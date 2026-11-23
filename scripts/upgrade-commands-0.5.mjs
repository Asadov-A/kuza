/**
 * Идемпотентное обновление commands.json до версии 0.5.0.
 * Запуск: node scripts/upgrade-commands-0.5.mjs && npm run generate
 */

import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../packages/core/commands.json", import.meta.url);
const data = JSON.parse(readFileSync(path, "utf8"));

const upsert = (item) => {
  const index = data.commands.findIndex((command) => command.name === item.name);
  if (index === -1) data.commands.push(item);
  else data.commands[index] = { ...data.commands[index], ...item };
};

const addCategory = (category) => {
  if (!data.categories.some((entry) => entry.id === category.id)) data.categories.push(category);
};

const addKeyword = (keyword) => {
  if (!data.keywords.some((entry) => entry.name === keyword.name)) data.keywords.push(keyword);
};

const addStructure = (structure) => {
  const index = data.structures.findIndex((entry) => entry.name === structure.name);
  if (index === -1) data.structures.push(structure);
  else data.structures[index] = { ...data.structures[index], ...structure };
};

addKeyword({
  name: "view",
  description: "экран: функция, которая рисует страницу и обновляется при изменении переменных",
  example: 'view App<> >> [ heading >> "Hello"; render; ];',
});

addStructure({
  name: "view",
  syntax: "view Name<> >> [ ... ]",
  description: "реактивный экран Kuza: вызывается один раз и при каждом изменении своих переменных",
  example: ':count = 0;\nview App<> >> [ heading >> "Count: {count}"; render; ];',
  snippet: "view ${1:App}<> >> [\n\t$0\n]",
});

// Tailwind-классы теперь можно передать любому контейнеру.
for (const name of ["body", "box", "row", "column", "card", "section", "nav"]) {
  upsert({
    id: name,
    name,
    aliases: name === "column" ? ["col"] : [],
    category: "site",
    args: "block",
    min: 0,
    max: 1,
    params: ["className"],
    description: `Контейнер ${name}; в <> можно передать Tailwind-классы`,
    example: `${name}<"flex gap-4"> >> [ para >> "Текст"; ];`,
    codegen: `__kz.uiOpen("${name}", {rest})`,
    returns: "void",
  });
}

// Алиас "input" уже занят командой prompt, "query" — domGet.
const field = data.commands.find((command) => command.name === "field");
if (field) field.aliases = field.aliases.filter((alias) => alias !== "input");
const domGet = data.commands.find((command) => command.name === "domGet");
if (domGet) domGet.aliases = domGet.aliases.filter((alias) => alias !== "query");

addCategory({ id: "storage", title: "Хранилище", titleEn: "Storage" });
for (const command of [
  {
    id: "storeGet",
    name: "storeGet",
    aliases: ["loadData"],
    category: "storage",
    args: "list",
    min: 1,
    max: 2,
    params: ["key", "fallback"],
    description: "Прочитать значение из localStorage (JSON), при отсутствии вернуть fallback",
    example: ':name = storeGet >> <"name", "мир">;',
    codegen: "__kz.storageGet({rest})",
    returns: "any",
  },
  {
    id: "storeSet",
    name: "storeSet",
    aliases: ["saveData"],
    category: "storage",
    args: "list",
    min: 2,
    max: 2,
    params: ["key", "value"],
    description: "Сохранить значение в localStorage и вернуть его",
    example: 'storeSet >> <"name", "Kuza">;',
    codegen: "__kz.storageSet({rest})",
    returns: "any",
  },
  {
    id: "storeRemove",
    name: "storeRemove",
    aliases: [],
    category: "storage",
    args: "single",
    params: ["key"],
    description: "Удалить значение из localStorage",
    example: 'storeRemove >> "name";',
    codegen: "__kz.storageRemove({0})",
    returns: "void",
  },
  {
    id: "storeClear",
    name: "storeClear",
    aliases: [],
    category: "storage",
    args: "none",
    params: [],
    description: "Очистить localStorage текущего сайта",
    example: "storeClear;",
    codegen: "__kz.storageClear()",
    returns: "void",
  },
]) {
  upsert(command);
}

addCategory({ id: "server", title: "Сервер", titleEn: "Server" });
for (const command of [
  {
    id: "route",
    name: "route",
    aliases: [],
    category: "server",
    args: "list",
    min: 3,
    max: 3,
    params: ["method", "path", "handler"],
    description: "Зарегистрировать HTTP-маршрут; путь поддерживает параметры /users/:id",
    example: 'route >> <"GET", "/users/:id", showUser>;',
    codegen: '__kz.serverRoute({0}, {1}, {2})',
    returns: "void",
  },
  {
    id: "respond",
    name: "respond",
    aliases: [],
    category: "server",
    args: "list",
    min: 1,
    max: 3,
    params: ["payload", "status", "headers"],
    description: "Ответить на текущий запрос; объект автоматически превращается в JSON",
    example: 'respond >> <{ ok: true }, 200>;',
    codegen: "__kz.serverRespond({rest})",
    returns: "any",
  },
  {
    id: "param",
    name: "param",
    aliases: [],
    category: "server",
    args: "single",
    params: ["name"],
    description: "Параметр пути из маршрута /users/:id",
    example: ':id = param >> "id";',
    codegen: "__kz.serverParam({0})",
    returns: "string",
  },
  {
    id: "query",
    name: "query",
    aliases: ["queryParam"],
    category: "server",
    args: "single",
    params: ["name"],
    description: "Параметр строки запроса ?name=value",
    example: ':q = query >> "q";',
    codegen: "__kz.serverQuery({0})",
    returns: "string",
  },
  {
    id: "requestBody",
    name: "requestBody",
    aliases: ["bodyData"],
    category: "server",
    args: "none",
    params: [],
    description: "Тело текущего запроса: JSON-объект или строка",
    example: ":data = requestBody;",
    codegen: "__kz.serverBody()",
    returns: "any",
  },
  {
    id: "header",
    name: "header",
    aliases: [],
    category: "server",
    args: "single",
    params: ["name"],
    description: "Заголовок текущего запроса",
    example: ':agent = header >> "user-agent";',
    codegen: "__kz.serverHeader({0})",
    returns: "string",
  },
  {
    id: "method",
    name: "method",
    aliases: [],
    category: "server",
    args: "none",
    params: [],
    description: "HTTP-метод текущего запроса",
    example: ':m = method;',
    codegen: "__kz.serverMethod()",
    returns: "string",
  },
  {
    id: "serverPath",
    name: "serverPath",
    aliases: [],
    category: "server",
    args: "none",
    params: [],
    description: "Путь текущего запроса",
    example: ':p = serverPath;',
    codegen: "__kz.serverPath()",
    returns: "string",
  },
  {
    id: "listen",
    name: "listen",
    aliases: [],
    category: "server",
    args: "single",
    params: ["port"],
    description: "Запустить HTTP-сервер (только Node.js); используется kuza serve",
    example: "listen >> 3000;",
    codegen: "__kz.serverListen({0})",
    returns: "server",
  },
]) {
  upsert(command);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`commands.json обновлён: ${data.commands.length} команд, ${data.categories.length} категорий`);
