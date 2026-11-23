// ⚠️ ЭТОТ ФАЙЛ СГЕНЕРИРОВАН ИЗ commands.json — не редактируй его вручную.
// Чтобы изменить команды: правь commands.json и запусти "npm run generate".

export interface CommandsDataShape {
  categories: Array<{ id: string; title: string; titleEn: string }>;
  keywords: Array<{ name: string; description: string; example: string }>;
  structures: Array<{
    name: string;
    syntax: string;
    description: string;
    example: string;
    snippet: string;
  }>;
  commands: Array<{
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
  }>;
}

export const COMMANDS_DATA: CommandsDataShape = {
  "categories": [
    {
      "id": "output",
      "title": "Вывод",
      "titleEn": "Output"
    },
    {
      "id": "types",
      "title": "Типы и переменные",
      "titleEn": "Types"
    },
    {
      "id": "math",
      "title": "Математика",
      "titleEn": "Math"
    },
    {
      "id": "strings",
      "title": "Строки",
      "titleEn": "Strings"
    },
    {
      "id": "arrays",
      "title": "Массивы",
      "titleEn": "Arrays"
    },
    {
      "id": "objects",
      "title": "Объекты и JSON",
      "titleEn": "Objects"
    },
    {
      "id": "time",
      "title": "Время и ожидание",
      "titleEn": "Time"
    },
    {
      "id": "input",
      "title": "Ввод",
      "titleEn": "Input"
    },
    {
      "id": "files",
      "title": "Файлы (Node.js)",
      "titleEn": "Files"
    },
    {
      "id": "http",
      "title": "HTTP-запросы",
      "titleEn": "HTTP"
    },
    {
      "id": "dom",
      "title": "DOM (браузер)",
      "titleEn": "DOM"
    },
    {
      "id": "utils",
      "title": "Утилиты",
      "titleEn": "Utils"
    },
    {
      "id": "tables",
      "title": "Таблицы",
      "titleEn": "Tables"
    },
    {
      "id": "site",
      "title": "Сайт (браузер)",
      "titleEn": "Site"
    },
    {
      "id": "storage",
      "title": "Хранилище",
      "titleEn": "Storage"
    },
    {
      "id": "server",
      "title": "Сервер",
      "titleEn": "Server"
    },
    {
      "id": "integration",
      "title": "Интеграции",
      "titleEn": "Integration"
    }
  ],
  "keywords": [
    {
      "name": "func",
      "description": "Объявить функцию",
      "example": "func add<a, b> >> [ return a + b; ]"
    },
    {
      "name": "while",
      "description": "Цикл «пока условие верно»",
      "example": "while<n > 0> >> [ :n = n - 1; ]"
    },
    {
      "name": "for",
      "description": "Цикл со счётчиком",
      "example": "for<i = 0; i < 5; i++> >> [ log >> i; ]"
    },
    {
      "name": "foreach",
      "description": "Перебор массива",
      "example": "foreach<item : items> >> [ log >> item; ]"
    },
    {
      "name": "try",
      "description": "Попробовать выполнить блок",
      "example": "try >> [ throw >> \"ой\"; ] catch<e> >> [ log >> e.message; ]"
    },
    {
      "name": "catch",
      "description": "Поймать ошибку из try",
      "example": "catch<e> >> [ log >> e.message; ]"
    },
    {
      "name": "return",
      "description": "Вернуть значение из функции",
      "example": "return a + b;"
    },
    {
      "name": "break",
      "description": "Выйти из цикла",
      "example": "break;"
    },
    {
      "name": "continue",
      "description": "Перейти к следующей итерации",
      "example": "continue;"
    },
    {
      "name": "throw",
      "description": "Выбросить ошибку",
      "example": "throw >> \"что-то сломалось\";"
    },
    {
      "name": "and",
      "description": "Логическое И",
      "example": "?a > 0 and b > 0 >> [ ]"
    },
    {
      "name": "or",
      "description": "Логическое ИЛИ",
      "example": "?a > 0 or b > 0 >> [ ]"
    },
    {
      "name": "not",
      "description": "Логическое НЕ",
      "example": "?not ready >> [ ]"
    },
    {
      "name": "true",
      "description": "Логическая истина",
      "example": ":flag = true;"
    },
    {
      "name": "false",
      "description": "Логическая ложь",
      "example": ":flag = false;"
    },
    {
      "name": "null",
      "description": "Пустое значение",
      "example": ":x = null;"
    },
    {
      "name": "select",
      "description": "Запрос к таблице: колонки, where, order by, limit",
      "example": ":adults = select name, age from users where age >= 18 order by age desc;"
    },
    {
      "name": "update",
      "description": "Изменить строки таблицы",
      "example": "update users set age = 18 where id = 1;"
    },
    {
      "name": "delete",
      "description": "Удалить строки таблицы",
      "example": "delete from users where age < 18;"
    },
    {
      "name": "view",
      "description": "экран: функция, которая рисует страницу и обновляется при изменении переменных",
      "example": "view App<> >> [ heading >> \"Hello\"; render; ];"
    }
  ],
  "structures": [
    {
      "name": "var",
      "syntax": ":name = value;",
      "description": "Объявить переменную. Внутри функции/цикла повторное \":name = ...\" для уже существующей переменной становится присваиванием.",
      "example": ":age = 17;\n:name = \"Alex\";",
      "snippet": ":${1:name} = ${2:value};$0"
    },
    {
      "name": "func",
      "syntax": "func name<a, b> >> [ ... ]",
      "description": "Объявить функцию с параметрами.",
      "example": "func greet<name> >> [\n  log >> `Привет, ${name}!`;\n]",
      "snippet": "func ${1:name}<${2:params}> >> [\n\t$0\n]"
    },
    {
      "name": "if",
      "syntax": "?cond >> [ ... ] || ?cond2 >> [ ... ] || [ ... ]",
      "description": "Условие: \"?\" — это if, \"||\" — это else if / else.",
      "example": "?age >= 18 >> [\n  log >> \"взрослый\";\n] || [\n  log >> \"ребёнок\";\n]",
      "snippet": "?${1:condition} >> [\n\t$0\n] || [\n\t\n]"
    },
    {
      "name": "while",
      "syntax": "while<cond> >> [ ... ]",
      "description": "Цикл, который повторяется, пока условие истинно.",
      "example": ":n = 3;\nwhile<n > 0> >> [\n  log >> n;\n  :n = n - 1;\n]",
      "snippet": "while<${1:condition}> >> [\n\t$0\n]"
    },
    {
      "name": "for",
      "syntax": "for<init; cond; step> >> [ ... ]",
      "description": "Цикл со счётчиком.",
      "example": "for<i = 0; i < 5; i++> >> [\n  log >> i;\n]",
      "snippet": "for<${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++> >> [\n\t$0\n]"
    },
    {
      "name": "foreach",
      "syntax": "foreach<item : array> >> [ ... ]",
      "description": "Перебрать все элементы массива.",
      "example": "foreach<n : [1, 2, 3]> >> [\n  log >> n;\n]",
      "snippet": "foreach<${1:item} : ${2:array}> >> [\n\t$0\n]"
    },
    {
      "name": "try",
      "syntax": "try >> [ ... ] catch<e> >> [ ... ]",
      "description": "Поймать ошибку и обработать её.",
      "example": "try >> [\n  throw >> \"ой\";\n]\ncatch<e> >> [\n  err >> e.message;\n]",
      "snippet": "try >> [\n\t$0\n] catch<${1:e}> >> [\n\t\n]"
    },
    {
      "name": "table",
      "syntax": ":users = table<id, name, age>;",
      "description": "Создать таблицу с колонками — основной способ хранить данные. Строки добавляются через insert into или users.add<...>, сохраняются через tableSave и читаются через tableLoad (JSON).",
      "example": ":users = table<id, name, age>;\nusers.add<1, \"Аня\", 17>;\nusers.add<2, \"Боря\", 22>;",
      "snippet": ":${1:users} = table<${2:id, name}>;\n${1:users}.add<${3:1, \"Аня\"}>;$0"
    },
    {
      "name": "select",
      "syntax": "select колонки from таблица where условие order by колонка desc limit N",
      "description": "Запрос к таблице: выбрать колонки, отфильтровать, отсортировать и ограничить. Колонки читаются как переменные.",
      "example": "select name, age from users where age >= 18 order by age desc;\nselect * from users limit 10;",
      "snippet": "select ${1:*} from ${2:users} where ${3:age >= 18};$0"
    },
    {
      "name": "update",
      "syntax": "update таблица set колонка = значение where условие;",
      "description": "Изменить строки таблицы, подходящие под условие. В значении можно использовать колонки: age = age + 1.",
      "example": "update users set age = 18 where id = 1;",
      "snippet": "update ${1:users} set ${2:age} = ${3:18} where ${4:id = 1};$0"
    },
    {
      "name": "delete",
      "syntax": "delete from таблица where условие;",
      "description": "Удалить строки таблицы, подходящие под условие.",
      "example": "delete from users where age < 18;",
      "snippet": "delete from ${1:users} where ${2:age < 18};$0"
    },
    {
      "name": "view",
      "syntax": "view Name<> >> [ ... ]",
      "description": "реактивный экран Kuza: вызывается один раз и при каждом изменении своих переменных",
      "example": ":count = 0;\nview App<> >> [ heading >> \"Count: {count}\"; render; ];",
      "snippet": "view ${1:App}<> >> [\n\t$0\n]"
    },
    {
      "name": "insert",
      "syntax": "insert into users values <1, \"Аня\", 30>;",
      "description": "Добавить строку в таблицу. Значения идут по порядку колонок table<...>; можно передать и объект: insert into users <{ id: 1, name: \"Аня\" }>.",
      "example": ":users = table<id, name>;\ninsert into users values <1, \"Аня\">;\ninsert into users values <2, \"Боря\">;\nlog >> select name from users where id = 2;",
      "snippet": "insert into ${1:users} values <${2:1, \"Аня\"}>;$0"
    },
    {
      "name": "use",
      "syntax": "use \"lodash\";\nuse math;\nuse \"./helpers.kuza\";",
      "description": "Подключить модуль: встроенный (math, time, random, text, json), свой файл (путь в кавычках) или пакет из npm (имя в кавычках). Пакеты загружаются через import, поэтому в браузере нужен import map или сборщик.",
      "example": "use \"lodash\";\nlog >> lodash.chunk<[1, 2, 3], 2>;",
      "snippet": "use \"${1:lodash}\";$0"
    }
  ],
  "commands": [
    {
      "id": "log",
      "name": "log",
      "aliases": [
        "print",
        "logln"
      ],
      "category": "output",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Вывести значение в консоль",
      "example": "log >> \"Привет, мир!\";",
      "codegen": "console.log({0})",
      "returns": "void"
    },
    {
      "id": "warn",
      "name": "warn",
      "aliases": [
        "warning"
      ],
      "category": "output",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Вывести предупреждение (жёлтым)",
      "example": "warn >> \"Осторожно!\";",
      "codegen": "console.warn({0})",
      "returns": "void"
    },
    {
      "id": "err",
      "name": "err",
      "aliases": [
        "logError"
      ],
      "category": "output",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Вывести ошибку (красным)",
      "example": "err >> \"Что-то пошло не так\";",
      "codegen": "console.error({0})",
      "returns": "void"
    },
    {
      "id": "alert",
      "name": "alert",
      "aliases": [
        "notify"
      ],
      "category": "output",
      "args": "single",
      "params": [
        "message"
      ],
      "description": "Показать всплывающее окно (в браузере) или строку в консоли (в Node)",
      "example": "alert >> \"Готово!\";",
      "codegen": "__kz.alert({0})",
      "returns": "void"
    },
    {
      "id": "clear",
      "name": "clear",
      "aliases": [
        "cls"
      ],
      "category": "output",
      "args": "none",
      "params": [],
      "description": "Очистить консоль",
      "example": "clear;",
      "codegen": "console.clear()",
      "returns": "void"
    },
    {
      "id": "table",
      "name": "table",
      "aliases": [],
      "category": "output",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Вывести массив или объект таблицей",
      "example": "table >> users;",
      "codegen": "console.table({0})",
      "returns": "void"
    },
    {
      "id": "typeof",
      "name": "typeof",
      "aliases": [
        "type"
      ],
      "category": "types",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Тип значения: number, string, object, boolean...",
      "example": ":t = typeof >> 42;",
      "codegen": "typeof ({0})",
      "returns": "string"
    },
    {
      "id": "int",
      "name": "int",
      "aliases": [
        "toInt"
      ],
      "category": "types",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Превратить в целое число",
      "example": ":n = int >> \"42\";",
      "codegen": "parseInt({0}, 10)",
      "returns": "number"
    },
    {
      "id": "float",
      "name": "float",
      "aliases": [
        "toFloat"
      ],
      "category": "types",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Превратить в число с дробной частью",
      "example": ":x = float >> \"3.14\";",
      "codegen": "parseFloat({0})",
      "returns": "number"
    },
    {
      "id": "str",
      "name": "str",
      "aliases": [
        "toStr"
      ],
      "category": "types",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Превратить в строку",
      "example": ":s = str >> 42;",
      "codegen": "String({0})",
      "returns": "string"
    },
    {
      "id": "bool",
      "name": "bool",
      "aliases": [
        "toBool"
      ],
      "category": "types",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Превратить в true/false",
      "example": ":ok = bool >> 1;",
      "codegen": "Boolean({0})",
      "returns": "boolean"
    },
    {
      "id": "isNum",
      "name": "isNum",
      "aliases": [
        "isNumber"
      ],
      "category": "types",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Проверить, что это число",
      "example": "?isNum >> x >> [ log >> \"число\"; ]",
      "codegen": "__kz.isNum({0})",
      "returns": "boolean"
    },
    {
      "id": "isStr",
      "name": "isStr",
      "aliases": [
        "isString"
      ],
      "category": "types",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Проверить, что это строка",
      "example": "?isStr >> x >> [ log >> \"строка\"; ]",
      "codegen": "__kz.isStr({0})",
      "returns": "boolean"
    },
    {
      "id": "isArr",
      "name": "isArr",
      "aliases": [
        "isArray"
      ],
      "category": "types",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Проверить, что это массив",
      "example": "?isArr >> items >> [ log >> \"массив\"; ]",
      "codegen": "__kz.isArr({0})",
      "returns": "boolean"
    },
    {
      "id": "isObj",
      "name": "isObj",
      "aliases": [
        "isObject"
      ],
      "category": "types",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Проверить, что это объект",
      "example": "?isObj >> user >> [ log >> \"объект\"; ]",
      "codegen": "__kz.isObj({0})",
      "returns": "boolean"
    },
    {
      "id": "abs",
      "name": "abs",
      "aliases": [],
      "category": "math",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Модуль числа (без знака)",
      "example": ":n = abs >> -5;",
      "codegen": "Math.abs({0})",
      "returns": "number"
    },
    {
      "id": "max",
      "name": "max",
      "aliases": [],
      "category": "math",
      "args": "list",
      "min": 1,
      "max": 99,
      "params": [
        "a",
        "b"
      ],
      "description": "Самое большое из чисел",
      "example": ":m = max >> <42, 17>;",
      "codegen": "Math.max({rest})",
      "returns": "number"
    },
    {
      "id": "min",
      "name": "min",
      "aliases": [],
      "category": "math",
      "args": "list",
      "min": 1,
      "max": 99,
      "params": [
        "a",
        "b"
      ],
      "description": "Самое маленькое из чисел",
      "example": ":m = min >> <42, 17>;",
      "codegen": "Math.min({rest})",
      "returns": "number"
    },
    {
      "id": "round",
      "name": "round",
      "aliases": [],
      "category": "math",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Округлить до ближайшего целого",
      "example": ":n = round >> 3.6;",
      "codegen": "Math.round({0})",
      "returns": "number"
    },
    {
      "id": "floor",
      "name": "floor",
      "aliases": [],
      "category": "math",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Округлить вниз",
      "example": ":n = floor >> 3.9;",
      "codegen": "Math.floor({0})",
      "returns": "number"
    },
    {
      "id": "ceil",
      "name": "ceil",
      "aliases": [],
      "category": "math",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Округлить вверх",
      "example": ":n = ceil >> 3.1;",
      "codegen": "Math.ceil({0})",
      "returns": "number"
    },
    {
      "id": "sqrt",
      "name": "sqrt",
      "aliases": [],
      "category": "math",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Квадратный корень",
      "example": ":n = sqrt >> 16;",
      "codegen": "Math.sqrt({0})",
      "returns": "number"
    },
    {
      "id": "pow",
      "name": "pow",
      "aliases": [],
      "category": "math",
      "args": "list",
      "params": [
        "base",
        "exponent"
      ],
      "description": "Возвести число в степень",
      "example": ":n = pow >> <2, 10>;",
      "codegen": "(({0}) ** ({1}))",
      "returns": "number"
    },
    {
      "id": "rand",
      "name": "rand",
      "aliases": [
        "random"
      ],
      "category": "math",
      "args": "single",
      "params": [
        "max"
      ],
      "description": "Случайное целое от 0 до max-1",
      "example": ":n = rand >> 100;",
      "codegen": "Math.floor(Math.random() * ({0}))",
      "returns": "number"
    },
    {
      "id": "randRange",
      "name": "randRange",
      "aliases": [
        "randBetween"
      ],
      "category": "math",
      "args": "list",
      "params": [
        "from",
        "to"
      ],
      "description": "Случайное целое от from до to включительно",
      "example": ":n = randRange >> <1, 6>;",
      "codegen": "__kz.randRange({rest})",
      "returns": "number"
    },
    {
      "id": "randPick",
      "name": "randPick",
      "aliases": [
        "pick"
      ],
      "category": "math",
      "args": "single",
      "params": [
        "array"
      ],
      "description": "Случайный элемент массива",
      "example": ":who = randPick >> [\"Аня\", \"Боря\", \"Вера\"];",
      "codegen": "__kz.randPick({0})",
      "returns": "any"
    },
    {
      "id": "sum",
      "name": "sum",
      "aliases": [],
      "category": "math",
      "args": "single",
      "params": [
        "array"
      ],
      "description": "Сумма чисел массива",
      "example": ":total = sum >> [1, 2, 3];",
      "codegen": "__kz.sum({0})",
      "returns": "number"
    },
    {
      "id": "avg",
      "name": "avg",
      "aliases": [
        "average",
        "mean"
      ],
      "category": "math",
      "args": "single",
      "params": [
        "array"
      ],
      "description": "Среднее арифметическое массива",
      "example": ":m = avg >> [1, 2, 3, 4];",
      "codegen": "__kz.avg({0})",
      "returns": "number"
    },
    {
      "id": "clamp",
      "name": "clamp",
      "aliases": [],
      "category": "math",
      "args": "list",
      "params": [
        "value",
        "low",
        "high"
      ],
      "description": "Ограничить число диапазоном",
      "example": ":n = clamp >> <150, 0, 100>;",
      "codegen": "__kz.clamp({rest})",
      "returns": "number"
    },
    {
      "id": "sign",
      "name": "sign",
      "aliases": [],
      "category": "math",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Знак числа: -1, 0 или 1",
      "example": ":s = sign >> -5;",
      "codegen": "Math.sign({0})",
      "returns": "number"
    },
    {
      "id": "upper",
      "name": "upper",
      "aliases": [
        "uppercase",
        "toUpper"
      ],
      "category": "strings",
      "args": "single",
      "params": [
        "text"
      ],
      "description": "Перевести строку в ВЕРХНИЙ регистр",
      "example": ":s = upper >> \"привет\";",
      "codegen": "String({0}).toUpperCase()",
      "returns": "string"
    },
    {
      "id": "lower",
      "name": "lower",
      "aliases": [
        "lowercase",
        "toLower"
      ],
      "category": "strings",
      "args": "single",
      "params": [
        "text"
      ],
      "description": "Перевести строку в нижний регистр",
      "example": ":s = lower >> \"ПРИВЕТ\";",
      "codegen": "String({0}).toLowerCase()",
      "returns": "string"
    },
    {
      "id": "trim",
      "name": "trim",
      "aliases": [],
      "category": "strings",
      "args": "single",
      "params": [
        "text"
      ],
      "description": "Убрать пробелы по краям",
      "example": ":s = trim >> \"  hi  \";",
      "codegen": "String({0}).trim()",
      "returns": "string"
    },
    {
      "id": "len",
      "name": "len",
      "aliases": [
        "length",
        "size"
      ],
      "category": "strings",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Длина строки, массива или число ключей объекта",
      "example": ":n = len >> \"привет\";",
      "codegen": "__kz.len({0})",
      "returns": "number"
    },
    {
      "id": "split",
      "name": "split",
      "aliases": [],
      "category": "strings",
      "args": "list",
      "params": [
        "text",
        "separator"
      ],
      "description": "Разбить строку на массив по разделителю",
      "example": ":parts = split >> <\"a,b,c\", \",\">;",
      "codegen": "String({0}).split({1})",
      "returns": "array"
    },
    {
      "id": "join",
      "name": "join",
      "aliases": [],
      "category": "strings",
      "args": "list",
      "params": [
        "array",
        "separator"
      ],
      "description": "Склеить массив в строку через разделитель",
      "example": ":s = join >> <[\"a\", \"b\"], \" | \">;",
      "codegen": "__kz.join({0}, {1})",
      "returns": "string"
    },
    {
      "id": "replace",
      "name": "replace",
      "aliases": [
        "replaceAll"
      ],
      "category": "strings",
      "args": "list",
      "params": [
        "text",
        "search",
        "replacement"
      ],
      "description": "Заменить все вхождения подстроки",
      "example": ":s = replace >> <\"a-b-c\", \"-\", \"+\">;",
      "codegen": "__kz.replaceAll({0}, {1}, {2})",
      "returns": "string"
    },
    {
      "id": "contains",
      "name": "contains",
      "aliases": [
        "includes",
        "has"
      ],
      "category": "strings",
      "args": "list",
      "params": [
        "value",
        "item"
      ],
      "description": "Проверить, есть ли подстрока или элемент",
      "example": "?contains >> <greeting, \"привет\"> >> [ log >> \"есть\"; ]",
      "codegen": "__kz.contains({0}, {1})",
      "returns": "boolean"
    },
    {
      "id": "startsWith",
      "name": "startsWith",
      "aliases": [
        "beginsWith"
      ],
      "category": "strings",
      "args": "list",
      "params": [
        "text",
        "prefix"
      ],
      "description": "Начинается ли строка с подстроки",
      "example": "?startsWith >> <url, \"https\"> >> [ log >> \"https\"; ]",
      "codegen": "String({0}).startsWith({1})",
      "returns": "boolean"
    },
    {
      "id": "endsWith",
      "name": "endsWith",
      "aliases": [],
      "category": "strings",
      "args": "list",
      "params": [
        "text",
        "suffix"
      ],
      "description": "Заканчивается ли строка подстрокой",
      "example": "?endsWith >> <file, \".kuza\"> >> [ log >> \"наш файл\"; ]",
      "codegen": "String({0}).endsWith({1})",
      "returns": "boolean"
    },
    {
      "id": "indexOf",
      "name": "indexOf",
      "aliases": [
        "findIndex"
      ],
      "category": "strings",
      "args": "list",
      "params": [
        "value",
        "item"
      ],
      "description": "Позиция подстроки или элемента, -1 если нет",
      "example": ":i = indexOf >> <items, 42>;",
      "codegen": "__kz.indexOf({0}, {1})",
      "returns": "number"
    },
    {
      "id": "slice",
      "name": "slice",
      "aliases": [
        "substr"
      ],
      "category": "strings",
      "args": "list",
      "min": 2,
      "max": 3,
      "params": [
        "value",
        "start",
        "end"
      ],
      "description": "Взять часть строки или массива",
      "example": ":s = slice >> <\"Kuza язык\", 0, 4>;",
      "codegen": "__kz.slice({rest})",
      "returns": "any"
    },
    {
      "id": "repeat",
      "name": "repeat",
      "aliases": [],
      "category": "strings",
      "args": "list",
      "params": [
        "text",
        "times"
      ],
      "description": "Повторить строку несколько раз",
      "example": ":line = repeat >> <\"-\", 20>;",
      "codegen": "String({0}).repeat({1})",
      "returns": "string"
    },
    {
      "id": "charAt",
      "name": "charAt",
      "aliases": [
        "char"
      ],
      "category": "strings",
      "args": "list",
      "params": [
        "text",
        "index"
      ],
      "description": "Символ по номеру позиции",
      "example": ":c = charAt >> <\"Kuza\", 0>;",
      "codegen": "String({0}).charAt({1})",
      "returns": "string"
    },
    {
      "id": "padLeft",
      "name": "padLeft",
      "aliases": [
        "padStart"
      ],
      "category": "strings",
      "args": "list",
      "min": 2,
      "max": 3,
      "params": [
        "text",
        "length",
        "fill"
      ],
      "description": "Дополнить строку слева до нужной длины",
      "example": ":s = padLeft >> <\"7\", 3, \"0\">;",
      "codegen": "__kz.padLeft({rest})",
      "returns": "string"
    },
    {
      "id": "padRight",
      "name": "padRight",
      "aliases": [
        "padEnd"
      ],
      "category": "strings",
      "args": "list",
      "min": 2,
      "max": 3,
      "params": [
        "text",
        "length",
        "fill"
      ],
      "description": "Дополнить строку справа до нужной длины",
      "example": ":s = padRight >> <\"7\", 3, \".\">;",
      "codegen": "__kz.padRight({rest})",
      "returns": "string"
    },
    {
      "id": "words",
      "name": "words",
      "aliases": [],
      "category": "strings",
      "args": "single",
      "params": [
        "text"
      ],
      "description": "Разбить строку на слова по пробелам",
      "example": ":w = words >> \"я учу kuza\";",
      "codegen": "__kz.words({0})",
      "returns": "array"
    },
    {
      "id": "capitalize",
      "name": "capitalize",
      "aliases": [],
      "category": "strings",
      "args": "single",
      "params": [
        "text"
      ],
      "description": "Сделать первую букву заглавной",
      "example": ":s = capitalize >> \"kuza\";",
      "codegen": "__kz.capitalize({0})",
      "returns": "string"
    },
    {
      "id": "push",
      "name": "push",
      "aliases": [
        "add"
      ],
      "category": "arrays",
      "args": "list",
      "params": [
        "array",
        "value"
      ],
      "description": "Добавить элемент в конец массива",
      "example": "push >> <items, 42>;",
      "codegen": "({0}).push({1})",
      "returns": "number"
    },
    {
      "id": "pop",
      "name": "pop",
      "aliases": [],
      "category": "arrays",
      "args": "single",
      "params": [
        "array"
      ],
      "description": "Забрать последний элемент массива",
      "example": ":last = pop >> items;",
      "codegen": "({0}).pop()",
      "returns": "any"
    },
    {
      "id": "shift",
      "name": "shift",
      "aliases": [],
      "category": "arrays",
      "args": "single",
      "params": [
        "array"
      ],
      "description": "Забрать первый элемент массива",
      "example": ":first = shift >> items;",
      "codegen": "({0}).shift()",
      "returns": "any"
    },
    {
      "id": "unshift",
      "name": "unshift",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "params": [
        "array",
        "value"
      ],
      "description": "Добавить элемент в начало массива",
      "example": "unshift >> <items, 0>;",
      "codegen": "({0}).unshift({1})",
      "returns": "number"
    },
    {
      "id": "filter",
      "name": "filter",
      "aliases": [
        "where"
      ],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "check"
      ],
      "description": "Оставить элементы, для которых проверка вернула true",
      "example": ":adults = filter >> <users, (u) -> u.age >= 18>;",
      "codegen": "{0}.filter({1})",
      "returns": "array"
    },
    {
      "id": "map",
      "name": "map",
      "aliases": [
        "transform"
      ],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "change"
      ],
      "description": "Превратить каждый элемент массива через функцию",
      "example": ":squares = map >> <items, (x) -> x * x>;",
      "codegen": "{0}.map({1})",
      "returns": "array"
    },
    {
      "id": "find",
      "name": "find",
      "aliases": [
        "firstMatch"
      ],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "check"
      ],
      "description": "Найти первый элемент, подходящий под проверку",
      "example": ":adult = find >> <users, (u) -> u.age >= 18>;",
      "codegen": "{0}.find({1})"
    },
    {
      "id": "each",
      "name": "each",
      "aliases": [
        "forEach"
      ],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "action"
      ],
      "description": "Выполнить действие для каждого элемента",
      "example": "each >> <items, (x) -> log >> x>;",
      "codegen": "{0}.forEach({1})"
    },
    {
      "id": "sort",
      "name": "sort",
      "aliases": [
        "sorted"
      ],
      "category": "arrays",
      "args": "list",
      "min": 1,
      "max": 2,
      "params": [
        "array",
        "key"
      ],
      "description": "Отсортировать массив (возвращает копию)",
      "example": ":sorted = sort >> [3, 1, 2];",
      "codegen": "__kz.sort({rest})",
      "returns": "array"
    },
    {
      "id": "reverse",
      "name": "reverse",
      "aliases": [
        "reversed"
      ],
      "category": "arrays",
      "args": "single",
      "params": [
        "array"
      ],
      "description": "Перевернуть массив или строку (возвращает копию)",
      "example": ":r = reverse >> [1, 2, 3];",
      "codegen": "__kz.reverse({0})",
      "returns": "any"
    },
    {
      "id": "unique",
      "name": "unique",
      "aliases": [
        "uniq"
      ],
      "category": "arrays",
      "args": "single",
      "params": [
        "array"
      ],
      "description": "Убрать повторяющиеся элементы",
      "example": ":u = unique >> [1, 1, 2, 3, 3];",
      "codegen": "__kz.unique({0})",
      "returns": "array"
    },
    {
      "id": "removeAt",
      "name": "removeAt",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "params": [
        "array",
        "index"
      ],
      "description": "Удалить элемент по позиции (возвращает копию)",
      "example": ":r = removeAt >> <items, 0>;",
      "codegen": "__kz.removeAt({rest})",
      "returns": "array"
    },
    {
      "id": "count",
      "name": "count",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "params": [
        "array",
        "value"
      ],
      "description": "Сколько раз значение встречается в массиве",
      "example": ":n = count >> <[1, 2, 1], 1>;",
      "codegen": "__kz.count({rest})",
      "returns": "number"
    },
    {
      "id": "flatten",
      "name": "flatten",
      "aliases": [
        "flat"
      ],
      "category": "arrays",
      "args": "single",
      "params": [
        "array"
      ],
      "description": "Склеить вложенные массивы на один уровень",
      "example": ":f = flatten >> [[1, 2], [3]];",
      "codegen": "__kz.flatten({0})",
      "returns": "array"
    },
    {
      "id": "keys",
      "name": "keys",
      "aliases": [],
      "category": "objects",
      "args": "single",
      "params": [
        "object"
      ],
      "description": "Список ключей объекта",
      "example": ":k = keys >> user;",
      "codegen": "Object.keys({0})",
      "returns": "array"
    },
    {
      "id": "values",
      "name": "values",
      "aliases": [],
      "category": "objects",
      "args": "single",
      "params": [
        "object"
      ],
      "description": "Список значений объекта",
      "example": ":v = values >> user;",
      "codegen": "Object.values({0})",
      "returns": "array"
    },
    {
      "id": "hasKey",
      "name": "hasKey",
      "aliases": [
        "hasOwn"
      ],
      "category": "objects",
      "args": "list",
      "params": [
        "object",
        "key"
      ],
      "description": "Есть ли такой ключ в объекте",
      "example": "?hasKey >> <user, \"name\"> >> [ log >> user.name; ]",
      "codegen": "__kz.hasKey({rest})",
      "returns": "boolean"
    },
    {
      "id": "merge",
      "name": "merge",
      "aliases": [
        "assign"
      ],
      "category": "objects",
      "args": "list",
      "params": [
        "a",
        "b"
      ],
      "description": "Склеить два объекта в новый",
      "example": ":all = merge >> <base, extra>;",
      "codegen": "Object.assign({}, {0}, {1})",
      "returns": "object"
    },
    {
      "id": "jsonParse",
      "name": "jsonParse",
      "aliases": [
        "fromJson"
      ],
      "category": "objects",
      "args": "single",
      "params": [
        "text"
      ],
      "description": "Строка JSON → объект",
      "example": ":user = jsonParse >> \"{\\\"name\\\":\\\"Аня\\\"}\";",
      "codegen": "JSON.parse({0})",
      "returns": "any"
    },
    {
      "id": "jsonStringify",
      "name": "jsonStringify",
      "aliases": [
        "toJson"
      ],
      "category": "objects",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Объект → красивая строка JSON",
      "example": ":text = jsonStringify >> user;",
      "codegen": "JSON.stringify({0}, null, 2)",
      "returns": "string"
    },
    {
      "id": "now",
      "name": "now",
      "aliases": [
        "timestamp"
      ],
      "category": "time",
      "args": "none",
      "params": [],
      "description": "Текущее время в миллисекундах",
      "example": ":t = now;",
      "codegen": "Date.now()",
      "returns": "number"
    },
    {
      "id": "today",
      "name": "today",
      "aliases": [],
      "category": "time",
      "args": "none",
      "params": [],
      "description": "Сегодняшняя дата в формате 2026-11-21",
      "example": "log >> today;",
      "codegen": "new Date().toISOString().slice(0, 10)",
      "returns": "string"
    },
    {
      "id": "date",
      "name": "date",
      "aliases": [
        "formatDate"
      ],
      "category": "time",
      "args": "list",
      "min": 0,
      "max": 1,
      "params": [
        "value"
      ],
      "description": "Дата в местном формате",
      "example": ":d = date;",
      "codegen": "__kz.formatDate({rest})",
      "returns": "string"
    },
    {
      "id": "year",
      "name": "year",
      "aliases": [],
      "category": "time",
      "args": "none",
      "params": [],
      "description": "Текущий год",
      "example": "log >> year;",
      "codegen": "new Date().getFullYear()",
      "returns": "number"
    },
    {
      "id": "month",
      "name": "month",
      "aliases": [],
      "category": "time",
      "args": "none",
      "params": [],
      "description": "Текущий месяц (1-12)",
      "example": "log >> month;",
      "codegen": "(new Date().getMonth() + 1)",
      "returns": "number"
    },
    {
      "id": "day",
      "name": "day",
      "aliases": [],
      "category": "time",
      "args": "none",
      "params": [],
      "description": "Текущий день месяца",
      "example": "log >> day;",
      "codegen": "new Date().getDate()",
      "returns": "number"
    },
    {
      "id": "wait",
      "name": "wait",
      "aliases": [
        "sleep"
      ],
      "category": "time",
      "args": "single",
      "params": [
        "ms"
      ],
      "description": "Подождать указанное число миллисекунд",
      "example": "wait >> 1000;",
      "codegen": "await __kz.sleep({0})",
      "returns": "void"
    },
    {
      "id": "prompt",
      "name": "prompt",
      "aliases": [
        "ask",
        "input"
      ],
      "category": "input",
      "args": "single",
      "params": [
        "message"
      ],
      "description": "Спросить у пользователя текст",
      "example": ":name = prompt >> \"Как тебя зовут?\";",
      "codegen": "await __kz.prompt({0})",
      "returns": "string"
    },
    {
      "id": "confirm",
      "name": "confirm",
      "aliases": [
        "yesno"
      ],
      "category": "input",
      "args": "single",
      "params": [
        "message"
      ],
      "description": "Спросить да/нет",
      "example": ":ok = confirm >> \"Продолжить?\";",
      "codegen": "await __kz.confirm({0})",
      "returns": "boolean"
    },
    {
      "id": "readFile",
      "name": "readFile",
      "aliases": [
        "read"
      ],
      "category": "files",
      "args": "single",
      "params": [
        "path"
      ],
      "description": "Прочитать текстовый файл (только Node.js)",
      "example": ":text = readFile >> \"data.txt\";",
      "codegen": "await __kz.readFile({0})",
      "returns": "string"
    },
    {
      "id": "writeFile",
      "name": "writeFile",
      "aliases": [
        "write"
      ],
      "category": "files",
      "args": "list",
      "params": [
        "path",
        "text"
      ],
      "description": "Записать текст в файл, перезаписав его (только Node.js)",
      "example": "writeFile >> <\"out.txt\", \"привет\">;",
      "codegen": "await __kz.writeFile({rest})",
      "returns": "void"
    },
    {
      "id": "appendFile",
      "name": "appendFile",
      "aliases": [
        "append"
      ],
      "category": "files",
      "args": "list",
      "params": [
        "path",
        "text"
      ],
      "description": "Дописать текст в конец файла (только Node.js)",
      "example": "appendFile >> <\"log.txt\", \"ещё строка\">;",
      "codegen": "await __kz.appendFile({rest})",
      "returns": "void"
    },
    {
      "id": "exists",
      "name": "exists",
      "aliases": [
        "fileExists"
      ],
      "category": "files",
      "args": "single",
      "params": [
        "path"
      ],
      "description": "Существует ли файл или папка (только Node.js)",
      "example": "?exists >> \"data.txt\" >> [ log >> readFile >> \"data.txt\"; ]",
      "codegen": "await __kz.exists({0})",
      "returns": "boolean"
    },
    {
      "id": "listDir",
      "name": "listDir",
      "aliases": [
        "ls"
      ],
      "category": "files",
      "args": "single",
      "params": [
        "path"
      ],
      "description": "Список файлов в папке (только Node.js)",
      "example": "log >> listDir >> \".\";",
      "codegen": "await __kz.listDir({0})",
      "returns": "array"
    },
    {
      "id": "removeFile",
      "name": "removeFile",
      "aliases": [
        "deleteFile"
      ],
      "category": "files",
      "args": "single",
      "params": [
        "path"
      ],
      "description": "Удалить файл (только Node.js, осторожно!)",
      "example": "removeFile >> \"temp.txt\";",
      "codegen": "await __kz.removeFile({0})",
      "returns": "void"
    },
    {
      "id": "httpGet",
      "name": "httpGet",
      "aliases": [
        "get"
      ],
      "category": "http",
      "args": "single",
      "params": [
        "url"
      ],
      "description": "GET-запрос, вернуть текст ответа",
      "example": ":html = httpGet >> \"https://example.com\";",
      "codegen": "await __kz.httpGet({0})",
      "returns": "string"
    },
    {
      "id": "httpJson",
      "name": "httpJson",
      "aliases": [
        "getJson"
      ],
      "category": "http",
      "args": "single",
      "params": [
        "url"
      ],
      "description": "GET-запрос, вернуть разобранный JSON",
      "example": ":data = httpJson >> \"https://api.github.com\";",
      "codegen": "await __kz.httpJson({0})",
      "returns": "any"
    },
    {
      "id": "httpPost",
      "name": "httpPost",
      "aliases": [
        "post"
      ],
      "category": "http",
      "args": "list",
      "params": [
        "url",
        "body"
      ],
      "description": "POST-запрос с телом, вернуть текст ответа",
      "example": ":res = httpPost >> <url, jsonStringify >> payload>;",
      "codegen": "await __kz.httpPost({rest})",
      "returns": "string"
    },
    {
      "id": "domGet",
      "name": "domGet",
      "aliases": [],
      "category": "dom",
      "args": "single",
      "params": [
        "selector"
      ],
      "description": "Найти элемент по CSS-селектору (браузер)",
      "example": ":title = domGet >> \"h1\";",
      "codegen": "__kz.domGet({0})",
      "returns": "element"
    },
    {
      "id": "domText",
      "name": "domText",
      "aliases": [
        "text"
      ],
      "category": "dom",
      "args": "list",
      "params": [
        "selector",
        "text"
      ],
      "description": "Поставить текст элемента (браузер)",
      "example": "domText >> <\"h1\", \"Привет!\">;",
      "codegen": "__kz.domText({rest})",
      "returns": "void"
    },
    {
      "id": "domHtml",
      "name": "domHtml",
      "aliases": [
        "html"
      ],
      "category": "dom",
      "args": "list",
      "params": [
        "selector",
        "html"
      ],
      "description": "Поставить HTML внутрь элемента (браузер)",
      "example": "domHtml >> <\"#app\", \"<b>Привет</b>\">;",
      "codegen": "__kz.domHtml({rest})",
      "returns": "void"
    },
    {
      "id": "domStyle",
      "name": "domStyle",
      "aliases": [
        "css"
      ],
      "category": "dom",
      "args": "list",
      "params": [
        "selector",
        "property",
        "value"
      ],
      "description": "Изменить CSS-свойство элемента (браузер)",
      "example": "domStyle >> <\"h1\", \"color\", \"tomato\">;",
      "codegen": "__kz.domStyle({rest})",
      "returns": "void"
    },
    {
      "id": "domOn",
      "name": "domOn",
      "aliases": [
        "on"
      ],
      "category": "dom",
      "args": "list",
      "params": [
        "selector",
        "event",
        "handler"
      ],
      "description": "Подписаться на событие элемента (браузер)",
      "example": "domOn >> <\"#btn\", \"click\", onClick>;",
      "codegen": "__kz.domOn({rest})",
      "returns": "void"
    },
    {
      "id": "domAdd",
      "name": "domAdd",
      "aliases": [
        "domAppend"
      ],
      "category": "dom",
      "args": "list",
      "params": [
        "selector",
        "html"
      ],
      "description": "Добавить HTML в конец элемента (браузер)",
      "example": "domAdd >> <\"#list\", \"<li>новый</li>\">;",
      "codegen": "__kz.domAdd({rest})",
      "returns": "void"
    },
    {
      "id": "domValue",
      "name": "domValue",
      "aliases": [
        "value"
      ],
      "category": "dom",
      "args": "list",
      "params": [
        "selector",
        "value"
      ],
      "description": "Прочитать или записать value поля ввода (браузер)",
      "example": ":text = domValue >> <\"#name\", null>;",
      "codegen": "__kz.domValue({rest})",
      "returns": "any"
    },
    {
      "id": "error",
      "name": "error",
      "aliases": [
        "newError"
      ],
      "category": "utils",
      "args": "single",
      "params": [
        "message"
      ],
      "description": "Создать объект ошибки",
      "example": ":e = error >> \"сообщение\";",
      "codegen": "new Error({0})",
      "returns": "error"
    },
    {
      "id": "assert",
      "name": "assert",
      "aliases": [
        "expect"
      ],
      "category": "utils",
      "args": "list",
      "min": 1,
      "max": 2,
      "params": [
        "condition",
        "message"
      ],
      "description": "Упасть с ошибкой, если условие ложно",
      "example": "assert >> <age >= 18, \"нужно 18+\">;",
      "codegen": "__kz.assert({rest})",
      "returns": "void"
    },
    {
      "id": "uuid",
      "name": "uuid",
      "aliases": [
        "id"
      ],
      "category": "utils",
      "args": "none",
      "params": [],
      "description": "Случайный уникальный идентификатор",
      "example": ":id = uuid;",
      "codegen": "__kz.uuid()",
      "returns": "string"
    },
    {
      "id": "clone",
      "name": "clone",
      "aliases": [
        "copy",
        "deepCopy"
      ],
      "category": "utils",
      "args": "single",
      "params": [
        "value"
      ],
      "description": "Глубокая копия массива или объекта",
      "example": ":copy = clone >> items;",
      "codegen": "__kz.clone({0})",
      "returns": "any"
    },
    {
      "id": "env",
      "name": "env",
      "aliases": [
        "getEnv"
      ],
      "category": "utils",
      "args": "single",
      "params": [
        "name"
      ],
      "description": "Прочитать переменную окружения (Node.js)",
      "example": ":key = env >> \"KUZA_API_KEY\";",
      "codegen": "__kz.env({0})",
      "returns": "string"
    },
    {
      "id": "args",
      "name": "args",
      "aliases": [
        "cliArgs"
      ],
      "category": "utils",
      "args": "none",
      "params": [],
      "description": "Аргументы командной строки",
      "example": "log >> args;",
      "codegen": "__kz.argv()",
      "returns": "array"
    },
    {
      "id": "tableFrom",
      "name": "tableFrom",
      "aliases": [
        "fromRows",
        "rowsToTable"
      ],
      "category": "tables",
      "args": "single",
      "params": [
        "rows"
      ],
      "description": "Превратить массив объектов в таблицу",
      "example": ":users = tableFrom >> data;",
      "codegen": "__kz.tableFrom({0})",
      "returns": "array"
    },
    {
      "id": "tableSave",
      "name": "tableSave",
      "aliases": [
        "saveTable"
      ],
      "category": "tables",
      "args": "list",
      "params": [
        "table",
        "path"
      ],
      "description": "Сохранить таблицу в JSON-файл (только Node.js)",
      "example": "tableSave >> <users, \"users.json\">;",
      "codegen": "await __kz.tableSave({0}, {1})",
      "returns": "number"
    },
    {
      "id": "tableLoad",
      "name": "tableLoad",
      "aliases": [
        "loadTable"
      ],
      "category": "tables",
      "args": "single",
      "params": [
        "path"
      ],
      "description": "Загрузить таблицу из JSON-файла (только Node.js)",
      "example": ":users = tableLoad >> \"users.json\";",
      "codegen": "await __kz.tableLoad({0})",
      "returns": "array"
    },
    {
      "id": "page",
      "name": "page",
      "aliases": [],
      "category": "site",
      "args": "single",
      "params": [
        "title"
      ],
      "description": "Начать страницу: сбросить содержимое и задать заголовок вкладки",
      "example": "page >> \"Мой сайт\";",
      "codegen": "__kz.sitePage({0})",
      "returns": "void"
    },
    {
      "id": "heading",
      "name": "heading",
      "aliases": [],
      "category": "site",
      "args": "list",
      "min": 1,
      "max": 2,
      "params": [
        "text",
        "className"
      ],
      "description": "Крупный заголовок страницы",
      "example": "heading >> \"Привет!\";",
      "codegen": "__kz.siteHeading({rest})",
      "returns": "void"
    },
    {
      "id": "para",
      "name": "para",
      "aliases": [],
      "category": "site",
      "args": "list",
      "min": 1,
      "max": 2,
      "params": [
        "text",
        "className"
      ],
      "description": "Абзац текста",
      "example": "para >> \"Мой первый сайт на Kuza.\";",
      "codegen": "__kz.sitePara({rest})",
      "returns": "void"
    },
    {
      "id": "button",
      "name": "button",
      "aliases": [],
      "category": "site",
      "args": "list",
      "min": 1,
      "max": 3,
      "params": [
        "text",
        "handler",
        "className"
      ],
      "description": "Кнопка; второй аргумент — обработчик, третий — Tailwind class list",
      "example": "button<\"Нажми\", onClick>;",
      "codegen": "__kz.siteButton({rest})",
      "returns": "void"
    },
    {
      "id": "field",
      "name": "field",
      "aliases": [],
      "category": "site",
      "args": "list",
      "min": 1,
      "max": 2,
      "params": [
        "placeholder",
        "name"
      ],
      "description": "Поле ввода; имя нужно, чтобы прочитать значение командой fieldValue",
      "example": "field<\"Твоё имя\", \"name\">;",
      "codegen": "__kz.siteField({rest})",
      "returns": "void"
    },
    {
      "id": "fieldValue",
      "name": "fieldValue",
      "aliases": [],
      "category": "site",
      "args": "single",
      "params": [
        "name"
      ],
      "description": "Прочитать то, что ввёл пользователь в поле с таким именем",
      "example": "log >> fieldValue >> \"name\";",
      "codegen": "__kz.siteValue({0})",
      "returns": "string"
    },
    {
      "id": "list",
      "name": "list",
      "aliases": [],
      "category": "site",
      "args": "single",
      "params": [
        "items"
      ],
      "description": "Список: каждый элемент массива станет пунктом",
      "example": "list >> [\"Первый\", \"Второй\"];",
      "codegen": "__kz.siteList({0})",
      "returns": "void"
    },
    {
      "id": "link",
      "name": "link",
      "aliases": [],
      "category": "site",
      "args": "list",
      "min": 2,
      "max": 3,
      "params": [
        "text",
        "href",
        "className"
      ],
      "description": "Ссылка; третий аргумент — Tailwind class list",
      "example": "link<\"Документация\", \"https://example.com\">;",
      "codegen": "__kz.siteLink({rest})",
      "returns": "void"
    },
    {
      "id": "image",
      "name": "image",
      "aliases": [],
      "category": "site",
      "args": "list",
      "min": 1,
      "max": 2,
      "params": [
        "src",
        "alt"
      ],
      "description": "Картинка по адресу",
      "example": "image<\"./logo.png\", \"Логотип\">;",
      "codegen": "__kz.siteImage({rest})",
      "returns": "void"
    },
    {
      "id": "render",
      "name": "render",
      "aliases": [],
      "category": "site",
      "args": "none",
      "params": [],
      "description": "Нарисовать то, что собрано командами страницы (браузер)",
      "example": "render;",
      "codegen": "__kz.siteRender()",
      "returns": "void"
    },
    {
      "id": "body",
      "name": "body",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "description": "Контейнер body; в <> можно передать Tailwind-классы",
      "example": "body<\"flex gap-4\"> >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"body\", {rest})",
      "returns": "void",
      "min": 0,
      "max": 1
    },
    {
      "id": "box",
      "name": "box",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "description": "Контейнер box; в <> можно передать Tailwind-классы",
      "example": "box<\"flex gap-4\"> >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"box\", {rest})",
      "returns": "void",
      "min": 0,
      "max": 1
    },
    {
      "id": "row",
      "name": "row",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "description": "Контейнер row; в <> можно передать Tailwind-классы",
      "example": "row<\"flex gap-4\"> >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"row\", {rest})",
      "returns": "void",
      "min": 0,
      "max": 1
    },
    {
      "id": "column",
      "name": "column",
      "aliases": [
        "col"
      ],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "description": "Контейнер column; в <> можно передать Tailwind-классы",
      "example": "column<\"flex gap-4\"> >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"column\", {rest})",
      "returns": "void",
      "min": 0,
      "max": 1
    },
    {
      "id": "card",
      "name": "card",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "description": "Контейнер card; в <> можно передать Tailwind-классы",
      "example": "card<\"flex gap-4\"> >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"card\", {rest})",
      "returns": "void",
      "min": 0,
      "max": 1
    },
    {
      "id": "section",
      "name": "section",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "description": "Контейнер section; в <> можно передать Tailwind-классы",
      "example": "section<\"flex gap-4\"> >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"section\", {rest})",
      "returns": "void",
      "min": 0,
      "max": 1
    },
    {
      "id": "nav",
      "name": "nav",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "description": "Контейнер nav; в <> можно передать Tailwind-классы",
      "example": "nav<\"flex gap-4\"> >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"nav\", {rest})",
      "returns": "void",
      "min": 0,
      "max": 1
    },
    {
      "id": "storeGet",
      "name": "storeGet",
      "aliases": [
        "loadData"
      ],
      "category": "storage",
      "args": "list",
      "min": 1,
      "max": 2,
      "params": [
        "key",
        "fallback"
      ],
      "description": "Прочитать значение из localStorage (JSON), при отсутствии вернуть fallback",
      "example": ":name = storeGet >> <\"name\", \"мир\">;",
      "codegen": "__kz.storageGet({rest})",
      "returns": "any"
    },
    {
      "id": "storeSet",
      "name": "storeSet",
      "aliases": [
        "saveData"
      ],
      "category": "storage",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "key",
        "value"
      ],
      "description": "Сохранить значение в localStorage и вернуть его",
      "example": "storeSet >> <\"name\", \"Kuza\">;",
      "codegen": "__kz.storageSet({rest})",
      "returns": "any"
    },
    {
      "id": "storeRemove",
      "name": "storeRemove",
      "aliases": [],
      "category": "storage",
      "args": "single",
      "params": [
        "key"
      ],
      "description": "Удалить значение из localStorage",
      "example": "storeRemove >> \"name\";",
      "codegen": "__kz.storageRemove({0})",
      "returns": "void"
    },
    {
      "id": "storeClear",
      "name": "storeClear",
      "aliases": [],
      "category": "storage",
      "args": "none",
      "params": [],
      "description": "Очистить localStorage текущего сайта",
      "example": "storeClear;",
      "codegen": "__kz.storageClear()",
      "returns": "void"
    },
    {
      "id": "route",
      "name": "route",
      "aliases": [],
      "category": "server",
      "args": "list",
      "min": 3,
      "max": 3,
      "params": [
        "method",
        "path",
        "handler"
      ],
      "description": "Зарегистрировать HTTP-маршрут; путь поддерживает параметры /users/:id",
      "example": "route >> <\"GET\", \"/users/:id\", showUser>;",
      "codegen": "__kz.serverRoute({0}, {1}, {2})",
      "returns": "void"
    },
    {
      "id": "respond",
      "name": "respond",
      "aliases": [],
      "category": "server",
      "args": "list",
      "min": 1,
      "max": 3,
      "params": [
        "payload",
        "status",
        "headers"
      ],
      "description": "Ответить на текущий запрос; объект автоматически превращается в JSON",
      "example": "respond >> <{ ok: true }, 200>;",
      "codegen": "__kz.serverRespond({rest})",
      "returns": "any"
    },
    {
      "id": "param",
      "name": "param",
      "aliases": [],
      "category": "server",
      "args": "single",
      "params": [
        "name"
      ],
      "description": "Параметр пути из маршрута /users/:id",
      "example": ":id = param >> \"id\";",
      "codegen": "__kz.serverParam({0})",
      "returns": "string"
    },
    {
      "id": "query",
      "name": "query",
      "aliases": [
        "queryParam"
      ],
      "category": "server",
      "args": "single",
      "params": [
        "name"
      ],
      "description": "Параметр строки запроса ?name=value",
      "example": ":q = query >> \"q\";",
      "codegen": "__kz.serverQuery({0})",
      "returns": "string"
    },
    {
      "id": "requestBody",
      "name": "requestBody",
      "aliases": [
        "bodyData"
      ],
      "category": "server",
      "args": "none",
      "params": [],
      "description": "Тело текущего запроса: JSON-объект или строка",
      "example": ":data = requestBody;",
      "codegen": "__kz.serverBody()",
      "returns": "any"
    },
    {
      "id": "header",
      "name": "header",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "min": 0,
      "max": 1,
      "description": "Шапка страницы; в <> можно передать Tailwind-классы",
      "example": "header >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"header\", {rest})",
      "returns": "void"
    },
    {
      "id": "method",
      "name": "method",
      "aliases": [],
      "category": "server",
      "args": "none",
      "params": [],
      "description": "HTTP-метод текущего запроса",
      "example": ":m = method;",
      "codegen": "__kz.serverMethod()",
      "returns": "string"
    },
    {
      "id": "serverPath",
      "name": "serverPath",
      "aliases": [],
      "category": "server",
      "args": "none",
      "params": [],
      "description": "Путь текущего запроса",
      "example": ":p = serverPath;",
      "codegen": "__kz.serverPath()",
      "returns": "string"
    },
    {
      "id": "listen",
      "name": "listen",
      "aliases": [],
      "category": "server",
      "args": "single",
      "params": [
        "port"
      ],
      "description": "Запустить HTTP-сервер (только Node.js); используется kuza serve",
      "example": "listen >> 3000;",
      "codegen": "__kz.serverListen({0})",
      "returns": "server"
    },
    {
      "id": "last",
      "name": "last",
      "aliases": [
        "tail"
      ],
      "category": "arrays",
      "args": "single",
      "params": [
        "array"
      ],
      "description": "Последний элемент массива",
      "example": ":x = last >> [1, 2, 3];",
      "codegen": "({0} || [])[{0}.length - 1]",
      "returns": "any"
    },
    {
      "id": "take",
      "name": "take",
      "aliases": [
        "first"
      ],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "n"
      ],
      "description": "Первые n элементов (копия)",
      "example": ":top3 = take >> <items, 3>;",
      "codegen": "({0} || []).slice(0, {1})",
      "returns": "array"
    },
    {
      "id": "drop",
      "name": "drop",
      "aliases": [
        "skip"
      ],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "n"
      ],
      "description": "Массив без первых n элементов (копия)",
      "example": ":rest = drop >> <items, 2>;",
      "codegen": "({0} || []).slice({1})",
      "returns": "array"
    },
    {
      "id": "chunk",
      "name": "chunk",
      "aliases": [
        "chunks"
      ],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "size"
      ],
      "description": "Разбить массив на группы по size элементов",
      "example": ":pages = chunk >> <items, 10>;",
      "codegen": "({0} || []).reduce((acc, item, i) => (i % {1} === 0 ? acc.push([item]) : acc[acc.length - 1].push(item), acc), [])",
      "returns": "array"
    },
    {
      "id": "sumOf",
      "name": "sumOf",
      "aliases": [
        "totalOf"
      ],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "getter"
      ],
      "description": "Сумма значений, которые возвращает функция",
      "example": ":total = sumOf >> <items, (x) -> x.price>;",
      "codegen": "({0} || []).reduce((total, item) => total + Number(({1})(item) || 0), 0)",
      "returns": "number"
    },
    {
      "id": "reduce",
      "name": "reduce",
      "aliases": [
        "fold"
      ],
      "category": "arrays",
      "args": "list",
      "min": 3,
      "max": 3,
      "params": [
        "array",
        "accumulator",
        "initial"
      ],
      "description": "Свернуть массив в одно значение: (acc, item) -> acc",
      "example": ":total = reduce >> <items, (acc, x) -> acc + x, 0>;",
      "codegen": "__kz.reduce({rest})",
      "returns": "any"
    },
    {
      "id": "flatMap",
      "name": "flatMap",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "change"
      ],
      "description": "Преобразовать каждый элемент и слить результаты в один массив",
      "example": ":tags = flatMap >> <posts, (p) -> p.tags>;",
      "codegen": "__kz.flatMap({0}, {1})",
      "returns": "array"
    },
    {
      "id": "partition",
      "name": "partition",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "check"
      ],
      "description": "Разделить массив на [подходящие, остальные]",
      "example": ":groups = partition >> <users, (u) -> u.active>;",
      "codegen": "__kz.partition({0}, {1})",
      "returns": "array"
    },
    {
      "id": "zip",
      "name": "zip",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "left",
        "right"
      ],
      "description": "Объединить два массива в пары по индексу",
      "example": ":pairs = zip >> <names, ages>;",
      "codegen": "__kz.zip({0}, {1})",
      "returns": "array"
    },
    {
      "id": "uniqueBy",
      "name": "uniqueBy",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "array",
        "key"
      ],
      "description": "Убрать дубликаты по результату функции",
      "example": ":once = uniqueBy >> <users, (u) -> u.email>;",
      "codegen": "__kz.uniqueBy({0}, {1})",
      "returns": "array"
    },
    {
      "id": "union",
      "name": "union",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "left",
        "right"
      ],
      "description": "Объединение двух массивов без дубликатов",
      "example": ":all = union >> <a, b>;",
      "codegen": "__kz.union({0}, {1})",
      "returns": "array"
    },
    {
      "id": "intersect",
      "name": "intersect",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "left",
        "right"
      ],
      "description": "Пересечение двух массивов",
      "example": ":both = intersect >> <a, b>;",
      "codegen": "__kz.intersect({0}, {1})",
      "returns": "array"
    },
    {
      "id": "difference",
      "name": "difference",
      "aliases": [],
      "category": "arrays",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "left",
        "right"
      ],
      "description": "Элементы первого массива, которых нет во втором",
      "example": ":onlyA = difference >> <a, b>;",
      "codegen": "__kz.difference({0}, {1})",
      "returns": "array"
    },
    {
      "id": "whereRows",
      "name": "whereRows",
      "aliases": [
        "filterRows"
      ],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "check"
      ],
      "description": "Строки таблицы, подходящие под условие",
      "example": ":adults = whereRows >> <users, (row) -> row.age >= 18>;",
      "codegen": "({0} || []).filter({1})",
      "returns": "array"
    },
    {
      "id": "orderBy",
      "name": "orderBy",
      "aliases": [
        "sortRows"
      ],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 3,
      "params": [
        "table",
        "key",
        "direction"
      ],
      "description": "Отсортировать строки по колонке (direction: \"asc\" или \"desc\")",
      "example": ":sorted = orderBy >> <users, \"age\", \"desc\">;",
      "codegen": "[...({0} || [])].sort((a, b) => ((a, b) => (a === b ? 0 : a > b ? 1 : -1))(a[{1}], b[{1}]) * ({2} === \"desc\" ? -1 : 1))",
      "returns": "array"
    },
    {
      "id": "groupBy",
      "name": "groupBy",
      "aliases": [
        "groupRows"
      ],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "key"
      ],
      "description": "Сгруппировать строки по значению колонки",
      "example": ":byCity = groupBy >> <users, \"city\">;",
      "codegen": "({0} || []).reduce((groups, row) => (groups[row[{1}]] = groups[row[{1}]] || [], groups[row[{1}]].push(row), groups), {})",
      "returns": "object"
    },
    {
      "id": "pluck",
      "name": "pluck",
      "aliases": [
        "columnOf"
      ],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "key"
      ],
      "description": "Массив значений одной колонки",
      "example": ":names = pluck >> <users, \"name\">;",
      "codegen": "({0} || []).map((row) => row[{1}])",
      "returns": "array"
    },
    {
      "id": "sumBy",
      "name": "sumBy",
      "aliases": [
        "totalBy"
      ],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "key"
      ],
      "description": "Сумма числовой колонки",
      "example": ":revenue = sumBy >> <orders, \"amount\">;",
      "codegen": "({0} || []).reduce((total, row) => total + Number(row[{1}] || 0), 0)",
      "returns": "number"
    },
    {
      "id": "avgBy",
      "name": "avgBy",
      "aliases": [
        "averageBy"
      ],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "key"
      ],
      "description": "Среднее значение числовой колонки",
      "example": ":average = avgBy >> <orders, \"amount\">;",
      "codegen": "({0} || []).length ? ({0}).reduce((total, row) => total + Number(row[{1}] || 0), 0) / ({0}).length : 0",
      "returns": "number"
    },
    {
      "id": "countBy",
      "name": "countBy",
      "aliases": [
        "tally"
      ],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "key"
      ],
      "description": "Сколько раз встречается каждое значение колонки",
      "example": ":stats = countBy >> <users, \"city\">;",
      "codegen": "({0} || []).reduce((counts, row) => (counts[row[{1}]] = (counts[row[{1}]] || 0) + 1, counts), {})",
      "returns": "object"
    },
    {
      "id": "indexBy",
      "name": "indexBy",
      "aliases": [
        "keyedBy"
      ],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "key"
      ],
      "description": "Сделать объект вида {значение колонки: строка} для быстрого поиска",
      "example": ":byId = indexBy >> <users, \"id\">;",
      "codegen": "({0} || []).reduce((index, row) => (index[row[{1}]] = row, index), {})",
      "returns": "object"
    },
    {
      "id": "updateRows",
      "name": "updateRows",
      "aliases": [
        "patchRows"
      ],
      "category": "tables",
      "args": "list",
      "min": 3,
      "max": 3,
      "params": [
        "table",
        "check",
        "change"
      ],
      "description": "Новая таблица: у подходящих строк колонки заменяются на результат change",
      "example": ":updated = updateRows >> <users, (row) -> row.age >= 18, (row) -> {active: true}>;",
      "codegen": "({0} || []).map((row) => (({1})(row) ? Object.assign({}, row, ({2})(row)) : row))",
      "returns": "array"
    },
    {
      "id": "columns",
      "name": "columns",
      "aliases": [
        "selectColumns",
        "pickColumns"
      ],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "keys"
      ],
      "description": "Оставить в каждой строке только указанные колонки",
      "example": ":brief = pick >> <users, [\"id\", \"name\"]>;",
      "codegen": "({0} || []).map((row) => Object.fromEntries(({1} || []).map((key) => [key, row[key]])))",
      "returns": "array"
    },
    {
      "id": "rowCount",
      "name": "rowCount",
      "aliases": [
        "rowsCount"
      ],
      "category": "tables",
      "args": "single",
      "params": [
        "table"
      ],
      "description": "Количество строк таблицы",
      "example": ":n = rowCount >> users;",
      "codegen": "__kz.rowCount({0})",
      "returns": "number"
    },
    {
      "id": "firstRow",
      "name": "firstRow",
      "aliases": [],
      "category": "tables",
      "args": "single",
      "params": [
        "table"
      ],
      "description": "Первая строка таблицы или null",
      "example": ":user = firstRow >> users;",
      "codegen": "__kz.firstRow({0})",
      "returns": "object"
    },
    {
      "id": "lastRow",
      "name": "lastRow",
      "aliases": [],
      "category": "tables",
      "args": "single",
      "params": [
        "table"
      ],
      "description": "Последняя строка таблицы или null",
      "example": ":user = lastRow >> users;",
      "codegen": "__kz.lastRow({0})",
      "returns": "object"
    },
    {
      "id": "takeRows",
      "name": "takeRows",
      "aliases": [],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "count"
      ],
      "description": "Первые n строк таблицы",
      "example": ":top = takeRows >> <users, 10>;",
      "codegen": "__kz.takeRows({0}, {1})",
      "returns": "array"
    },
    {
      "id": "dropRows",
      "name": "dropRows",
      "aliases": [],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "count"
      ],
      "description": "Строки таблицы без первых n",
      "example": ":rest = dropRows >> <users, 10>;",
      "codegen": "__kz.dropRows({0}, {1})",
      "returns": "array"
    },
    {
      "id": "distinctRows",
      "name": "distinctRows",
      "aliases": [],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "table",
        "key"
      ],
      "description": "Уникальные строки по колонке или функции",
      "example": ":once = distinctRows >> <users, (u) -> u.email>;",
      "codegen": "__kz.distinctRows({0}, {1})",
      "returns": "array"
    },
    {
      "id": "sortRowsBy",
      "name": "sortRowsBy",
      "aliases": [],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 3,
      "params": [
        "table",
        "key",
        "direction"
      ],
      "description": "Отсортировать таблицу по колонке, вернуть новую таблицу",
      "example": ":sorted = sortRowsBy >> <users, \"age\", \"desc\">;",
      "codegen": "__kz.sortRowsBy({rest})",
      "returns": "array"
    },
    {
      "id": "mergeTables",
      "name": "mergeTables",
      "aliases": [],
      "category": "tables",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "left",
        "right"
      ],
      "description": "Объединить строки двух таблиц, сохранив все колонки",
      "example": ":all = mergeTables >> <admins, users>;",
      "codegen": "__kz.mergeTables({0}, {1})",
      "returns": "array"
    },
    {
      "id": "tableFromRows",
      "name": "tableFromRows",
      "aliases": [],
      "category": "tables",
      "args": "list",
      "min": 1,
      "max": 2,
      "params": [
        "rows",
        "columns"
      ],
      "description": "Создать таблицу из массива объектов (колонки можно задать явно)",
      "example": ":users = tableFromRows >> <data, [\"id\", \"name\"]>;",
      "codegen": "__kz.tableFromRows({rest})",
      "returns": "array"
    },
    {
      "id": "requestHeader",
      "name": "requestHeader",
      "aliases": [
        "headerValue"
      ],
      "category": "server",
      "args": "single",
      "params": [
        "name"
      ],
      "description": "Заголовок текущего HTTP-запроса",
      "example": ":auth = requestHeader >> \"authorization\";",
      "codegen": "__kz.serverHeader({0})",
      "returns": "string"
    },
    {
      "id": "cors",
      "name": "cors",
      "aliases": [],
      "category": "server",
      "args": "single",
      "params": [
        "origin"
      ],
      "description": "Задать Access-Control-Allow-Origin для всех ответов сервера",
      "example": "cors >> \"https://example.com\";",
      "codegen": "__kz.serverCors({0})",
      "returns": "string"
    },
    {
      "id": "emit",
      "name": "emit",
      "aliases": [
        "emitEvent"
      ],
      "category": "integration",
      "args": "list",
      "min": 1,
      "max": 2,
      "params": [
        "name",
        "detail"
      ],
      "description": "Отправить CustomEvent в браузере — слушают React/Vue/любой хост",
      "example": "emit >> <\"kuza:count\", { value: 5 }>;",
      "codegen": "__kz.emitEvent({rest})",
      "returns": "any"
    },
    {
      "id": "onEvent",
      "name": "onEvent",
      "aliases": [],
      "category": "integration",
      "args": "list",
      "min": 2,
      "max": 2,
      "params": [
        "name",
        "handler"
      ],
      "description": "Подписаться на событие хоста или другой части приложения",
      "example": "onEvent >> <\"kuza:count\", (data) -> log >> data>;",
      "codegen": "__kz.onEvent({0}, {1})",
      "returns": "function"
    },
    {
      "id": "hostCall",
      "name": "hostCall",
      "aliases": [],
      "category": "integration",
      "args": "list",
      "min": 1,
      "params": [
        "name",
        "args"
      ],
      "description": "Вызвать функцию, которую хост (React/Vue/Node) положил в globalThis",
      "example": ":result = hostCall >> <\"onLogin\", { id: 1 }>;",
      "codegen": "__kz.callHost({rest})",
      "returns": "any"
    },
    {
      "id": "hostValue",
      "name": "hostValue",
      "aliases": [],
      "category": "integration",
      "args": "single",
      "params": [
        "name"
      ],
      "description": "Прочитать значение из globalThis хоста",
      "example": ":token = hostValue >> \"__INITIAL_STATE__\";",
      "codegen": "__kz.hostValue({0})",
      "returns": "any"
    },
    {
      "id": "footer",
      "name": "footer",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "min": 0,
      "max": 1,
      "description": "Подвал страницы; в <> можно передать Tailwind-классы",
      "example": "footer >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"footer\", {rest})",
      "returns": "void"
    },
    {
      "id": "main",
      "name": "main",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "min": 0,
      "max": 1,
      "description": "Главная область страницы; в <> можно передать Tailwind-классы",
      "example": "main >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"main\", {rest})",
      "returns": "void"
    },
    {
      "id": "article",
      "name": "article",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "min": 0,
      "max": 1,
      "description": "Статья: текст с заголовками; в <> можно передать Tailwind-классы",
      "example": "article >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"article\", {rest})",
      "returns": "void"
    },
    {
      "id": "aside",
      "name": "aside",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "min": 0,
      "max": 1,
      "description": "Боковая колонка; в <> можно передать Tailwind-классы",
      "example": "aside >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"aside\", {rest})",
      "returns": "void"
    },
    {
      "id": "grid",
      "name": "grid",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "min": 0,
      "max": 1,
      "description": "Сетка: карточки сами разложатся по ширине; в <> можно передать Tailwind-классы",
      "example": "grid >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"grid\", {rest})",
      "returns": "void"
    },
    {
      "id": "hero",
      "name": "hero",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "min": 0,
      "max": 1,
      "description": "Крупный первый экран страницы; в <> можно передать Tailwind-классы",
      "example": "hero >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"hero\", {rest})",
      "returns": "void"
    },
    {
      "id": "form",
      "name": "form",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "min": 0,
      "max": 1,
      "description": "Форма: поля и кнопка отправки; в <> можно передать Tailwind-классы",
      "example": "form >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"form\", {rest})",
      "returns": "void"
    },
    {
      "id": "center",
      "name": "center",
      "aliases": [],
      "category": "site",
      "args": "block",
      "params": [
        "className"
      ],
      "min": 0,
      "max": 1,
      "description": "Центрированный блок; в <> можно передать Tailwind-классы",
      "example": "center >> [ para >> \"Текст\"; ];",
      "codegen": "__kz.uiOpen(\"center\", {rest})",
      "returns": "void"
    },
    {
      "id": "subheading",
      "name": "subheading",
      "aliases": [
        "subhead",
        "h2"
      ],
      "category": "site",
      "args": "list",
      "params": [
        "text",
        "className"
      ],
      "min": 1,
      "max": 2,
      "description": "Подзаголовок второго уровня",
      "example": "subheading >> \"Возможности\";",
      "codegen": "__kz.siteSubheading({rest})",
      "returns": "void"
    },
    {
      "id": "small",
      "name": "small",
      "aliases": [
        "muted"
      ],
      "category": "site",
      "args": "list",
      "params": [
        "text",
        "className"
      ],
      "min": 1,
      "max": 2,
      "description": "Мелкий приглушённый текст",
      "example": "small >> \"Работает без сборщика\";",
      "codegen": "__kz.siteSmall({rest})",
      "returns": "void"
    },
    {
      "id": "badge",
      "name": "badge",
      "aliases": [
        "tagBadge"
      ],
      "category": "site",
      "args": "list",
      "params": [
        "text",
        "className"
      ],
      "min": 1,
      "max": 2,
      "description": "Маленькая плашка-метка",
      "example": "badge >> \"beta\";",
      "codegen": "__kz.siteBadge({rest})",
      "returns": "void"
    },
    {
      "id": "quote",
      "name": "quote",
      "aliases": [
        "cite"
      ],
      "category": "site",
      "args": "list",
      "params": [
        "text",
        "author",
        "className"
      ],
      "min": 1,
      "max": 3,
      "description": "Цитата с необязательным автором",
      "example": "quote<\"Язык должен быть простым\", \"Кто-то\">;",
      "codegen": "__kz.siteQuote({rest})",
      "returns": "void"
    },
    {
      "id": "divider",
      "name": "divider",
      "aliases": [
        "hr"
      ],
      "category": "site",
      "args": "none",
      "params": [],
      "description": "Горизонтальная линия-разделитель",
      "example": "divider;",
      "codegen": "__kz.siteDivider()",
      "returns": "void"
    },
    {
      "id": "codeBlock",
      "name": "codeBlock",
      "aliases": [
        "code"
      ],
      "category": "site",
      "args": "list",
      "params": [
        "code",
        "className"
      ],
      "min": 1,
      "max": 2,
      "description": "Блок кода с моно-шрифтом",
      "example": "codeBlock >> 'log >> \"привет\";';",
      "codegen": "__kz.siteCode({rest})",
      "returns": "void"
    },
    {
      "id": "checkbox",
      "name": "checkbox",
      "aliases": [
        "check"
      ],
      "category": "site",
      "args": "list",
      "params": [
        "label",
        "name"
      ],
      "min": 1,
      "max": 2,
      "description": "Флажок; значение читается через fieldValue",
      "example": "checkbox<\"Согласен\", \"agree\">;",
      "codegen": "__kz.siteCheckbox({rest})",
      "returns": "void"
    },
    {
      "id": "choices",
      "name": "choices",
      "aliases": [
        "dropdown"
      ],
      "category": "site",
      "args": "list",
      "params": [
        "label",
        "options",
        "name"
      ],
      "min": 2,
      "max": 3,
      "description": "Выпадающий список вариантов",
      "example": "choices<\"План\", [\"Free\", \"Pro\"], \"plan\">;",
      "codegen": "__kz.siteChoices({rest})",
      "returns": "void"
    }
  ]
};
