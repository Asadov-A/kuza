/**
 * ЗНАНИЕ ЯЗЫКА ДЛЯ ИИ.
 *
 * Модель не «помнит» Kuza — ей нужно давать точный, актуальный контекст.
 * Здесь он собирается из самого компилятора (COMMANDS, STRUCTURES, VERSION),
 * поэтому после `npm run generate` ИИ автоматически знает все новые команды.
 *
 * Плюс: проектные инструкции (AGENTS.md, KUZA.md, CLAUDE.md) — как у
 * Claude Code и Codex, чтобы агент соблюдал правила конкретного проекта.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, COMMANDS, STRUCTURES, VERSION, NAME, EXT } from "kuza-core";

/** Файлы с правилами проекта: читаются по порядку, все найденные. */
export const INSTRUCTION_FILES = ["KUZA.md", "AGENTS.md", "CLAUDE.md", "docs/AGENTS.md"];

/** Категории, для которых в каталог команд стоит добавлять пример. */
const WITH_EXAMPLES = new Set(["output", "site", "tables", "server", "storage", "files", "http"]);

let cachedCliVersion: string | undefined;

/** Версия установленного CLI (из его package.json). */
export function cliVersion(): string {
  if (cachedCliVersion) return cachedCliVersion;
  try {
    const path = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const data = JSON.parse(readFileSync(path, "utf8")) as { version?: string };
    cachedCliVersion = data.version ?? "0.0.0";
  } catch {
    cachedCliVersion = "0.0.0";
  }
  return cachedCliVersion;
}

