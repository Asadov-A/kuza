/**
 * РЕЕСТР КОМАНД.
 *
 * Единственный источник правды — commands.json. Скрипт generate.mjs
 * превращает его в commands.generated.ts, а этот файл лишь раскладывает
 * данные по удобным словарям: поиск по имени и алиасу, проверка числа
 * аргументов, подсказка «возможно, вы имели в виду...».
 */

import { COMMANDS_DATA } from "./commands.generated.js";
import { KuzaError } from "./errors.js";

export interface CategoryDef {
  id: string;
  title: string;
  titleEn: string;
}

export interface CommandDef {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  args: "none" | "single" | "list" | "block";
  min?: number;
  max?: number;
  params: string[];
  description: string;
  example: string;
  codegen: string;
  returns?: string;
}

export interface KeywordDef {
  name: string;
  description: string;
  example: string;
}

export interface StructureDef {
  name: string;
  syntax: string;
  description: string;
  example: string;
  snippet: string;
}

export const CATEGORIES: CategoryDef[] = COMMANDS_DATA.categories;
export const KEYWORDS: KeywordDef[] = COMMANDS_DATA.keywords;
export const STRUCTURES: StructureDef[] = COMMANDS_DATA.structures;
export const COMMANDS: CommandDef[] = COMMANDS_DATA.commands;

const BY_NAME = new Map<string, CommandDef>();
for (const command of COMMANDS) {
  BY_NAME.set(command.name, command);
  for (const alias of command.aliases) BY_NAME.set(alias, command);
}

/** Найти команду по имени или алиасу. */
export function findCommand(name: string): CommandDef | undefined {
  return BY_NAME.get(name);
}

/**
 * Зарегистрировать команду из плагина. Используется в kuza.config.js:
 *   import { defineCommand } from "kuza-core";
 *   defineCommand({ name: "hello", args: "single", ... });
 */
export function defineCommand(command: CommandDef): CommandDef {
  for (const name of [command.name, ...command.aliases]) {
    if (BY_NAME.has(name)) {
      throw new Error(`Команда или алиас "${name}" уже занят`);
    }
  }
  COMMANDS.push(command);
  BY_NAME.set(command.name, command);
  for (const alias of command.aliases) BY_NAME.set(alias, command);
  return command;
}

export function minArgs(command: CommandDef): number {
  if (typeof command.min === "number") return command.min;
  return command.args === "none" ? 0 : command.params.length;
}

export function maxArgs(command: CommandDef): number {
  if (typeof command.max === "number") return command.max;
  return command.args === "none" ? 0 : command.params.length;
}

/** Все имена и алиасы — для подсветки и автодополнения. */
export function allCommandNames(): string[] {
  const names = new Set<string>();
  for (const command of COMMANDS) {
    names.add(command.name);
    for (const alias of command.aliases) names.add(alias);
  }
  return [...names];
}

/** Расстояние Левенштейна — чтобы подсказывать похожие имена. */
function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[rows - 1]![cols - 1]!;
}

export function suggestCommand(name: string): string | undefined {
  let best: { name: string; score: number } | undefined;
  for (const candidate of allCommandNames()) {
    if (candidate === "log" && name !== "log") continue;
    const score = distance(name.toLowerCase(), candidate.toLowerCase());
    if (!best || score < best.score) best = { name: candidate, score };
  }
  if (!best) return undefined;
  const limit = Math.max(2, Math.floor(name.length / 2));
  return best.score <= limit ? best.name : undefined;
}

/** Найти команду или выдать понятную ошибку с подсказкой. */
export function resolveCommand(
  name: string,
  line: number,
  column: number,
): CommandDef {
  const command = findCommand(name);
  if (command) return command;
  const suggestion = suggestCommand(name);
  throw new KuzaError(
    `Неизвестная команда "${name}"`,
    line,
    column,
    "parser",
    suggestion
      ? `Возможно, вы имели в виду "${suggestion}". Список команд: docs/commands.md`
      : "Список всех команд: docs/commands.md",
  );
}

/** Проверить, что у команды правильное число аргументов. */
export function validateArity(
  command: CommandDef,
  count: number,
  line: number,
  column: number,
): void {
  const low = minArgs(command);
  const high = maxArgs(command);
  if (count >= low && count <= high) return;

  const spell = (n: number) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} аргумент`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} аргумента`;
    return `${n} аргументов`;
  };
  const expected =
    low === high
      ? `ожидается ${spell(low)}`
      : high === 0
        ? "аргументы не нужны"
        : `ожидается от ${low} до ${high} аргументов`;
  throw new KuzaError(
    `Команда "${command.name}" получила ${spell(count)}, а ${expected}`,
    line,
    column,
    "parser",
    `Пример: ${command.example}`,
  );
}

/** Разложить шаблон codegen в готовый JavaScript. */
export function applyCodegen(command: CommandDef, args: string[]): string {
  let result = command.codegen.replace(/\{rest\}/g, args.join(", "));
  for (let i = 0; i < args.length; i++) {
    result = result.split(`{${i}}`).join(args[i]!);
  }
  // Пустой {rest} не должен оставлять "foo(, )" или "foo(x, )".
  return result.replace(/,\s*\)/g, ")").replace(/\(\s*,/g, "(");
}
