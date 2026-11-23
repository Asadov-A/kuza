/**
 * ПУБЛИЧНЫЙ API пакета kuza-core.
 *
 *   import { compile, run } from "kuza-core";
 *
 *   const result = compile("log >> \"привет\";");
 *   const execution = await run("log >> 2 + 2;");
 */

import { generate, type CodegenOptions } from "./codegen.js";
import { formatDiagnostic, KuzaError, toDiagnostic, type Diagnostic } from "./errors.js";
import { parse, type ParseOptions } from "./parser.js";
import { tokenize } from "./lexer.js";

export { NAME, NAME_LOWER, EXT, FILE_EXT, VERSION, TAGLINE, COLORS } from "./config.js";
export { tokenize } from "./lexer.js";
export { parse } from "./parser.js";
export { generate } from "./codegen.js";
export { formatDiagnostic, KuzaError, toDiagnostic };
export type { Diagnostic };
export {
  COMMANDS,
  CATEGORIES,
  KEYWORDS,
  STRUCTURES,
  allCommandNames,
  defineCommand,
  findCommand,
} from "./builtins.js";
export type { CommandDef, CategoryDef, KeywordDef, StructureDef } from "./builtins.js";

export interface CompileOptions extends CodegenOptions {
  /** Имя файла — только для сообщений об ошибках. */
  filename?: string;
  /** Чтение своего файла для use "./helpers.kuza". */
  resolveModule?: ParseOptions["resolveModule"];
}

export interface CompileResult {
  ok: boolean;
  /** Готовый JavaScript (пустая строка, если есть ошибки). */
  code: string;
  errors: Diagnostic[];
}

/**
 * Скомпилировать программу на Kuza в JavaScript.
 * Никогда не бросает исключение: ошибки лежат в result.errors.
 */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  try {
    const program = parse(source, {
      filename: options.filename,
      resolveModule: options.resolveModule,
    });
    const code = generate(program, options);
    return { ok: true, code, errors: [] };
  } catch (error) {
    return { ok: false, code: "", errors: [toDiagnostic(error)] };
  }
}

/** То же, но при ошибке бросает KuzaError — удобно в тестах и CLI. */
export function compileOrThrow(source: string, options: CompileOptions = {}): string {
  const result = compile(source, options);
  if (!result.ok) {
    const diagnostic = result.errors[0]!;
    throw new KuzaError(
      diagnostic.message,
      diagnostic.line,
      diagnostic.column,
      diagnostic.source,
      diagnostic.hint,
    );
  }
  return result.code;
}

export interface LogEntry {
  type: "log" | "warn" | "error" | "info";
  message: string;
}

export interface RunResult {
  ok: boolean;
  output: LogEntry[];
  error?: Diagnostic;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Выполнить программу и вернуть всё, что она вывела в консоль.
 * Работает и в Node.js, и в браузере.
 */
export async function run(source: string, options: CompileOptions = {}): Promise<RunResult> {
  const compiled = compile(source, { ...options, includeRuntime: true, mode: "runtime" });
  if (!compiled.ok) {
    return { ok: false, output: [], error: compiled.errors[0] };
  }

  const output: LogEntry[] = [];
  const push = (type: LogEntry["type"]) => (...args: unknown[]) => {
    output.push({ type, message: args.map(formatValue).join(" ") });
  };
  const fakeConsole = {
    log: push("log"),
    info: push("info"),
    warn: push("warn"),
    error: push("error"),
    debug: push("log"),
    table: push("log"),
    clear: () => {
      output.length = 0;
    },
  };

  // new Function не умеет import(), поэтому даём рантайму свою функцию импорта.
  const importRuntime = globalThis as unknown as {
    __kzImport?: (specifier: string) => Promise<unknown>;
  };
  const previousImport = importRuntime.__kzImport;
  importRuntime.__kzImport = (specifier: string) => import(specifier);

  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function("console", `${compiled.code}\n;return __kz.__main();`);
    await factory(fakeConsole);
    return { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.push({ type: "error", message });
    return {
      ok: false,
      output,
      error: { message, line: 0, column: 0, source: "runtime" },
    };
  } finally {
    importRuntime.__kzImport = previousImport;
  }
}
