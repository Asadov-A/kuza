/**
 * Добавляет в commands.json категорию «site» — команды для сборки страниц.
 * Запускается один раз: node scripts/add-site-commands.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../packages/core/commands.json", import.meta.url);
const data = JSON.parse(readFileSync(path, "utf8"));

const taken = new Set();
for (const command of data.commands) {
  taken.add(command.name);
  for (const alias of command.aliases) taken.add(alias);
}

if (!data.categories.some((category) => category.id === "site")) {
  data.categories.push({ id: "site", title: "Сайт (браузер)", titleEn: "Site" });
}

const commands = [
  {
    id: "page",
    name: "page",
    aliases: [],
    category: "site",
    args: "single",
    params: ["title"],
    description: "Начать страницу: сбросить содержимое и задать заголовок вкладки",
    example: 'page >> "Мой сайт";',
    codegen: "__kz.sitePage({0})",
    returns: "void",
  },
  {
    id: "heading",
    name: "heading",
    aliases: [],
    category: "site",
    args: "single",
    params: ["text"],
    description: "Крупный заголовок страницы",
    example: 'heading >> "Привет!";',
    codegen: "__kz.siteHeading({0})",
    returns: "void",
  },
  {
    id: "para",
    name: "para",
    aliases: [],
    category: "site",
    args: "single",
    params: ["text"],
    description: "Абзац текста",
    example: 'para >> "Мой первый сайт на Kuza.";',
    codegen: "__kz.sitePara({0})",
    returns: "void",
  },
  {
    id: "button",
    name: "button",
    aliases: [],
    category: "site",
    args: "list",
    min: 1,
    max: 2,
    params: ["text", "handler"],
    description: "Кнопка; второй аргумент — функция, которая вызовется по нажатию",
    example: 'button<"Нажми", onClick>;',
    codegen: "__kz.siteButton({rest})",
    returns: "void",
  },
  {
    id: "field",
    name: "field",
    aliases: [],
    category: "site",
    args: "list",
    min: 1,
    max: 2,
    params: ["placeholder", "name"],
    description: "Поле ввода; имя нужно, чтобы прочитать значение командой fieldValue",
    example: 'field<"Твоё имя", "name">;',
    codegen: "__kz.siteField({rest})",
    returns: "void",
  },
  {
    id: "fieldValue",
    name: "fieldValue",
    aliases: [],
    category: "site",
    args: "single",
    params: ["name"],
    description: "Прочитать то, что ввёл пользователь в поле с таким именем",
    example: 'log >> fieldValue >> "name";',
    codegen: "__kz.siteValue({0})",
    returns: "string",
  },
  {
    id: "list",
    name: "list",
    aliases: [],
    category: "site",
    args: "single",
    params: ["items"],
    description: "Список: каждый элемент массива станет пунктом",
    example: 'list >> ["Первый", "Второй"];',
    codegen: "__kz.siteList({0})",
    returns: "void",
  },
  {
    id: "link",
    name: "link",
    aliases: [],
    category: "site",
    args: "list",
    min: 2,
    max: 2,
    params: ["text", "href"],
    description: "Ссылка",
    example: 'link<"Документация", "https://example.com">;',
    codegen: "__kz.siteLink({rest})",
    returns: "void",
  },
  {
    id: "image",
    name: "image",
    aliases: [],
    category: "site",
    args: "list",
    min: 1,
    max: 2,
    params: ["src", "alt"],
    description: "Картинка по адресу",
    example: 'image<"./logo.png", "Логотип">;',
    codegen: "__kz.siteImage({rest})",
    returns: "void",
  },
  {
    id: "render",
    name: "render",
    aliases: [],
    category: "site",
    args: "none",
    params: [],
    description: "Нарисовать то, что собрано командами страницы (браузер)",
    example: "render;",
    codegen: "__kz.siteRender()",
    returns: "void",
  },
  {
    id: "body",
    name: "body",
    aliases: [],
    category: "site",
    args: "block",
    params: [],
    description: "Основной блок страницы: всё внутри него — содержимое сайта",
    example: 'body >> [ heading >> "Привет"; ];',
    codegen: '__kz.uiOpen("body")',
    returns: "void",
  },
  {
    id: "box",
    name: "box",
    aliases: [],
    category: "site",
    args: "block",
    params: [],
    description: "Обычный контейнер (div) для группы элементов",
    example: 'box >> [ para >> "Текст"; ];',
    codegen: '__kz.uiOpen("box")',
    returns: "void",
  },
  {
    id: "row",
    name: "row",
    aliases: [],
    category: "site",
    args: "block",
    params: [],
    description: "Ряд: элементы стоят рядом по горизонтали",
    example: 'row >> [ card >> [ para >> "A"; ]; card >> [ para >> "B"; ]; ];',
    codegen: '__kz.uiOpen("row")',
    returns: "void",
  },
  {
    id: "column",
    name: "column",
    aliases: ["col"],
    category: "site",
    args: "block",
    params: [],
    description: "Колонка: элементы стоят друг под другом",
    example: 'column >> [ heading >> "Заголовок"; para >> "Текст"; ];',
    codegen: '__kz.uiOpen("column")',
    returns: "void",
  },
  {
    id: "card",
    name: "card",
    aliases: [],
    category: "site",
    args: "block",
    params: [],
    description: "Карточка с рамкой и фоном",
    example: 'card >> [ heading >> "Заголовок"; para >> "Описание"; ];',
    codegen: '__kz.uiOpen("card")',
    returns: "void",
  },
  {
    id: "section",
    name: "section",
    aliases: [],
    category: "site",
    args: "block",
    params: [],
    description: "Секция страницы (section)",
    example: 'section >> [ heading >> "О проекте"; ];',
    codegen: '__kz.uiOpen("section")',
    returns: "void",
  },
  {
    id: "nav",
    name: "nav",
    aliases: [],
    category: "site",
    args: "block",
    params: [],
    description: "Навигация: ссылки в строку",
    example: 'nav >> [ link >> <"Главная", "#">; ];',
    codegen: '__kz.uiOpen("nav")',
    returns: "void",
  },
];

const existingIds = new Set(data.commands.map((command) => command.id));
for (const command of commands) {
  if (existingIds.has(command.id)) continue;
  if (taken.has(command.name)) throw new Error(`Имя уже занято: ${command.name}`);
}

for (const command of commands) {
  const index = data.commands.findIndex((existing) => existing.id === command.id);
  if (index >= 0) data.commands[index] = command;
  else data.commands.push(command);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`✅ Добавлено команд: ${commands.length}, всего: ${data.commands.length}`);
