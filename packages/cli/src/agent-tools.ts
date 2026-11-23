/**
 * ИНСТРУМЕНТЫ АГЕНТА.
 *
 * Всё, что агент умеет делать с проектом: читать и искать файлы, писать и
 * удалять их, ставить npm-пакеты, скачивать данные по ссылке, запускать
 * проверки и обновлять Kuza.
 *
 * Безопасность: только текущая папка проекта, только разрешённые расширения,
 * никаких секретов, npm-команды — без shell-инъекций, каждая запись и
 * установка спрашивает подтверждение (кроме `--yes`).
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { compile, formatDiagnostic, VERSION } from "kuza-core";
import { cliVersion } from "./kuza-knowledge.js";
import { danger, dim, success, warning } from "./ui.js";

export const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".next", "build", ".cache", ".vscode"]);
export const WRITABLE = new Set([".kuza", ".md", ".css", ".html", ".json", ".txt", ".js", ".mjs", ".svg"]);
const SECRET = /(^|\/)(\.env(\..*)?|\.npmrc|id_rsa|.*\.pem|.*\.key)$/i;
const TEXT_EXT = new Set([".kuza", ".md", ".css", ".html", ".json", ".txt", ".js", ".mjs", ".ts", ".svg", ".yml", ".yaml"]);

export const MAX_READ = 20000;
export const MAX_LIST = 200;
const MAX_MATCHES = 80;
const MAX_RESULT = 6000;
const MAX_FETCH = 2 * 1024 * 1024;

export type ActionName =
  | "plan"
  | "list"
  | "info"
  | "glob"
  | "grep"
  | "read"
  | "write"
  | "append"
  | "replace"
  | "delete"
  | "mkdir"
  | "check"
  | "run"
  | "install"
  | "fetch"
  | "version"
  | "upgrade"
  | "done";

export interface Action {
  action: ActionName;
  path?: string;
  pattern?: string;
  content?: string;
  find?: string;
  replace?: string;
  all?: boolean;
  offset?: number;
  limit?: number;
  packages?: string[];
  command?: string;
  url?: string;
  summary?: string;
  steps?: string[];
}

export interface ToolContext {
  root: string;
  /** Не спрашивать подтверждение. */
  yes: boolean;
}

/** Проект считается Kuza-проектом, если в нём есть хотя бы один .kuza файл. */
export function findKuzaFiles(root: string, depth = 4): string[] {
  const found: string[] = [];
  const walk = (dir: string, level: number): void => {
    if (level > depth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found.length >= 80) return;
      if (entry.startsWith(".") && entry !== ".") continue;
      if (SKIP_DIRS.has(entry)) continue;
      const path = join(dir, entry);
      let info;
      try {
        info = statSync(path);
      } catch {
        continue;
      }
      if (info.isDirectory()) walk(path, level + 1);
      else if (entry.endsWith(".kuza")) found.push(path);
    }
  };
  walk(root, 0);
  return found;
}

/** Дерево проекта — контекст агента в первом сообщении. */
export function tree(root: string, depth = 2): string {
  const lines: string[] = [];
  const walk = (dir: string, level: number): void => {
    if (level > depth || lines.length >= MAX_LIST) return;
    let entries: string[];
    try {
      entries = readdirSync(dir).sort();
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
      const name = relative(root, path).split(sep).join("/");
      if (info.isDirectory()) {
        lines.push(`${name}/`);
        walk(path, level + 1);
      } else {
        lines.push(`${name} (${info.size} B)`);
      }
      if (lines.length >= MAX_LIST) return;
    }
  };
  walk(root, 0);
  return lines.join("\n");
}

/** Путь внутри проекта и не секрет. */
export function safePath(root: string, target: string): string | null {
  if (!target) return null;
  const path = resolve(root, target);
  if (path !== root && !path.startsWith(root + sep)) return null;
  const rel = relative(root, path).split(sep).join("/");
  if (SECRET.test(rel)) return null;
  if (rel.split("/").some((part) => SKIP_DIRS.has(part))) return null;
  return path;
}

