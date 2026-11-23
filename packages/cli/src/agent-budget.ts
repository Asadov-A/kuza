/**
 * УЧЁТ ТОКЕНОВ.
 *
 * Считаем реальные токены, когда провайдер их возвращает, и оценку — когда нет.
 * Оценка нужна только чтобы не выйти за лимит, а не для отчётности: в выводе
 * помечаем, какие числа названы провайдером, а какие приблизительные.
 */

export interface TokenUsage {
  input: number;
  output: number;
  /** Прочитано из кеша промпта (уже оплачено/не переотправлено). */
  cached: number;
  requests: number;
  /** true, хотя бы провайдер вернул usage. */
  reported: boolean;
}

export function createUsage(): TokenUsage {
  return { input: 0, output: 0, cached: 0, requests: 0, reported: false };
}

export function mergeUsage(target: TokenUsage, delta: TokenUsage): void {
  target.input += delta.input;
  target.output += delta.output;
  target.cached += delta.cached;
  target.requests += delta.requests;
  target.reported = target.reported || delta.reported;
}

/** Грубая оценка: 4 символа латиницы на токен, 3 — для кириллицы. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let cyrillic = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 0x400 && code <= 0x4ff) || (code >= 0x100 && code <= 0x24f)) cyrillic++;
  }
  const weighted = text.length - cyrillic + cyrillic * 1.35;
  return Math.ceil(weighted / 4);
}

function envNumber(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export class TokenBudget {
  readonly limit: number;
  readonly reserve: number;
  private used: TokenUsage = createUsage();

  constructor(limit = envNumber("KUZA_AI_MAX_TOKENS", 150_000), reserve = 4_000) {
    this.limit = limit;
    this.reserve = reserve;
  }

  get total(): number {
    return this.used.input + this.used.output;
  }

  get snapshot(): TokenUsage {
    return { ...this.used };
  }

  /** Сколько ещё можно потратить, оставив место на финальный ответ. */
  get remaining(): number {
    return Math.max(0, this.limit - this.reserve - this.total);
  }

  canAfford(estimatedInput: number, expectedOutput = 2_000): boolean {
    return estimatedInput + expectedOutput <= this.remaining;
  }

  record(usage: TokenUsage): void {
    mergeUsage(this.used, usage);
  }

  report(): string {
    const u = this.used;
    const fmt = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));
    const source = u.reported ? "provider" : "estimated";
    const cache = u.cached ? ` · cached ${fmt(u.cached)}` : "";
    return `Tokens: ${fmt(u.input)} in / ${fmt(u.output)} out · ${fmt(this.total)} of ${fmt(this.limit)} (${source}${cache}) · ${u.requests} call(s)`;
  }
}
