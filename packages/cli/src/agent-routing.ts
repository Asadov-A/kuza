/**
 * МАРШРУТИЗАЦИЯ МОДЕЛЕЙ И РЕЖИМЫ ПОВЕДЕНИЯ АГЕНТА.
 *
 * Никаких захардкоженных имён моделей в ядре: все модели задаются переменными
 * окружения. Ядро выбирает только «уровень сложности» задачи, а точную модель
 * для уровня берёт из конфигурации пользователя.
 *
 *   KUZA_AI_MODEL_SIMPLE   — дешёвая быстрая модель (поиск, мелкие правки)
 *   KUZA_AI_MODEL          — основная модель (по умолчанию для средних задач)
 *   KUZA_AI_MODEL_COMPLEX  — сильная модель (архитектура, большой рефакторинг)
 *   KUZA_AI_FALLBACK_MODEL — запасная модель, если основная недоступна
 *   KUZA_AI_ROUTE=auto|simple|medium|complex|off
 *   KUZA_AI_MODE=precise|creative|engineering
 */

import type { AiConfig } from "./ai.js";

export type Complexity = "simple" | "medium" | "complex";
export type AgentMode = "precise" | "creative" | "engineering";

// \b работает только с ASCII-словыми символами: для кириллицы и узбекского
// нужны Unicode-границы, иначе `исправь` начинается с `is` и классификатор
// ошибочно считает это вопросом.
const BOUND = String.raw`(?<![\p{L}\p{N}_])`;
const END = String.raw`(?![\p{L}\p{N}_])`;

const SIMPLE_VERBS = new RegExp(
  BOUND +
    "(?:what|why|where|which|list|find|show|read|open|rename|explain|describe|is|does|check|how much|how many|count|" +
    "что|почему|где|какой|какая|покажи|список|найди|объясни|переименуй|проверь|сколько|" +
    "nima|nega|qayer|qanday|ko'rsat|top|tushuntir|hisobla)" +
    END,
  "iu",
);

const COMPLEX_VERBS = new RegExp(
  BOUND +
    "(?:architect|architecture|refactor|redesign|migrate|from scratch|whole|entire|all files|multiple files|system|optimize|performance|security|framework|integration|" +
    "архитектур|рефакторинг|перепиши|полностью|все файлы|несколько файлов|оптимизируй|безопасност|интеграц|фреймворк|масштаб|" +
    "arxitektura|refaktor|qayta yoz|barcha fayl|integratsiya|optimallashtir|xavfsizlik)" +
    END,
  "iu",
);

const EDIT_VERBS = new RegExp(
  BOUND +
    "(?:add|create|write|change|fix|update|remove|delete|implement|build|make|edit|patch|replace|insert|move|rename|generate|improve|refactor|setup|configure|wire|connect|convert|merge|split|" +
    "try|please|want|need|help me|let's|could you|can you|" +
    "добавь|добавить|создай|создать|напиши|написать|исправь|исправить|поменяй|поменять|измени|изменить|удали|удалить|убери|убрать|реализуй|реализовать|сделай|сделать|почини|починить|обнови|обновить|перепиши|переписать|вставь|вставить|подключи|подключить|настрой|настроить|переименуй|переименовать|оптимизируй|оптимизировать|улучши|улучшить|собери|собрать|" +
    "попробуй|попробуйте|давай|давайте|хочу|нужно|надо|прошу|" +
    "qo'sh|yarat|yo'z|tuzat|o'zgartir|o'chir|qil|amalga oshir|tikla|sozla|sinab|sinang|qilish|qilmoq|yozish|tuzatish|qo'shish|yaratish)" +
    END,
  "iu",
);

/** Какую сложность задачи мы видим. Не зависит от конкретной модели. */
export function classifyComplexity(task: string, fileCount = 0): Complexity {
  const text = task.toLowerCase();
  if (COMPLEX_VERBS.test(text) || text.length > 400 || fileCount > 12) return "complex";
  if (SIMPLE_VERBS.test(text) && text.length < 180 && fileCount <= 3) return "simple";
  return "medium";
}

/** Нужно ли редактировать проект (а не просто ответить). */
export function looksLikeEdit(text: string): boolean {
  return EDIT_VERBS.test(text);
}

export function resolveAgentMode(value?: string): AgentMode {
  const raw = (value ?? process.env.KUZA_AI_MODE ?? "").toLowerCase();
  return raw === "creative" || raw === "engineering" ? raw : "precise";
}

export function modeInstructions(mode: AgentMode): string {
  switch (mode) {
    case "creative":
      return [
        "# Behavior mode: CREATIVE",
        "Solve the task in a distinctive, thoughtful way. Prefer elegant and original solutions over boilerplate,",
        "but stay inside Kuza syntax and the project's rules. Do not generate several alternatives for a small request;",
        "pick the best one and implement it. Improve UX where it clearly helps, without redesigning unrelated code.",
      ].join("\n");
    case "engineering":
      return [
        "# Behavior mode: ENGINEERING",
        "Prioritize architecture, maintainability, performance and reliability. Keep the change small and focused,",
        "avoid duplication, preserve existing public behaviour, and verify with check after every code change.",
      ].join("\n");
    default:
      return [
        "# Behavior mode: PRECISE",
        "Follow the request literally. Make the smallest correct change. Do not add features, files or refactors",
        "that were not asked for. If something is ambiguous, choose the conservative interpretation.",
      ].join("\n");
  }
}

function envModel(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

/** Модели-кандидаты для задачи: основная и запасная. */
export function modelChain(config: AiConfig, complexity: Complexity): string[] {
  const forced = (process.env.KUZA_AI_ROUTE ?? "auto").toLowerCase();
  const level: Complexity =
    forced === "simple" || forced === "medium" || forced === "complex" ? forced : complexity;

  const chain: string[] = [];
  const add = (model: string | undefined): void => {
    if (model && !chain.includes(model)) chain.push(model);
  };

  if (level === "simple") {
    add(envModel("KUZA_AI_MODEL_SIMPLE"));
    add(config.model);
  } else if (level === "complex") {
    add(envModel("KUZA_AI_MODEL_COMPLEX"));
    add(config.model);
  } else {
    add(config.model);
  }
  add(envModel("KUZA_AI_FALLBACK_MODEL"));
  return chain.length ? chain : [config.model];
}

export function complexityLabel(complexity: Complexity): string {
  return complexity === "simple" ? "simple" : complexity === "complex" ? "complex" : "medium";
}
