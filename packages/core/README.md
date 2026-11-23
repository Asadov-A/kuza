# kuza-core

Компилятор и рантайм языка **Kuza**. Пакет не содержит команды `kuza` в терминале — для этого нужен `kuza-lang`. Используй `kuza-core`, когда хочешь встроить компиляцию Kuza в свой проект: Node.js-сервис, React-приложение, редактор, генератор или тесты.

```bash
npm i kuza-core
```

## Что умеет

- Лексер, парсер и генератор JavaScript: `:x = 5;`, `log >> x;`, `? ... || ...`, `while`, `for`, `foreach`, `func`, таблицы `table<...>` и SQL-подобный `select ... from ... where ...`.
- Команды из `commands.json` (132 записи, 16 категорий) — единственный источник истины для компилятора, документации, подсветки и сниппетов.
- Рантайм `__kz`: вывод, работа с текстом/массивами, файлы, HTTP, DOM, `localStorage`, бэкенд-роутинг.
- Экраны `view`: автоматическая перерисовка при изменении переменных экрана.
- Расширение команд через `defineCommand` — то, чем пользуются плагины CLI.

## Пример

```kuza
:name = "мир";
log >> "Привет, {name}!";

:users = table<id, name, age>;
users.add<1, "Аня", 17>;
users.add<2, "Боря", 22>;

:adults = select name from users where age >= 18 order by name;
table >> adults;
```

Экран для сайта:

```kuza
:count = 0;

view App<> >> [
  body<"p-8"> >> [
    heading >> <"Count: {count}", "text-2xl font-bold">;
    button >> <"Add one", increase, "rounded bg-orange-500 px-4 py-2">;
  ];
  render;
];

func increase<> >> [
  count = count + 1; // экран обновится сам
];
```

## API

```js
import { compile, compileOrThrow, run, parse, generate, tokenize } from "kuza-core";

const compiled = compile('log >> "привет";');
console.log(compiled.ok, compiled.code, compiled.errors);

const result = await run(":nums = [1, 2, 3];\nlog >> sum >> nums;");
console.log(result.output); // [{ type: "log", message: "6" }]
```

Основные экспорты:

- `compile`, `compileOrThrow`, `run`, `parse`, `generate`, `tokenize`;
- `formatDiagnostic`, `KuzaError`, `toDiagnostic`;
- `COMMANDS`, `CATEGORIES`, `KEYWORDS`, `STRUCTURES`, `allCommandNames`, `findCommand`, `defineCommand`;
- `NAME`, `EXT`, `FILE_EXT`, `VERSION`, `TAGLINE`, `COLORS`.

`compile` принимает опции `mode`, `includeRuntime`, `standalone`, `filename`, `resolveModule`. `run` выполняет скомпилированный код в Node.js и возвращает `{ ok, output, error }`.

## Свои команды

```js
import { defineCommand } from "kuza-core";

defineCommand({
  id: "shout",
  name: "shout",
  aliases: [],
  category: "output",
  args: "single",
  params: ["text"],
  description: "Выводит текст заглавными буквами",
  example: 'shout >> "привет";',
  codegen: "console.log(String({0}).toUpperCase())",
});
```

`{0}`, `{1}` заменяются аргументами, `{rest}` — всеми аргументами через запятую. Конфликтующие имена и алиасы отклоняются.

## Разработка

```bash
npm run generate   # обновить commands.generated.ts, docs/commands.md и артефакты VS Code
npm run build      # generate + tsc
npm test           # build + vitest
```

Новую команду добавляй в `commands.json`, затем запускай `npm run generate`. Не редактируй `commands.generated.ts` вручную.

Лицензия: MIT.
