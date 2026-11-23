/**
 * `kuza agent "задача"` — ИИ-разработчик внутри проекта на Kuza.
 *
 * Что он умеет:
 *   • читать, искать (glob/grep), создавать, править и удалять файлы;
 *   • ставить npm-пакеты и подключать их через `use "пакет"`;
 *   • скачивать данные по ссылке (документация, JSON);
 *   • запускать `npm run …`, `kuza check|build` и проверять компиляцию;
 *   • смотреть версии Kuza и обновлять язык в проекте;
 *   • запоминать решения проекта в .kuza/agent/ и работать в трёх режимах.
 *
 * Протокол — JSON без tool-calling API, поэтому работает с OpenAI,
 * Anthropic, OpenRouter, Groq, Ollama и любым OpenAI-совместимым сервером.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { askAi, resolveAiConfig, type ChatMessage } from "./ai.js";
import { createUsage, estimateTokens, TokenBudget } from "./agent-budget.js";
import {
  compactHistory,
  mapIsStale,
  mapSummary,
  memoryContext,
  readProjectMap,
  refreshProjectMap,
  rememberTask,
  selectRelevantFiles,
  type ProjectMap,
} from "./agent-context.js";
import {
  classifyComplexity,
  complexityLabel,
  modelChain,
  modeInstructions,
  resolveAgentMode,
  type AgentMode,
} from "./agent-routing.js";
import {
  AGENTS_TEMPLATE,
  languageKnowledge,
  readProjectInstructions,
  type LoadedInstruction,
} from "./kuza-knowledge.js";
import {
  compileCheck,
  executeAction,
  findKuzaFiles,
  tree,
  type Action,
  type ActionName,
  type ToolContext,
} from "./agent-tools.js";
import { bold, code, danger, dim, primary, success, warning } from "./ui.js";

const MAX_BATCH = 6;
const MAX_QA_RETRIES = 3;

function maxSteps(): number {
  const value = Number(process.env.KUZA_AI_MAX_STEPS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 24;
}

const ACTION_NAMES = new Set<ActionName>([
  "plan",
  "list",
  "info",
  "glob",
  "grep",
  "read",
  "write",
  "append",
  "replace",
  "delete",
  "mkdir",
  "check",
  "run",
  "install",
  "fetch",
  "version",
  "upgrade",
  "done",
]);

const CHANGES_FILES = new Set<ActionName>(["write", "append", "replace", "delete", "mkdir"]);

export interface AgentOptions {
  /** Применять изменения без вопросов. */
  yes?: boolean;
  /** Создать AGENTS.md с правилами проекта. */
  init?: boolean;
  /** Напечатать системный промпт (отладка) и выйти. */
  printPrompt?: boolean;
  /** precise | creative | engineering. */
  mode?: string;
  /** Принудительная модель (перекрывает автоматический выбор). */
  model?: string;
}

interface ContextParts {
  map: ProjectMap;
  instructions: LoadedInstruction[];
  memory: string;
}

/** Что важно знать о проекте: зависимости и npm-скрипты. */
function projectFacts(root: string): string {
  const path = join(root, "package.json");
  if (!existsSync(path)) return "package.json: (none)";
  try {
    const pkg = JSON.parse(readFileSync(path, "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const scripts = Object.entries(pkg.scripts ?? {})
      .map(([name, command]) => `${name}: ${command}`)
      .join("; ");
    const deps = Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) });
    return `scripts: ${scripts || "(none)"}\ndependencies: ${deps.join(", ") || "(none)"}`;
  } catch {
    return "package.json: cannot parse";
  }
}

function relevantFiles(root: string, map: ProjectMap, task: string): string {
  const paths = selectRelevantFiles(map, task, 4);
  if (paths.length === 0) return "(no obviously relevant files; use glob/grep to explore)";
  return paths
    .map((path) => {
      try {
        let text = readFileSync(join(root, path), "utf8");
        if (text.length > 6_000) text = text.slice(0, 6_000) + "\n… [truncated]";
        return `--- ${path} ---\n${text}`;
      } catch {
        return `--- ${path} ---\n(unreadable)`;
      }
    })
    .join("\n\n");
}

