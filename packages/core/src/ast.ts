/**
 * AST — Abstract Syntax Tree, «дерево программы».
 *
 * Лексер режет текст на токены, парсер собирает из них дерево:
 * программа → операторы → выражения. Генератор JS потом просто
 * обходит это дерево. Никаких регулярных замен по строкам.
 */

export interface Pos {
  line: number;
  column: number;
}

export interface NodeBase extends Pos {}

/** Программа: список операторов. */
export interface Program extends NodeBase {
  kind: "Program";
  body: Statement[];
}

export type Statement =
  | VarDecl
  | Assign
  | UpdateStmt
  | ExprStmt
  | IfStmt
  | WhileStmt
  | ForStmt
  | ForEachStmt
  | FuncDecl
  | ReturnStmt
  | BreakStmt
  | ContinueStmt
  | TryStmt
  | ThrowStmt
  | DestructureDecl
  | ForRangeStmt
  | UseStmt
  | TableUpdateStmt
  | TableDeleteStmt
  | TableInsertStmt;

export type Expression =
  | NumberLit
  | StringLit
  | BoolLit
  | NullLit
  | TemplateLit
  | ArrayLit
  | ObjectLit
  | Identifier
  | MemberExpr
  | IndexExpr
  | CallExpr
  | CommandExpr
  | BinaryExpr
  | UnaryExpr
  | InterpolatedString
  | LambdaExpr
  | RangeExpr
  | SliceExpr
  | MethodCallExpr
  | TableLiteral
  | SelectQuery;

export interface VarDecl extends NodeBase {
  kind: "VarDecl";
  name: string;
  value: Expression;
}

export interface Assign extends NodeBase {
  kind: "Assign";
  target: Identifier | MemberExpr | IndexExpr;
  operator: "=" | "+=" | "-=" | "*=" | "/=";
  value: Expression;
}

export interface UpdateStmt extends NodeBase {
  kind: "UpdateStmt";
  target: Identifier | MemberExpr | IndexExpr;
  operator: "++" | "--";
}

export interface ExprStmt extends NodeBase {
  kind: "ExprStmt";
  expression: Expression;
}

export interface IfStmt extends NodeBase {
  kind: "IfStmt";
  condition: Expression;
  then: Statement[];
  otherwise?: Statement[] | IfStmt;
}

export interface WhileStmt extends NodeBase {
  kind: "WhileStmt";
  condition: Expression;
  body: Statement[];
}

export interface ForStmt extends NodeBase {
  kind: "ForStmt";
  init: Statement | null;
  condition: Expression | null;
  step: Statement | null;
  body: Statement[];
}

export interface ForEachStmt extends NodeBase {
  kind: "ForEachStmt";
  name: string;
  iterable: Expression;
  body: Statement[];
}

/** Параметр функции: имя и необязательное значение по умолчанию. */
export interface Param {
  name: string;
  default?: Expression;
}

export interface FuncDecl extends NodeBase {
  kind: "FuncDecl";
  name: string;
  params: Param[];
  body: Statement[];
  /** `view Name<> >> [...]`: функция-экран; её вызов обновляет страницу. */
  view?: boolean;
}

/** :[a, b] = pair;  или  :{name, age} = user; */
export interface DestructureDecl extends NodeBase {
  kind: "DestructureDecl";
  shape: "array" | "object";
  names: string[];
  value: Expression;
}

/** for<:i = 1..10> >> [ ... ] — цикл по диапазону. */
export interface ForRangeStmt extends NodeBase {
  kind: "ForRangeStmt";
  name: string;
  from: Expression;
  to: Expression;
  body: Statement[];
}

/** use math;  /  use math as m;  /  use "./helpers.kuza";  /  use "lodash"; */
export interface UseStmt extends NodeBase {
  kind: "UseStmt";
  /** Имя встроенного модуля, путь к файлу или имя пакета из npm. */
  module: string;
  /** Имя, под которым модуль доступен в программе. */
  alias: string;
  /** true — это свой файл, его операторы уже разобраны в body. */
  local: boolean;
  /** true — пакет из node_modules (или адрес, который понимает `import`). */
  external?: boolean;
  body?: Statement[];
}

export interface ReturnStmt extends NodeBase {
  kind: "ReturnStmt";
  value: Expression | null;
}

export interface BreakStmt extends NodeBase {
  kind: "BreakStmt";
}

export interface ContinueStmt extends NodeBase {
  kind: "ContinueStmt";
}

