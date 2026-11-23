/**
 * Добавляет в commands.json описания структур языка, которые появились в 0.5:
 * insert into (таблицы) и use "пакет" (npm). Скрипт идемпотентный.
 *
 * Запуск: node scripts/add-structures.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../packages/core/commands.json", import.meta.url);
const data = JSON.parse(readFileSync(path, "utf8"));

const upsert = (structure) => {
  const index = data.structures.findIndex((item) => item.name === structure.name);
  if (index >= 0) data.structures[index] = structure;
  else data.structures.push(structure);
};

upsert({
  name: "insert",
  syntax: 'insert into users values <1, "Аня", 30>;',
  description:
    "Добавить строку в таблицу. Значения идут по порядку колонок table<...>; можно передать и объект: insert into users <{ id: 1, name: \"Аня\" }>.",
  example:
    ':users = table<id, name>;\ninsert into users values <1, "Аня">;\ninsert into users values <2, "Боря">;\nlog >> select name from users where id = 2;',
  snippet: 'insert into ${1:users} values <${2:1, "Аня"}>;$0',
});

upsert({
  name: "use",
  syntax: 'use "lodash";\nuse math;\nuse "./helpers.kuza";',
  description:
    "Подключить модуль: встроенный (math, time, random, text, json), свой файл (путь в кавычках) или пакет из npm (имя в кавычках). Пакеты загружаются через import, поэтому в браузере нужен import map или сборщик.",
  example: 'use "lodash";\nlog >> lodash.chunk<[1, 2, 3], 2>;',
  snippet: 'use "${1:lodash}";$0',
});

const table = data.structures.find((item) => item.name === "table");
if (table) {
  table.description =
    "Создать таблицу с колонками — основной способ хранить данные. Строки добавляются через insert into или users.add<...>, сохраняются через tableSave и читаются через tableLoad (JSON).";
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`✅ Структур языка: ${data.structures.length}`);
