/**
 * ИНТЕРАКТИВНАЯ КОНСОЛЬ (REPL).
 *
 * REPL = Read, Eval, Print, Loop: читает строку, выполняет, печатает результат.
 *
 * Как хранится состояние: мы держим весь ввод сессии и при каждом новом
 * куске перекомпилируем его целиком, печатая только новые строки вывода.
 * Просто и надёжно: переменные и функции «живут» между вводами.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { createInterface } from "node:readline";
import {
  CATEGORIES,
  COMMANDS,
  FILE_EXT,
  compile,
  formatDiagnostic,
  run,
  type CompileOptions,
} from "kuza-core";
import { appendCommand, commandConflicts, proposeCommand, resolveAiConfig } from "./ai.js";
import { runAiQuestion } from "./ask.js";
import { runAgentTask } from "./agent.js";
import { classifyIntent } from "./agent-intent.js";
import { resolveAgentMode } from "./agent-routing.js";
import { getLang, helpLines, isLang, setLang, t } from "./i18n.js";
import {
  accent,
  bold,
  code,
  danger,
  dim,
  primary,
  setTheme,
  success,
  warning,
} from "./ui.js";

const require = createRequire(import.meta.url);

/** Режим агента живёт между перезапусками REPL после /ai → /agent. */
let agentMode = resolveAgentMode();

function promptMain(): string {
  return `${primary("kuza")} ${dim("›")} `;
}

function promptContinue(): string {
  return `${dim("     ...")} `;
}

/** Закрыты ли все блоки [ ], строки и комментарии? */
function isComplete(text: string): boolean {
  let depth = 0;
  let inString: string | null = null;
  let inComment = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (inComment) {
      if (ch === "\n") inComment = false;
      continue;
    }
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "`" || ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if ((ch === "#" && next === "#") || (ch === "/" && next === "/")) {
      inComment = true;
      i++;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") depth = Math.max(0, depth - 1);
  }

  return depth === 0 && inString === null;
}

/** Похоже ли на «просто выражение», которое надо напечатать? */
function looksLikeExpression(snippet: string): boolean {
  const text = snippet.trim();
  if (!text || text.includes("\n")) return false;
  if (/^(func|while|for|foreach|try|return|throw|break|continue)\b/.test(text)) return false;
  if (text.startsWith(":") || text.startsWith("?") || text.startsWith("[")) return false;
  if (text.includes(">>")) return false;
  // Присваивание? (одиночный "=", не "==" / "!=" / "<=" / ">=")
  if (/(^|[^=!<>])=([^=]|$)/.test(text)) return false;
  return true;
}

/** Похоже ли на обычный язык, а не на код Kuza? */
function looksLikeProse(snippet: string): boolean {
  const text = snippet.trim();
  if (!text || text.includes("\n")) return false;
  if (/[>>:?\[\];=]/.test(text)) return false;
  if (/^(func|while|for|foreach|try|return|throw|break|continue)\b/.test(text)) return false;
  return /\s/.test(text) && /\p{L}/u.test(text);
}

function printEntry(entry: { type: string; message: string }): void {
  switch (entry.type) {
    case "error":
      console.log(danger("✕ " + entry.message));
      break;
    case "warn":
      console.log(warning("⚠ " + entry.message));
      break;
    case "info":
      console.log(accent("› " + entry.message));
      break;
    default:
      console.log(entry.message);
  }
}

function examplesDirectory(): string {
  const commandsPath = require.resolve("kuza-core/commands.json");
  return join(dirname(commandsPath), "examples");
}

export interface ReplOptions {
  options?: CompileOptions;
}

export async function startRepl(_replOptions: ReplOptions = {}): Promise<void> {
  // `/agent` закрывает текущую сессию: агенту нужен собственный stdin для
  // подтверждений. После задачи открывается новая сессия REPL.
  while (await runReplSession()) { /* continue in a fresh session */ }
}

