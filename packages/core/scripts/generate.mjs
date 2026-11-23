#!/usr/bin/env node
/**
 * ГЕНЕРАТОР АРТЕФАКТОВ.
 *
 * Один файл commands.json — и из него появляется всё остальное:
 *   • src/commands.generated.ts  — данные для компилятора и автодополнения
 *   • ../../docs/commands.md     — документация
 *   • packages/vscode/syntaxes/* — подсветка для VS Code (если пакет есть)
 *   • packages/vscode/snippets/* — сниппеты (если пакет есть)
 *
 * Запуск: npm run generate   (из корня или из packages/core)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = join(here, "..");
const repoRoot = join(packageDir, "..", "..");

// ── 1. Читаем config.ts (единственный источник имени и расширения) ────
const configSource = readFileSync(join(packageDir, "src", "config.ts"), "utf8");
const pick = (key) => {
  const match = configSource.match(new RegExp(`export const ${key} = "([^"]*)"`));
  if (!match) throw new Error(`Не нашёл ${key} в src/config.ts`);
  return match[1];
};
const NAME = pick("NAME");
const EXT = pick("EXT");
const VERSION = pick("VERSION");
const TAGLINE = pick("TAGLINE");

// ── 2. Читаем и проверяем commands.json ───────────────────────────────
const dataPath = join(packageDir, "commands.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

const problems = [];
const categoryIds = new Set((data.categories ?? []).map((category) => category.id));
const seen = new Map();

for (const command of data.commands ?? []) {
  if (!categoryIds.has(command.category)) {
    problems.push(`Команда "${command.name}": неизвестная категория "${command.category}"`);
  }
  for (const name of [command.name, ...(command.aliases ?? [])]) {
    if (seen.has(name)) {
      problems.push(`Имя "${name}" встречается дважды: ${seen.get(name)} и ${command.name}`);
    } else {
      seen.set(name, command.name);
    }
  }
  const placeholders = [...String(command.codegen).matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
  for (const index of placeholders) {
    if (index >= (command.params?.length ?? 0)) {
      problems.push(
        `Команда "${command.name}": в codegen есть {${index}}, но параметров только ${command.params?.length ?? 0}`,
      );
    }
  }
  if (command.args === "none" && placeholders.length > 0) {
    problems.push(`Команда "${command.name}": args = "none", но codegen ждёт аргументы`);
  }
}

if (problems.length > 0) {
  console.error("❌ commands.json содержит ошибки:");
  for (const problem of problems) console.error("   • " + problem);
  process.exit(1);
}

// ── 3. src/commands.generated.ts ──────────────────────────────────────
const generatedTs = `// ⚠️ ЭТОТ ФАЙЛ СГЕНЕРИРОВАН ИЗ commands.json — не редактируй его вручную.
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

export const COMMANDS_DATA: CommandsDataShape = ${JSON.stringify(data, null, 2)};
`;

writeFileSync(join(packageDir, "src", "commands.generated.ts"), generatedTs, "utf8");

// ── 4. docs/commands.md ───────────────────────────────────────────────
const docs = [];
docs.push(`# Команды ${NAME}`);
docs.push("");
docs.push(
  `> Файл сгенерирован из \`packages/core/commands.json\`. Хочешь новую команду — добавь запись туда и запусти \`npm run generate\`.`,
);
docs.push("");
docs.push(`Версия: ${VERSION}. Расширение файлов: \`.${EXT}\`. ${TAGLINE}.`);
docs.push("");
docs.push(`Всего команд: **${data.commands.length}**.`);
docs.push("");
docs.push("## Синтаксис");
docs.push("");
docs.push("| Конструкция | Что делает |");
docs.push("| --- | --- |");
for (const structure of data.structures) {
  docs.push(`| \`${structure.syntax}\` | ${structure.description} |`);
}
docs.push("");
docs.push("### Пример программы");
docs.push("");
docs.push("```" + EXT);
docs.push(":name = \"Kuza\";");
docs.push("log >> `Привет, ${name}!`;");
docs.push("");
docs.push("func add<a, b> >> [");
docs.push("  return a + b;");
docs.push("]");
docs.push("");
docs.push("?add<2, 3> > 4 >> [");
docs.push("  log >> \"больше четырёх\";");
docs.push("] || [");
docs.push("  log >> \"мало\";");
docs.push("]");
docs.push("```");
docs.push("");
docs.push("## Ключевые слова");
docs.push("");
docs.push("| Ключевое слово | Что делает |");
docs.push("| --- | --- |");
for (const keyword of data.keywords) {
  docs.push(`| \`${keyword.name}\` | ${keyword.description} |`);
}
docs.push("");
docs.push("## Команды по категориям");
for (const category of data.categories) {
  const commands = data.commands.filter((command) => command.category === category.id);
  if (commands.length === 0) continue;
  docs.push("");
  docs.push(`### ${category.title}`);
  docs.push("");
  docs.push("| Команда | Что делает | Пример |");
  docs.push("| --- | --- | --- |");
  for (const command of commands) {
    const aliases = command.aliases?.length ? ` (${command.aliases.join(", ")})` : "";
    docs.push(
      `| \`${command.name}\`${aliases} | ${command.description} | \`${command.example.replace(/\|/g, "\\|")}\` |`,
    );
  }
}
docs.push("");
docs.push("## Как добавить свою команду");
docs.push("");
docs.push("1. Открой `packages/core/commands.json`.");
docs.push("2. Добавь объект в массив `commands`: имя, категория, аргументы, описание, пример и `codegen`.");
docs.push("3. В `codegen` подставляй аргументы через `{0}`, `{1}` или все сразу через `{rest}`.");
docs.push("4. Запусти `npm run generate` — обновятся компилятор, подсветка, сниппеты и этот файл.");
docs.push("");
docs.push("Пример:");
docs.push("");
docs.push("```json");
docs.push('{ "id": "shout", "name": "shout", "aliases": ["крик"], "category": "output",');
docs.push('  "args": "single", "params": ["text"], "description": "Вывести громко",');
docs.push('  "example": "shout >> \\"привет\\";", "codegen": "console.log(String({0}).toUpperCase() + \\"!\\")" }');
docs.push("```");
docs.push("");

mkdirSync(join(repoRoot, "docs"), { recursive: true });
writeFileSync(join(repoRoot, "docs", "commands.md"), docs.join("\n"), "utf8");

// ── 5. VS Code: подсветка и сниппеты (если пакет уже создан) ──────────
const vscodeDir = join(repoRoot, "packages", "vscode");
if (existsSync(vscodeDir)) {
  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const commandNames = [...new Set(data.commands.flatMap((command) => [command.name, ...(command.aliases ?? [])]))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
  // Слова, которые не являются командами, но должны подсвечиваться.
  const syntaxKeywords = [
    "select",
    "from",
    "where",
    "order",
    "by",
    "limit",
    "desc",
    "asc",
    "update",
    "set",
    "delete",
  ];
  const keywordNames = [...data.keywords.map((keyword) => keyword.name), ...syntaxKeywords]
    .map(escapeRegex)
    .join("|");

  const grammar = {
    $schema: "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
    name: NAME,
    scopeName: `source.${EXT}`,
    fileTypes: [EXT],
    patterns: [
      { include: "#comments" },
      { include: "#strings" },
      { include: "#numbers" },
      { include: "#keywords" },
      { include: "#commands" },
      { include: "#variables" },
      { include: "#operators" },
    ],
    repository: {
      comments: {
        patterns: [
          { name: "comment.line.double-hash." + EXT, match: "##.*$" },
          { name: "comment.line.double-slash." + EXT, match: "//.*$" },
        ],
      },
      strings: {
        patterns: [
          { name: "string.quoted.backtick." + EXT, begin: "`", end: "`" },
          { name: "string.quoted.double." + EXT, match: '"(?:[^"\\\\]|\\\\.)*"' },
          { name: "string.quoted.single." + EXT, match: "'(?:[^'\\\\]|\\\\.)*'" },
        ],
      },
      numbers: {
        patterns: [{ name: "constant.numeric." + EXT, match: "\\b\\d+(?:\\.\\d+)?\\b" }],
      },
      keywords: {
        patterns: [
          {
            name: "keyword.control." + EXT,
            match: `\\b(?:${keywordNames})\\b`,
          },
          { name: "constant.language." + EXT, match: "\\b(?:true|false|null)\\b" },
        ],
      },
      commands: {
        patterns: [{ name: "support.function.builtin." + EXT, match: `\\b(?:${commandNames})\\b` }],
      },
      variables: {
        patterns: [
          {
            match: ":(\\s*)([\\p{L}_$][\\p{L}\\p{N}_$]*)",
            captures: { 2: { name: "variable.other." + EXT } },
          },
        ],
      },
      operators: {
        patterns: [
          {
            name: "keyword.operator." + EXT,
            match: ">>|\\|>|->|\\.\\.|\\|\\||\\?|==|!=|<=|>=|\\*\\*|\\+=|-=|\\*=|/=|\\+\\+|--|&&|=",
          },
          { name: "punctuation.section.block.begin." + EXT, match: "\\[" },
          { name: "punctuation.section.block.end." + EXT, match: "\\]" },
        ],
      },
    },
  };

  mkdirSync(join(vscodeDir, "syntaxes"), { recursive: true });
  writeFileSync(
    join(vscodeDir, "syntaxes", `${EXT}.tmLanguage.json`),
    JSON.stringify(grammar, null, 2) + "\n",
    "utf8",
  );

  const snippets = {};
  for (const structure of data.structures) {
    snippets[structure.name] = {
      prefix: structure.name,
      body: structure.snippet.split("\n").map((line) => line.replace(/^\t+/, (tabs) => "\t".repeat(tabs.length))),
      description: structure.description,
    };
  }
  mkdirSync(join(vscodeDir, "snippets"), { recursive: true });
  writeFileSync(
    join(vscodeDir, "snippets", `${EXT}.json`),
    JSON.stringify(snippets, null, 2) + "\n",
    "utf8",
  );

  const languageConfiguration = {
    comments: { lineComment: "##" },
    brackets: [
      ["[", "]"],
      ["{", "}"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
    ],
    surroundingPairs: [
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    indentationRules: {
      increaseIndentPattern: "\\[\\s*$",
      decreaseIndentPattern: "^\\s*\\]",
    },
  };
  writeFileSync(
    join(vscodeDir, "language-configuration.json"),
    JSON.stringify(languageConfiguration, null, 2) + "\n",
    "utf8",
  );

  // Манифест расширения подтягиваем к config.ts: имя, расширение, версия.
  const manifestPath = join(vscodeDir, "package.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.name = NAME.toLowerCase() + "-vscode";
    manifest.displayName = NAME;
    manifest.description = NAME + " language support: syntax, completions, hovers and run";
    manifest.version = VERSION;
    manifest.activationEvents = [
      "onLanguage:" + EXT,
      ...(manifest.contributes.commands ?? []).map((entry) => "onCommand:" + entry.command),
    ];
    manifest.contributes.languages = [
      {
        id: EXT,
        aliases: [NAME, EXT],
        extensions: ["." + EXT],
        icon: {
          light: "./icons/" + EXT + "-light.png",
          dark: "./icons/" + EXT + "-dark.png",
        },
        configuration: "./language-configuration.json",
      },
    ];
    manifest.contributes.grammars = [
      { language: EXT, scopeName: "source." + EXT, path: "./syntaxes/" + EXT + ".tmLanguage.json" },
    ];
    manifest.contributes.snippets = [
      { language: EXT, path: "./snippets/" + EXT + ".json" },
    ];
    const runEntry = (manifest.contributes.commands ?? []).find(
      (entry) => entry.command === NAME.toLowerCase() + ".run",
    );
    if (runEntry && !runEntry.title) runEntry.title = "Run " + NAME + " file";
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  }

  console.log("   • VS Code: подсветка, сниппеты, language-configuration и манифест обновлены");
}

console.log(`✅ ${NAME} ${VERSION}: ${data.commands.length} команд, ${data.categories.length} категорий`);
console.log("   • packages/core/src/commands.generated.ts");
console.log("   • docs/commands.md");
