/**
 * ГЕНЕРАТОР JavaScript.
 *
 * Здесь дерево (AST) снова становится текстом — но уже JavaScript.
 *
 * Две важные вещи:
 *  1. Мы следим за областями видимости: `:x = 1` внутри блока, где x уже
 *     объявлен, превращается в присваивание `x = 1`, а не в новый `let x`.
 *     Именно поэтому счётчики в циклах теперь работают.
 *  2. Программа оборачивается в async-функцию, чтобы `wait >> 1000;`
 *     и `prompt >> "..."` могли использовать await.
 */

import type * as AST from "./ast.js";
import { applyCodegen, findCommand } from "./builtins.js";
import { KuzaError } from "./errors.js";
import { RUNTIME_SOURCE } from "./runtime.js";

export interface CodegenOptions {
  /**
   * "runtime" — полная программа, "body" — только тело (для превью),
   * "module" — ES-модуль: функции экспортируются, чтобы их можно было
   * вызвать из React, Vue, Svelte, Node.js или любого другого JS-кода.
   */
  mode?: "runtime" | "body" | "module";
  /** Вставлять ли рантайм __kz в начало файла. */
  includeRuntime?: boolean;
  /** Добавить обработку ошибок и код выхода — для `kuza build`. */
  standalone?: boolean;
}

const INDENT = "  ";

/** Имена переменных, объявленных на верхнем уровне программы. */
function declaredNames(program: AST.Program): Set<string> {
  const names = new Set<string>();
  for (const statement of program.body) {
    if (statement.kind === "VarDecl") names.add(statement.name);
  }
  return names;
}

/**
 * Переменные, которые использует `view`. Присваивание такой переменной
 * автоматически перерисовывает экран — без ручного вызова функции.
 */
function reactiveNames(program: AST.Program, declared: Set<string>): Set<string> {
  const result = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const node = value as Record<string, unknown>;
    if (node.kind === "Identifier" && typeof node.name === "string" && declared.has(node.name)) {
      result.add(node.name);
    }
    for (const [key, child] of Object.entries(node)) {
      if (key !== "kind") visit(child);
    }
  };
  for (const statement of program.body) {
    if (statement.kind === "FuncDecl" && statement.view) visit(statement.body);
  }
  return result;
}

export function generate(program: AST.Program, options: CodegenOptions = {}): string {
  const moduleMode = options.mode === "module";
  const generator = new Generator(reactiveNames(program, declaredNames(program)), moduleMode);
  const body = generator.emitStatements(program.body, 0);

  if (options.mode === "body") return body;

  if (moduleMode) {
    const parts: string[] = [
      `// Сгенерировано Kuza. Модуль можно импортировать из React, Vue, Svelte или Node.js.`,
    ];
    if (options.includeRuntime !== false) parts.push(RUNTIME_SOURCE, "");
    parts.push(body, "");
    return parts.join("\n");
  }

  const parts: string[] = [];
  if (options.includeRuntime !== false) {
    parts.push(RUNTIME_SOURCE);
    parts.push("");
  }
  parts.push("__kz.__main = async () => {");
  if (body.trim().length > 0) parts.push(body);
  // Экран запускается один раз после всех объявлений — так переменные уже есть.
  if (generator.viewNames.length > 0) {
    parts.push(`${generator.viewNames[generator.viewNames.length - 1]}();`);
  }
  parts.push("};");

  if (options.standalone) {
    parts.push("");
    parts.push("__kz.__main().catch((error) => {");
    parts.push('  console.error("💥 " + (error && error.message ? error.message : error));');
    parts.push('  if (typeof process !== "undefined") process.exitCode = 1;');
    parts.push("});");
  }

  return parts.join("\n") + "\n";
}

class Generator {
  private scopes: Set<string>[] = [new Set()];

  readonly viewNames: string[] = [];

  constructor(
    private readonly reactive: Set<string>,
    /** Экспортировать объявленные функции (режим "module"). */
    private readonly exportFunctions = false,
  ) {}