function agentSystem(
  root: string,
  kuzaFiles: string[],
  parts: ContextParts,
  mode: AgentMode,
  task: string,
): string {
  const files = kuzaFiles.map((file) => relative(root, file).split("\\").join("/"));
  const rules =
    parts.instructions.length > 0
      ? parts.instructions.map((item) => `### ${item.file}\n${item.text}`).join("\n\n")
      : "(no AGENTS.md / KUZA.md / CLAUDE.md — follow the Kuza conventions below)";

  return [
    languageKnowledge(),
    "",
    "# You are Kuza Agent — a developer, not a chatbot",
    `You work inside a real Kuza project at ${root} and change files on disk.`,
    "Work autonomously: investigate first, then plan, implement, verify. Do not ask the user things you can find out yourself.",
    "Never say you did something you did not do. Every code change must be followed by `check`.",
    "",
    modeInstructions(mode),
    "",
    "# Project rules (highest priority, follow them exactly)",
    rules,
    parts.memory ? `\n${parts.memory}` : "",
    "",
    "# Protocol",
    "Reply with ONE JSON object and nothing else — no prose, no markdown fences.",
    'To do several independent things at once, reply {"actions":[{...},{...}]} (up to 6 actions).',
    "",
    "Actions:",
    '{"action":"plan","steps":["…","…"]}                       — short plan (once, for non-trivial tasks)',
    '{"action":"glob","pattern":"**/*.kuza"}                  — find files by glob',
    '{"action":"grep","pattern":"email"}                      — search text inside project files',
    '{"action":"list","path":"."}                             — list a folder',
    '{"action":"info","path":"main.kuza"}                     — file size, lines, mtime',
    '{"action":"read","path":"main.kuza","offset":1,"limit":80} — read a file or a line range',
    '{"action":"write","path":"main.kuza","content":"…"}      — create or fully replace a file',
    '{"action":"append","path":"main.kuza","content":"…"}     — append to a file',
    '{"action":"replace","path":"main.kuza","find":"old","replace":"new","all":false} — exact fragment patch (preferred)',
    '{"action":"delete","path":"old.kuza"}                    — delete a file (only if the task asks)',
    '{"action":"mkdir","path":"pages"}                        — create a folder',
    '{"action":"check"}                                       — compile every .kuza file',
    '{"action":"run","command":"npm run build"}               — only npm run <script>, npm test, kuza check|build',
    '{"action":"install","packages":["lodash"]}               — npm install, then use in code',
    '{"action":"fetch","url":"https://…","path":"public/data.json"} — download text/data (omit path to just read it)',
    '{"action":"version"}                                     — installed and latest Kuza versions',
    '{"action":"upgrade"}                                     — npm install kuza-lang@latest --save',
    '{"action":"done","summary":"what changed and why"}       — finish',
    "",
    "# How to work",
    "1. Explore: use the project map below first, then glob/grep and targeted `read` only when needed.",
    "2. For non-trivial work, one `plan` with 2–5 concrete steps.",
    "3. Change code with `replace` when possible, `write` for new or fully rewritten files. Keep changes minimal.",
    "4. Run `check` after code changes. If it fails, read the exact diagnostic, patch only the broken fragment, check again.",
    "5. `done` only when the task is really complete and `check` passes. Summary must be short and truthful.",
    "",
    "# Extra capabilities",
    '- A missing library: `install` first, then `use "pkg";`. Prefer built-in commands over dependencies.',
    "- Need current docs: `fetch` the URL and read the result. Save into the project only when the task requires it.",
    "- If the project's Kuza version is too old for a feature: `version`, then `upgrade` (it is allowed).",
    "- Secrets and .env are off-limits. Never run npm publish, git push or destructive commands outside the project.",
    "",
    "# Task",
    task,
    "",
    "# Project state (cached map — use `list` if it looks outdated)",
    mapSummary(parts.map),
    "",
    "# Files likely relevant to this task (already read for you)",
    relevantFiles(root, parts.map, task),
    "",
    "# Kuza files",
    files.join(", ") || "(none)",
    projectFacts(root),
    "",
    "# Shallow tree",
    tree(root),
  ].join("\n");
}

/** Достать JSON-действия из ответа модели (объект, массив или {actions:[…]}). */
function parseActions(answer: string): Action[] | null {
  let text = answer.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1]!.trim();

  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let start = -1;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);
  if (start === -1) return null;

  const lastBrace = text.lastIndexOf("}");
  const lastBracket = text.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);
  if (end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { actions?: unknown }).actions)
      ? (parsed as { actions: unknown[] }).actions
      : [parsed];

  const actions: Action[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") return null;
    const action = item as Action;
    if (typeof action.action !== "string" || !ACTION_NAMES.has(action.action as ActionName)) return null;
    actions.push(action);
    if (actions.length >= MAX_BATCH) break;
  }
  return actions.length > 0 ? actions : null;
}

