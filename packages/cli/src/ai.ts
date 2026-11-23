/**
 * ИИ-ПОМОЩНИК.
 *
 * Два адаптера:
 *   • openai      — всё, что говорит на языке OpenAI (/chat/completions):
 *                   OpenAI, OpenRouter, Groq, локальный Ollama, Freebuff API.
 *   • anthropic   — Claude (/v1/messages).
 *
 * Ключ берётся ТОЛЬКО из переменных окружения (или из .env в текущей папке):
 *   KUZA_AI_KEY / OPENAI_API_KEY  либо  ANTHROPIC_API_KEY
 *   KUZA_AI_PROVIDER=openai|anthropic   (если ключей два)
 *   KUZA_AI_MODEL=...                   (иначе модель по умолчанию)
 *   KUZA_AI_BASE_URL=...                (для OpenAI-совместимых серверов)
 *
 * Ключ никогда не печатается и не уходит никуда, кроме выбранного провайдера.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { CATEGORIES, COMMANDS, EXT, NAME } from "kuza-core";
import { mergeUsage, type TokenUsage } from "./agent-budget.js";
import { languageKnowledge } from "./kuza-knowledge.js";

export type Provider = "openai" | "anthropic";

export interface AiConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskOptions {
  /** 0 — строго и предсказуемо (агент), 0.7 — свободнее (объяснения). */
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Сколько раз повторить запрос при 429/5xx/сети. */
  retries?: number;
  /** Сюда пишется фактический расход токенов (если провайдер его отдаёт). */
  usage?: TokenUsage;
  /** Явная модель для этого вызова (роутинг). */
  model?: string;
  /** Запасная модель, если основная недоступна. */
  fallbackModel?: string;
  /** Стабильный ключ для кеша промпта (OpenAI-совместимые провайдеры). */
  cacheKey?: string;
}

/** Ошибка HTTP-запроса к провайдеру: нужен status для повторов. */
class AiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** HTTP-ошибка с подсказкой, не раскрывающей сам ключ. */
function requestError(status: number, text: string, config: AiConfig): AiRequestError {
  let hint = "";
  if (status === 401 || status === 403) {
    hint = config.baseUrl.includes("openrouter.ai")
      ? " Check KUZA_AI_KEY — create a fresh key at https://openrouter.ai/keys (it starts with sk-or-)."
      : " Check KUZA_AI_KEY / provider credentials in .env.";
  }
  return new AiRequestError(status, `${status} ${text.slice(0, 300)}${hint}`);
}

/** Мини-загрузчик .env: не перезаписывает уже заданные переменные. */
function loadDotEnv(): void {
  const path = join(process.cwd(), ".env");
  if (!existsSync(path)) return;
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

/** Найти настройки ИИ. Возвращает null, если ключа нет. */
export function resolveAiConfig(): AiConfig | null {
  loadDotEnv();

  const explicit = (process.env.KUZA_AI_PROVIDER ?? "").toLowerCase();
  const openaiKey = process.env.KUZA_AI_KEY || process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (explicit === "anthropic" && anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      model: process.env.KUZA_AI_MODEL || "claude-3-5-sonnet-latest",
      baseUrl: process.env.KUZA_AI_BASE_URL || "https://api.anthropic.com",
    };
  }

  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      model: process.env.KUZA_AI_MODEL || "gpt-4o-mini",
      baseUrl: (process.env.KUZA_AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    };
  }

  if (anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      model: process.env.KUZA_AI_MODEL || "claude-3-5-sonnet-latest",
      baseUrl: process.env.KUZA_AI_BASE_URL || "https://api.anthropic.com",
    };
  }

  return null;
}

/** Короткая шпаргалка по синтаксису (часть системного промпта). */
export function syntaxCheatSheet(): string {
  return [
    `The language is ${NAME}, files use .${EXT}. Syntax:`,
    ':name = value;               — declare a variable',
    'log >> value;                — output (also warn, err, alert)',
    ':n = upper >> s;             — command with one argument',
    ':m = max >> <a, b>;          — command with a list of arguments in <>',
    'func add<a, b> >> [ ... ]    — function',
    'f<1, 2>                      — call a function (angle brackets act as parentheses)',
    '?cond >> [ ... ] || ?c2 >> [ ... ] || [ ... ]  — if / else if / else',
    'while<cond> >> [ ... ]',
    'for<:i = 0; i < 10; i++> >> [ ... ]',
    'foreach<item : array> >> [ ... ]',
    'try >> [ ... ] catch<e> >> [ ... ]',
    '## comment',
    'Operators: + - * / % **, == != < > <= >=, and or not',
  ].join("\n");
}

