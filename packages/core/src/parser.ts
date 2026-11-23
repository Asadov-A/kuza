/**
 * ПАРСЕР.
 *
 * Парсер — это «сборщик»: он берёт плоский список токенов от лексера
 * и строит из него дерево (AST), где видно структуру программы:
 * какой блок вложен в какой, что является аргументом, где условие.
 *
 * Именно поэтому вложенные `? ... [ ... ]` больше не ломаются.
 */

import type * as AST from "./ast.js";
import { KuzaError } from "./errors.js";
import { tokenize, type Token } from "./lexer.js";
import { findCommand, minArgs, resolveCommand, validateArity, type CommandDef } from "./builtins.js";

/** Приоритеты бинарных операторов: от самого слабого к самому сильному. */
const BINARY_LEVELS: string[][] = [
  ["or"],
  ["and"],
  ["==", "!=", "<", ">", "<=", ">="],
  ["+", "-"],
  ["*", "/", "%"],
  ["**"],
];

const ASSIGN_OPERATORS = ["=", "+=", "-=", "*=", "/="];

/** Токены, после которых `>` внутри <...> точно закрывает скобку. */
const AFTER_CLOSER = new Set([
  ";", "]", "[", ",", ")", "}", ".", ">>", ">", "<",
  ">=", "<=", "==", "!=", "+", "-", "*", "/", "%", "?", "|", "|>",
]);

/** Встроенные модули: use math; */
export const BUILTIN_MODULES = ["math", "time", "random", "text", "json"];

/** Настройки разбора: откуда брать свой файл по use "./x.kuza". */
export interface ParseOptions {
  /** Имя файла — только для сообщений об ошибках. */
  filename?: string;
  /** Чтение своего файла: возвращает исходник по пути из use "./x.kuza". */
  resolveModule?: (specifier: string) => string;
}

export function parse(source: string, options: ParseOptions = {}): AST.Program {
  return new Parser(tokenize(source), options).parseProgram();
}

class Parser {
  private tokens: Token[];
  private index = 0;
  /** Глубина вложенности <...>: внутри неё `>` может быть закрывашкой. */
  private angleDepth = 0;
  /** > 0, когда разбираем условие: там `имя >> [` — блок, а не команда. */
  private conditionDepth = 0;
  /** > 0 внутри where: там `=` — это сравнение, как в SQL. */
  private sqlConditionDepth = 0;

  /** Параметры лямбд, которые затеняют одноимённые команды. */
  private lambdaParams: string[] = [];
  private options: ParseOptions;

  constructor(tokens: Token[], options: ParseOptions = {}) {
    this.tokens = tokens;
    this.options = options;
  }

  /** Разобрать выражение как условие: `?flag >> [ ... ]` значит «если flag». */
  private withCondition<T>(fn: () => T): T {
    this.conditionDepth++;
    try {
      return fn();
    } finally {
      this.conditionDepth--;
    }
  }

  /** Внутри where `age = 18` значит `age == 18`. */
  private withTableCondition<T>(fn: () => T): T {
    this.sqlConditionDepth++;
    try {
      return fn();
    } finally {
      this.sqlConditionDepth--;
    }
  }

