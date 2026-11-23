/**
 * Расширяет категорию «site»: больше тегов для страниц (header/footer/hero/
 * grid/badge/quote/code и другие). Скрипт идемпотентный.
 *
 * Запуск: node scripts/add-ui-commands.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../packages/core/commands.json", import.meta.url);
const data = JSON.parse(readFileSync(path, "utf8"));

const container = (id, title, tag) => ({
  id,
  name: id,
  aliases: [],
  category: "site",
  args: "block",
  params: ["className"],
  min: 0,
  max: 1,
  description: `${title}; в <> можно передать Tailwind-классы`,
  example: `${id} >> [ para >> "Текст"; ];`,
  codegen: `__kz.uiOpen("${tag ?? id}", {rest})`,
  returns: "void",
});

const commands = [
  container("header", "Шапка страницы"),
  container("footer", "Подвал страницы"),
  container("main", "Главная область страницы"),
  container("article", "Статья: текст с заголовками"),
  container("aside", "Боковая колонка"),
  container("grid", "Сетка: карточки сами разложатся по ширине"),
  container("hero", "Крупный первый экран страницы"),
  container("form", "Форма: поля и кнопка отправки"),
  container("center", "Центрированный блок"),
  {
    id: "subheading",
    name: "subheading",
    aliases: ["subhead", "h2"],
    category: "site",
    args: "list",
    params: ["text", "className"],
    min: 1,
    max: 2,
    description: "Подзаголовок второго уровня",
    example: 'subheading >> "Возможности";',
    codegen: "__kz.siteSubheading({rest})",
    returns: "void",
  },
  {
    id: "small",
    name: "small",
    aliases: ["muted"],
    category: "site",
    args: "list",
    params: ["text", "className"],
    min: 1,
    max: 2,
    description: "Мелкий приглушённый текст",
    example: 'small >> "Работает без сборщика";',
    codegen: "__kz.siteSmall({rest})",
    returns: "void",
  },
  {
    id: "badge",
    name: "badge",
    aliases: ["tagBadge"],
    category: "site",
    args: "list",
    params: ["text", "className"],
    min: 1,
    max: 2,
    description: "Маленькая плашка-метка",
    example: 'badge >> "beta";',
    codegen: "__kz.siteBadge({rest})",
    returns: "void",
  },
  {
    id: "quote",
    name: "quote",
    aliases: ["cite"],
    category: "site",
    args: "list",
    params: ["text", "author", "className"],
    min: 1,
    max: 3,
    description: "Цитата с необязательным автором",
    example: 'quote<"Язык должен быть простым", "Кто-то">;',
    codegen: "__kz.siteQuote({rest})",
    returns: "void",
  },
  {
    id: "divider",
    name: "divider",
    aliases: ["hr"],
    category: "site",
    args: "none",
    params: [],
    description: "Горизонтальная линия-разделитель",
    example: "divider;",
    codegen: "__kz.siteDivider()",
    returns: "void",
  },
  {
    id: "codeBlock",
    name: "codeBlock",
    aliases: ["code"],
    category: "site",
    args: "list",
    params: ["code", "className"],
    min: 1,
    max: 2,
    description: "Блок кода с моно-шрифтом",
    example: 'codeBlock >> \'log >> "привет";\';',
    codegen: "__kz.siteCode({rest})",
    returns: "void",
  },
  {
    id: "checkbox",
    name: "checkbox",
    aliases: ["check"],
    category: "site",
    args: "list",
    params: ["label", "name"],
    min: 1,
    max: 2,
    description: "Флажок; значение читается через fieldValue",
    example: 'checkbox<"Согласен", "agree">;',
    codegen: "__kz.siteCheckbox({rest})",
    returns: "void",
  },
  {
    id: "choices",
    name: "choices",
    aliases: ["dropdown"],
    category: "site",
    args: "list",
    params: ["label", "options", "name"],
    min: 2,
    max: 3,
    description: "Выпадающий список вариантов",
    example: 'choices<"План", ["Free", "Pro"], "plan">;',
    codegen: "__kz.siteChoices({rest})",
    returns: "void",
  },
];

const taken = new Map();
for (const command of data.commands) {
  for (const name of [command.name, ...command.aliases]) taken.set(name, command.id);
}

for (const command of commands) {
  const index = data.commands.findIndex((existing) => existing.id === command.id);
  for (const name of [command.name, ...command.aliases]) {
    const owner = taken.get(name);
    if (owner && owner !== command.id) {
      throw new Error(`Имя "${name}" уже занято командой ${owner}`);
    }
  }
  if (index >= 0) data.commands[index] = command;
  else data.commands.push(command);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`✅ Команд в наборе: ${commands.length}, всего в языке: ${data.commands.length}`);