/** Сжатый список всех команд — чтобы модель не выдумывала несуществующих. */
export function commandsContext(): string {
  const lines: string[] = [];
  for (const category of CATEGORIES) {
    const items = COMMANDS.filter((command) => command.category === category.id);
    if (items.length === 0) continue;
    lines.push(`\n## ${category.titleEn}`);
    for (const command of items) {
      const signature =
        command.args === "none"
          ? command.name
          : command.args === "single"
            ? `${command.name} >> x`
            : `${command.name} >> <${command.params.join(", ")}>`;
      const aliases = command.aliases.length ? ` [aliases: ${command.aliases.join(", ")}]` : "";
      lines.push(`- ${signature} — ${command.description}${aliases}`);
    }
  }
  return lines.join("\n");
}

export function systemPrompt(): string {
  return [
    languageKnowledge(),
    "",
    "# Your role",
    `You are the built-in assistant for the ${NAME} programming language.`,
    "Answer briefly and to the point, in the user's language (English by default).",
    `Write code examples ONLY in ${NAME}, inside \`\`\`${EXT} blocks.`,
    "Use only the commands and syntax above. If something does not exist in Kuza, say so honestly instead of inventing it.",
    "When a project uses an old Kuza version, suggest `kuza upgrade`.",
  ].join("\n");
}

async function callOpenAi(
  config: AiConfig,
  messages: ChatMessage[],
  system: string,
  options: AskOptions = {},
): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model ?? config.model,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxTokens ?? 2000,
    messages: [{ role: "system", content: system }, ...messages],
  };
  // Стабильный системный промпт — хороший кандидат для серверного кеша.
  // Включаем поле только для официального API: сторонние OpenAI-совместимые
  // серверы могут отклонять неизвестные поля.
  if (options.cacheKey && config.baseUrl.includes("api.openai.com")) {
    body.prompt_cache_key = options.cacheKey;
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 90_000),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw requestError(response.status, text, config);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      prompt_tokens_details?: { cached_tokens?: number };
    };
  };
  if (options.usage && data.usage) {
    mergeUsage(options.usage, {
      input: data.usage.prompt_tokens ?? 0,
      output: data.usage.completion_tokens ?? 0,
      cached: data.usage.prompt_tokens_details?.cached_tokens ?? 0,
      requests: 1,
      reported: true,
    });
  }
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callAnthropic(
  config: AiConfig,
  messages: ChatMessage[],
  system: string,
  options: AskOptions = {},
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 90_000),
    body: JSON.stringify({
      model: options.model ?? config.model,
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.4,
      // Кеш промпта: системный контекст языка не меняется между шагами.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw requestError(response.status, text, config);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  if (options.usage && data.usage) {
    mergeUsage(options.usage, {
      input: data.usage.input_tokens ?? 0,
      output: data.usage.output_tokens ?? 0,
      cached: data.usage.cache_read_input_tokens ?? 0,
      requests: 1,
      reported: true,
    });
  }
  return (data.content ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

export async function askAi(
  config: AiConfig,
  messages: ChatMessage[],
  system = systemPrompt(),
  options: AskOptions = {},
): Promise<string> {
  const retries = options.retries ?? 2;
  const chain = [options.model ?? config.model, options.fallbackModel].filter(
    (model): model is string => Boolean(model),
  );
  const unique = chain.filter((model, index) => chain.indexOf(model) === index);
  let lastError: unknown;

  for (let modelIndex = 0; modelIndex < unique.length; modelIndex++) {
    const model = unique[modelIndex]!;
    for (let attempt = 0; ; attempt++) {
      try {
        return config.provider === "anthropic"
          ? await callAnthropic(config, messages, system, { ...options, model })
          : await callOpenAi(config, messages, system, { ...options, model });
      } catch (error) {
        lastError = error;
        const status = error instanceof AiRequestError ? error.status : 0;
        const retryable = status === 0 || status === 429 || status >= 500;
        if (!retryable || attempt >= retries) break;
        // 429 и редкие 5xx провайдера: короткая пауза и ещё одна попытка.
        await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** attempt));
      }
    }
    if (modelIndex < unique.length - 1) {
      console.error(`[kuza ai] model "${model}" unavailable, trying "${unique[modelIndex + 1]}"`);
    }
  }
  throw lastError ?? new Error("No model configured");
}