function focusErrors(result: string): string {
  return result.length > 3_000 ? result.slice(0, 3_000) + "\n… [truncated]" : result;
}

function printDone(summary: string | undefined, changed: string[], budget: TokenBudget): void {
  console.log("");
  console.log(success("✓ Done") + (summary ? ` — ${summary}` : ""));
  console.log(dim(`Files changed: ${changed.length}${changed.length ? ` (${changed.slice(0, 8).join(", ")})` : ""}`));
  console.log(dim(budget.report()));
}

/** Записать AGENTS.md в проект (не перезаписывает существующий). */
export function initAgentRules(root: string = process.cwd()): string {
  const path = join(root, "AGENTS.md");
  if (existsSync(path)) {
    console.log(warning("AGENTS.md already exists — left untouched."));
    return path;
  }
  writeFileSync(path, AGENTS_TEMPLATE, "utf8");
  console.log(success("✓ Created AGENTS.md") + dim(" — the agent will follow these rules."));
  return path;
}

/** Напечатать промпт агента (для отладки знания языка). */
export function printAgentPrompt(root: string = process.cwd(), mode?: string): void {
  const files = findKuzaFiles(root);
  const map = readProjectMap(root) ?? refreshProjectMap(root);
  console.log(
    agentSystem(
      root,
      files,
      { map, instructions: readProjectInstructions(root), memory: memoryContext(root) },
      resolveAgentMode(mode),
      "(prompt preview)",
    ),
  );
}

