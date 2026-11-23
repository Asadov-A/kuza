#!/usr/bin/env node
/**
 * ТОЧКА ВХОДА CLI.
 *
 *   kuza / kuza repl            консоль
 *   kuza new <dir>              новый проект (alias: init, create)
 *   kuza start / dev            localhost
 *   kuza build                  dist/
 *   kuza check                  проверка без запуска
 *   kuza serve server.kuza      backend
 *   kuza ai "вопрос" --file ... ИИ, который читает файлы проекта
 *   kuza help                   справка
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  watchFile,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { FILE_EXT, NAME, VERSION, compile, formatDiagnostic, run } from "kuza-core";
import {
  applyBuildHooks,
  applyCompileHooks,
  applyRunHooks,
  loadProjectConfig,
  type LoadedConfig,
} from "./config.js";
import { runAgentTask } from "./agent.js";
import { classifyIntent } from "./agent-intent.js";
import { runAiQuestion } from "./ask.js";
import { docsHtml } from "./docs-html.js";
import { openInBrowser } from "./open.js";
import { startRepl } from "./repl.js";
import { t } from "./i18n.js";
import {
  bold,
  code,
  danger,
  dim,
  primary,
  printBanner,
  success,
  warning,
} from "./ui.js";
import { scaffoldProject } from "./scaffold.js";

const argv = process.argv.slice(2);
let cachedConfig: LoadedConfig | undefined;

/** Короткие команды: kuza d = kuza dev, kuza b = kuza build. */
const ALIASES: Record<string, string> = {
  n: "new",
  d: "dev",
  b: "build",
  c: "check",
  r: "run",
  s: "serve",
  a: "ai",
  g: "agent",
  u: "upgrade",
  h: "help",
  v: "version",
};

/** Версия самого CLI (VERSION из kuza-core — это версия языка/ядра). */
const CLI_VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function printEntry(entry: { type: string; message: string }): void {
  switch (entry.type) {
    case "error":
      console.log(danger("✕ " + entry.message));
      break;
    case "warn":
      console.log(warning("⚠ " + entry.message));
      break;
    case "info":
      console.log(dim("› " + entry.message));
      break;
    default:
      console.log(entry.message);
  }
}

function usage(): void {
  const ex = `main${FILE_EXT}`;
  console.log("");
  console.log(bold(`${NAME} ${CLI_VERSION}`) + dim(` (core ${VERSION}) — run ${NAME} programs`));
  console.log("");
  console.log(`  ${primary("kuza")}                    ${dim("open the interactive REPL")}`);
  console.log(`  ${primary("kuza")} new my-site        ${dim("create a site in ./my-site")}`);
  console.log(`  ${primary("kuza")} start              ${dim("dev server (alias: dev)")}`);
  console.log(`  ${primary("kuza")} build              ${dim("build into dist/")}`);
  console.log(`  ${primary("kuza")} check              ${dim("check every .kuza file")}`);
  console.log(`  ${primary("kuza")} serve ${ex}     ${dim("start an HTTP server")}`);
  console.log(`  ${primary("kuza")} ai "question"      ${dim("AI assistant that reads your files")}`);
    console.log(`  ${primary("kuza")} agent "task"      ${dim("AI developer: reads, edits, installs, checks")}`);
  console.log(`  ${primary("kuza")} agent --init        ${dim("create AGENTS.md rules for the agent")}`);
  console.log(`  ${primary("kuza")} agent --mode creative ${dim("precise|creative|engineering")}`);
  console.log(`  ${primary("kuza")} doctor              ${dim("diagnose stale global install / PATH")}`);
  console.log(`  ${primary("kuza")} upgrade            ${dim("update kuza-lang in this project")}`);
  console.log(`  ${primary("kuza")} docs               ${dim("open local docs in the browser")}`);
  console.log(`  ${primary("kuza")} run ${ex}       ${dim("execute a file")}`);
  console.log(`  ${primary("kuza")} build ${ex}     ${dim("build a console program")}`);
  console.log(`  ${primary("kuza")} build ${ex} --lib   ${dim("ES module for React/Vue/Svelte/Node")}`);
  console.log(`  ${primary("kuza")} help               ${dim("this help")}`);
  console.log("");
  console.log(dim("Shortcuts: n new · d dev · b build · c check · r run · s serve · a ai · g agent · u upgrade"));
  console.log("");
  console.log(dim("First site: ") + code("npm install kuza-lang && npm run dev"));
  console.log(dim("Docs: ") + code("kuza docs") + dim(" or START.md in the project folder"));
  console.log("");
}

function flagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

/** Диагностика «обычный kuza не работает, а npx kuza работает». */
function doctorCommand(): void {
  console.log("");
  console.log(bold("Kuza doctor") + dim(" — checking which CLI your terminal actually runs"));
  console.log(dim(`running: ${process.execPath} ${process.argv[1] ?? ""}`));
  console.log(`local CLI: ${primary(CLI_VERSION)}  core: ${VERSION}`);

  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const global = spawnSync(npm, ["ls", "-g", "kuza-lang", "--depth=0"], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  const globalText = `${global.stdout ?? ""}${global.stderr ?? ""}`.trim();
  console.log(`global: ${globalText || "(not installed)"}`);

  const finder = process.platform === "win32" ? "where" : "which";
  const paths = spawnSync(finder, ["kuza"], { encoding: "utf8", shell: false, windowsHide: true });
  console.log(`${finder} kuza:\n${(paths.stdout || paths.stderr || "(not found)").trim()}`);

  const stale = /kuza-lang@(\d+)\.(\d+)\.(\d+)/.exec(globalText);
  if (stale && `${stale[1]}.${stale[2]}.${stale[3]}` !== CLI_VERSION) {
    console.log("");
    console.log(warning(`Your global kuza-lang is ${stale[0]} — older than the CLI in this folder (${CLI_VERSION}).`));
    console.log(dim(`That is why plain "kuza" lacks new commands such as /agent. Fix it with:`));
    console.log(code("npm install -g kuza-lang@latest"));
  }

  if (process.platform === "win32") {
    const ps = spawnSync(
      "powershell",
      ["-NoProfile", "-Command", "Get-ExecutionPolicy -Scope CurrentUser"],
      { encoding: "utf8", shell: false, windowsHide: true },
    );
    const policy = (ps.stdout ?? "").trim() || "(unknown)";
    console.log(dim(`PowerShell execution policy (CurrentUser): ${policy}`));
    if (/Restricted|AllSigned|Undefined/i.test(policy)) {
      console.log(warning("PowerShell blocks kuza.ps1 with this policy. Fix it with:"));
      console.log(code("Set-ExecutionPolicy -Scope CurrentUser RemoteSigned"));
      console.log(dim("or simply use npx kuza until the global install is updated."));
    }
  }
  console.log("");
}

function fail(text: string): void {
  console.error(danger(text));
  process.exitCode = 1;
}

async function config(): Promise<LoadedConfig> {
  if (!cachedConfig) cachedConfig = await loadProjectConfig(process.cwd());
  for (const warningText of cachedConfig.warnings) console.log(warning(warningText));
  return cachedConfig;
}

/** Читать use "./helpers.kuza" относительно запускаемого файла. */
function moduleResolver(entryPath: string) {
  return (specifier: string) => readFileSync(resolve(dirname(entryPath), specifier), "utf8");
}

function compileSource(source: string, filename: string, cfg: LoadedConfig, standalone = true) {
  const prepared = applyCompileHooks(cfg, { source, filename });
  return compile(prepared, {
    standalone,
    filename,
    resolveModule: moduleResolver(filename),
  });
}

async function runFile(file: string): Promise<void> {
  const path = resolve(file);
  if (!existsSync(path)) {
    fail(`${t("fileNotFound")}: ${file}`);
    return;
  }

  const cfg = await config();
  const source = readFileSync(path, "utf8");
  const compiled = compileSource(source, path, cfg);
  if (!compiled.ok) {
    console.error(danger(`${t("compileError")}: ${basename(path)}`));
    console.error(danger(formatDiagnostic(compiled.errors[0]!, source)));
    process.exitCode = 1;
    return;
  }

  console.log(dim(`${t("running")} ${basename(path)}`));
  const result = (await run(source, {
    filename: path,
    resolveModule: moduleResolver(path),
  })) as { ok: boolean; output: Array<{ type: string; message: string }> };
  applyRunHooks(cfg, { result, filename: path });
  for (const entry of result.output) printEntry(entry);
  process.exitCode = result.ok ? 0 : 1;
}

/**
 * Вставить скомпилированный код в index.html. Метка {main.kuza} — обычный
 * HTML-комментарий/плейсхолдер, поэтому каркас остаётся нормальной страницей.
 */
const GENERATOR_META = `<meta name="generator" content="${NAME} ${VERSION}">`;
const STRONG_MARKERS =
  `<meta name="kuza" content="${NAME} ${VERSION}">\n` +
  `<meta name="kuza-version" content="${VERSION}">`;

/**
 * Маркеры для инструментов, которые определяют стек страницы
 * (Wappalyzer и подобные): meta generator + глобальный объект в JS.
 */
const PAGE_MARKER =
  `<script>window.__KUZA__=window.__KUZA__||{name:${JSON.stringify(NAME)},` +
  `languageVersion:"${VERSION}",cliVersion:"${CLI_VERSION}",framework:"Kuza",` +
  `buildTool:"Kuza",runtime:"Kuza"};</script>`;

/**
 * Wappalyzer ищет tech-сигналы в head и в JS. Обычного `generator` бывает
 * недостаточно, поэтому добавляем явные Kuza-метаданные и data-атрибут.
 */
function withGenerator(html: string): string {
  let out = html;
  if (/<meta\s+name=["']generator["'][^>]*>/i.test(out)) {
    out = out.replace(/<meta\s+name=["']generator["'][^>]*>/i, GENERATOR_META);
  } else if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>\n  ${GENERATOR_META}`);
  } else {
    out = `${GENERATOR_META}\n${out}`;
  }
  if (!/name=["']kuza-version["']/i.test(out)) {
    out = /<head[^>]*>/i.test(out)
      ? out.replace(/<head([^>]*)>/i, `<head$1>\n  ${STRONG_MARKERS}`)
      : `${STRONG_MARKERS}\n${out}`;
  }
  if (/<html[^>]*>/i.test(out) && !/data-kuza=/i.test(out)) {
    out = out.replace(/<html([^>]*)>/i, (_match: string, attrs: string) => `<html${attrs} data-kuza="${VERSION}">`);
  }
  return out;
}

function pageHtml(code: string, dir: string, scriptName: string): string {
  const tag =
    `${PAGE_MARKER}\n<script>\n// ${NAME} ${VERSION}: built from ${scriptName}. ` +
    `Edit the .kuza source, not this file.\n${code}</script>`;
  const shellPath = join(dir, "index.html");

  if (existsSync(shellPath)) {
    const shell = readFileSync(shellPath, "utf8");
    for (const marker of [`{${scriptName}}`, `{main${FILE_EXT}}`, "{kuza}"]) {
      if (shell.includes(marker)) return withGenerator(shell.split(marker).join(tag));
    }
    if (shell.includes("</body>")) return withGenerator(shell.replace("</body>", `${tag}\n</body>`));
    return withGenerator(`${shell}\n${tag}\n`);
  }

  return withGenerator(
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${NAME}</title>\n` +
      `<script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body>\n${tag}\n</body>\n</html>\n`,
  );
}

const LIVE_RELOAD =
  '<script>(function(){let last=null;async function check(){try{const r=await fetch("/__kuza/reload?path="+encodeURIComponent(location.pathname),{cache:"no-store"});const d=await r.json();if(last!==null&&d.mtime!==last)location.reload();last=d.mtime;}catch(e){}}setInterval(check,700);check();})();</script>';

/** Все страницы проекта: главная + pages/*.kuza. */
function projectPages(dir: string): Map<string, string> {
  const pages = new Map<string, string>();
  for (const name of [`main${FILE_EXT}`, `index${FILE_EXT}`]) {
    const path = join(dir, name);
    if (existsSync(path)) {
      pages.set("/", path);
      break;
    }
  }
  const pagesDir = join(dir, "pages");
  if (existsSync(pagesDir)) {
    for (const name of readdirSync(pagesDir)) {
      if (!name.endsWith(FILE_EXT)) continue;
      const route = name === `index${FILE_EXT}` ? "index" : name.slice(0, -FILE_EXT.length);
      pages.set(`/${route}`, join(pagesDir, name));
    }
  }
  return pages;
}

function projectEntry(dir = process.cwd()): string | undefined {
  return projectPages(dir).get("/");
}

function relativeEntries(dir = process.cwd()): string[] {
  return [...projectPages(dir).entries()].map(([route, path]) => `${route} → ${relative(dir, path)}`);
}

function mtimeOf(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

async function startDevServer(file: string | undefined, portArg?: string): Promise<void> {
  const dir = file ? dirname(resolve(file)) : process.cwd();
  const pages = projectPages(dir);
  const cfg = await config();
  const port = Number(portArg ?? process.env.PORT ?? 5173);

  const server = createServer((request, response) => {
    const urlPath = decodeURIComponent((request.url || "/").split("?")[0] || "/");

    if (urlPath === "/__kuza/reload") {
      const raw = (request.url || "").split("?")[1] || "";
      const wanted = new URLSearchParams(raw).get("path") || "/";
      const source = pages.get(wanted) ?? pages.get(wanted.replace(/\.html$/, "")) ?? pages.get("/");
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ mtime: source ? mtimeOf(source) : 0 }));
      return;
    }

    const pageKey = urlPath.replace(/\.html$/, "");
    const sourcePath = pages.get(pageKey) ?? (pageKey === "/" ? pages.get("/") : undefined);
    if (sourcePath) {
      const source = readFileSync(sourcePath, "utf8");
      const compiled = compileSource(source, sourcePath, cfg);
      if (!compiled.ok) {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end(formatDiagnostic(compiled.errors[0]!, source));
        return;
      }
      const html = pageHtml(compiled.code, dir, basename(sourcePath)).replace(
        "</body>",
        `${LIVE_RELOAD}\n</body>`,
      );
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(html);
      return;
    }

    const asset = [resolve(dir, `.${urlPath}`), resolve(dir, "public", `.${urlPath}`)].find(
      (candidate) =>
        candidate.startsWith(dir) && existsSync(candidate) && statSync(candidate).isFile(),
    );
    if (asset) {
      response.writeHead(200, {
        "content-type": MIME[extname(asset)] ?? "application/octet-stream",
      });
      response.end(readFileSync(asset));
      return;
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(success(`Kuza dev server: http://localhost:${port}`));
    console.log(dim("Pages: " + relativeEntries(dir).join(", ")));
    console.log(dim("Edit a .kuza file — the browser reloads automatically. Ctrl+C to stop."));
  });
}

function buildFile(
  file: string,
  web: boolean,
  cfg: LoadedConfig,
  outputFile?: string,
  lib = false,
): void {
  const path = resolve(file);
  if (!existsSync(path)) {
    fail(`${t("fileNotFound")}: ${file}`);
    return;
  }

  const source = readFileSync(path, "utf8");
  const compiled = lib
    ? compile(applyCompileHooks(cfg, { source, filename: path }), {
        mode: "module",
        filename: path,
        resolveModule: moduleResolver(path),
      })
    : compileSource(source, path, cfg);
  if (!compiled.ok) {
    console.error(danger(`${t("compileError")}: ${basename(path)}`));
    console.error(danger(formatDiagnostic(compiled.errors[0]!, source)));
    process.exitCode = 1;
    return;
  }

  const base = path.slice(0, path.length - extname(path).length);
  const outPath = outputFile ?? (web && !lib ? `${base}.html` : `${base}.js`);
  mkdirSync(dirname(outPath), { recursive: true });
  const code = applyBuildHooks(cfg, { code: compiled.code, filename: path, output: outPath });

  if (web && !lib) {
    const page = pageHtml(code, dirname(path), basename(path));
    writeFileSync(outPath, page, "utf8");
    console.log(success(`✓ ${t("built")} ${outPath}`));
    console.log(dim(`${t("openInBrowser")}: `) + code2(`"${relative(process.cwd(), outPath)}"`));
    return;
  }

  writeFileSync(outPath, code, "utf8");
  console.log(success(`✓ ${t("built")} ${outPath}`));
  if (lib) {
    console.log(
      dim("Import it anywhere: ") +
        code2(`import { yourFunction } from "./${basename(outPath)}"`),
    );
    return;
  }
  console.log(dim(`${t("runWithNode")}: `) + code2(`node "${relative(process.cwd(), outPath)}"`));
}

function code2(value: string): string {
  return code(value);
}

function copyDir(from: string, to: string): void {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const source = join(from, entry);
    const target = join(to, entry);
    if (statSync(source).isDirectory()) copyDir(source, target);
    else copyFileSync(source, target);
  }
}

async function buildProject(): Promise<void> {
  const dir = process.cwd();
  const cfg = await config();
  const pages = projectPages(dir);
  if (pages.size === 0) {
    fail(`Could not find main${FILE_EXT}. Run kuza new.`);
    return;
  }

  const dist = join(dir, "dist");
  mkdirSync(dist, { recursive: true });

  for (const [route, sourcePath] of pages) {
    const source = readFileSync(sourcePath, "utf8");
    const compiled = compileSource(source, sourcePath, cfg);
    if (!compiled.ok) {
      console.error(danger(`${t("compileError")}: ${relative(dir, sourcePath)}`));
      console.error(danger(formatDiagnostic(compiled.errors[0]!, source)));
      process.exitCode = 1;
      return;
    }
    const output = route === "/" ? join(dist, "index.html") : join(dist, route, "index.html");
    mkdirSync(dirname(output), { recursive: true });
    const js = applyBuildHooks(cfg, {
      code: compiled.code,
      filename: sourcePath,
      output,
    });
    writeFileSync(output, pageHtml(js, dir, basename(sourcePath)), "utf8");
    console.log(success(`✓ ${output}`));
  }

  // public/ содержит ассеты и справочник (public/docs.html).
  copyDir(join(dir, "public"), dist);
  console.log(dim("Done. Open dist/index.html or run kuza start."));
}

function watchProject(file: string, web: boolean, cfg: LoadedConfig): void {
  const path = resolve(file);
  if (!existsSync(path)) {
    fail(`${t("fileNotFound")}: ${file}`);
    return;
  }

  const rebuild = (): void => {
    process.exitCode = 0;
    buildFile(file, web, cfg);
  };

  rebuild();
  watchFile(path, { interval: 400 }, (current, previous) => {
    if (current.mtimeMs === previous.mtimeMs) return;
    console.log(dim(`↻ ${t("watchChanged")}`));
    rebuild();
  });
  console.log(dim(t("watching")));
}

async function checkProject(): Promise<void> {
  const dir = process.cwd();
  const cfg = await config();
  const files: string[] = [];
  const collect = (folder: string): void => {
    if (!existsSync(folder)) return;
    for (const name of readdirSync(folder)) {
      const path = join(folder, name);
      if (statSync(path).isDirectory()) collect(path);
      else if (name.endsWith(FILE_EXT)) files.push(path);
    }
  };
  collect(dir);
  const filtered = files.filter((path) => !path.includes(`${dirname(dir)}\\`));
  if (filtered.length === 0) filtered.push(...projectPages(dir).values());
  let errors = 0;
  for (const path of filtered) {
    const source = readFileSync(path, "utf8");
    const result = compileSource(source, path, cfg, false);
    if (result.ok) {
      console.log(success(`✓ ${relative(dir, path)}`));
    } else {
      errors++;
      console.error(danger(`✕ ${relative(dir, path)}`));
      console.error(danger(formatDiagnostic(result.errors[0]!, source)));
    }
  }
  console.log(errors === 0 ? success("✓ Everything compiles") : danger(`Errors: ${errors}`));
  if (errors > 0) process.exitCode = 1;
}

async function serveCommand(file: string): Promise<void> {
  const path = resolve(file);
  if (!existsSync(path)) {
    fail(`${t("fileNotFound")}: ${file}`);
    return;
  }
  const cfg = await config();
  const source = readFileSync(path, "utf8");
  const compiled = compileSource(source, path, cfg);
  if (!compiled.ok) {
    console.error(danger(formatDiagnostic(compiled.errors[0]!, source)));
    process.exitCode = 1;
    return;
  }
  const result = await run(source, { filename: path, resolveModule: moduleResolver(path) });
  for (const entry of result.output) printEntry(entry);
  applyRunHooks(cfg, { result, filename: path });
  // Даём динамическому import("node:http") момент на запуск слушателя.
  await new Promise<void>((done) => setTimeout(done, 100));
}

/** Обновить kuza-lang в текущем проекте до последней версии из npm. */
function upgradeCommand(): void {
  const pkgPath = join(process.cwd(), "package.json");
  if (!existsSync(pkgPath)) {
    fail("No package.json here — run this inside a Kuza project.");
    return;
  }
  console.log(dim("Installing kuza-lang@latest in this project…"));
  const result = spawnSync('npm install kuza-lang@latest --save --no-audit --no-fund', {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    fail("npm install failed — nothing was changed.");
    return;
  }
  console.log(success("✓ Updated.") + dim(" Restart `npm run dev` and run `kuza check`."));
}

function scaffoldCommand(target: string | undefined, web: boolean, force: boolean): void {
  const dir = target ? resolve(target) : process.cwd();
  const created = scaffoldProject(dir, { scriptOnly: !web, force });
  if (created.length === 0) {
    console.log(warning("Files already exist — nothing was overwritten."));
    return;
  }
  console.log(success(`✓ Created: ${created.join(", ")}`));
  const where = relative(process.cwd(), dir);
  const prefix = where && where !== "." ? `cd ${where} && ` : "";
  console.log(dim("Next: ") + code(`${prefix}npm install && npm run dev`));
}

async function main(): Promise<void> {
  const [rawFirst, ...rest] = argv;
  const first = rawFirst ? (ALIASES[rawFirst] ?? rawFirst) : undefined;

  if (!first || first === "repl") {
    printBanner();
    await startRepl();
    return;
  }

  if (first === "--version" || first === "-v" || first === "version") {
    console.log(`${NAME} ${CLI_VERSION} (core ${VERSION})`);
    const pkgPath = join(process.cwd(), "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          dependencies?: Record<string, string>;
        };
        const dependency = pkg.dependencies?.["kuza-lang"];
        if (dependency) console.log(dim(`project: kuza-lang ${dependency}`));
      } catch {
        /* package.json без зависимостей — не ошибка */
      }
    }
    return;
  }

  if (first === "--help" || first === "-h" || first === "help") {
    usage();
    return;
  }

  if (first === "new" || first === "create" || first === "init") {
    scaffoldCommand(
      rest.find((arg) => !arg.startsWith("--")),
      !rest.includes("--script"),
      rest.includes("--force"),
    );
    return;
  }

  if (first === "start" || first === "dev") {
    const target = rest.find((arg) => !arg.startsWith("--") && !arg.startsWith("--port="));
    const portArg = rest.find((arg) => arg.startsWith("--port="))?.slice("--port=".length);
    const file = target ?? projectEntry();
    if (!file && !target) return fail(`Could not find main${FILE_EXT}. Run kuza new.`);
    await startDevServer(file, portArg);
    return;
  }

  if (first === "build") {
    const target = rest.find((arg) => !arg.startsWith("--"));
    if (!target) {
      await buildProject();
      return;
    }
    await buildFile(target, rest.includes("--web"), await config(), undefined, rest.includes("--lib"));
    return;
  }

  if (first === "check") {
    await checkProject();
    return;
  }

  if (first === "serve") {
    const target = rest.find((arg) => !arg.startsWith("--")) || projectEntry();
    if (!target) return fail(`Specify a server file: kuza serve server${FILE_EXT}`);
    await serveCommand(target);
    return;
  }

  if (first === "ai" || first === "ask") {
    const files: string[] = [];
    const words: string[] = [];
    for (let index = 0; index < rest.length; index++) {
      const arg = rest[index]!;
      if (arg === "--file" || arg === "-f") {
        const next = rest[++index];
        if (next) files.push(next);
      } else if (arg === "--mode" || arg === "--model") {
        index++;
      } else if (!arg.startsWith("--")) {
        words.push(arg);
      }
    }
    if (words.length === 0) {
      fail('Ask something: kuza ai "explain main.kuza"');
      return;
    }
    const question = words.join(" ");
    // Единый вход: если просят изменить проект — запускаем агента.
    if (classifyIntent(question) === "edit") {
      await runAgentTask(question, {
        yes: rest.includes("--yes") || rest.includes("-y"),
        mode: flagValue(rest, "--mode"),
        model: flagValue(rest, "--model"),
      });
      return;
    }
    await runAiQuestion(question, files);
    return;
  }

  if (first === "doctor") {
    doctorCommand();
    return;
  }

  if (first === "docs") {
    const folder = join(process.cwd(), "public");
    const path = join(folder, "docs.html");
    if (!existsSync(path)) {
      mkdirSync(folder, { recursive: true });
      writeFileSync(path, docsHtml(), "utf8");
      console.log(success("Created public/docs.html"));
    }
    openInBrowser(path);
    console.log(dim("Opened the docs in your browser: ") + relative(process.cwd(), path));
    return;
  }

  if (first === "agent" || first === "do") {
    const taskWords: string[] = [];
    for (let index = 0; index < rest.length; index++) {
      const arg = rest[index]!;
      if (arg === "--mode" || arg === "--model") {
        index++;
        continue;
      }
      if (!arg.startsWith("--") && arg !== "-y") taskWords.push(arg);
    }
    const task = taskWords.join(" ");
    const init = rest.includes("--init");
    const printPrompt = rest.includes("--print-prompt");
    if (!task && !init && !printPrompt) {
      fail('Describe a task: kuza agent "add a pricing section to main.kuza"');
      return;
    }
    await runAgentTask(task, {
      yes: rest.includes("--yes") || rest.includes("-y"),
      init,
      printPrompt,
      mode: flagValue(rest, "--mode"),
      model: flagValue(rest, "--model"),
    });
    return;
  }

  if (first === "upgrade") {
    upgradeCommand();
    return;
  }

  if (first === "run") {
    if (!rest[0]) {
      fail(`Specify a file: ${NAME.toLowerCase()} run main${FILE_EXT}`);
      return;
    }
    await runFile(rest[0]);
    return;
  }

  if (first === "watch") {
    const web = rest.includes("--web");
    const target = rest.find((arg) => !arg.startsWith("--"));
    if (!target) {
      fail(`Specify a file: ${NAME.toLowerCase()} watch main${FILE_EXT}`);
      return;
    }
    watchProject(target, web, await config());
    return;
  }

  if (first.endsWith(FILE_EXT)) {
    await runFile(first);
    return;
  }

  fail(`${t("unknownCommand")}: ${first}. Try "${NAME.toLowerCase()} help"`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(danger(`💥 ${message}`));
  process.exitCode = 1;
});
