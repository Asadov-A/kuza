/**
 * ИНТЕЛЛЕКТУАЛЬНЫЙ КОНТЕКСТ И ПАМЯТЬ ПРОЕКТА.
 *
 * Вместо того чтобы каждый шаг перечитывать весь проект, агент держит
 * компактную карту файлов (имя, размер, mtime), поднимает только релевантные
 * файлы и хранит важные решения в .kuza/agent/. Карта перестраивается только
 * когда файлы действительно изменились.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import type { ChatMessage } from "./ai.js";
import { SKIP_DIRS } from "./agent-tools.js";

const MEMORY_DIR = join(".kuza", "agent");
const MAP_VERSION = 1;
const MAX_MAP_FILES = 300;
const MAX_MEMORY_CHARS = 6_000;
const MAX_HISTORY = 12;

export interface MapFile {
  path: string;
  size: number;
  mtime: number;
  kind: "kuza" | "code" | "config" | "docs" | "asset";
}

export interface ProjectMap {
  version: number;
  root: string;
  generated: number;
  files: MapFile[];
  scripts: string[];
  dependencies: string[];
}

function kindOf(name: string): MapFile["kind"] {
  const ext = extname(name).toLowerCase();
  if (ext === ".kuza") return "kuza";
  if ([".js", ".mjs", ".ts", ".tsx", ".jsx", ".vue", ".py", ".go", ".rs"].includes(ext)) return "code";
  if ([".json", ".toml", ".yaml", ".yml", ".env.example"].includes(name) || ext === ".json") return "config";
  if ([".md", ".html", ".txt"].includes(ext)) return "docs";
  return "asset";
}

function packageFacts(root: string): { scripts: string[]; dependencies: string[] } {
  const path = join(root, "package.json");
  if (!existsSync(path)) return { scripts: [], dependencies: [] };
  try {
    const pkg = JSON.parse(readFileSync(path, "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return {
      scripts: Object.keys(pkg.scripts ?? {}),
      dependencies: Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }),
    };
  } catch {
    return { scripts: [], dependencies: [] };
  }
}

/** Полное сканирование — только при первом обращении или когда файлы изменились. */
export function buildProjectMap(root: string): ProjectMap {
  const files: MapFile[] = [];
  const walk = (dir: string, level: number): void => {
    if (level > 7 || files.length >= MAX_MAP_FILES) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(".") || SKIP_DIRS.has(entry)) continue;
      const path = join(dir, entry);
      let info;
      try {
        info = statSync(path);
      } catch {
        continue;
      }
      const rel = relative(root, path).split(sep).join("/");
      if (info.isDirectory()) {
        walk(path, level + 1);
      } else if (info.isFile()) {
        files.push({ path: rel, size: info.size, mtime: info.mtimeMs, kind: kindOf(entry) });
      }
    }
  };
  walk(root, 0);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const facts = packageFacts(root);
  return {
    version: MAP_VERSION,
    root: resolve(root),
    generated: Date.now(),
    files,
    scripts: facts.scripts,
    dependencies: facts.dependencies,
  };
}

export function memoryDir(root: string): string {
  return join(root, MEMORY_DIR);
}

export function readProjectMap(root: string): ProjectMap | null {
  const path = join(memoryDir(root), "project-map.json");
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8")) as ProjectMap;
    if (data.version !== MAP_VERSION || resolve(data.root) !== resolve(root)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Карта устарела, если число файлов изменилось или любой mtime сдвинулся. */
export function mapIsStale(map: ProjectMap | null, root: string): boolean {
  if (!map || map.version !== MAP_VERSION) return true;
  const current = new Map<string, number>();
  const walk = (dir: string, level: number): void => {
    if (level > 7 || current.size >= MAX_MAP_FILES) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(".") || SKIP_DIRS.has(entry)) continue;
      const path = join(dir, entry);
      let info;
      try {
        info = statSync(path);
      } catch {
        continue;
      }
      if (info.isDirectory()) walk(path, level + 1);
      else if (info.isFile()) current.set(relative(root, path).split(sep).join("/"), info.mtimeMs);
    }
  };
  walk(root, 0);
  if (current.size !== map.files.length) return true;
  return map.files.some((file) => current.get(file.path) !== file.mtime);
}

export function refreshProjectMap(root: string): ProjectMap {
  const map = buildProjectMap(root);
  const dir = memoryDir(root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "project-map.json"), JSON.stringify(map, null, 2) + "\n", "utf8");
  return map;
}

/** Карта в компактном виде для системного промпта. */
export function mapSummary(map: ProjectMap): string {
  const lines = [`Project files (${map.files.length}):`];
  for (const file of map.files.slice(0, 160)) {
    const size = file.size >= 1024 ? `${Math.round(file.size / 1024)}k` : `${file.size}B`;
    lines.push(`  ${file.path} · ${file.kind} · ${size}`);
  }
  if (map.files.length > 160) lines.push(`  … and ${map.files.length - 160} more`);
  lines.push(`npm scripts: ${map.scripts.join(", ") || "(none)"}`);
  lines.push(`dependencies: ${map.dependencies.join(", ") || "(none)"}`);
  return lines.join("\n");
}