export async function runAgentTask(task: string, options: AgentOptions = {}): Promise<void> {
  const root = process.cwd();
  const kuzaFiles = findKuzaFiles(root);

  if (options.init) {
    initAgentRules(root);
    if (!task) return;
  }

  if (kuzaFiles.length === 0) {
    console.log(danger("This folder has no .kuza files — kuza agent only works on Kuza projects."));
    console.log(dim("Run it from a project created with ") + code("kuza new") + dim(", or write your code in a .kuza file first."));
    console.log(dim("A plain question can be asked with ") + code('kuza ai "…"') + dim(" instead."));
    process.exitCode = 1;
    return;
  }

  if (options.printPrompt) {
    printAgentPrompt(root, options.mode);
    return;
  }

  if (!task) {
    console.log(danger('Describe a task: kuza agent "add a pricing section to main.kuza"'));
    process.exitCode = 1;
    return;
  }

  const config = resolveAiConfig();
  if (!config) {
    console.log(danger("AI is not configured. Add KUZA_AI_KEY to .env or to the environment."));
    console.log(dim("Details: START.md → the AI assistant section"));
    console.log(dim("Tip: ") + code("kuza agent --print-prompt") + dim(" shows the language knowledge the model gets."));
    process.exitCode = 1;
    return;
  }

  const mode = resolveAgentMode(options.mode);
  const complexity = classifyComplexity(task, kuzaFiles.length);
  const chain = options.model ? [options.model] : modelChain(config, complexity);
  const model = chain[0] ?? config.model;
  const fallbackModel = chain[1];
  const budget = new TokenBudget();
  const steps = maxSteps();

  let map = readProjectMap(root);
  const mapWasStale = mapIsStale(map, root);
  if (mapWasStale) map = refreshProjectMap(root);
  const parts: ContextParts = {
    map: map!,
    instructions: readProjectInstructions(root),
    memory: memoryContext(root),
  };

  console.log(bold(primary("Kuza Agent")) + dim(` · ${config.provider}/${model}`));
  console.log(dim(`Task: ${task}`));
  console.log(dim(`Project: ${root} (${kuzaFiles.length} .kuza file(s), map ${mapWasStale ? "rebuilt" : "cached"})`));
  console.log(dim(`Mode: ${mode} · complexity: ${complexityLabel(complexity)}`));
  console.log(
    dim(
      parts.instructions.length
        ? `Rules: ${parts.instructions.map((item) => item.file).join(", ")}`
        : "Rules: none (add AGENTS.md with kuza agent --init)",
    ),
  );
  console.log("");

  const system = agentSystem(root, kuzaFiles, parts, mode, task);
  const context: ToolContext = { root, yes: options.yes ?? false };
  let messages: ChatMessage[] = [
    { role: "user", content: `Task: ${task}\n\nStart by exploring the files you need.` },
  ];
  const changed: string[] = [];
  let dirty = false;
  let parseFailures = 0;
  let checkFailures = 0;

  const finishInterrupted = (reason: string): void => {
    rememberTask(root, {
      task,
      summary: `Interrupted: ${reason}`,
      changed,
      mode,
    });
    console.log(dim(budget.report()));
    console.log(dim("Task state saved in .kuza/agent/ — run the command again to continue."));
    process.exitCode = 1;
  };

  for (let step = 1; step <= steps; step++) {
    const usage = createUsage();
    const estimate = estimateTokens(system) + messages.reduce((sum, item) => sum + estimateTokens(item.content), 0);
    if (!budget.canAfford(estimate, 1_200)) {
      console.log(warning("Token budget reached — stopping before the next model call."));
      finishInterrupted("token budget reached");
      return;
    }

    let answer: string;
    try {
      answer = await askAi(config, messages, system, {
        temperature: mode === "creative" ? 0.3 : 0.15,
        maxTokens: 3_000,
        usage,
        model,
        fallbackModel,
        cacheKey: "kuza-agent-v1",
      });
    } catch (error) {
      console.log(danger(`AI error: ${error instanceof Error ? error.message : String(error)}`));
      finishInterrupted("AI error");
      return;
    }
    budget.record(usage);
    console.log(dim(`[${step}/${steps}] ${complexityLabel(complexity)} · ${model} · ${budget.report()}`));

    const actions = parseActions(answer);
    if (!actions) {
      parseFailures++;
      messages.push({ role: "assistant", content: answer });
      messages.push({
        role: "user",
        content:
          'That was not a valid action. Reply with exactly one JSON object, for example {"action":"read","path":"main.kuza"} or {"actions":[{"action":"glob","pattern":"**/*.kuza"},{"action":"read","path":"main.kuza"}]}, or {"action":"done","summary":"…"}.',
      });
      if (parseFailures >= 3) {
        console.log(danger("The model keeps answering without valid actions — stopping."));
        finishInterrupted("invalid model replies");
        return;
      }
      continue;
    }
    parseFailures = 0;

    messages.push({
      role: "assistant",
      content: JSON.stringify(actions.length === 1 ? actions[0] : { actions }),
    });

    const results: string[] = [];
    let doneBlocked = false;

    for (const action of actions) {
      if (action.action === "done") {
        if (dirty) {
          const check = compileCheck(root);
          console.log(dim("› final check ") + (check.startsWith("OK") ? success(check) : danger(check.split("\n")[0]!)));
          if (!check.startsWith("OK")) {
            checkFailures++;
            if (checkFailures > MAX_QA_RETRIES) {
              console.log(danger(`Still broken after ${MAX_QA_RETRIES} correction attempts. Stopping.`));
              finishInterrupted("verification failed");
              return;
            }
            results.push(`### check\n${focusErrors(check)}`);
            results.push("Fix ONLY the errors above, then call check again. Do not finish while they remain.");
            doneBlocked = true;
            break;
          }
          dirty = false;
        }
        rememberTask(root, { task, summary: action.summary ?? "(no summary)", changed, mode });
        printDone(action.summary, changed, budget);
        return;
      }

      const result = await executeAction(action, context);
      const failed = result.startsWith("ERROR") || result.startsWith("REJECTED");
      if (CHANGES_FILES.has(action.action) && !failed && action.path) {
        if (!changed.includes(action.path)) changed.push(action.path);
        dirty = true;
      }
      if (action.action === "check") {
        dirty = !result.startsWith("OK");
        if (dirty) checkFailures++;
      }
      results.push(`### ${action.action}\n${focusErrors(result)}`);
    }

    messages.push({
      role: "user",
      content: doneBlocked
        ? `Results:\n${results.join("\n\n")}`
        : `Results:\n${results.join("\n\n")}\n\nContinue with the next action. Call check after code changes; call done when finished.`,
    });
    messages = compactHistory(messages);
  }

  console.log("");
  console.log(warning(`Stopped after ${steps} steps without a final answer. Files changed: ${changed.length}.`));
  if (dirty) {
    const check = compileCheck(root);
    console.log(check.startsWith("OK") ? success(check) : danger(focusErrors(check)));
  }
  finishInterrupted("step limit reached");
}
