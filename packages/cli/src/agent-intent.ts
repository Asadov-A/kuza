/**
 * ОПРЕДЕЛЕНИЕ НАМЕРЕНИЯ ДЛЯ ЕДИНОЙ КОМАНДЫ /ai.
 *
 * Один и тот же ввод может значить «объясни» (ответ без изменений) или
 * «сделай» (нужен агент с доступом к файлам). Классификация детерминированная
 * и локальная: лишний вызов модели здесь только замедлил бы REPL.
 */

import { looksLikeEdit } from "./agent-routing.js";
import { dim, warning } from "./ui.js";

export type Intent = "chat" | "edit";

const BOUND = String.raw`(?<![\p{L}\p{N}_])`;
const END = String.raw`(?![\p{L}\p{N}_])`;

// \b не работает с кириллицей: `исправь` начинается с латинского `is`.
const QUESTION = new RegExp(
  "^(?:what|why|how|where|when|which|who|is|are|does|do|can|should|would|tell me|explain|compare)" +
    END +
    "|" +
    BOUND +
    "(?:what is|how does|difference between|в чём разница)" +
    END +
    "|" +
    BOUND +
    "(?:что|почему|как|где|когда|какой|какая|какие|объясни|расскажи)" +
    END +
    "|" +
    BOUND +
    "(?:nima|nega|qanday|qayer|qachon|tushuntir)" +
    END,
  "iu",
);

const WEB = new RegExp(
  BOUND +
    "https?:\\/\\/\\S+" +
    "|" +
    BOUND +
    "(?:search|google|find online|look up|latest docs|on the web)" +
    END +
    "|" +
    BOUND +
    "(?:найди в интернете|погугли|поищи в сети|последние версии|актуальная документация)" +
    END +
    "|" +
    BOUND +
    "(?:izlab top|internetdan|eng so'nggi)" +
    END,
  "iu",
);

const DIRECT_EDIT = new RegExp(
  "^(?:add|create|fix|write|make|try|please|help me|" +
    "добавь|добавить|создай|создать|исправь|исправить|напиши|написать|сделай|сделать|" +
    "попробуй|попробуйте|давай|давайте|хочу|нужно|надо)" +
    END,
  "iu",
);

export function classifyIntent(text: string): Intent {
  const clean = text.trim();
  // Вопрос про код не должен случайно стать правкой из-за слова "make".
  if (QUESTION.test(clean) && !DIRECT_EDIT.test(clean)) return "chat";
  return looksLikeEdit(clean) ? "edit" : "chat";
}

export function wantsWeb(text: string): boolean {
  return WEB.test(text);
}

function stripMarkup(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Подтянуть в контекст страницы по ссылкам из вопроса или результат поиска.
 * При отсутствии сети возвращает пустую строку — ответ всё равно состоится.
 */
export async function collectWebContext(text: string): Promise<string> {
  if (!wantsWeb(text)) return "";
  const urls = text.match(/https?:\/\/[^\s"'<>)]+/g) ?? [];
  const targets = urls.slice(0, 3);
  if (targets.length === 0) {
    const query = text.replace(/^(найди|поищи|погугли|search|google|look up)\b/i, "").trim();
    targets.push(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.slice(0, 200))}`);
  }

  const blocks: string[] = [];
  for (const url of targets) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
      const response = await fetch(parsed, {
        signal: AbortSignal.timeout(12_000),
        headers: { "user-agent": "KuzaAgent/0.5 (+https://github.com/kuza-lang/kuza)" },
      });
      if (!response.ok) continue;
      const text = stripMarkup(await response.text()).slice(0, 6_000);
      if (text) blocks.push(`--- ${parsed.host} ---\n${text}`);
    } catch {
      // сеть недоступна — просто отвечаем без внешнего контекста
    }
  }
  if (blocks.length === 0) {
    console.log(warning("External lookup failed (no network or the host blocked it). Answering without it."));
  } else {
    console.log(dim(`Web context: ${blocks.length} source(s)`));
  }
  return blocks.join("\n\n");
}