async function runReplSession(): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY === true,
    historySize: 200,
    completer: (line: string) => {
      const trimmed = line.trimStart();
      if (!trimmed.startsWith("/")) return [[], line];
      const names = [
        "/help",
        "/commands",
        "/examples",
        "/clear",
        "/ai",
        "/agent",
        "/mode",
        "/lang",
        "/theme",
        "/exit",
      ];
      return [names.filter((name) => name.startsWith(trimmed)), line];
    },
  });

  let buffer: string[] = [];
  let session: string[] = [];
  let printed = 0;
  let aiMode = false;
  let agentTask = "";

  const resetSession = () => {
    session = [];
    printed = 0;
  };

  function printOutput(entries: { type: string; message: string }[], from: number): void {
    for (const entry of entries.slice(from)) printEntry(entry);
  }

  async function execute(snippet: string): Promise<void> {
    const prepared = looksLikeExpression(snippet) ? `log >> ${snippet.trim()};` : snippet;
    const candidate = [...session, prepared].join("\n");

    const compiled = compile(candidate, { mode: "body" });
    if (!compiled.ok) {
      console.error(danger(formatDiagnostic(compiled.errors[0]!, candidate)));
      if (looksLikeProse(snippet)) {
        console.log(dim("This looks like plain language — enable /ai first, then type it again."));
      }
      return;
    }

    session.push(prepared);
    const result = await run(session.join("\n"));
    printOutput(result.output, printed);
    printed = result.output.length;

    if (!result.ok) {
      // Откатываем сломанный кусок, чтобы следующая строка снова работала.
      session.pop();
      printed = Math.max(0, printed - 1);
    }
  }

  /** Единый /ai: сам решает — ответить или править проект. */
  async function routeAssistant(question: string): Promise<void> {
    const intent = classifyIntent(question);
    if (intent === "edit") {
      agentTask = question;
      console.log(dim("This looks like a project change — switching to Kuza Agent…"));
      return;
    }
    // Раньше здесь не было файлов проекта, поэтому модель отвечала, что не
    // имеет доступа к исходникам. `kuza ai` читает проект и умеет искать в сети.
    await runAiQuestion(question);
  }

  async function addCommand(description: string): Promise<void> {
    const config = resolveAiConfig();
    if (!config) {
      console.log(warning(t("aiNoKey")));
      console.log(dim(t("aiNoKeyHint")));
      return;
    }
    if (!description) {
      console.log(dim(t("aiAddUsage")));
      return;
    }

    console.log(dim(t("aiThinking") + "…"));
    try {
      const proposal = await proposeCommand(config, description);
      const conflict = commandConflicts(proposal);

      console.log("");
      console.log(bold(t("aiAddProposal")) + ":");
      console.log(code(JSON.stringify(proposal, null, 2)));
      console.log("");

      if (conflict) {
        console.log(danger("✕ " + conflict));
        return;
      }

      const answer = await new Promise<string>((resolvePrompt) => {
        rl.question(accent(t("aiAddConfirm") + " "), resolvePrompt);
      });

      if (!/^(y|yes|д|да|1)$/i.test(answer.trim())) {
        console.log(dim(t("aiAddCancel")));
        return;
      }

      const { path } = appendCommand(proposal);
      console.log(success("✓ " + t("aiAddDone") + ": " + path));
      console.log(dim(t("aiAddRebuild")));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(danger(`${t("aiAddInvalid")}: ${message}`));
    }
  }

  function listCommands(filter: string): void {
    const query = filter.toLowerCase();
    let found = 0;

    for (const category of CATEGORIES) {
      const categoryMatches =
        category.id.toLowerCase().includes(query) ||
        category.title.toLowerCase().includes(query) ||
        category.titleEn.toLowerCase().includes(query);
      const items = COMMANDS.filter(
        (command) =>
          command.category === category.id &&
          (!query ||
            categoryMatches ||
            command.name.toLowerCase().includes(query) ||
            command.description.toLowerCase().includes(query) ||
            command.aliases.some((alias) => alias.toLowerCase().includes(query))),
      );
      if (items.length === 0) continue;

      found += items.length;
      console.log("");
      console.log(bold(primary(category.titleEn)));
      for (const command of items) {
        const signature =
          command.args === "none"
            ? command.name
            : command.args === "single"
              ? `${command.name} >> x`
              : `${command.name} >> <${command.params.join(", ")}>`;
        console.log(`  ${code(signature.padEnd(34))} ${dim(command.description)}`);
      }
    }

    console.log("");
    if (found === 0) console.log(dim(`${t("commandsFiltered")} "${filter}"`));
    else console.log(dim(`Total: ${found}. Full list: kuza docs`));
  }

  async function listExamples(argument: string): Promise<void> {
    const dir = examplesDirectory();
    if (!existsSync(dir)) {
      console.log(dim("Examples folder not found."));
      return;
    }
    const files = readdirSync(dir).filter((name) => name.endsWith(FILE_EXT));

    if (argument.startsWith("run")) {
      const wanted = argument.slice(3).trim().replace(/\.kuza$/, "");
      if (!wanted) {
        console.log(dim(t("examplesUsage")));
        return;
      }
      const file = files.find((name) => basename(name, FILE_EXT) === wanted);
      if (!file) {
        console.log(danger(`${t("fileNotFound")}: ${wanted}`));
        return;
      }
      const source = readFileSync(join(dir, file), "utf8");
      console.log("");
      console.log(dim(`▶ examples/${file}`));
      const result = await run(source);
      for (const entry of result.output) printEntry(entry);
      console.log("");
      return;
    }

    console.log("");
    console.log(bold(t("examplesTitle")));
    for (const file of files) console.log(`  ${code(basename(file, FILE_EXT))}  ${dim("examples/" + file)}`);
    console.log("");
    console.log(dim(t("examplesUsage")));
    console.log("");
  }

  /** Возвращает true, если пора выходить. */
  async function handleSlash(text: string): Promise<boolean> {
    const [name, ...restParts] = text.slice(1).split(/\s+/);
    const rest = restParts.join(" ");

    switch ((name ?? "").toLowerCase()) {
      case "help":
        console.log("");
        console.log(bold(t("helpTitle")));
        for (const line of helpLines()) console.log(line);
        console.log("");
        return false;

      case "commands":
        listCommands(rest);
        return false;

      case "examples":
        await listExamples(rest);
        return false;

      case "clear":
        resetSession();
        console.clear();
        console.log(dim(t("cleared")));
        return false;

      case "ai": {
        const task = rest.trim();
        if (task.startsWith("add-command")) {
          const description = task
            .slice("add-command".length)
            .trim()
            .replace(/^["'«]|["'»]$/g, "");
          await addCommand(description);
          return false;
        }
        if (!task) {
          aiMode = !aiMode;
          console.log(
            aiMode
              ? success(t("aiModeOn")) + " " + dim(`(${agentMode})`)
              : dim(t("aiModeOff")),
          );
          return false;
        }
        await routeAssistant(task);
        return !!agentTask;
      }

      case "mode": {
        const value = rest.trim().toLowerCase();
        if (!value) {
          console.log(dim("Usage: /mode precise|creative|engineering"));
          return false;
        }
        agentMode = resolveAgentMode(value);
        console.log(success(`Agent mode: ${agentMode}`));
        return false;
      }

      case "agent": {
        agentTask = rest.trim();
        if (!agentTask) {
          console.log(dim('Usage: /agent "add a pricing section to main.kuza"'));
          return false;
        }
        // Возврат true завершит эту сессию; агент получит собственный stdin,
        // а после задачи откроется новый REPL.
        return true;
      }

      case "lang": {
        const value = rest.trim().toLowerCase();
        if (isLang(value)) {
          setLang(value);
          console.log(success(t("langSet")));
        } else {
          console.log(dim("Usage: /lang ru|uz|en"));
        }
        return false;
      }

      case "theme": {
        const value = rest.trim().toLowerCase();
        if (value === "dark" || value === "light") {
          setTheme(value);
          console.log(success(t("themeSet") + ": " + value));
        } else {
          console.log(dim("Usage: /theme dark|light"));
        }
        return false;
      }

      case "exit":
      case "quit":
        return true;

      default:
        console.log(dim(`${t("unknownCommand")}: /${name}. Try /help`));
        return false;
    }
  }

  rl.setPrompt(promptMain());
  rl.prompt();

  rl.on("SIGINT", () => {
    if (buffer.length > 0) {
      buffer = [];
      console.log("");
      rl.setPrompt(promptMain());
      rl.prompt();
    } else {
      rl.close();
    }
  });

  for await (const line of rl) {
    // Многострочный ввод: пока блок не закрыт, собираем строки.
    if (buffer.length > 0) {
      buffer.push(line);
      const text = buffer.join("\n");
      if (!isComplete(text)) {
        rl.setPrompt(promptContinue());
        rl.prompt();
        continue;
      }
      buffer = [];
      rl.setPrompt(promptMain());
      await execute(text);
      rl.prompt();
      continue;
    }

    if (!line.trim()) {
      rl.prompt();
      continue;
    }

    if (line.trimStart().startsWith("/")) {
      const shouldExit = await handleSlash(line.trim());
      if (shouldExit) {
        rl.close();
        break;
      }
      rl.prompt();
      continue;
    }

    if (!isComplete(line)) {
      buffer = [line];
      rl.setPrompt(promptContinue());
      rl.prompt();
      continue;
    }

    if (aiMode) {
      await routeAssistant(line);
      if (agentTask) {
        rl.close();
        break;
      }
    } else {
      await execute(line);
    }
    rl.prompt();
  }

  if (agentTask) {
    rl.close();
    console.log("");
    await runAgentTask(agentTask, { mode: agentMode });
    console.log("");
    console.log(dim(t("sessionRestart")));
    return true;
  }

  console.log("");
  console.log(dim(t("bye")));
  console.log("");
  return false;
}
