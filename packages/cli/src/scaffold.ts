/**
 * Единый генератор проектов: используется и `kuza new/init`, и postinstall.
 * Шаблоны лежат в packages/cli/templates и попадают в npm-пакет целиком.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { FILE_EXT, VERSION } from "kuza-core";
import { docsHtml } from "./docs-html.js";
import { AGENTS_TEMPLATE } from "./kuza-knowledge.js";

const TEMPLATES = new URL("../templates/", import.meta.url);

const ENV_EXAMPLE = [
  "# Copy this file to .env and paste your key.",
  "# .env is already in .gitignore, so it will not be committed.",
  "",
  "# OpenAI (default)",
  "# KUZA_AI_PROVIDER=openai",
  "# KUZA_AI_KEY=sk-...",
  "# KUZA_AI_MODEL=gpt-4o-mini",
  "",
  "# OpenRouter / Groq / Ollama / Freebuff — any OpenAI-compatible API",
  "# KUZA_AI_PROVIDER=openai",
  "# KUZA_AI_KEY=your-provider-key",
  "# KUZA_AI_BASE_URL=https://openrouter.ai/api/v1",
  "# KUZA_AI_MODEL=openai/gpt-4o-mini",
  "",
  "# Anthropic Claude",
  "# KUZA_AI_PROVIDER=anthropic",
  "# ANTHROPIC_API_KEY=sk-ant-...",
  "# KUZA_AI_MODEL=claude-3-5-sonnet-latest",
  "",
  "# Agent routing and behavior (all models are user-defined, no hardcoding)",
  "# KUZA_AI_MODEL_SIMPLE=gpt-4o-mini",
  "# KUZA_AI_MODEL_COMPLEX=claude-3-5-sonnet-latest",
  "# KUZA_AI_FALLBACK_MODEL=openai/gpt-4o-mini",
  "# KUZA_AI_ROUTE=auto          # auto|simple|medium|complex|off",
  "# KUZA_AI_MODE=precise        # precise|creative|engineering",
  "# KUZA_AI_MAX_TOKENS=150000",
  "# KUZA_AI_MAX_STEPS=24",
  "# KUZA_AI_FETCH_HOSTS=example.com,raw.githubusercontent.com",
  "",
].join("\n");

function template(name: string): string {
  return readFileSync(new URL(name, TEMPLATES), "utf8");
}

export interface ScaffoldOptions {
  /** Перезаписать существующие файлы (для `kuza new --force`). */
  force?: boolean;
  /** Консольная программа вместо сайта. */
  scriptOnly?: boolean;
}

function packageName(dir: string): string {
  const raw = basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return raw || "kuza-app";
}

function patchPackageJson(dir: string, created: string[], force: boolean): void {
  const path = join(dir, "package.json");
  const scripts = {
    dev: "kuza dev",
    start: "kuza dev",
    build: "kuza build",
    check: "kuza check",
  };
  let data: Record<string, unknown>;

  if (existsSync(path)) {
    try {
      data = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    } catch {
      if (!force) return;
      data = {};
    }
  } else {
    data = {};
  }

  if (!data.name) data.name = packageName(dir);
  if (!data.private) data.private = true;
  if (!data.type) data.type = "module";
  data.scripts = { ...scripts, ...(data.scripts as Record<string, unknown> | undefined) };
  const deps = (data.dependencies ?? {}) as Record<string, string>;
  // Версия берётся из kuza-core — новый проект всегда просит актуальную ветку.
  if (!deps["kuza-lang"]) deps["kuza-lang"] = `^${VERSION}`;
  data.dependencies = deps;

  if (!existsSync(path) || force) created.push("package.json");
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** Создать базовый проект. Возвращает список созданных файлов. */
export function scaffoldProject(target: string | undefined, options: ScaffoldOptions = {}): string[] {
  const dir = resolve(target ?? process.cwd());
  const force = options.force ?? false;
  mkdirSync(dir, { recursive: true });
  const created: string[] = [];

  const write = (name: string, content: string): void => {
    const path = join(dir, name);
    if (existsSync(path) && !force) return;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, { encoding: "utf8", flag: force ? "w" : "wx" });
    created.push(name);
  };

  if (options.scriptOnly) {
    write(`main${FILE_EXT}`, template("main-script.kuza"));
  } else {
    write("index.html", template("index.html"));
    write("public/favicon.svg", template("public/favicon.svg"));
    write("public/styles.css", template("public/styles.css"));
    write(`main${FILE_EXT}`, template("main.kuza"));
    write("AGENTS.md", AGENTS_TEMPLATE);
    write("START.md", template("START.md"));
    write("public/docs.html", docsHtml());
    write(".env.example", ENV_EXAMPLE);
    write(
      "README.md",
      `# ${packageName(dir)}\n\nA site built with Kuza.\n\n` +
        "```bash\nnpm install\nnpm run dev\n```\n\n" +
        "- `kuza docs` — open the local reference (public/docs.html) with every command.\n" +
        "- `START.md` — short getting-started guide.\n" +
        "- `.env.example` — AI setup example (copy it to `.env`).\n",
    );
    write(".gitignore", "node_modules/\ndist/\n.env\n");
  }

  patchPackageJson(dir, created, force);
  return created;
}