/** Выбрать файлы, о которых задача упоминает прямо или по ключевым словам. */
export function selectRelevantFiles(map: ProjectMap, task: string, limit = 6): string[] {
  const words = task
    .toLowerCase()
    .split(/[^\p{L}\p{N}._/-]+/u)
    .filter((word) => word.length > 2);
  const priority = new Set(["main.kuza", "index.kuza", "package.json", "start.md", "index.html"]);
  const scored = map.files.map((file) => {
    const name = file.path.toLowerCase();
    let score = priority.has(name) ? 4 : 0;
    if (file.kind === "kuza") score += 2;
    for (const word of words) {
      if (name.includes(word)) score += 4;
      if (file.path.split(/[/-]/).some((part) => part.toLowerCase() === `${word}.kuza`)) score += 3;
    }
    return { path: file.path, score, size: file.size };
  });
  scored.sort((a, b) => b.score - a.score || a.size - b.size);
  return scored.filter((item) => item.score > 0).slice(0, limit).map((item) => item.path);
}

export interface MemoryFile {
  decisions: string;
  conventions: string;
  taskState: string | null;
}

export function readMemory(root: string): MemoryFile {
  const read = (name: string): string => {
    const path = join(memoryDir(root), name);
    if (!existsSync(path)) return "";
    try {
      return readFileSync(path, "utf8").trim().slice(0, MAX_MEMORY_CHARS);
    } catch {
      return "";
    }
  };
  return {
    decisions: read("project-memory.md"),
    conventions: read("conventions.md"),
    taskState: read("task-state.json") || null,
  };
}

export function memoryContext(root: string): string {
  const memory = readMemory(root);
  if (!memory.decisions && !memory.conventions) return "";
  return [
    "# Persistent project memory",
    memory.decisions ? `## Decisions\n${memory.decisions}` : "",
    memory.conventions ? `## Conventions\n${memory.conventions}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Сохранить только то, что пригодится в следующей сессии. */
export function rememberTask(
  root: string,
  data: { task: string; summary: string; changed: string[]; mode?: string },
): void {
  const dir = memoryDir(root);
  mkdirSync(dir, { recursive: true });

  const state = {
    task: data.task.slice(0, 500),
    summary: data.summary.slice(0, 1000),
    changed: data.changed.slice(0, 40),
    mode: data.mode ?? "precise",
    updated: new Date().toISOString(),
  };
  writeFileSync(join(dir, "task-state.json"), JSON.stringify(state, null, 2) + "\n", "utf8");

  const memoryPath = join(dir, "project-memory.md");
  const previous = existsSync(memoryPath) ? readFileSync(memoryPath, "utf8").trim() : "";
  if (!previous.startsWith("# Kuza agent memory")) {
    writeFileSync(
      memoryPath,
      [
        "# Kuza agent memory",
        "",
        "Facts worth keeping between sessions. Written by `kuza agent`; edit freely.",
        "",
        `## ${state.updated.slice(0, 10)} — ${state.task}`,
        `- ${state.summary}`,
        ...state.changed.slice(0, 12).map((file) => `- changed: ${file}`),
        "",
      ].join("\n"),
      "utf8",
    );
    return;
  }
  const entry = [
    `## ${state.updated.slice(0, 10)} — ${state.task}`,
    `- ${state.summary}`,
    ...state.changed.slice(0, 12).map((file) => `- changed: ${file}`),
    "",
  ].join("\n");
  writeFileSync(memoryPath, `${previous.trimEnd()}\n\n${entry}`.slice(0, MAX_MEMORY_CHARS), "utf8");
}

/**
 * Сжать историю: оставить исходную задачу, последние сообщения и короткий
 * конспект старых результатов инструментов вместо десятков килобайт логов.
 */
export function compactHistory(messages: ChatMessage[], keep = MAX_HISTORY): ChatMessage[] {
  if (messages.length <= keep) return messages;
  const head = messages[0]!;
  const old = messages.slice(1, messages.length - keep + 1);
  const tail = messages.slice(messages.length - keep + 1);
  const notes = old
    .filter((message) => message.role === "user" && message.content.startsWith("Results:"))
    .map((message) => message.content.replace(/^Results:\s*/i, "").slice(0, 300));
  const summary = [
    "Summary of earlier steps (tool results condensed; files on disk are the source of truth):",
    ...notes.slice(-8).map((note) => `- ${note.replace(/\s+/g, " ").trim()}`),
  ].join("\n");
  return [head, { role: "user", content: summary }, ...tail];
}