export interface TryStmt extends NodeBase {
  kind: "TryStmt";
  body: Statement[];
  catchParam: string | null;
  catchBody: Statement[] | null;
}

export interface ThrowStmt extends NodeBase {
  kind: "ThrowStmt";
  value: Expression;
}

export interface NumberLit extends NodeBase {
  kind: "NumberLit";
  value: number;
  raw: string;
}

export interface StringLit extends NodeBase {
  kind: "StringLit";
  value: string;
}

export interface BoolLit extends NodeBase {
  kind: "BoolLit";
  value: boolean;
}

export interface NullLit extends NodeBase {
  kind: "NullLit";
  value: null;
}

/** Строка в обратных кавычках: содержимое передаётся в JS как есть. */
export interface TemplateLit extends NodeBase {
  kind: "TemplateLit";
  raw: string;
}

export interface ArrayLit extends NodeBase {
  kind: "ArrayLit";
  elements: Expression[];
}

export interface ObjectLit extends NodeBase {
  kind: "ObjectLit";
  properties: Array<{ key: string; value: Expression }>;
}

export interface Identifier extends NodeBase {
  kind: "Identifier";
  name: string;
}

export interface MemberExpr extends NodeBase {
  kind: "MemberExpr";
  object: Expression;
  property: string;
}

export interface IndexExpr extends NodeBase {
  kind: "IndexExpr";
  object: Expression;
  index: Expression;
}

/** Обычный вызов: sum<1, 2> */
export interface CallExpr extends NodeBase {
  kind: "CallExpr";
  callee: string;
  args: Expression[];
}

/** Команда языка: log >> x;  или  :n = len >> items; */
export interface CommandExpr extends NodeBase {
  kind: "CommandExpr";
  /** Имя, как его написал пользователь (может быть алиасом). */
  name: string;
  /** id команды из commands.json. */
  commandId: string;
  args: Expression[];
  /** Вложенный блок: `body >> [ ... ]`, `card >> [ ... ]`. */
  body?: Statement[];
}

export interface BinaryExpr extends NodeBase {
  kind: "BinaryExpr";
  /** Уже в виде JavaScript-оператора: && || == != < > <= >= + - * / % ** */
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpr extends NodeBase {
  kind: "UnaryExpr";
  operator: "-" | "not";
  argument: Expression;
}

/** Строка с подстановками: "Привет, {name}!" */
export interface InterpolatedString extends NodeBase {
  kind: "InterpolatedString";
  parts: Array<string | Expression>;
}

/** Короткая функция: (x) -> x * 2 */
export interface LambdaExpr extends NodeBase {
  kind: "LambdaExpr";
  params: string[];
  body: Expression;
}

/** Диапазон: 1..10 (даёт массив числел) */
export interface RangeExpr extends NodeBase {
  kind: "RangeExpr";
  from: Expression;
  to: Expression;
}

/** Срез: items[2..5] */
export interface SliceExpr extends NodeBase {
  kind: "SliceExpr";
  object: Expression;
  from: Expression;
  to: Expression | null;
}

/** Вызов функции модуля: math.sqrt<16> */
export interface MethodCallExpr extends NodeBase {
  kind: "MethodCallExpr";
  object: Expression;
  method: string;
  args: Expression[];
}

/** Создание таблицы: table<id, name, age> */
export interface TableLiteral extends NodeBase {
  kind: "TableLiteral";
  columns: string[];
}

/** Одна колонка в select: name или name as who */
export interface SelectColumn {
  name: string;
  alias?: string;
}

/** Запрос к таблице: select name from users where age >= 18 order by age desc limit 10 */
export interface SelectQuery extends NodeBase {
  kind: "SelectQuery";
  columns: SelectColumn[] | "*";
  source: Expression;
  where?: Expression;
  orderBy?: Expression;
  descending: boolean;
  limit?: Expression;
}

/** update users set age = 18 where id = 1; */
export interface TableUpdateStmt extends NodeBase {
  kind: "TableUpdateStmt";
  table: string;
  changes: Array<{ column: string; value: Expression }>;
  where: Expression | null;
}

/** delete from users where age < 18; */
export interface TableDeleteStmt extends NodeBase {
  kind: "TableDeleteStmt";
  table: string;
  where: Expression | null;
}

/** insert into users values <1, "Аня", 30>; */
export interface TableInsertStmt extends NodeBase {
  kind: "TableInsertStmt";
  table: string;
  /** Значения по колонкам таблицы или один объект { колонка: значение }. */
  values: Expression[];
}

