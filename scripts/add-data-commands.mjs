/**
 * Идемпотентно добавляет команды для работы с таблицами (массив объектов)
 * и массивами в packages/core/commands.json.
 *
 *   node scripts/add-data-commands.mjs && npm run generate && npm run build
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "packages/core/commands.json");
const data = JSON.parse(readFileSync(path, "utf8"));

/** Общая функция приведения значения к сравнимому виду — как в SQL ORDER BY. */
const CMP = "(a, b) => (a === b ? 0 : a > b ? 1 : -1)";

const commands = [
  // ── массивы ────────────────────────────────────────────────
  {
    id: "last",
    name: "last",
    aliases: ["tail"],
    category: "arrays",
    args: "single",
    params: ["array"],
    description: "Последний элемент массива",
    example: ":x = last >> [1, 2, 3];",
    codegen: "({0} || [])[{0}.length - 1]",
    returns: "any",
  },
  {
    id: "take",
    name: "take",
    aliases: ["first"],
    category: "arrays",
    args: "list",
    min: 2,
    max: 2,
    params: ["array", "n"],
    description: "Первые n элементов (копия)",
    example: ":top3 = take >> <items, 3>;",
    codegen: "({0} || []).slice(0, {1})",
    returns: "array",
  },
  {
    id: "drop",
    name: "drop",
    aliases: ["skip"],
    category: "arrays",
    args: "list",
    min: 2,
    max: 2,
    params: ["array", "n"],
    description: "Массив без первых n элементов (копия)",
    example: ":rest = drop >> <items, 2>;",
    codegen: "({0} || []).slice({1})",
    returns: "array",
  },
  {
    id: "chunk",
    name: "chunk",
    aliases: ["chunks"],
    category: "arrays",
    args: "list",
    min: 2,
    max: 2,
    params: ["array", "size"],
    description: "Разбить массив на группы по size элементов",
    example: ":pages = chunk >> <items, 10>;",
    codegen:
      "({0} || []).reduce((acc, item, i) => (i % {1} === 0 ? acc.push([item]) : acc[acc.length - 1].push(item), acc), [])",
    returns: "array",
  },
  {
    id: "sumOf",
    name: "sumOf",
    aliases: ["totalOf"],
    category: "arrays",
    args: "list",
    min: 2,
    max: 2,
    params: ["array", "getter"],
    description: "Сумма значений, которые возвращает функция",
    example: ":total = sumOf >> <items, (x) -> x.price>;",
    codegen: "({0} || []).reduce((total, item) => total + Number(({1})(item) || 0), 0)",
    returns: "number",
  },

  // ── таблицы: массив объектов ───────────────────────────────
  {
    id: "whereRows",
    name: "whereRows",
    aliases: ["filterRows"],
    category: "tables",
    args: "list",
    min: 2,
    max: 2,
    params: ["table", "check"],
    description: "Строки таблицы, подходящие под условие",
    example: ':adults = whereRows >> <users, (row) -> row.age >= 18>;',
    codegen: "({0} || []).filter({1})",
    returns: "array",
  },
  {
    id: "columns",
    name: "columns",
    aliases: ["selectColumns", "pickColumns"],
    category: "tables",
    args: "list",
    min: 2,
    max: 2,
    params: ["table", "keys"],
    description: "Оставить в каждой строке только указанные колонки",
    example: ':brief = pick >> <users, ["id", "name"]>;',
    codegen:
      "({0} || []).map((row) => Object.fromEntries(({1} || []).map((key) => [key, row[key]])))",
    returns: "array",
  },
  {
    id: "orderBy",
    name: "orderBy",
    aliases: ["sortRows"],
    category: "tables",
    args: "list",
    min: 2,
    max: 3,
    params: ["table", "key", "direction"],
    description: "Отсортировать строки по колонке (direction: \"asc\" или \"desc\")",
    example: ':sorted = orderBy >> <users, "age", "desc">;',
    codegen: `[...({0} || [])].sort((a, b) => (${CMP})(a[{1}], b[{1}]) * ({2} === "desc" ? -1 : 1))`,
    returns: "array",
  },
  {
    id: "groupBy",
    name: "groupBy",
    aliases: ["groupRows"],
    category: "tables",
    args: "list",
    min: 2,
    max: 2,
    params: ["table", "key"],
    description: "Сгруппировать строки по значению колонки",
    example: ':byCity = groupBy >> <users, "city">;',
    codegen:
      "({0} || []).reduce((groups, row) => (groups[row[{1}]] = groups[row[{1}]] || [], groups[row[{1}]].push(row), groups), {})",
    returns: "object",
  },
  {
    id: "pluck",
    name: "pluck",
    aliases: ["columnOf"],
    category: "tables",
    args: "list",
    min: 2,
    max: 2,
    params: ["table", "key"],
    description: "Массив значений одной колонки",
    example: ':names = pluck >> <users, "name">;',
    codegen: "({0} || []).map((row) => row[{1}])",
    returns: "array",
  },
  {
    id: "sumBy",
    name: "sumBy",
    aliases: ["totalBy"],
    category: "tables",
    args: "list",
    min: 2,
    max: 2,
    params: ["table", "key"],
    description: "Сумма числовой колонки",
    example: ':revenue = sumBy >> <orders, "amount">;',
    codegen: "({0} || []).reduce((total, row) => total + Number(row[{1}] || 0), 0)",
    returns: "number",
  },
  {
    id: "avgBy",
    name: "avgBy",
    aliases: ["averageBy"],
    category: "tables",
    args: "list",
    min: 2,
    max: 2,
    params: ["table", "key"],
    description: "Среднее значение числовой колонки",
    example: ':average = avgBy >> <orders, "amount">;',
    codegen:
      "({0} || []).length ? ({0}).reduce((total, row) => total + Number(row[{1}] || 0), 0) / ({0}).length : 0",
    returns: "number",
  },
  {
    id: "countBy",
    name: "countBy",
    aliases: ["tally"],
    category: "tables",
    args: "list",
    min: 2,
    max: 2,
    params: ["table", "key"],
    description: "Сколько раз встречается каждое значение колонки",
    example: ':stats = countBy >> <users, "city">;',
    codegen:
      "({0} || []).reduce((counts, row) => (counts[row[{1}]] = (counts[row[{1}]] || 0) + 1, counts), {})",
    returns: "object",
  },
  {
    id: "indexBy",
    name: "indexBy",
    aliases: ["keyedBy"],
    category: "tables",
    args: "list",
    min: 2,
    max: 2,
    params: ["table", "key"],
    description: "Сделать объект вида {значение колонки: строка} для быстрого поиска",
    example: ':byId = indexBy >> <users, "id">;',
    codegen:
      "({0} || []).reduce((index, row) => (index[row[{1}]] = row, index), {})",
    returns: "object",
  },
  {
    id: "updateRows",
    name: "updateRows",
    aliases: ["patchRows"],
    category: "tables",
    args: "list",
    min: 3,
    max: 3,
    params: ["table", "check", "change"],
    description: "Новая таблица: у подходящих строк колонки заменяются на результат change",
    example: ':updated = updateRows >> <users, (row) -> row.age >= 18, (row) -> {active: true}>;',
    codegen:
      "({0} || []).map((row) => (({1})(row) ? Object.assign({}, row, ({2})(row)) : row))",
    returns: "array",
  },
];

// Убираем устаревшие id своих же команд (переименования).
const OWN_IDS = new Set(commands.map((command) => command.id));
data.commands = data.commands.filter(
  (item) => !(item.category === "tables" && item.id === "pick") && (!OWN_IDS.has(item.id) || commands.some((command) => command.id === item.id)),
);

let added = 0;
let updated = 0;
for (const command of commands) {
  const index = data.commands.findIndex((item) => item.name === command.name);
  if (index === -1) {
    data.commands.push(command);
    added++;
  } else {
    data.commands[index] = command;
    updated++;
  }
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`commands.json: +${added} new, ~${updated} updated, total ${data.commands.length}`);