/** Все текстовые файлы проекта (для glob/grep). */
function walkProjectFiles(root: string, visit: (path: string, rel: string) => void): void {
  const walk = (dir: string, level: number): void => {
    if (level > 8) return;
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
      if (info.isDirectory()) walk(path, level + 1);
      else visit(path, rel);
    }
  };
  walk(root, 0);
}

function globToRegExp(pattern: string): RegExp {
  let out = "^";
  const source = pattern.replace(/\\/g, "/").replace(/^\.\//, "");
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!;
    if (ch === "*") {
      if (source[i + 1] === "*") {
        i++;
        if (source[i + 1] === "/") {
          i++;
          out += "(?:.*/)?";
        } else {
          out += ".*";
        }
      } else {
        out += "[^/]*";
      }
      continue;
    }
    if (ch === "?") {
      out += "[^/]";
      continue;
    }
    out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(out + "$");
}

function cap(text: string, limit = MAX_RESULT): string {
  return text.length > limit ? text.slice(0, limit) + "\n… [truncated]" : text;
}

/**
 * Не даём ключам и токенам попасть ни в промпт модели, ни в терминал.
 * Вызывается для всех результатов инструментов, включая вывод команд.
 */
export function redact(text: string): string {
  return text
    .replace(/(sk-[A-Za-z0-9_-]{8,})/g, "[REDACTED_KEY]")
    .replace(/(sk-ant-[A-Za-z0-9_-]{8,})/g, "[REDACTED_KEY]")
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{8,}/gi, "$1[REDACTED]")
    .replace(/(x-api-key["':=\s]+)[A-Za-z0-9_-]{8,}/gi, "$1[REDACTED]")
    .replace(
      /\b(KUZA_AI_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|NPM_TOKEN|GITHUB_TOKEN|DATABASE_URL)\s*[:=]\s*\S+/gi,
      "$1=[REDACTED]",
    );
}

function lineCount(text: string): number {
  return text.split(/\r?\n/).length;
}

function preview(content: string): string {
  const lines = content.split(/\r?\n/);
  return lines.slice(0, 8).join("\n") + (lines.length > 8 ? `\n… (${lines.length} lines)` : "");
}

export function compileCheck(root: string): string {
  const files = findKuzaFiles(root);
  if (files.length === 0) return "No .kuza files found.";
  const problems: string[] = [];
  for (const path of files) {
    const source = readFileSync(path, "utf8");
    const result = compile(source, { filename: path });
    if (!result.ok) {
      problems.push(
        `${relative(root, path).split(sep).join("/")}:\n${formatDiagnostic(result.errors[0]!, source)}`,
      );
    }
  }
  if (problems.length === 0) return `OK — ${files.length} file(s) compile.`;
  return problems.join("\n\n");
}

/** Спросить разрешение у человека. `a` — разрешить всё до конца задачи. */
export async function askConfirm(question: string, ctx: ToolContext): Promise<boolean> {
  if (ctx.yes) return true;
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question} ${dim("[y/N/a=all]")} `)).trim().toLowerCase();
    if (answer === "a" || answer === "all" || answer === "все" || answer === "в") {
      ctx.yes = true;
      return true;
    }
    return answer === "y" || answer === "yes" || answer === "д" || answer === "да";
  } finally {
    rl.close();
  }
}

function npmBinary(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

/** Без shell:true: команда и аргументы передаются отдельно, инъекция невозможна. */
function runNpm(args: string[], cwd: string, timeout = 180_000) {
  return spawnSync(npmBinary(), args, {
    cwd,
    shell: false,
    encoding: "utf8",
    timeout,
    windowsHide: true,
  });
}

/** Разрешённые команды превращаем в argv — без вызовов оболочки. */
function commandArgv(command: string): string[] | null {
  const text = command.trim();
  if (text === "npm test") return [npmBinary(), "test"];
  const run = text.match(/^npm run ([\w:.-]+)$/);
  if (run) return [npmBinary(), "run", run[1]!];
  const kuza = text.match(/^(?:npx )?kuza (check|build)$/);
  if (kuza) {
    const entry = process.argv[1];
    return entry ? [process.execPath, entry, kuza[1]!] : [npmBinary(), "exec", "--", "kuza", kuza[1]!];
  }
  return null;
}

function runCommand(command: string, cwd: string, timeout = 180_000): string {
  const argv = commandArgv(command);
  if (!argv) return "ERROR: command is not in the allowlist.";
  const result = spawnSync(argv[0]!, argv.slice(1), {
    cwd,
    shell: false,
    encoding: "utf8",
    timeout,
    windowsHide: true,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const status = result.status ?? (result.error ? 1 : 0);
  const tail = output.split(/\r?\n/).slice(-40).join("\n");
  return `exit ${status}\n${cap(tail, 4000)}`;
}

function installedVersions(root: string): string {
  const lines: string[] = [`language/core: ${VERSION}`, `CLI: ${cliVersion()}`];
  const path = join(root, "package.json");
  if (existsSync(path)) {
    try {
      const pkg = JSON.parse(readFileSync(path, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      for (const name of ["kuza-lang", "kuza-core"]) {
        if (all[name]) lines.push(`project ${name}: ${all[name]}`);
      }
    } catch {
      lines.push("package.json: cannot parse");
    }
  } else {
    lines.push("package.json: not found");
  }
  return lines.join("\n");
}

function latestNpmVersion(): string {
  const result = runNpm(["view", "kuza-lang", "version"], process.cwd(), 25_000);
  const text = (result.stdout ?? "").trim();
  return result.status === 0 && text ? text : "unknown (no network or npm unavailable)";
}

/** Проверить, что команду запускать безопасно. */
function safeRunCommand(command: string, root: string): string | null {
  const text = command.trim();
  if (!/^npm (run [\w:.-]+|test)$/.test(text) && !/^(npx )?kuza (check|build)$/.test(text)) {
    return `ERROR: only "npm run <script>", "npm test" and "kuza check|build" are allowed (got "${text}").`;
  }
  const scriptMatch = text.match(/^npm run ([\w:.-]+)$/);
  if (scriptMatch) {
    const path = join(root, "package.json");
    if (!existsSync(path)) return "ERROR: no package.json in this project.";
    try {
      const pkg = JSON.parse(readFileSync(path, "utf8")) as { scripts?: Record<string, string> };
      if (!pkg.scripts?.[scriptMatch[1]!]) return `ERROR: package.json has no script "${scriptMatch[1]}".`;
    } catch {
      return "ERROR: cannot parse package.json.";
    }
  }
  return null;
}

/** Защита от обращения к локальным сервисам через fetch (SSRF). */
function fetchHostAllowed(url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const allow = (process.env.KUZA_AI_FETCH_HOSTS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length > 0) {
    return allow.some((entry) => host === entry || host.endsWith(`.${entry}`));
  }
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") return false;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
  if (/^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^(fc|fd|fe)[0-9a-f]*:|^fe80:/i.test(host)) return false;
  return true;
}

const PACKAGE_NAME = /^(@[\w.-]+\/)?[\w.-]+(@[\w.^~*<>=|-]+)?$/;

/** Выполнить одно действие агента и вернуть текст результата для модели. */
async function executeActionInner(action: Action, ctx: ToolContext): Promise<string> {
  const { root } = ctx;

  switch (action.action) {
    case "plan": {
      const steps = (action.steps ?? []).filter(Boolean);
      if (steps.length === 0) return "ERROR: plan needs steps: [\"…\"].";
      console.log(dim("Plan:"));
      steps.forEach((step, index) => console.log(dim(`  ${index + 1}. ${step}`)));
      return "Plan recorded. Now execute it step by step.";
    }

    case "list": {
      const path = safePath(root, action.path ?? ".");
      if (!path) return "ERROR: path is outside the project.";
      console.log(dim(`› list ${action.path ?? "."}`));
      try {
        return readdirSync(path).slice(0, MAX_LIST).join("\n") || "(empty)";
      } catch {
        return "ERROR: cannot read that folder.";
      }
    }

    case "info": {
      const path = safePath(root, action.path ?? "");
      if (!path || !existsSync(path)) return "ERROR: file not found or path not allowed.";
      try {
        const info = statSync(path);
        const lines = lineCount(info.isFile() ? readFileSync(path, "utf8") : "");
        return [
          `path: ${action.path}`,
          `type: ${info.isDirectory() ? "directory" : "file"}`,
          `size: ${info.size} bytes`,
          `lines: ${lines}`,
          `modified: ${info.mtime.toISOString()}`,
        ].join("\n");
      } catch {
        return "ERROR: cannot inspect that path.";
      }
    }

    case "glob": {
      const pattern = action.pattern ?? action.path ?? "**/*.kuza";
      console.log(dim(`› glob ${pattern}`));
      let regex: RegExp;
      try {
        regex = globToRegExp(pattern);
      } catch {
        return "ERROR: bad glob pattern.";
      }
      const matches: string[] = [];
      walkProjectFiles(root, (_path, rel) => {
        if (matches.length < 100 && regex.test(rel)) matches.push(rel);
      });
      return matches.length ? matches.join("\n") : `No files match ${pattern}.`;
    }

    case "grep": {
      const pattern = action.pattern ?? "";
      if (!pattern) return "ERROR: grep needs a pattern.";
      console.log(dim(`› grep ${pattern}`));
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, "i");
      } catch {
        return "ERROR: bad regular expression.";
      }
      const hits: string[] = [];
      walkProjectFiles(root, (path, rel) => {
        if (hits.length >= MAX_MATCHES) return;
        if (!TEXT_EXT.has(extname(rel))) return;
        let text: string;
        try {
          if (statSync(path).size > 400_000) return;
          text = readFileSync(path, "utf8");
        } catch {
          return;
        }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length && hits.length < MAX_MATCHES; i++) {
          if (regex.test(lines[i]!)) hits.push(`${rel}:${i + 1}: ${lines[i]!.trim().slice(0, 200)}`);
        }
      });
      return hits.length ? hits.join("\n") : `No matches for ${pattern}.`;
    }

    case "read": {
      const path = safePath(root, action.path ?? "");
      if (!path || !existsSync(path)) return "ERROR: file not found or path not allowed.";
      console.log(dim(`› read ${action.path}`));
      const text = readFileSync(path, "utf8");
      const lines = text.split(/\r?\n/);
      const offset = Math.max(0, (action.offset ?? 1) - 1);
      const limit = action.limit && action.limit > 0 ? action.limit : undefined;
      const slice = lines.slice(offset, limit ? offset + limit : undefined);
      let out = slice.join("\n");
      if (out.length > MAX_READ) out = out.slice(0, MAX_READ) + "\n… [truncated]";
      if (offset > 0 || (limit && offset + limit < lines.length)) {
        out = `[lines ${offset + 1}–${offset + slice.length} of ${lines.length}]\n${out}`;
      }
      return out || "(empty file)";
    }

    case "write": {
      const path = safePath(root, action.path ?? "");
      const content = action.content ?? "";
      if (!path) return "ERROR: path is outside the project.";
      if (!WRITABLE.has(extname(path))) return `ERROR: ${extname(path) || "this file type"} is read-only for the agent.`;
      const exists = existsSync(path);
      console.log(`${exists ? warning("~") : success("+")} ${action.path} ${dim(`(${lineCount(content)} lines)`)}`);
      console.log(dim(preview(content).replace(/^/gm, "    ")));
      if (!(await askConfirm(`Write ${action.path}?`, ctx))) {
        return "REJECTED: the user did not approve this write. Ask before changing files or finish.";
      }
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, "utf8");
      return `Wrote ${action.path} (${content.length} bytes). Reminder: run check.`;
    }

    case "append": {
      const path = safePath(root, action.path ?? "");
      const content = action.content ?? "";
      if (!path) return "ERROR: path is outside the project.";
      if (!WRITABLE.has(extname(path))) return `ERROR: ${extname(path) || "this file type"} is read-only.`;
      console.log(warning(`+ ${action.path}`) + dim(` (append ${lineCount(content)} lines)`));
      if (!(await askConfirm(`Append to ${action.path}?`, ctx))) return "REJECTED: the user did not approve.";
      mkdirSync(dirname(path), { recursive: true });
      const current = existsSync(path) ? readFileSync(path, "utf8") : "";
      writeFileSync(path, current + content, "utf8");
      return `Appended to ${action.path}. Reminder: run check.`;
    }

    case "replace": {
      const path = safePath(root, action.path ?? "");
      const find = action.find ?? "";
      const replacement = action.replace ?? "";
      if (!path || !existsSync(path)) return "ERROR: file not found or path not allowed.";
      if (!find) return "ERROR: empty find fragment.";
      const current = readFileSync(path, "utf8");
      if (!current.includes(find)) {
        return `ERROR: fragment not found in ${action.path}. Read the file and copy the exact text.`;
      }
      console.log(warning(`~ ${action.path}`) + dim(` (replace ${lineCount(find)} line(s))`));
      if (!(await askConfirm(`Apply this change to ${action.path}?`, ctx))) {
        return "REJECTED: the user did not approve this change.";
      }
      const next = action.all ? current.split(find).join(replacement) : current.replace(find, replacement);
      writeFileSync(path, next, "utf8");
      return `Patched ${action.path}. Reminder: run check.`;
    }

    case "delete": {
      const path = safePath(root, action.path ?? "");
      if (!path || !existsSync(path)) return "ERROR: file not found or path not allowed.";
      if (!WRITABLE.has(extname(path))) return `ERROR: ${extname(path) || "this file type"} cannot be deleted by the agent.`;
      if (!(await askConfirm(`Delete ${action.path}?`, ctx))) return "REJECTED: the user did not approve the deletion.";
      rmSync(path, { force: true });
      console.log(danger(`- ${action.path}`));
      return `Deleted ${action.path}.`;
    }

    case "mkdir": {
      const path = safePath(root, action.path ?? "");
      if (!path) return "ERROR: path is outside the project.";
      console.log(warning(`+ ${action.path}/`));
      if (!(await askConfirm(`Create folder ${action.path}?`, ctx))) {
        return "REJECTED: the user did not approve creating the folder.";
      }
      mkdirSync(path, { recursive: true });
      return `Created folder ${action.path}.`;
    }

    case "check": {
      const result = compileCheck(root);
      console.log(dim("› check ") + (result.startsWith("OK") ? success(result) : danger(result.split("\n")[0]!)));
      return result;
    }

    case "run": {
      const command = action.command ?? "";
      const problem = safeRunCommand(command, root);
      if (problem) return problem;
      console.log(dim(`› run ${command}`));
      if (!(await askConfirm(`Run "${command}"?`, ctx))) return "REJECTED: the user did not approve running it.";
      return runCommand(command, root);
    }

    case "install": {
      const packages = (action.packages ?? []).map((name) => name.trim()).filter(Boolean);
      if (packages.length === 0) return "ERROR: install needs packages: [\"lodash\"].";
      const bad = packages.find((name) => !PACKAGE_NAME.test(name));
      if (bad) return `ERROR: "${bad}" is not a valid package name.`;
      console.log(dim(`› install ${packages.join(" ")}`));
      if (!(await askConfirm(`Install ${packages.join(", ")}?`, ctx))) return "REJECTED: the user did not approve the install.";
      const result = runNpm(["install", ...packages, "--no-audit", "--no-fund"], root);
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split(/\r?\n/).slice(-20).join("\n");
      const status = result.status ?? 1;
      if (status === 0) {
        return `Installed ${packages.join(", ")}. Use it with: use "${packages[0]!.replace(/@.*$/, "")}";\n${cap(output, 2000)}`;
      }
      return `ERROR: npm install failed (exit ${status}).\n${cap(output, 2000)}`;
    }

    case "fetch": {
      const raw = action.url ?? "";
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        return "ERROR: invalid URL.";
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") return "ERROR: only http(s) URLs are allowed.";
      if (!fetchHostAllowed(url)) {
        return "ERROR: this host is not allowed. Set KUZA_AI_FETCH_HOSTS to a comma-separated allowlist if you trust it.";
      }
      console.log(dim(`› fetch ${raw}`));
      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      } catch (error) {
        return `ERROR: request failed: ${error instanceof Error ? error.message : String(error)}`;
      }
      if (!response.ok) return `ERROR: HTTP ${response.status} for ${raw}`;
      if (response.url && !fetchHostAllowed(new URL(response.url))) {
        return "ERROR: redirect pointed to a blocked host.";
      }
      const text = await response.text();
      if (text.length > MAX_FETCH) return "ERROR: response is too large (>2 MB).";
      if (!action.path) return cap(text, 12000);
      const path = safePath(root, action.path);
      if (!path) return "ERROR: path is outside the project.";
      if (!WRITABLE.has(extname(path))) return `ERROR: ${extname(path) || "this file type"} is read-only.`;
      if (!(await askConfirm(`Save ${url.host} to ${action.path}?`, ctx))) return "REJECTED: the user did not approve saving it.";
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text, "utf8");
      return `Saved ${raw} → ${action.path} (${text.length} bytes).`;
    }

    case "version": {
      const latest = latestNpmVersion();
      const result = `${installedVersions(root)}\nlatest on npm: kuza-lang ${latest}`;
      console.log(dim("› version"));
      console.log(dim(result.replace(/^/gm, "  ")));
      return result;
    }

    case "upgrade": {
      console.log(dim("› upgrade kuza-lang@latest"));
      if (!(await askConfirm("Install kuza-lang@latest in this project?", ctx))) {
        return "REJECTED: the user did not approve the upgrade.";
      }
      const result = runNpm(
        ["install", "kuza-lang@latest", "--save", "--no-audit", "--no-fund"],
        root,
        240_000,
      );
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split(/\r?\n/).slice(-20).join("\n");
      const status = result.status ?? 1;
      if (status !== 0) return `ERROR: upgrade failed (exit ${status}).\n${cap(output, 2000)}`;
      const installed = installedVersions(root);
      return `Upgraded. ${installed}\nThe user must restart the dev server. Re-run check before claiming done.\n${cap(output, 1200)}`;
    }

    case "done":
      return "Use done only through the agent loop.";

    default:
      return `ERROR: unknown action "${String((action as Action).action)}".`;
  }
}

/** Все результаты проходят через фильтр секретов. */
export async function executeAction(action: Action, ctx: ToolContext): Promise<string> {
  return redact(await executeActionInner(action, ctx));
}

/** Короткая подпись действия для журнала. */
export function describeAction(action: Action): string {
  switch (action.action) {
    case "read":
    case "list":
    case "glob":
    case "grep":
      return "";
    case "run":
      return `run ${action.command ?? ""}`;
    case "install":
      return `install ${(action.packages ?? []).join(" ")}`;
    case "fetch":
      return `fetch ${action.url ?? ""}`;
    default:
      return action.action;
  }
}

