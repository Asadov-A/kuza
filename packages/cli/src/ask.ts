/** Одноразовый вызов ИИ из CLI: kuza ai "вопрос" --file main.kuza */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { compile, formatDiagnostic } from "kuza-core";
import { askAi, resolveAiConfig, systemPrompt, type ChatMessage } from "./ai.js";
import { createUsage, TokenBudget } from "./agent-budget.js";
import { collectWebContext } from "./agent-intent.js";
import { classifyComplexity, looksLikeEdit, modelChain } from "./agent-routing.js";
import { bold, danger, dim, primary, warning } from "./ui.js";

const ALLOWED = new Set([".kuza", ".html", ".js", ".ts", ".json", ".md", ".css", ".txt", ".mjs"]);
const SKIP = new Set(["node_modules", "dist", ".git", ".vsix"]);
const MAX_FILES = 24;
const MAX_CHARS = 60000;

function collectFiles(root: string, explicit: string[]): string[] {
  if (explicit.length > 0) {
    return explicit
      .map((name) => resolve(root, name))
      .filter((path) => existsSync(path) && statSync(path).isFile());
  }

  const found: string[] = [];
  const walk = (dir: string, depth: number): void => {
    if (depth > 2 || found.length >= MAX_FILES) return;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP.has(entry) || entry.startsWith(".")) continue;
      const path = join(dir, entry);
      if (!existsSync(path)) continue;
      if (statSync(path).isDirectory()) {
        walk(path, depth + 1);
        continue;
      }
      if (ALLOWED.has(extname(entry))) found.push(path);
      if (found.length >= MAX_FILES) break;
    }
  };
  walk(root, 0);

  // Сначала самые важные файлы проекта.
  const priority = ["main.kuza", "index.kuza", "index.html", "START.md", "package.json"];
  found.sort((a, b) => {
    const nameA = relative(root, a).replace(/\\/g, "/");
    const nameB = relative(root, b).replace(/\\/g, "/");
    const rankA = priority.indexOf(nameA);
    const rankB = priority.indexOf(nameB);
    return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
  });
  return found.slice(0, MAX_FILES);
}

function diagnostics(root: string): string {
  for (const name of ["main.kuza", "index.kuza"]) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    const source = readFileSync(path, "utf8");
    const result = compile(source, { filename: path });
    if (!result.ok) {
      return `\nCompile error in ${name}:\n${formatDiagnostic(result.errors[0]!, source)}`;
    }
  }
  return "";
}

export async function runAiQuestion(question: string, explicitFiles: string[] = []): Promise<void> {
  const config = resolveAiConfig();
  if (!config) {
    console.log(danger("AI is not configured. Add KUZA_AI_KEY to .env or to the environment."));
    console.log(dim("Details: START.md → the AI assistant section"));
    return;
  }

  const root = process.cwd();
  const files = collectFiles(root, explicitFiles);
  const parts = [`Project at ${root}. Files:`];
  let total = 0;
  for (const path of files) {
    const name = relative(root, path).replace(/\\/g, "/");
    let text = readFileSync(path, "utf8");
    if (text.length > 12000) text = text.slice(0, 12000) + "\n… [truncated]";
    if (total + text.length > MAX_CHARS) break;
    total += text.length;
    parts.push(`\n--- ${name} ---\n${text}`);
  }
  if (files.length === 0) parts.push("(no project text files found in the folder)");
  parts.push(diagnostics(root));

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `${parts.join("\n")}\n\nTask: ${question}`,
    },
  ];

  const web = await collectWebContext(question);
  if (web) messages[0]!.content += `\n\nWeb context for this question:\n${web}`;

  const complexity = classifyComplexity(question, files.length);
  const chain = modelChain(config, complexity);
  const usage = createUsage();
  const budget = new TokenBudget();

  console.log(dim(`AI is reading ${files.length} file(s) · ${complexity} · ${chain[0]}…`));
  try {
    const answer = await askAi(config, messages, systemPrompt(), {
      usage,
      model: chain[0],
      fallbackModel: chain[1],
      cacheKey: "kuza-ai-v1",
    });
    budget.record(usage);
    console.log("");
    if (answer) {
      console.log(bold(primary("Kuza AI")) + "\n" + answer);
    } else {
      console.log(warning("The model returned an empty response."));
      if (looksLikeEdit(question)) {
        console.log(dim('This looks like a project change — use /agent "..." to let Kuza edit files.'));
      } else {
        console.log(dim("Try rephrasing the question or switching KUZA_AI_MODEL."));
      }
    }
    console.log("");
    console.log(dim(budget.report()));
  } catch (error) {
    console.log(danger(`AI error: ${error instanceof Error ? error.message : String(error)}`));
  }
}