  // ── области видимости ───────────────────────────────────────────────

  private pushScope(): void {
    this.scopes.push(new Set());
  }

  private popScope(): void {
    this.scopes.pop();
  }

  private declare(name: string): void {
    this.scopes[this.scopes.length - 1]!.add(name);
  }

  private isDeclared(name: string): boolean {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i]!.has(name)) return true;
    }
    return false;
  }

  private indent(level: number): string {
    return INDENT.repeat(level);
  }

  // ── операторы ───────────────────────────────────────────────────────

  emitStatements(body: AST.Statement[], level: number): string {
    return body.map((statement) => this.emitStatement(statement, level)).join("\n");
  }

  private emitBlock(body: AST.Statement[], level: number): string {
    this.pushScope();
    const inner = this.emitStatements(body, level);
    this.popScope();
    return inner;
  }

  private emitStatement(node: AST.Statement, level: number): string {
    const pad = this.indent(level);

    switch (node.kind) {
      case "VarDecl": {
        const value = this.emitExpression(node.value);
        if (this.isDeclared(node.name)) {
          return `${pad}${node.name} = ${value};`;
        }
        this.declare(node.name);
        return `${pad}let ${node.name} = ${value};`;
      }

      case "Assign": {
        const target = this.emitExpression(node.target);
        const expression = `${target} ${node.operator} ${this.emitExpression(node.value)}`;
        if (node.target.kind === "Identifier" && this.reactive.has(node.target.name)) {
          return `${pad}__kz.stateSet(${JSON.stringify(node.target.name)}, ${expression});`;
        }
        return `${pad}${expression};`;
      }

      case "UpdateStmt": {
        const target = this.emitExpression(node.target);
        const expression = `${target}${node.operator}`;
        if (node.target.kind === "Identifier" && this.reactive.has(node.target.name)) {
          return `${pad}__kz.stateSet(${JSON.stringify(node.target.name)}, ${expression});`;
        }
        return `${pad}${expression};`;
      }

      case "ExprStmt": {
        return `${pad}${this.emitExpression(node.expression)};`;
      }

      case "IfStmt": {
        return this.emitIf(node, level, false);
      }

      case "WhileStmt": {
        const inner = this.emitBlock(node.body, level + 1);
        return `${pad}while (${this.emitExpression(node.condition)}) {\n${inner}\n${pad}}`;
      }

      case "ForStmt": {
        this.pushScope();
        const init = node.init ? this.emitInline(node.init) : "";
        const condition = node.condition ? this.emitExpression(node.condition) : "";
        const step = node.step ? this.emitInline(node.step) : "";
        const inner = this.emitBlock(node.body, level + 1);
        this.popScope();
        return `${pad}for (${init}; ${condition}; ${step}) {\n${inner}\n${pad}}`;
      }

      case "ForEachStmt": {
        this.pushScope();
        const iterable = this.emitExpression(node.iterable);
        this.declare(node.name);
        const inner = this.emitBlock(node.body, level + 1);
        this.popScope();
        return `${pad}for (const ${node.name} of ${iterable}) {\n${inner}\n${pad}}`;
      }

      case "FuncDecl": {
        this.declare(node.name);
        this.pushScope();
        for (const param of node.params) this.declare(param.name);
        const inner = this.emitStatements(node.body, level + 1);
        this.popScope();
        const list = node.params
          .map((param) =>
            param.default ? `${param.name} = ${this.emitExpression(param.default)}` : param.name,
          )
          .join(", ");
        const keyword = this.exportFunctions ? "export function" : "function";
        const head = `${pad}${keyword} ${node.name}(${list}) {`;
        const declaration = `${head}\n${inner}\n${pad}}`;
        if (!node.view) return declaration;
        this.viewNames.push(node.name);
        return `${declaration}\n${pad}__kz.__view = ${node.name};`;
      }

      case "ForRangeStmt": {
        this.pushScope();
        this.declare(node.name);
        const from = this.emitExpression(node.from);
        const to = this.emitExpression(node.to);
        const inner = this.emitBlock(node.body, level + 1);
        this.popScope();
        return `${pad}for (let ${node.name} = ${from}; ${node.name} <= ${to}; ${node.name}++) {\n${inner}\n${pad}}`;
      }

      case "DestructureDecl": {
        const value = this.emitExpression(node.value);
        for (const name of node.names) this.declare(name);
        const pattern =
          node.shape === "array" ? `[${node.names.join(", ")}]` : `{ ${node.names.join(", ")} }`;
        return `${pad}const ${pattern} = ${value};`;
      }

      case "UseStmt": {
        if (node.local) {
          return this.emitStatements(node.body ?? [], level);
        }
        this.declare(node.alias);
        if (node.external) {
          return `${pad}const ${node.alias} = await __kz.use(${JSON.stringify(node.module)});`;
        }
        return `${pad}const ${node.alias} = __kz.modules[${JSON.stringify(node.module)}];`;
      }

      case "TableInsertStmt": {
        const values = node.values.map((value) => this.emitExpression(value)).join(", ");
        return `${pad}__kz.tableInsert(${node.table}${values ? ", " + values : ""});`;
      }

      case "TableUpdateStmt": {
        const match = node.where ? this.rowScope(node.where) : "() => true";
        const patch = node.changes
          .map((change) => `${JSON.stringify(change.column)}: ${this.rowScope(change.value)}`)
          .join(", ");
        return `${pad}__kz.update(${node.table}, ${match}, { ${patch} });`;
      }

      case "TableDeleteStmt": {
        const match = node.where ? this.rowScope(node.where) : "() => true";
        return `${pad}__kz.removeRows(${node.table}, ${match});`;
      }

      case "ReturnStmt": {
        return node.value
          ? `${pad}return ${this.emitExpression(node.value)};`
          : `${pad}return;`;
      }

      case "BreakStmt":
        return `${pad}break;`;

      case "ContinueStmt":
        return `${pad}continue;`;

      case "TryStmt": {
        const inner = this.emitBlock(node.body, level + 1);
        let result = `${pad}try {\n${inner}\n${pad}}`;
        if (node.catchBody) {
          this.pushScope();
          if (node.catchParam) this.declare(node.catchParam);
          const catchInner = this.emitStatements(node.catchBody, level + 1);
          this.popScope();
          result += ` catch (${node.catchParam ?? "_error"}) {\n${catchInner}\n${pad}}`;
        }
        return result;
      }

      case "ThrowStmt": {
        return `${pad}throw __kz.toError(${this.emitExpression(node.value)});`;
      }
    }
  }

  private emitIf(node: AST.IfStmt, level: number, inline: boolean): string {
    const pad = this.indent(level);
    const prefix = inline ? "" : pad;
    const condition = this.emitExpression(node.condition);
    const inner = this.emitBlock(node.then, level + 1);
    let result = `${prefix}if (${condition}) {\n${inner}\n${pad}}`;

    if (node.otherwise) {
      if (Array.isArray(node.otherwise)) {
        const elseInner = this.emitBlock(node.otherwise, level + 1);
        result += ` else {\n${elseInner}\n${pad}}`;
      } else {
        result += ` else ${this.emitIf(node.otherwise, level, true)}`;
      }
    }

    return result;
  }

  /** Оператор в одну строку — нужен внутри заголовка for. */
  private emitInline(node: AST.Statement): string {
    switch (node.kind) {
      case "VarDecl": {
        const value = this.emitExpression(node.value);
        if (this.isDeclared(node.name)) return `${node.name} = ${value}`;
        this.declare(node.name);
        return `let ${node.name} = ${value}`;
      }
      case "Assign":
        return `${this.emitExpression(node.target)} ${node.operator} ${this.emitExpression(node.value)}`;
      case "UpdateStmt":
        return `${this.emitExpression(node.target)}${node.operator}`;
      case "ExprStmt":
        return this.emitExpression(node.expression);
      default: {
        const line = node.line;
        throw new KuzaError(
          "Внутри заголовка for можно использовать только простое выражение или присваивание",
          line,
          node.column,
          "codegen",
        );
      }
    }
  }

  // ── выражения ───────────────────────────────────────────────────────

  private emitExpression(node: AST.Expression): string {
    switch (node.kind) {
      case "NumberLit":
        return node.raw;

      case "StringLit":
        return JSON.stringify(node.value);

      case "BoolLit":
        return node.value ? "true" : "false";

      case "NullLit":
        return "null";

      case "TemplateLit":
        return "`" + node.raw + "`";

      case "ArrayLit":
        return `[${node.elements.map((element) => this.emitExpression(element)).join(", ")}]`;

      case "ObjectLit": {
        const props = node.properties
          .map((property) => `${safeKey(property.key)}: ${this.emitExpression(property.value)}`)
          .join(", ");
        return `{ ${props} }`;
      }

      case "Identifier":
        return node.name;

      case "MemberExpr":
        return `${this.wrap(node.object)}.${node.property}`;

      case "IndexExpr":
        return `${this.wrap(node.object)}[${this.emitExpression(node.index)}]`;

      case "CallExpr":
        return `${node.callee}(${node.args.map((arg) => this.emitExpression(arg)).join(", ")})`;

      case "CommandExpr": {
        const command = findCommand(node.name);
        if (!command) {
          throw new KuzaError(
            `Внутренняя ошибка: команда "${node.name}" не найдена в commands.json`,
            node.line,
            node.column,
            "codegen",
          );
        }
        if (node.body) {
          const open = applyCodegen(
            command,
            node.args.map((argument) => this.emitExpression(argument)),
          );
          const inner = this.emitStatements(node.body, 0)
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line) => INDENT + line)
            .join("\n");
          return `${open}\n${inner}\n__kz.uiClose()`;
        }

        const args = node.args.map((arg) => this.emitExpression(arg));
        return applyCodegen(command, args);
      }

      case "BinaryExpr":
        return `(${this.emitExpression(node.left)} ${node.operator} ${this.emitExpression(node.right)})`;

      case "UnaryExpr":
        return node.operator === "-"
          ? `(-${this.wrap(node.argument)})`
          : `(!${this.wrap(node.argument)})`;

      case "InterpolatedString": {
        const parts = node.parts.map((part) =>
          typeof part === "string"
            ? escapeTemplateText(part)
            : "${" + this.emitExpression(part) + "}",
        );
        return "`" + parts.join("") + "`";
      }

      case "LambdaExpr": {
        const params = node.params.join(", ");
        const body =
          node.body.kind === "ObjectLit"
            ? `(${this.emitExpression(node.body)})`
            : this.emitExpression(node.body);
        return `(${params}) => ${body}`;
      }

      case "RangeExpr":
        return `__kz.range(${this.emitExpression(node.from)}, ${this.emitExpression(node.to)})`;

      case "SliceExpr": {
        const object = this.wrap(node.object);
        const from = this.emitExpression(node.from);
        // Срез включительный: items[2..5] берёт элементы 2, 3, 4, 5.
        const to = node.to ? `${this.wrap(node.to)} + 1` : "undefined";
        return `__kz.slice(${object}, ${from}, ${to})`;
      }

      case "MethodCallExpr": {
        const object = this.wrap(node.object);
        const args = node.args.map((arg) => this.emitExpression(arg)).join(", ");
        return `${object}.${node.method}(${args})`;
      }

      case "TableLiteral":
        return `__kz.table([${node.columns.map((column) => JSON.stringify(column)).join(", ")}])`;

      case "SelectQuery": {
        const options: string[] = [`columns: ${JSON.stringify(node.columns)}`];
        if (node.where) options.push(`where: ${this.rowScope(node.where)}`);
        if (node.orderBy) options.push(`order: ${this.rowScope(node.orderBy)}`);
        if (node.descending) options.push("desc: true");
        if (node.limit) options.push(`limit: ${this.emitExpression(node.limit)}`);
        return `__kz.select(${this.emitExpression(node.source)}, { ${options.join(", ")} })`;
      }
    }
  }

  /**
   * Имена, которые в условии таблицы читаются из строки:
   * `where age >= 18` → age берётся из __r, а внешние переменные — как есть.
   */
  private freeIdentifiers(node: AST.Expression, scope: Set<string> = new Set()): Set<string> {
    const found = new Set<string>();

    const walk = (current: AST.Expression, bound: Set<string>): void => {
      switch (current.kind) {
        case "Identifier":
          if (!bound.has(current.name)) found.add(current.name);
          return;
        case "NumberLit":
        case "StringLit":
        case "BoolLit":
        case "NullLit":
        case "TemplateLit":
        case "TableLiteral":
          return;
        case "ArrayLit":
          for (const element of current.elements) walk(element, bound);
          return;
        case "ObjectLit":
          for (const property of current.properties) walk(property.value, bound);
          return;
        case "MemberExpr":
          walk(current.object, bound);
          return;
        case "IndexExpr":
          walk(current.object, bound);
          walk(current.index, bound);
          return;
        case "CallExpr":
          for (const arg of current.args) walk(arg, bound);
          return;
        case "CommandExpr":
          for (const arg of current.args) walk(arg, bound);
          return;
        case "BinaryExpr":
          walk(current.left, bound);
          walk(current.right, bound);
          return;
        case "UnaryExpr":
          walk(current.argument, bound);
          return;
        case "InterpolatedString":
          for (const part of current.parts) if (typeof part !== "string") walk(part, bound);
          return;
        case "LambdaExpr": {
          const inner = new Set(bound);
          for (const param of current.params) inner.add(param);
          walk(current.body, inner);
          return;
        }
        case "RangeExpr":
          walk(current.from, bound);
          walk(current.to, bound);
          return;
        case "SliceExpr":
          walk(current.object, bound);
          walk(current.from, bound);
          if (current.to) walk(current.to, bound);
          return;
        case "MethodCallExpr":
          walk(current.object, bound);
          for (const arg of current.args) walk(arg, bound);
          return;
        case "SelectQuery":
          walk(current.source, bound);
          if (current.where) walk(current.where, bound);
          if (current.orderBy) walk(current.orderBy, bound);
          if (current.limit) walk(current.limit, bound);
          return;
      }
    };

    walk(node, scope);
    return found;
  }

  /** Условие/сортировка как функция от строки: (__r) => { const age = __r.age; return ... } */
  private rowScope(node: AST.Expression): string {
    const names = [...this.freeIdentifiers(node)].filter(
      (name) => !this.isDeclared(name) && isSafeIdentifier(name),
    );
    const declarations = names.map((name) => `const ${name} = __r.${name};`).join(" ");
    const head = declarations ? declarations + " " : "";
    return `(__r) => { ${head}return (${this.emitExpression(node)}); }`;
  }

  /** Обернуть выражение скобками, если оно составное. */
  private wrap(node: AST.Expression): string {
    const needsParens =
      node.kind === "BinaryExpr" ||
      node.kind === "UnaryExpr" ||
      node.kind === "ObjectLit" ||
      node.kind === "TemplateLit";
    const text = this.emitExpression(node);
    return needsParens ? `(${text})` : text;
  }
}

/** Экранировать текст для вставки в шаблонную строку JS. */
function escapeTemplateText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function safeKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

/** Можно ли имя использовать как переменную JavaScript (включая кириллицу). */
function isSafeIdentifier(name: string): boolean {
  return /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(name);
}
