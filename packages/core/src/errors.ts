/**
 * Ошибки языка Kuza.
 *
 * Главное правило: любая ошибка знает номер строки и столбца,
 * чтобы человек (и редактор) могли показать её точно на месте.
 */

export interface Diagnostic {
  /** Понятное человеку сообщение. */
  message: string;
  /** Строка, начиная с 1. */
  line: number;
  /** Столбец, начиная с 1. */
  column: number;
  /** Подсказка «что делать», если есть. */
  hint?: string;
  /** Тип: ошибка компиляции или выполнения. */
  source: "lexer" | "parser" | "codegen" | "runtime";
}

export class KuzaError extends Error {
  line: number;
  column: number;
  source: Diagnostic["source"];
  hint?: string;

  constructor(
    message: string,
    line: number,
    column: number,
    source: Diagnostic["source"] = "parser",
    hint?: string,
  ) {
    super(message);
    this.name = "KuzaError";
    this.line = line;
    this.column = column;
    this.source = source;
    this.hint = hint;
  }

  toDiagnostic(): Diagnostic {
    return {
      message: this.message,
      line: this.line,
      column: this.column,
      source: this.source,
      hint: this.hint,
    };
  }
}

export function toDiagnostic(error: unknown): Diagnostic {
  if (error instanceof KuzaError) return error.toDiagnostic();
  const message = error instanceof Error ? error.message : String(error);
  return { message, line: 1, column: 1, source: "runtime" };
}

/**
 * Красивый текст ошибки с фрагментом кода и указателем:
 *
 *   Ошибка (строка 3, столбец 7): Неизвестная команда "lenn"
 *     3 | :n = lenn >> items;
 *       |       ^
 *   Подсказка: возможно, вы имели в виду "len".
 */
export function formatDiagnostic(diagnostic: Diagnostic, source?: string): string {
  const head = `Ошибка (строка ${diagnostic.line}, столбец ${diagnostic.column}): ${diagnostic.message}`;
  let body = "";
  if (source) {
    const lines = source.split(/\r?\n/);
    const lineText = lines[diagnostic.line - 1];
    if (lineText !== undefined) {
      const gutter = String(diagnostic.line);
      body = `\n  ${gutter} | ${lineText}\n  ${" ".repeat(gutter.length)} | ${" ".repeat(
        Math.max(0, diagnostic.column - 1),
      )}^`;
    }
  }
  const hint = diagnostic.hint ? `\nПодсказка: ${diagnostic.hint}` : "";

  // Готовая строка-исправление: подменяем опечатку на подсказанное имя.
  let fix = "";
  const suggestion = /имели в виду "([^"]+)"/.exec(diagnostic.hint ?? "");
  if (suggestion && source) {
    const lineText = source.split(/\r?\n/)[diagnostic.line - 1];
    if (lineText !== undefined) {
      const before = lineText.slice(0, diagnostic.column - 1);
      const after = lineText.slice(diagnostic.column - 1).replace(/^[\p{L}\p{N}_$]+/u, suggestion[1]!);
      fix = `\nИсправление:  ${before}${after}`;
    }
  }

  return head + body + hint + fix;
}