// ── /ai add-command ───────────────────────────────────────────────────

export interface ProposedCommand {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  args: "none" | "single" | "list";
  params: string[];
  description: string;
  example: string;
  codegen: string;
  returns?: string;
}

export async function proposeCommand(
  config: AiConfig,
  description: string,
): Promise<ProposedCommand> {
  const prompt = [
    "Придумай одну новую команду для language Kuza и верни ТОЛЬКО JSON-объект без пояснений и без markdown.",
    "Схема объекта:",
    '{"id":"shout","name":"shout","aliases":["крик"],"category":"output","args":"single",',
    '"params":["text"],"description":"...","example":"shout >> \\"привет\\";","codegen":"console.log(String({0}).toUpperCase())","returns":"void"}',
    "",
    "Правила:",
    "- name — латиницей, одним словом, в стиле существующих команд;",
    '- args: "none" | "single" | "list" (list — аргументы через запятую в <>);',
    "- в codegen подставляй аргументы как {0}, {1} или {rest} (все через запятую);",
    "- codegen должен быть валидным JavaScript;",
    `- category — одна из: ${CATEGORIES.map((category) => category.id).join(", ")};`,
    "- example и description — на русском.",
    "",
    `Что должна делать команда: ${description}`,
  ].join("\n");

  const answer = await askAi(config, [{ role: "user", content: prompt }], systemPrompt());

  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");

  const parsed = JSON.parse(answer.slice(start, end + 1)) as Partial<ProposedCommand>;

  if (!parsed.name || !parsed.codegen || !parsed.category) throw new Error("invalid");

  return {
    id: parsed.id || parsed.name,
    name: parsed.name,
    aliases: parsed.aliases ?? [],
    category: parsed.category,
    args: parsed.args ?? "single",
    params: parsed.params ?? [],
    description: parsed.description ?? description,
    example: parsed.example ?? "",
    codegen: parsed.codegen,
    returns: parsed.returns,
  };
}

export function commandConflicts(command: ProposedCommand): string | null {
  const taken = new Set<string>();
  for (const existing of COMMANDS) {
    taken.add(existing.name);
    for (const alias of existing.aliases) taken.add(alias);
  }
  if (taken.has(command.name)) return `имя "${command.name}" уже занято`;
  for (const alias of command.aliases) {
    if (taken.has(alias)) return `алиас "${alias}" уже занят`;
  }
  if (!CATEGORIES.some((category) => category.id === command.category)) {
    return `неизвестная категория "${command.category}"`;
  }
  return null;
}

/** Дописать команду в commands.json и попробовать перегенерировать артефакты. */
export function appendCommand(command: ProposedCommand): { regenerated: boolean; path: string } {
  const require = createRequire(import.meta.url);
  const commandsPath = require.resolve("kuza-core/commands.json");
  const data = JSON.parse(readFileSync(commandsPath, "utf8")) as { commands: unknown[] };
  data.commands.push(command);
  // Записываем аккуратно: 2 пробела, перевод строки в конце.
  const fs = require("node:fs") as typeof import("node:fs");
  fs.writeFileSync(commandsPath, JSON.stringify(data, null, 2) + "\n", "utf8");

  const coreDir = dirname(commandsPath);
  const script = join(coreDir, "scripts", "generate.mjs");
  let regenerated = false;
  if (existsSync(script)) {
    const result = spawnSync(process.execPath, [script], { cwd: coreDir, stdio: "ignore" });
    regenerated = result.status === 0;
  }

  return { regenerated, path: commandsPath };
}