  // ── вспомогательные методы чтения токенов ───────────────────────────

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)]!;
  }

  private advance(): Token {
    const token = this.tokens[this.index]!;
    if (token.type !== "eof") this.index++;
    return token;
  }

  private atEof(): boolean {
    return this.peek().type === "eof";
  }

  private isPunct(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token.type === "punct" && token.value === value;
  }

  private isIdent(value?: string, offset = 0): boolean {
    const token = this.peek(offset);
    if (token.type !== "ident") return false;
    return value === undefined ? true : token.value === value;
  }

  private expectPunct(value: string, message?: string): Token {
    if (this.isPunct(value)) return this.advance();
    const token = this.peek();
    throw new KuzaError(
      message ?? `Ожидался символ "${value}", а получено "${this.describe(token)}"`,
      token.line,
      token.column,
      "parser",
    );
  }

  private expectIdent(message = "Ожидалось имя"): Token {
    const token = this.peek();
    if (token.type === "ident") return this.advance();
    throw new KuzaError(
      `${message}, а получено "${this.describe(token)}"`,
      token.line,
      token.column,
      "parser",
    );
  }

  private describe(token: Token): string {
    if (token.type === "eof") return "конец файла";
    if (token.type === "newline") return "перевод строки";
    return token.value;
  }

  private error(token: Token, message: string, hint?: string): never {
    throw new KuzaError(message, token.line, token.column, "parser", hint);
  }

  /** Пропустить переводы строк и точки с запятой. */
  private skipSeparators(): void {
    while (this.peek().type === "newline" || this.isPunct(";")) this.advance();
  }

  private isStatementEnd(): boolean {
    const token = this.peek();
    return (
      token.type === "newline" ||
      token.type === "eof" ||
      (token.type === "punct" && (token.value === ";" || token.value === "]"))
    );
  }

  private endStatement(): void {
    if (!this.isStatementEnd()) {
      const token = this.peek();
      const previous = this.tokens[this.index - 1];
      // Типичный случай: `view App<> >> [` разбирается старым (@0.4.x)
      // компилятором как выражение `view`, а `App` кажется лишним.
      const staleCompiler =
        previous?.type === "ident" &&
        token.type === "ident" &&
        !findCommand(previous.value) &&
        !findCommand(token.value);
      this.error(
        token,
        `Ожидался конец строки или ";", а получено "${this.describe(token)}"`,
        staleCompiler
          ? `Возможно, используется старый компилятор: проверьте "kuza -v" и обновите "kuza upgrade". Новые команды вроде view/render требуют Kuza 0.5+. Каждый оператор заканчивается переводом строки или ";".`
          : "Каждый оператор заканчивается переводом строки или точкой с запятой.",
      );
    }
    this.skipSeparators();
  }

  // ── программа ───────────────────────────────────────────────────────

  parseProgram(): AST.Program {
    const body: AST.Statement[] = [];
    this.skipSeparators();
    while (!this.atEof()) {
      if (this.isPunct("]")) {
        this.error(this.peek(), "Лишняя закрывающая скобка \"]\"");
      }
      body.push(this.parseStatement());
      this.skipSeparators();
    }
    return { kind: "Program", body, line: 1, column: 1 };
  }

  // ── операторы ───────────────────────────────────────────────────────

  private parseStatement(): AST.Statement {
    const token = this.peek();

    if (token.type === "punct" && token.value === ":") {
      return this.parseVarDecl(true);
    }

    if (token.type === "ident") {
      switch (token.value) {
        case "func":
        case "view":
          return this.parseFuncDecl();
        case "while":
          return this.parseWhile();
        case "for":
          return this.parseFor();
        case "foreach":
          return this.parseForEach();
        case "try":
          return this.parseTry();
        case "use":
          return this.parseUse();
        case "return":
          return this.parseReturn();
        case "break":
          this.advance();
          this.endStatement();
          return { kind: "BreakStmt", line: token.line, column: token.column };
        case "continue":
          this.advance();
          this.endStatement();
          return { kind: "ContinueStmt", line: token.line, column: token.column };
        case "throw":
          return this.parseThrow();
        case "update":
          return this.parseTableUpdate();
        case "delete":
          return this.parseTableDelete();
        case "insert":
          return this.parseTableInsert();
        case "let":
        case "const":
        case "var":
          this.error(
            token,
            `В Kuza переменная объявляется через ":", а не "${token.value}"`,
            `Напиши ":имя = значение;", например ":count = 0;"`,
          );
          break;
      }
    }

    if (token.type === "punct" && token.value === "?") {
      return this.parseIf();
    }

    if (token.type === "punct" && token.value === "[") {
      this.error(
        token,
        "Блок без условия или цикла",
        "Блоки [ ... ] пишутся после условия, цикла или функции.",
      );
    }

    return this.parseSimpleStatement(true);
  }

  private parseVarDecl(consumeTerminator: boolean): AST.Statement {
    const start = this.expectPunct(":");

    // Деструктуризация: :[a, b] = pair;  или  :{name, age} = user;
    if (this.isPunct("[") || this.isPunct("{")) {
      const shape: "array" | "object" = this.isPunct("[") ? "array" : "object";
      this.advance();
      const names: string[] = [];
      const closer = shape === "array" ? "]" : "}";
      while (!this.isPunct(closer)) {
        names.push(this.expectIdent("Ожидалось имя переменной").value);
        if (this.isPunct(",")) {
          this.advance();
          continue;
        }
        break;
      }
      this.expectPunct(closer, "Не закрыт список имён при деструктуризации");
      this.expectPunct("=", 'После списка имён нужен знак "="');
      const value = this.parseExpression();
      if (consumeTerminator) this.endStatement();
      return { kind: "DestructureDecl", shape, names, value, line: start.line, column: start.column };
    }

    const nameToken = this.expectIdent('Ожидалось имя переменной после ":"');
    this.expectPunct("=", `После имени "${nameToken.value}" нужен знак "="`);
    const value = this.parseExpression();
    if (consumeTerminator) this.endStatement();
    return {
      kind: "VarDecl",
      name: nameToken.value,
      value,
      line: start.line,
      column: start.column,
    };
  }

  private parseSimpleStatement(consumeTerminator: boolean): AST.Statement {
    const start = this.peek();
    const expression = this.parseExpression();
    const token = this.peek();

    if (token.type === "punct" && ASSIGN_OPERATORS.includes(token.value)) {
      if (!isAssignable(expression)) {
        this.error(token, 'Слева от "=" должна быть переменная, поле или элемент массива');
      }
      this.advance();
      const value = this.parseExpression();
      if (consumeTerminator) this.endStatement();
      return {
        kind: "Assign",
        target: expression,
        operator: token.value as AST.Assign["operator"],
        value,
        line: start.line,
        column: start.column,
      };
    }

    if (token.type === "punct" && (token.value === "++" || token.value === "--")) {
      if (!isAssignable(expression)) {
        this.error(token, `Оператор "${token.value}" работает только с переменными`);
      }
      this.advance();
      if (consumeTerminator) this.endStatement();
      return {
        kind: "UpdateStmt",
        target: expression,
        operator: token.value as "++" | "--",
        line: start.line,
        column: start.column,
      };
    }

    if (consumeTerminator) this.endStatement();
    return { kind: "ExprStmt", expression, line: start.line, column: start.column };
  }

  private parseIf(): AST.IfStmt {
    const start = this.expectPunct("?");
    const condition = this.withCondition(() => this.parseExpression());
    if (this.isPunct(">>")) this.advance();
    const then = this.parseBlock();
    return this.finishIf(start, condition, then);
  }

  private finishIf(start: Token, condition: AST.Expression, then: AST.Statement[]): AST.IfStmt {
    const save = this.index;
    this.skipSeparators();

    if (!this.isPunct("||")) {
      this.index = save;
      return { kind: "IfStmt", condition, then, line: start.line, column: start.column };
    }

    this.advance(); // ||
    this.skipSeparators();

    if (this.isPunct("?")) {
      const nestedStart = this.advance();
      const nestedCondition = this.withCondition(() => this.parseExpression());
      if (this.isPunct(">>")) this.advance();
      const nestedBody = this.parseBlock();
      return {
        kind: "IfStmt",
        condition,
        then,
        otherwise: this.finishIf(nestedStart, nestedCondition, nestedBody),
        line: start.line,
        column: start.column,
      };
    }

    return {
      kind: "IfStmt",
      condition,
      then,
      otherwise: this.parseBlock(),
      line: start.line,
      column: start.column,
    };
  }

  private parseWhile(): AST.WhileStmt {
    const start = this.advance(); // while
    this.expectPunct("<", 'После "while" нужно условие в <...>');
    this.angleDepth++;
    const condition = this.withCondition(() => this.parseExpression());
    this.angleDepth--;
    this.expectPunct(">", 'Не закрыто условие while: не хватает ">"');
    if (this.isPunct(">>")) this.advance();
    const body = this.parseBlock();
    return { kind: "WhileStmt", condition, body, line: start.line, column: start.column };
  }

  private parseFor(): AST.Statement {
    const start = this.advance(); // for
    this.expectPunct("<", 'После "for" нужен заголовок в <...>');
    this.angleDepth++;

    // Форма по диапазону: for<:i = 1..10> >> [ ... ]
    const range = this.tryParseForRange();
    if (range) {
      this.angleDepth--;
      this.expectPunct(">", 'Не закрыт заголовок for: не хватает ">"');
      if (this.isPunct(">>")) this.advance();
      const rangeBody = this.parseBlock();
      return {
        kind: "ForRangeStmt",
        name: range.name,
        from: range.from,
        to: range.to,
        body: rangeBody,
        line: start.line,
        column: start.column,
      };
    }

    let init: AST.Statement | null = null;
    if (!this.isPunct(";")) init = this.parseHeaderStatement();
    this.expectPunct(";", 'В заголовке for части разделяются ";"');

    let condition: AST.Expression | null = null;
    if (!this.isPunct(";")) condition = this.withCondition(() => this.parseExpression());
    this.expectPunct(";", "В заголовке for нужны три части: init; условие; шаг");

    let step: AST.Statement | null = null;
    if (!this.isPunct(">")) step = this.parseHeaderStatement();

    this.angleDepth--;
    this.expectPunct(">", 'Не закрыт заголовок for: не хватает ">"');
    if (this.isPunct(">>")) this.advance();
    const body = this.parseBlock();

    return { kind: "ForStmt", init, condition, step, body, line: start.line, column: start.column };
  }

  private parseHeaderStatement(): AST.Statement {
    const token = this.peek();
    if (token.type === "ident" && ["let", "const", "var"].includes(token.value)) {
      this.error(
        token,
        'В Kuza счётчик объявляется через ":": for<:i = 0; i < 10; i++>',
        `Замени "${token.value}" на ":"`,
      );
    }
    if (this.isPunct(":")) return this.parseVarDecl(false);
    return this.parseSimpleStatement(false);
  }

  private parseForEach(): AST.ForEachStmt {
    const start = this.advance(); // foreach
    this.expectPunct("<", 'После "foreach" нужен заголовок в <...>');
    this.angleDepth++;
    const nameToken = this.expectIdent('Ожидалось имя элемента после "foreach<"');
    this.expectPunct(":", "В foreach нужна форма foreach<элемент : массив>");
    const iterable = this.parseExpression();
    this.angleDepth--;
    this.expectPunct(">", 'Не закрыт заголовок foreach: не хватает ">"');
    if (this.isPunct(">>")) this.advance();
    const body = this.parseBlock();
    return {
      kind: "ForEachStmt",
      name: nameToken.value,
      iterable,
      body,
      line: start.line,
      column: start.column,
    };
  }

  private parseFuncDecl(): AST.FuncDecl {
    const start = this.advance(); // func / view
    const keyword = start.value;
    const label = keyword === "view" ? "экрана" : "функции";
    const nameToken = this.expectIdent(`Ожидалось имя ${label} после "${keyword}"`);
    this.expectPunct("<", `После имени ${label} "${nameToken.value}" нужны параметры в <...>`);
    this.angleDepth++;

    const params: AST.Param[] = [];
    if (!this.isPunct(">")) {
      for (;;) {
        const paramName = this.expectIdent("Ожидалось имя параметра").value;
        let defaultValue: AST.Expression | undefined;
        if (this.isPunct("=")) {
          this.advance();
          defaultValue = this.parseExpression();
        }
        params.push(defaultValue ? { name: paramName, default: defaultValue } : { name: paramName });
        if (this.isPunct(",")) {
          this.advance();
          if (this.isPunct(">")) break;
          continue;
        }
        break;
      }
    }
    this.angleDepth--;
    this.expectPunct(">", 'Не закрыт список параметров: не хватает ">"');
    if (this.isPunct(">>")) this.advance();
    const body = this.parseBlock();

    return {
      kind: "FuncDecl",
      name: nameToken.value,
      params,
      body,
      view: keyword === "view",
      line: start.line,
      column: start.column,
    };
  }

  private parseTry(): AST.TryStmt {
    const start = this.advance(); // try
    if (this.isPunct(">>")) this.advance();
    const body = this.parseBlock();

    const save = this.index;
    this.skipSeparators();
    let catchParam: string | null = null;
    let catchBody: AST.Statement[] | null = null;

    if (this.isIdent("catch")) {
      this.advance();
      this.expectPunct("<", 'После "catch" нужен параметр ошибки: catch<e>');
      catchParam = this.expectIdent("Ожидалось имя переменной ошибки").value;
      this.expectPunct(">", 'Не закрыт catch: не хватает ">"');
      if (this.isPunct(">>")) this.advance();
      catchBody = this.parseBlock();
    } else {
      this.index = save;
    }

    return {
      kind: "TryStmt",
      body,
      catchParam,
      catchBody,
      line: start.line,
      column: start.column,
    };
  }

  private parseReturn(): AST.ReturnStmt {
    const start = this.advance(); // return
    let value: AST.Expression | null = null;
    if (!this.isStatementEnd()) value = this.parseExpression();
    this.endStatement();
    return { kind: "ReturnStmt", value, line: start.line, column: start.column };
  }

  private parseThrow(): AST.ThrowStmt {
    const start = this.advance(); // throw
    if (this.isPunct(">>")) this.advance();
    const value = this.parseExpression();
    this.endStatement();
    return { kind: "ThrowStmt", value, line: start.line, column: start.column };
  }

  private parseBlock(): AST.Statement[] {
    this.expectPunct("[", 'Здесь нужен блок: открой его символом "["');
    const body: AST.Statement[] = [];
    this.skipSeparators();
    while (!this.isPunct("]")) {
      if (this.atEof()) this.error(this.peek(), 'Не закрыт блок: не хватает "]"');
      body.push(this.parseStatement());
      this.skipSeparators();
    }
    this.advance(); // ]
    return body;
  }

  // ── выражения ───────────────────────────────────────────────────────

  private parseExpression(): AST.Expression {
    let left = this.parseRange();
    while (this.isPunct("|>")) {
      const pipe = this.advance();
      left = this.parsePipe(left, pipe);
    }
    return left;
  }

  /** Диапазон: 1..10. Низший приоритет: `1 + 1..5` = (1+1)..5. */
  private parseRange(): AST.Expression {
    const from = this.parseBinary(0);
    if (this.isPunct("..")) {
      this.advance();
      const to = this.parseBinary(0);
      return { kind: "RangeExpr", from, to, line: from.line, column: from.column };
    }
    return from;
  }

  /**
   * Цепочка: items |> filter<(x) -> x > 3> |> sort
   * Левое значение подставляется первым аргументом.
   */
  private parsePipe(value: AST.Expression, pipe: Token): AST.Expression {
    const nameToken = this.peek();
    if (nameToken.type !== "ident") {
      this.error(
        nameToken,
        'После "|>" нужна команда или имя функции',
        "Например: items |> sort или items |> filter<(x) -> x > 3>",
      );
    }
    this.advance();

    let rest: AST.Expression[] = [];
    if (this.isPunct("<") && !this.peek().spaceBefore) rest = this.parseAngleArgs();

    const command = findCommand(nameToken.value);
    if (command) {
      const args = [value, ...rest];
      validateArity(command, args.length, nameToken.line, nameToken.column);
      return {
        kind: "CommandExpr",
        name: nameToken.value,
        commandId: command.id,
        args,
        line: pipe.line,
        column: pipe.column,
      };
    }

    return {
      kind: "CallExpr",
      callee: nameToken.value,
      args: [value, ...rest],
      line: pipe.line,
      column: pipe.column,
    };
  }

  /** Арифметика без сравнений и логики — так разбирается аргумент команды. */
  private parseArithmetic(): AST.Expression {
    return this.parseBinary(3);
  }

  /** Аргумент команды плюс цепочки: log >> nums |> filter<...>; */
  private parseArithmeticWithPipes(): AST.Expression {
    let left = this.parseBinary(3);
    while (this.isPunct("|>")) {
      const pipe = this.advance();
      left = this.parsePipe(left, pipe);
    }
    return left;
  }

  private parseBinary(level: number): AST.Expression {
    if (level >= BINARY_LEVELS.length) return this.parseUnary();

    const operators = BINARY_LEVELS[level]!;
    let left = this.parseBinary(level + 1);

    for (;;) {
      const token = this.peek();
      if (token.type === "newline" || token.type === "eof") break;
      if (token.type !== "punct" && token.type !== "ident") break;

      const operator = token.value;
      const sqlEquals = operator === "=" && this.sqlConditionDepth > 0 && level === 2;
      if (!operators.includes(operator) && !sqlEquals) break;
      if (token.type === "ident" && operator !== "and" && operator !== "or") break;

      // Внутри <...> знак ">" может быть закрывающей скобкой, а не сравнением.
      if (operator === ">" && this.angleDepth > 0 && this.isAngleCloser()) break;

      this.advance();
      const right = this.parseBinary(operator === "**" ? level : level + 1);
      left = {
        kind: "BinaryExpr",
        operator:
          operator === "and"
            ? "&&"
            : operator === "or"
              ? "||"
              : sqlEquals
                ? "=="
                : operator,
        left,
        right,
        line: token.line,
        column: token.column,
      };
    }

    return left;
  }

  /**
   * Похоже ли текущее ">" на закрывающую скобку, а не на сравнение?
   * После сравнения идёт выражение (число, строка, имя), после закрывашки —
   * ";", "]", ">>", оператор и т.п.
   */
  private isAngleCloser(): boolean {
    const next = this.peek(1);
    if (next.type === "newline" || next.type === "eof") return true;
    if (next.type === "punct") return AFTER_CLOSER.has(next.value);
    return false;
  }

  private parseUnary(): AST.Expression {
    const token = this.peek();
    if (token.type === "punct" && token.value === "-") {
      this.advance();
      return {
        kind: "UnaryExpr",
        operator: "-",
        argument: this.parseUnary(),
        line: token.line,
        column: token.column,
      };
    }
    if (
      (token.type === "punct" && token.value === "!") ||
      (token.type === "ident" && token.value === "not")
    ) {
      this.advance();
      return {
        kind: "UnaryExpr",
        operator: "not",
        argument: this.parseUnary(),
        line: token.line,
        column: token.column,
      };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): AST.Expression {
    let expression = this.parsePrimary();
    for (;;) {
      if (this.isPunct(".")) {
        const dot = this.advance();
        const property = this.expectIdent("После точки ожидалось имя поля");
        const afterDot = this.peek();
        if (afterDot.type === "punct" && afterDot.value === "<" && !afterDot.spaceBefore) {
          const args = this.parseAngleArgs();
          expression = {
            kind: "MethodCallExpr",
            object: expression,
            method: property.value,
            args,
            line: dot.line,
            column: dot.column,
          };
          continue;
        }
        expression = {
          kind: "MemberExpr",
          object: expression,
          property: property.value,
          line: dot.line,
          column: dot.column,
        };
        continue;
      }
      if (this.isPunct("[")) {
        const bracket = this.advance();
        const index = this.parseExpression();
        this.expectPunct("]", 'Не закрыт доступ по индексу: не хватает "]"');
        if (index.kind === "RangeExpr") {
          expression = {
            kind: "SliceExpr",
            object: expression,
            from: index.from,
            to: index.to,
            line: bracket.line,
            column: bracket.column,
          };
        } else {
          expression = {
            kind: "IndexExpr",
            object: expression,
            index,
            line: bracket.line,
            column: bracket.column,
          };
        }
        continue;
      }
      break;
    }
    return expression;
  }

  private parsePrimary(): AST.Expression {
    const token = this.peek();

    if (token.type === "number") {
      this.advance();
      const raw = token.value.replace(/_/g, "");
      return { kind: "NumberLit", value: Number(raw), raw, line: token.line, column: token.column };
    }

    if (token.type === "string") {
      this.advance();
      if (token.value.includes("{")) return this.parseInterpolatedString(token);
      return { kind: "StringLit", value: token.value, line: token.line, column: token.column };
    }

    if (token.type === "template") {
      this.advance();
      return { kind: "TemplateLit", raw: token.value, line: token.line, column: token.column };
    }

    if (token.type === "punct" && token.value === "(") {
      if (this.isLambdaAhead()) return this.parseLambda();
      this.advance();
      const inner = this.parseExpression();
      this.expectPunct(")", 'Не закрыта скобка: не хватает ")"');
      return inner;
    }

    if (token.type === "punct" && token.value === "[") {
      return this.parseArrayLiteral();
    }

    if (token.type === "punct" && token.value === "{") {
      return this.parseObjectLiteral();
    }

    if (token.type === "ident") {
      if (token.value === "true" || token.value === "false") {
        this.advance();
        return {
          kind: "BoolLit",
          value: token.value === "true",
          line: token.line,
          column: token.column,
        };
      }
      if (token.value === "null") {
        this.advance();
        return { kind: "NullLit", value: null, line: token.line, column: token.column };
      }

      const next = this.peek(1);

      // Параметр лямбды всегда переменная, даже если совпадает с командой.
      if (this.lambdaParams.includes(token.value)) {
        this.advance();
        return { kind: "Identifier", name: token.value, line: token.line, column: token.column };
      }

      // `user.name`, `row["age"]` — обращение к полю, а не команда.
      if (
        next.type === "punct" &&
        (next.value === "." || next.value === "[" || next.value === "?.")
      ) {
        this.advance();
        return { kind: "Identifier", name: token.value, line: token.line, column: token.column };
      }

      // Таблица: table<id, name, age>
      if (token.value === "table" && next.type === "punct" && next.value === "<" && !next.spaceBefore) {
        return this.parseTableLiteral();
      }

      // Запрос: select name, age from users where age >= 18 order by age desc
      if (token.value === "select") {
        return this.parseSelect();
      }

      // `имя >> [` внутри условия — это блок if, а не команда.
      if (next.type === "punct" && next.value === ">>") {
        const after = this.peek(2);
        const blockFollows = after.type === "punct" && after.value === "[";
        if (!(this.conditionDepth > 0 && blockFollows)) return this.parseCommand();
      }

      if (next.type === "punct" && next.value === "<" && !next.spaceBefore) {
        const candidate = findCommand(token.value);
        // `card<"p-4"> >> [ ... ]` — контейнер с Tailwind-классом.
        if (candidate?.args === "block") return this.parseCommand();
        // Команда без стрелки: `field<"Имя", "name">;` — это тоже команда,
        // иначе получился бы вызов несуществующей функции field().
        if (candidate) {
          const nameToken = this.advance();
          const args = this.parseAngleArgs();
          validateArity(candidate, args.length, nameToken.line, nameToken.column);
          return {
            kind: "CommandExpr",
            name: nameToken.value,
            commandId: candidate.id,
            args,
            line: nameToken.line,
            column: nameToken.column,
          };
        }
        return this.parseCall();
      }

      // Команда без аргументов: now, today, uuid.
      // Внутри where имя — это колонка таблицы, а не команда (колонка id важнее uuid).
      const bare = findCommand(token.value);
      if (bare && minArgs(bare) === 0 && this.sqlConditionDepth === 0) {
        this.advance();
        return {
          kind: "CommandExpr",
          name: token.value,
          commandId: bare.id,
          args: [],
          line: token.line,
          column: token.column,
        };
      }

      this.advance();
      return { kind: "Identifier", name: token.value, line: token.line, column: token.column };
    }

    this.error(
      token,
      `Ожидалось значение, а получено "${this.describe(token)}"`,
      "Значение — это число, строка, переменная, массив [..] или команда.",
    );
  }

  private parseCommand(): AST.CommandExpr {
    const nameToken = this.expectIdent();
    // Возможен вид `card<"class"> >> [ ... ]`: аргумент до стрелки.
    const leading = this.isPunct("<") ? this.parseAngleArgs() : [];
    this.expectPunct(">>");
    const command = resolveCommand(nameToken.value, nameToken.line, nameToken.column);
    return this.finishCommand(nameToken, command, leading);
  }

  private finishCommand(
    nameToken: Token,
    command: CommandDef,
    leading: AST.Expression[] = [],
  ): AST.CommandExpr {
    let args: AST.Expression[] = [];

    // Контейнер страницы: `body >> [ ... ]`, `card<"class"> >> [ ... ]`.
    if (command.args === "block") {
      let args = leading;
      if (args.length === 0 && this.isPunct("<")) args = this.parseAngleArgs();
      validateArity(command, args.length, nameToken.line, nameToken.column);
      const body = this.parseBlock();
      return {
        kind: "CommandExpr",
        name: nameToken.value,
        commandId: command.id,
        args,
        body,
        line: nameToken.line,
        column: nameToken.column,
      };
    }

    if (this.isPunct("<")) {
      args = [...leading, ...this.parseAngleArgs()];
    } else if (minArgs(command) > 0 && !this.isStatementEnd()) {
      // Один аргумент команды — это арифметическое выражение, без сравнений.
      // Поэтому `?len >> nums > 3` читается как `(len >> nums) > 3`.
      // Цепочки внутри аргумента разрешены: log >> nums |> sort;
      args = [...leading, this.parseArithmeticWithPipes()];
    } else {
      args = leading;
    }

    validateArity(command, args.length, nameToken.line, nameToken.column);

    return {
      kind: "CommandExpr",
      name: nameToken.value,
      commandId: command.id,
      args,
      line: nameToken.line,
      column: nameToken.column,
    };
  }

  private parseAngleArgs(): AST.Expression[] {
    this.expectPunct("<");
    this.angleDepth++;
    const args: AST.Expression[] = [];

    while (!this.isPunct(">")) {
      if (this.atEof()) this.error(this.peek(), 'Не закрыт список аргументов: не хватает ">"');
      args.push(this.parseExpression());
      if (this.isPunct(",")) {
        this.advance();
        if (this.isPunct(">")) break;
        continue;
      }
      break;
    }

    this.angleDepth--;
    this.expectPunct(">", 'Не закрыт список аргументов: не хватает ">"');
    return args;
  }

  private parseCall(): AST.CallExpr {
    const nameToken = this.expectIdent();
    const args = this.parseAngleArgs();
    return {
      kind: "CallExpr",
      callee: nameToken.value,
      args,
      line: nameToken.line,
      column: nameToken.column,
    };
  }

  private parseArrayLiteral(): AST.ArrayLit {
    const start = this.expectPunct("[");
    const elements: AST.Expression[] = [];
    // Массив можно разбивать на строки: переносы внутри [ ] не мешают.
    this.skipSeparators();
    while (!this.isPunct("]")) {
      if (this.atEof()) this.error(this.peek(), 'Не закрыт массив: не хватает "]"');
      elements.push(this.parseExpression());
      this.skipSeparators();
      if (this.isPunct(",")) {
        this.advance();
        this.skipSeparators();
        continue;
      }
      break;
    }
    this.expectPunct("]", 'Не закрыт массив: не хватает "]"');
    return { kind: "ArrayLit", elements, line: start.line, column: start.column };
  }

  private parseObjectLiteral(): AST.ObjectLit {
    const start = this.expectPunct("{");
    const properties: Array<{ key: string; value: AST.Expression }> = [];
    this.skipSeparators();
    while (!this.isPunct("}")) {
      if (this.atEof()) this.error(this.peek(), 'Не закрыт объект: не хватает "}"');
      const keyToken = this.peek();
      let key: string;
      if (keyToken.type === "ident" || keyToken.type === "string" || keyToken.type === "number") {
        key = keyToken.value;
        this.advance();
      } else {
        this.error(keyToken, "Ожидалось имя поля объекта");
      }
      this.expectPunct(":", 'После имени поля нужен ":"');
      const value = this.parseExpression();
      properties.push({ key, value });
      this.skipSeparators();
      if (this.isPunct(",")) {
        this.advance();
        this.skipSeparators();
        continue;
      }
      break;
    }
    this.expectPunct("}", 'Не закрыт объект: не хватает "}"');
    return { kind: "ObjectLit", properties, line: start.line, column: start.column };
  }

  // ── Шаг B: таблицы и запросы к ним ──────────────────────────────────

  /** table<id, name, age> — таблица с колонками. */
  private parseTableLiteral(): AST.TableLiteral {
    const start = this.advance(); // table
    this.expectPunct("<", 'После "table" нужны колонки: table<id, name>');
    this.angleDepth++;
    const columns: string[] = [];
    if (!this.isPunct(">")) {
      for (;;) {
        columns.push(this.expectIdent("Ожидалось имя колонки").value);
        if (this.isPunct(",")) {
          this.advance();
          if (this.isPunct(">")) break;
          continue;
        }
        break;
      }
    }
    this.angleDepth--;
    this.expectPunct(">", 'Не закрыт список колонок: не хватает ">"');
    return { kind: "TableLiteral", columns, line: start.line, column: start.column };
  }

  /** select колонки from таблица where ... order by ... desc limit N */
  private parseSelect(): AST.SelectQuery {
    const start = this.advance(); // select

    let columns: AST.SelectColumn[] | "*";
    if (this.isPunct("*")) {
      this.advance();
      columns = "*";
    } else {
      const list: AST.SelectColumn[] = [];
      for (;;) {
        const name = this.expectIdent("После select нужны колонки: select name, age from users").value;
        let alias: string | undefined;
        if (this.isIdent("as")) {
          this.advance();
          alias = this.expectIdent('После "as" ожидалось имя колонки').value;
        }
        list.push(alias ? { name, alias } : { name });
        if (this.isPunct(",")) {
          this.advance();
          continue;
        }
        break;
      }
      columns = list;
    }

    if (!this.isIdent("from")) {
      this.error(
        this.peek(),
        'После списка колонок нужно "from"',
        "Например: select name, age from users;",
      );
    }
    this.advance();
    const source = this.parseBinary(0);

    let where: AST.Expression | undefined;
    if (this.isIdent("where")) {
      this.advance();
      where = this.withTableCondition(() => this.parseExpression());
    }

    let orderBy: AST.Expression | undefined;
    let descending = false;
    if (this.isIdent("order")) {
      this.advance();
      if (!this.isIdent("by")) {
        this.error(this.peek(), 'После "order" нужно "by"', "Например: order by age desc");
      }
      this.advance();
      orderBy = this.parseBinary(0);
      if (this.isIdent("desc")) {
        this.advance();
        descending = true;
      } else if (this.isIdent("asc")) {
        this.advance();
      }
    }

    let limit: AST.Expression | undefined;
    if (this.isIdent("limit")) {
      this.advance();
      limit = this.parseArithmetic();
    }

    return {
      kind: "SelectQuery",
      columns,
      source,
      where,
      orderBy,
      descending,
      limit,
      line: start.line,
      column: start.column,
    };
  }

  /** update таблица set колонка = значение, ... where условие; */
  private parseTableUpdate(): AST.TableUpdateStmt {
    const start = this.advance(); // update
    const table = this.expectIdent('После "update" ожидалось имя таблицы').value;
    if (!this.isIdent("set")) {
      this.error(this.peek(), 'После имени таблицы нужно "set"', "Например: update users set age = 18 where id = 1;");
    }
    this.advance();

    const changes: Array<{ column: string; value: AST.Expression }> = [];
    for (;;) {
      const column = this.expectIdent("Ожидалось имя колонки").value;
      this.expectPunct("=", `После колонки "${column}" нужен "="`);
      changes.push({ column, value: this.parseExpression() });
      if (this.isPunct(",")) {
        this.advance();
        continue;
      }
      break;
    }

    let where: AST.Expression | null = null;
    if (this.isIdent("where")) {
      this.advance();
      where = this.withTableCondition(() => this.parseExpression());
    }

    this.endStatement();
    return { kind: "TableUpdateStmt", table, changes, where, line: start.line, column: start.column };
  }

  /** insert into таблица values <значение, ...>; или insert into таблица <{...}>; */
  private parseTableInsert(): AST.TableInsertStmt {
    const start = this.advance(); // insert
    if (!this.isIdent("into")) {
      this.error(
        this.peek(),
        'После "insert" нужно "into"',
        'Например: insert into users values <1, "Аня", 30>;',
      );
    }
    this.advance();
    const table = this.expectIdent('После "insert into" ожидалось имя таблицы').value;

    // Слово "values" необязательно: insert into users <1, "Аня">;
    if (this.isIdent("values")) this.advance();

    const values = this.isPunct("<") ? this.parseAngleArgs() : [];
    if (values.length === 0) {
      this.error(
        this.peek(),
        "В insert нужны значения",
        'Например: insert into users values <1, "Аня">; или insert into users <{id: 1}>;',
      );
    }

    this.endStatement();
    return { kind: "TableInsertStmt", table, values, line: start.line, column: start.column };
  }

  /** delete from таблица where условие; */
  private parseTableDelete(): AST.TableDeleteStmt {
    const start = this.advance(); // delete
    if (!this.isIdent("from")) {
      this.error(this.peek(), 'После "delete" нужно "from"', "Например: delete from users where age < 18;");
    }
    this.advance();
    const table = this.expectIdent("Ожидалось имя таблицы").value;

    let where: AST.Expression | null = null;
    if (this.isIdent("where")) {
      this.advance();
      where = this.withTableCondition(() => this.parseExpression());
    }

    this.endStatement();
    return { kind: "TableDeleteStmt", table, where, line: start.line, column: start.column };
  }

  // ── Шаг A: лямбды, подстановки, диапазоны, модули ────────────────────

  /** Впереди лямбда: (x) -> ... ? */
  private isLambdaAhead(): boolean {
    if (!this.isPunct("(")) return false;
    let depth = 0;
    for (let i = this.index; i < this.tokens.length; i++) {
      const token = this.tokens[i]!;
      if (token.type === "eof") return false;
      if (token.type === "punct" && token.value === "(") {
        depth++;
      } else if (token.type === "punct" && token.value === ")") {
        depth--;
        if (depth === 0) {
          const next = this.tokens[i + 1];
          return !!next && next.type === "punct" && next.value === "->";
        }
      }
    }
    return false;
  }

  private parseLambda(): AST.LambdaExpr {
    const start = this.expectPunct("(");
    const params: string[] = [];
    while (!this.isPunct(")")) {
      params.push(this.expectIdent("Ожидалось имя параметра лямбды").value);
      if (this.isPunct(",")) {
        this.advance();
        continue;
      }
      break;
    }
    this.expectPunct(")", 'Не закрыт список параметров лямбды: не хватает ")"');
    this.expectPunct("->", 'После параметров лямбды нужна стрелка "->"');
    // Параметры лямбды затеняют команды с тем же именем:
    // (row) -> row.age работает, хотя row — это ещё и тег-контейнер.
    const shadowed = this.lambdaParams.length;
    this.lambdaParams.push(...params);
    let body: AST.Expression;
    try {
      body = this.parseExpression();
    } finally {
      this.lambdaParams.length = shadowed;
    }
    return { kind: "LambdaExpr", params, body, line: start.line, column: start.column };
  }

  /** Строка с подстановками: "Привет, {name}!" — части текста и выражения. */
  private parseInterpolatedString(token: Token): AST.Expression {
    const parts: Array<string | AST.Expression> = [];
    const value = token.value;
    let buffer = "";
    let i = 0;

    while (i < value.length) {
      const ch = value[i]!;
      if (ch === "{" && value[i + 1] === "{") {
        buffer += "{";
        i += 2;
        continue;
      }
      if (ch === "}" && value[i + 1] === "}") {
        buffer += "}";
        i += 2;
        continue;
      }

      if (ch === "{" && this.startsSubstitution(value[i + 1])) {
        let depth = 0;
        let end = -1;
        for (let k = i; k < value.length; k++) {
          if (value[k] === "{") depth++;
          else if (value[k] === "}") {
            depth--;
            if (depth === 0) {
              end = k;
              break;
            }
          }
        }
        if (end === -1) {
          throw new KuzaError(
            'Не закрыта подстановка в строке: не хватает "}"',
            token.line,
            token.column,
            "parser",
            'Подстановка пишется так: "Привет, {name}!"',
          );
        }
        if (buffer) {
          parts.push(buffer);
          buffer = "";
        }
        const inner = value.slice(i + 1, end).trim();
        if (inner) parts.push(this.parseSubExpression(inner, token));
        i = end + 1;
        continue;
      }

      buffer += ch;
      i++;
    }

    if (buffer) parts.push(buffer);
    return { kind: "InterpolatedString", parts, line: token.line, column: token.column };
  }

  /** Похоже ли на начало выражения или это просто фигурная скобка в тексте. */
  private startsSubstitution(ch: string | undefined): boolean {
    if (!ch) return false;
    return /[\p{L}\p{N}_$("'\-!]/u.test(ch);
  }

  /** Разобрать кусок строки внутри { ... } тем же парсером. */
  private parseSubExpression(source: string, token: Token): AST.Expression {
    try {
      const sub = new Parser(tokenize(source), this.options);
      const expression = sub.parseExpression();
      if (!sub.atEof()) {
        throw new KuzaError(
          `В подстановке "{${source}}" лишний текст`,
          token.line,
          token.column,
          "parser",
          "Внутри { } должно быть одно выражение: {name}, {age + 1}, {user.name}",
        );
      }
      return expression;
    } catch (error) {
      if (error instanceof KuzaError) {
        throw new KuzaError(
          `Ошибка в подстановке "{${source}}": ${error.message}`,
          token.line,
          token.column,
          "parser",
          error.hint,
        );
      }
      throw error;
    }
  }

  /** Заголовок for<:i = 1..10>. Если это не он — откатиться и разобрать как обычно. */
  private tryParseForRange(): { name: string; from: AST.Expression; to: AST.Expression } | null {
    const save = this.index;
    const attempt = (): { name: string; from: AST.Expression; to: AST.Expression } | null => {
      if (!this.isPunct(":")) return null;
      this.advance();
      const nameToken = this.peek();
      if (nameToken.type !== "ident") return null;
      this.advance();
      if (!this.isPunct("=")) return null;
      this.advance();
      const from = this.parseBinary(0);
      if (!this.isPunct("..")) return null;
      this.advance();
      const to = this.parseBinary(0);
      return { name: nameToken.value, from, to };
    };
    try {
      const result = attempt();
      if (!result) this.index = save;
      return result;
    } catch {
      this.index = save;
      return null;
    }
  }

  /** use math; / use math as m; / use "./helpers.kuza"; / use "lodash"; */
  private parseUse(): AST.Statement {
    const start = this.advance(); // use
    const token = this.peek();
    let moduleName: string;
    let local = false;
    let external = false;

    if (token.type === "string") {
      moduleName = token.value;
      this.advance();
      // "./helpers.kuza" — свой файл, "lodash" или "@scope/pkg" — пакет из npm.
      local = isLocalSpecifier(moduleName);
      external = !local;
    } else if (token.type === "ident") {
      moduleName = token.value;
      this.advance();
    } else {
      this.error(
        token,
        'После "use" нужно имя модуля или путь в кавычках',
        'Например: use math; или use "./helpers.kuza";',
      );
    }

    if (moduleName.startsWith("npm:")) {
      moduleName = moduleName.slice("npm:".length);
      local = false;
      external = true;
    }

    let alias = local || external ? moduleAlias(fileStem(moduleName)) : moduleName;
    if (this.isIdent("as")) {
      this.advance();
      alias = this.expectIdent('После "as" ожидалось имя').value;
    }
    this.endStatement();

    if (external) {
      return {
        kind: "UseStmt",
        module: moduleName,
        alias,
        local: false,
        external: true,
        line: start.line,
        column: start.column,
      };
    }

    if (local) {
      const source = this.options.resolveModule?.(moduleName);
      if (source === undefined) {
        this.error(
          start,
          "Здесь нельзя подключить свой файл",
          'Свой файл подключается при запуске через "kuza run": use "./helpers.kuza";',
        );
      }
      const sub = new Parser(tokenize(source), { ...this.options, filename: moduleName });
      const program = sub.parseProgram();
      return {
        kind: "UseStmt",
        module: moduleName,
        alias,
        local: true,
        body: program.body,
        line: start.line,
        column: start.column,
      };
    }

    if (!BUILTIN_MODULES.includes(moduleName)) {
      this.error(
        start,
        `Неизвестный модуль "${moduleName}"`,
        `Есть модули: ${BUILTIN_MODULES.join(", ")}. ` +
          'Свой файл: use "./helpers.kuza"; пакет: use "lodash";',
      );
    }

    return {
      kind: "UseStmt",
      module: moduleName,
      alias,
      local: false,
      line: start.line,
      column: start.column,
    };
  }
}

/**
 * Имя модуля без папок и расширения:
 *   "./helpers.kuza" → "helpers", "node:path" → "path", "@scope/pkg" → "pkg".
 */
function fileStem(path: string): string {
  const base = path.replace(/\\/g, "/").split(/[\/:]/).pop() ?? path;
  return base.replace(/\.[^.]*$/, "") || "module";
}

/** Путь к своему файлу, а не имя пакета: "./x.kuza", "../x.kuza", "/x.kuza". */
function isLocalSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("/") ||
    specifier.startsWith(".\\") ||
    specifier.startsWith("..\\") ||
    specifier.endsWith(".kuza")
  );
}

/** Имя пакета → допустимое имя переменной: "date-fns" → "date_fns". */
function moduleAlias(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_$]/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned || "module";
}

function isAssignable(
  expression: AST.Expression,
): expression is AST.Identifier | AST.MemberExpr | AST.IndexExpr {
  return (
    expression.kind === "Identifier" ||
    expression.kind === "MemberExpr" ||
    expression.kind === "IndexExpr"
  );
}
