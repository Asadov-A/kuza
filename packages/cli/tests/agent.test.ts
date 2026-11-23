import { afterEach, describe, expect, it, vi } from "vitest";
import type { AiConfig } from "../dist/ai.js";
import { askAi } from "../dist/ai.js";
import { createUsage, estimateTokens, TokenBudget } from "../dist/agent-budget.js";
import { classifyIntent, wantsWeb } from "../dist/agent-intent.js";
import {
  classifyComplexity,
  looksLikeEdit,
  modelChain,
  resolveAgentMode,
} from "../dist/agent-routing.js";

const ENV_KEYS = [
  "KUZA_AI_ROUTE",
  "KUZA_AI_MODE",
  "KUZA_AI_MODEL_SIMPLE",
  "KUZA_AI_MODEL_COMPLEX",
  "KUZA_AI_FALLBACK_MODEL",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("классификация намерения", () => {
  it("вопрос остаётся вопросом", () => {
    expect(classifyIntent("what does render do?")).toBe("chat");
    expect(classifyIntent("почему не работает компиляция?")).toBe("chat");
  });

  it("просьба изменить файлы уходит агенту", () => {
    expect(classifyIntent("add a hero section to main.kuza")).toBe("edit");
    expect(classifyIntent("исправь ошибку в main.kuza")).toBe("edit");
  });

  it("мягкие и инфинитивные просьбы тоже уходят агенту", () => {
    expect(
      classifyIntent("попробуй сделать красивый и современный калькулятор. Возможно со своими функциями"),
    ).toBe("edit");
    expect(classifyIntent("попробуйте добавить таблицу")).toBe("edit");
    expect(classifyIntent("try to create a pricing section")).toBe("edit");
    expect(classifyIntent("хочу красивый калькулятор")).toBe("edit");
    expect(looksLikeEdit("сделать новый калькулятор")).toBe(true);
  });

  it("вопрос про 'как сделать' остаётся вопросом", () => {
    expect(classifyIntent("как сделать калькулятор на Kuza?")).toBe("chat");
    expect(classifyIntent("how to make a calculator?")).toBe("chat");
  });

  it("ссылка и слова поиска включают веб-контекст", () => {
    expect(wantsWeb("see https://example.com/docs")).toBe(true);
    expect(wantsWeb("погугли актуальную документацию")).toBe(true);
    expect(wantsWeb("объясни команду log")).toBe(false);
  });
});

describe("маршрутизация моделей", () => {
  const config: AiConfig = {
    provider: "openai",
    apiKey: "test",
    model: "main-model",
    baseUrl: "https://api.openai.com/v1",
  };

  it("простые задачи берут дешёвую модель, сложные — сильную", () => {
    process.env.KUZA_AI_MODEL_SIMPLE = "fast-model";
    process.env.KUZA_AI_MODEL_COMPLEX = "strong-model";
    process.env.KUZA_AI_FALLBACK_MODEL = "backup-model";

    expect(modelChain(config, classifyComplexity("what is render?"))).toEqual([
      "fast-model",
      "main-model",
      "backup-model",
    ]);
    expect(modelChain(config, classifyComplexity("refactor the whole project"))).toEqual([
      "strong-model",
      "main-model",
      "backup-model",
    ]);
  });

  it("принудительный роутинг перекрывает сложность", () => {
    process.env.KUZA_AI_ROUTE = "simple";
    expect(modelChain(config, "complex")[0]).toBe("main-model");
  });

  it("режимы и edit-глаголы распознаются", () => {
    expect(looksLikeEdit("create a table for users")).toBe(true);
    expect(looksLikeEdit("explain tables")).toBe(false);
    expect(resolveAgentMode("creative")).toBe("creative");
    expect(resolveAgentMode("nonsense")).toBe("precise");
    process.env.KUZA_AI_MODE = "engineering";
    expect(resolveAgentMode()).toBe("engineering");
  });
});

describe("бюджет токенов", () => {
  it("оценка считает кириллицу дороже", () => {
    expect(estimateTokens("a".repeat(100))).toBe(25);
    expect(estimateTokens("я".repeat(100))).toBeGreaterThan(25);
  });

  it("оставляет резерв на финальный ответ", () => {
    const budget = new TokenBudget(100, 10);
    expect(budget.remaining).toBe(90);
    budget.record({ input: 50, output: 20, cached: 0, requests: 1, reported: true });
    expect(budget.total).toBe(70);
    expect(budget.remaining).toBe(20);
    expect(budget.canAfford(15, 5)).toBe(true);
    expect(budget.canAfford(25, 5)).toBe(false);
    expect(budget.report()).toContain("provider");
  });
});

describe("fallback модели", () => {
  it("переключается на запасную модель и считает usage", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        bodies.push(body);
        if (bodies.length === 1) return new Response("rate limited", { status: 429 });
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"action":"done"}' } }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 4,
              prompt_tokens_details: { cached_tokens: 2 },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const usage = createUsage();
    const config: AiConfig = {
      provider: "openai",
      apiKey: "test",
      model: "primary",
      baseUrl: "https://api.openai.com/v1",
    };
    const answer = await askAi(config, [{ role: "user", content: "hi" }], "system", {
      model: "primary",
      fallbackModel: "backup",
      retries: 0,
      usage,
      cacheKey: "cache-key-1",
    });

    expect(answer).toBe('{"action":"done"}');
    expect(bodies.map((body) => body.model)).toEqual(["primary", "backup"]);
    expect(bodies[1]?.prompt_cache_key).toBe("cache-key-1");
    expect(usage).toEqual({ input: 10, output: 4, cached: 2, requests: 1, reported: true });
  });
});