/** Сигнатура команды в синтаксисе Kuza — для системного промпта. */
function signature(command: (typeof COMMANDS)[number]): string {
  switch (command.args) {
    case "none":
      return `${command.name};`;
    case "single":
      return `${command.name} >> value;`;
    case "block":
      return `${command.name}${command.params.length ? `<...>` : ""} >> [ ... ];`;
    default:
      return `${command.name}<${command.params.join(", ")}>;`;
  }
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Полный список команд, сгруппированный по категориям. */
export function commandCatalog(): string {
  const lines: string[] = [];
  for (const category of CATEGORIES) {
    const items = COMMANDS.filter((command) => command.category === category.id);
    if (items.length === 0) continue;
    lines.push(`\n### ${category.titleEn} (${category.id})`);
    for (const command of items) {
      const aliases = command.aliases.length ? ` (aliases: ${command.aliases.join(", ")})` : "";
      lines.push(`- \`${signature(command)}\` — ${oneLine(command.description)}${aliases}`);
      if (WITH_EXAMPLES.has(command.category) && command.example) {
        lines.push(`  example: \`${oneLine(command.example)}\``);
      }
    }
  }
  return lines.join("\n");
}

/** Структуры языка с короткими примерами: таблицы, функции, условия. */
export function structureReference(): string {
  return STRUCTURES.map(
    (structure) =>
      `- **${structure.name}** — \`${oneLine(structure.syntax)}\`\n  ${oneLine(structure.description)}`,
  ).join("\n");
}

/**
 * Всё, что модель должна знать о языке: версии, синтаксис, команды, подводные
 * камни. Собирается при каждом запуске, поэтому всегда соответствует коду.
 */
export function languageKnowledge(): string {
  return [
    `# ${NAME} language reference (core ${VERSION}, CLI ${cliVersion()})`,
    `Files use .${EXT}. Kuza compiles to plain JavaScript. One language for frontend pages, console programs and small HTTP backends.`,
    "",
    "## Syntax (this is the whole language, do not invent other constructs)",
    "- `:name = value;` — declare a variable. `let`/`const`/`var` do not exist.",
    "- `log >> value;` — output (also `warn`, `err`, `info`). No `console.log(...)`.",
    '- `:n = upper >> text;` — command with one argument. Angle form: `upper<text>` also works.',
    "- `cmd >> <a, b>;` — command with several arguments. In expressions: `:m = max >> <a, b>;`.",
    "- `func add<a, b> >> [ return a + b; ]` — function. Call: `add<1, 2>`.",
    "- `view App<> >> [ ...; render; ];` — a screen; assigning a variable it uses re-renders it.",
    "- `?cond >> [ ... ] || ?other >> [ ... ] || [ ... ]` — if / else if / else.",
    "- `while<cond> >> [ ... ]`, `for<:i = 0; i < 10; i++> >> [ ... ]`, `foreach<item : items> >> [ ... ]`.",
    "- Blocks are always `[ ... ]`, never `{ }`. Object literals are `{ key: value }`.",
    "- `try >> [ ... ] catch<e> >> [ ... ]`, `throw >> \"message\";`.",
    "- Strings: \"text\" and `template ${js}`; interpolation in normal strings: \"Привет, {name}!\".",
    "- Table access: `user.name`, `items[0]`, slice `items[1..3]`, pipe `items |> filter<(x) -> x > 2>`.",
    "- Comments: `## text` or `// text`.",
    "- Operators: `+ - * / % **`, `== != < > <= >=`, `and or not`, `=` `+=` `-=` `*=` `/=` `++` `--`.",
    "",
    "## Tables are the default data model",
    "- `:users = table<id, name, age>;` — columns. `insert into users values <1, \"Аня\", 17>;` adds a row.",
    "- `insert into users <{ id: 2, name: \"Боря\" }>;` — add by column names.",
    "- `select name, age from users where age >= 18 order by age desc limit 10;`",
    "- `update users set age = 18 where id = 1;` and `delete from users where age < 18;`.",
    "- `tableSave >> <users, \"users.json\">;` and `:users = tableLoad >> \"users.json\";` — JSON storage.",
    "- Row helpers: `whereRows`, `orderBy`, `groupBy`, `pluck`, `sumBy`, `avgBy`, `countBy`, `indexBy`.",
    "",
    "## Pages (frontend)",
    "- `page >> \"Title\";` resets the page; then `header`, `hero`, `section`, `grid`, `card`, `row`, `column`, `box`, `form`, `footer` build the layout.",
    "- Text and controls: `heading`, `subheading`, `para`, `small`, `badge`, `quote`, `divider`, `codeBlock`, `list`, `link`, `image`, `field`, `checkbox`, `choices`, `button`.",
    "- `field<\"Placeholder\", \"name\">;` + `fieldValue >> \"name\"` reads what the user typed.",
    "- `render;` draws the page. Without `render` nothing appears.",
    "- CSS classes are passed as the last argument: `card<\"p-4\"> >> [ ... ]` or `heading<\"Hi\", \"text-3xl\">`.",
    "",
    "## Backend and CLI",
    "- `route<\"GET\", \"/users/:id\", show>;`, `respond`, `param`, `query`, `requestBody`, `listen<3000>;` + `kuza serve server.kuza`.",
    "- Dev: `npm run dev` (`kuza dev`), build: `npm run build` (`kuza build`), check: `npm run check` (`kuza check`).",
    "- ES module for React/Vue/Svelte/Node: `kuza build logic.kuza --lib` exports every `func`.",
    "",
    "## Modules and npm packages",
    '- `use math;` / `use time;` / `use random;` / `use text;` / `use json;` — built in.',
    '- `use "./helpers.kuza";` — your own file (parsed into this program).',
    '- `use "lodash";` — npm package (real dynamic import). It must be installed; in a browser it needs a bundler or import map.',
    "- Prefer built-in commands over a dependency. Install only when the task really needs a package, then `use \"pkg\";`.",
    "",
    "## Language structures",
    structureReference(),
    "",
    "## Commands — the only commands that exist",
    "If a command is not in this list it does not exist. Do not invent commands and do not use JavaScript APIs when a command exists.",
    commandCatalog(),
    "",
    "## Common mistakes (wrong → right)",
    "- `let x = 1` → `:x = 1;`",
    "- `console.log(x)` → `log >> x;`",
    "- `if (x) { }` → `?x >> [ ... ]`; else is `||`.",
    "- `while (x) { }` → `while<x> >> [ ... ]`; braces are never blocks in Kuza.",
    "- `func f(x) { }` → `func f<x> >> [ ]`; call `f<1>`.",
    "- `field(\"a\")`, `button(\"a\", fn)` → `field<\"a\">;`, `button<\"a\", fn>;` (angle brackets, command names always win).",
    "- `len(items)` → `len >> items;` or `:n = len >> items;`",
    "- `users.push(row)` → `insert into users values <...>;`",
    "- `==` in a table filter is fine; in `where` a single `=` also means comparison.",
    "- `page` without `render` → nothing shows. Add `render;` at the end of the view.",
    "- Writing to a file outside the project or to node_modules is impossible — do not try.",
    "",
    `## Versions and upgrades`,
    `- Installed language/core: ${VERSION}. Installed CLI: ${cliVersion()}.`,
    "- `package.json` dependency `kuza-lang` decides the project version. If the project uses an older version and a needed feature is missing, use the `version` action, then `upgrade`.",
    "- `upgrade` runs `npm install kuza-lang@latest --save`. After upgrading, ask the user to restart commands; generated code may need `kuza check`.",
    "- Never edit node_modules or dist. Never publish or run `npm publish`.",
  ].join("\n");
}

export interface LoadedInstruction {
  file: string;
  text: string;
}

/** Прочитать AGENTS.md / KUZA.md / CLAUDE.md проекта. */
export function readProjectInstructions(root: string): LoadedInstruction[] {
  const found: LoadedInstruction[] = [];
  for (const file of INSTRUCTION_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    let text = readFileSync(path, "utf8").trim();
    if (!text) continue;
    if (text.length > 8000) text = text.slice(0, 8000) + "\n… [truncated]";
    found.push({ file, text });
  }
  return found;
}

/** Шаблон AGENTS.md для новых проектов и `kuza agent --init`. */
export const AGENTS_TEMPLATE = `# AGENTS.md — правила проекта на Kuza

Этот файл читает ИИ-агент Kuza (\`kuza agent "..."\`), как AGENTS.md в других
инструментах. Держите здесь то, что агент должен знать о проекте.

## Что это за проект

- Сайт на языке Kuza (\`.kuza\` → JavaScript). Исходники: \`main.kuza\`, \`pages/*.kuza\`.
- Данные — таблицы Kuza: \`table<...>\`, \`insert into\`, \`select\`, \`tableSave\`/\`tableLoad\`.
- Не редактируйте \`dist/\` и \`node_modules/\` — они генерируются.

## Команды

- \`npm run dev\` — локальный сервер с live reload.
- \`npm run build\` — сборка в \`dist/\`.
- \`npm run check\` — проверка всех \`.kuza\` (агент обязан прогнать её после правок).
- \`kuza docs\` — полный справочник команд (\`public/docs.html\`).
- \`kuza agent "задача"\` — этот агент.

## Правила кода

- Переменные: \`:name = value;\`, команды: \`log >> value;\`, аргументы: \`cmd<a, b>\`.
- Блоки — \`[ ... ]\`, условия — \`?cond >> [ ... ] || [ ... ]\`.
- Только команды из справочника Kuza; не выдумывать новые.
- Тексты и подписи — на языке проекта (по умолчанию русский).
- Стили — в \`public/styles.css\`; классы передаются последним аргументом тега.

## Что нельзя

- Менять \`.env\`, ключи и секреты.
- Удалять файлы без явной просьбы.
- Добавлять зависимости, если хватает встроенных команд.
`;
