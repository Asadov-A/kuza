/**
 * ЛЕКСЕР.
 *
 * Лексер — это «разрезатель»: он берёт текст программы и выдаёт список
 * токенов (слов, чисел, строк, символов). Парсер потом собирает из них дерево.
 *
 * Мы храним у каждого токена строку, столбец и флаг «перед ним был пробел»:
 * флаг нужен, чтобы отличать вызов f<x> от сравнения a < b.
 */

import { KuzaError } from "./errors.js";

export type TokenType =
  | "number"
  | "string"
  | "template"
  | "ident"
  | "punct"
  | "newline"
  | "eof";

export interface Token {
  type: TokenType;
  value: string;
  /** Строка, с 1. */
  line: number;
  /** Столбец, с 1. */
  column: number;
  /** true, если между этим токеном и предыдущим были пробелы/табуляция. */
  spaceBefore: boolean;
}

const MULTI_CHAR_PUNCT = [
  ">>",
  "|>",
  "->",
  "..",
  "==",
  "!=",
  "<=",
  ">=",
  "+=",
  "-=",
  "*=",
  "/=",
  "**",
  "++",
  "--",
  "&&",
  "||",
];

const SINGLE_CHAR_PUNCT = new Set([
  ":",
  "=",
  "<",
  ">",
  "[",
  "]",
  "(",
  ")",
  "{",
  "}",
  ",",
  ";",
  ".",
  "?",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
  "|",
]);

const IDENT_START = /[\p{L}_$]/u;
const IDENT_PART = /[\p{L}\p{N}_$]/u;

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let column = 1;
  let spaceBefore = false;

  const push = (type: TokenType, value: string, tokenLine: number, tokenColumn: number) => {
    tokens.push({ type, value, line: tokenLine, column: tokenColumn, spaceBefore });
    spaceBefore = false;
  };

  const advance = (count = 1) => {
    for (let k = 0; k < count; k++) {
      if (source[i] === "\n") {
        line++;
        column = 1;
      } else {
        column++;
      }
      i++;
    }
  };

  while (i < source.length) {
    const ch = source[i]!;

    // ── перевод строки ────────────────────────────────────────────────
    if (ch === "\n") {
      push("newline", "\n", line, column);
      advance();
      spaceBefore = false;
      continue;
    }

    // ── пробелы ───────────────────────────────────────────────────────
    if (ch === " " || ch === "\t" || ch === "\r") {
      advance();
      spaceBefore = true;
      continue;
    }

    // ── комментарии: ## и // ──────────────────────────────────────────
    if ((ch === "#" && source[i + 1] === "#") || (ch === "/" && source[i + 1] === "/")) {
      while (i < source.length && source[i] !== "\n") advance();
      spaceBefore = true;
      continue;
    }

    // ── числа ─────────────────────────────────────────────────────────
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(source[i + 1] ?? ""))) {
      const start = i;
      const startLine = line;
      const startColumn = column;
      if (ch === "0" && /[xX]/.test(source[i + 1] ?? "")) {
        advance(2);
        while (i < source.length && /[0-9a-fA-F_]/.test(source[i]!)) advance();
      } else {
        while (i < source.length && /[0-9_]/.test(source[i]!)) advance();
        if (source[i] === "." && /[0-9]/.test(source[i + 1] ?? "")) {
          advance();
          while (i < source.length && /[0-9_]/.test(source[i]!)) advance();
        }
        if (/[eE]/.test(source[i] ?? "") && /[0-9+-]/.test(source[i + 1] ?? "")) {
          advance();
          if (/[+-]/.test(source[i] ?? "")) advance();
          while (i < source.length && /[0-9]/.test(source[i]!)) advance();
        }
      }
      push("number", source.slice(start, i), startLine, startColumn);
      continue;
    }

    // ── строки "..." и '...' ──────────────────────────────────────────
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startLine = line;
      const startColumn = column;
      advance();
      let value = "";
      let closed = false;
      while (i < source.length) {
        const c = source[i]!;
        if (c === "\n") break;
        if (c === "\\") {
          const next = source[i + 1];
          switch (next) {
            case "n": value += "\n"; break;
            case "t": value += "\t"; break;
            case "r": value += "\r"; break;
            case "\\": value += "\\"; break;
            case '"': value += '"'; break;
            case "'": value += "'"; break;
            case "`": value += "`"; break;
            case "0": value += "\0"; break;
            default: value += next ?? "";
          }
          advance(2);
          continue;
        }
        if (c === quote) {
          advance();
          closed = true;
          break;
        }
        value += c;
        advance();
      }
      if (!closed) {
        throw new KuzaError(
          "Незакрытая строка",
          startLine,
          startColumn,
          "lexer",
          `Добавь закрывающую кавычку ${quote} в конце строки.`,
        );
      }
      tokens.push({
        type: "string",
        value,
        line: startLine,
        column: startColumn,
        spaceBefore,
      });
      spaceBefore = false;
      continue;
    }

    // ── шаблонные строки `...` ────────────────────────────────────────
    if (ch === "`") {
      const startLine = line;
      const startColumn = column;
      advance();
      let raw = "";
      let closed = false;
      while (i < source.length) {
        const c = source[i]!;
        if (c === "\\") {
          raw += c + (source[i + 1] ?? "");
          advance(2);
          continue;
        }
        if (c === "`") {
          advance();
          closed = true;
          break;
        }
        raw += c;
        advance();
      }
      if (!closed) {
        throw new KuzaError(
          "Незакрытая шаблонная строка",
          startLine,
          startColumn,
          "lexer",
          "Добавь обратную кавычку ` в конце.",
        );
      }
      tokens.push({ type: "template", value: raw, line: startLine, column: startColumn, spaceBefore });
      spaceBefore = false;
      continue;
    }

    // ── идентификаторы и ключевые слова ───────────────────────────────
    if (IDENT_START.test(ch)) {
      const start = i;
      const startLine = line;
      const startColumn = column;
      while (i < source.length && IDENT_PART.test(source[i]!)) advance();
      push("ident", source.slice(start, i), startLine, startColumn);
      continue;
    }

    // ── операторы из нескольких символов ──────────────────────────────
    const two = source.slice(i, i + 2);
    if (MULTI_CHAR_PUNCT.includes(two)) {
      push("punct", two, line, column);
      advance(2);
      continue;
    }

    // ── одиночные символы ─────────────────────────────────────────────
    if (SINGLE_CHAR_PUNCT.has(ch)) {
      push("punct", ch, line, column);
      advance();
      continue;
    }

    throw new KuzaError(
      `Неизвестный символ "${ch}"`,
      line,
      column,
      "lexer",
      "Проверь, что здесь нет опечатки или невидимого символа.",
    );
  }

  tokens.push({ type: "eof", value: "", line, column, spaceBefore: true });
  return tokens;
}
