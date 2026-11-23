/**
 * Generates the local documentation page opened by `kuza docs`.
 *
 * The file is written straight into the project as public/docs.html, so the link can
 * never rot. Command lists are built from the installed core's commands.json,
 * which keeps the reference in sync with the language version.
 */

import { readFileSync } from "node:fs";
import { CATEGORIES, COMMANDS, KEYWORDS, STRUCTURES, VERSION } from "kuza-core";

type Command = (typeof COMMANDS)[number];

type EnEntry = { description: string; example: string };
type EnDocs = {
  commands: Record<string, EnEntry>;
  structures: Record<string, EnEntry>;
  keywords: Record<string, EnEntry>;
};

const TEMPLATES = new URL("../templates/", import.meta.url);
const LOGO = readFileSync(new URL("public/favicon.svg", TEMPLATES), "utf8");

/**
 * Descriptions and examples in commands.json are Russian. The English overlay
 * ships with the CLI templates and keeps the generated public/docs.html fully English.
 * Falls back to the original text if a key is missing.
 */
const EN: EnDocs = JSON.parse(readFileSync(new URL("docs-en.json", TEMPLATES), "utf8")) as EnDocs;

const enCommand = (id: string, fallback: EnEntry): EnEntry => EN.commands[id] ?? fallback;
const enStructure = (name: string, fallback: EnEntry): EnEntry => EN.structures[name] ?? fallback;
const enKeyword = (name: string, fallback: EnEntry): EnEntry => EN.keywords[name] ?? fallback;

/** Three structure signatures still contain Russian placeholders in core. */
const EN_STRUCTURE_SYNTAX: Record<string, string> = {
  select: "select columns from table where condition order by column desc limit N",
  update: "update table set column = value where condition;",
  delete: "delete from table where condition;",
};

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );

function signature(command: Command): string {
  if (command.args === "none") return command.name;
  if (command.args === "single") return `${command.name} >> ${command.params[0] ?? "value"}`;
  if (command.args === "block") return `${command.name}<"class"> >> [ ... ]`;
  return `${command.name} >> <${command.params.join(", ")}>`;
}

function commandRow(command: Command): string {
  const aliases = command.aliases.length
    ? `<span class="alias">${command.aliases.map(escapeHtml).join(", ")}</span>`
    : "";
  const en = enCommand(command.id, { description: command.description, example: command.example });
  return `<div class="cmd" data-search="${escapeHtml(
    `${command.name} ${command.aliases.join(" ")} ${en.description}`.toLowerCase(),
  )}">
    <div class="cmd-head"><code>${escapeHtml(signature(command))}</code>${aliases}</div>
    <div class="cmd-desc">${escapeHtml(en.description)}</div>
    <pre><code>${escapeHtml(en.example)}</code></pre>
  </div>`;
}

function categorySection(id: string, titleEn: string): string {
  const items = COMMANDS.filter((command) => command.category === id);
  if (items.length === 0) return "";
  return `<section class="cat" id="${escapeHtml(id)}">
    <h2>${escapeHtml(titleEn)} <span>${items.length} commands</span></h2>
    <div class="grid">${items.map(commandRow).join("")}</div>
  </section>`;
}

/** Full, self-contained HTML document. */
export function docsHtml(): string {
  const categories = CATEGORIES.map((category) =>
    categorySection(category.id, category.titleEn),
  ).join("\n");

  const nav = CATEGORIES.map(
    (category) =>
      `<a href="#${escapeHtml(category.id)}">${escapeHtml(category.titleEn)} <span>${COMMANDS.filter(
        (command) => command.category === category.id,
      ).length}</span></a>`,
  ).join("");

  const structures = STRUCTURES.map((item) => {
    const en = enStructure(item.name, { description: item.description, example: item.example });
    return `<div class="doc-card">
      <div class="cmd-head"><code>${escapeHtml(EN_STRUCTURE_SYNTAX[item.name] ?? item.syntax)}</code></div>
      <div class="cmd-desc">${escapeHtml(en.description)}</div>
      <pre><code>${escapeHtml(en.example)}</code></pre>
    </div>`;
  }).join("");

  const keywords = KEYWORDS.map((item) => {
    const en = enKeyword(item.name, { description: item.description, example: item.example });
    return `<div class="doc-card small">
      <div class="cmd-head"><code>${escapeHtml(item.name)}</code></div>
      <div class="cmd-desc">${escapeHtml(en.description)}</div>
      <pre><code>${escapeHtml(en.example)}</code></pre>
    </div>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Kuza ${VERSION} — project documentation</title>
<style>
:root{--bg:#0a0b0d;--panel:#111419;--line:rgba(244,241,234,.13);--text:#f4f1ea;--muted:#8b949f;--accent:#ff6b2c}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:100vh}
aside{position:sticky;top:0;height:100vh;overflow:auto;border-right:1px solid var(--line);background:#0c0e11;padding:26px 20px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.brand svg{width:28px;height:28px;border-radius:6px;flex:none}
.brand b{font-size:20px;font-weight:800;letter-spacing:-.04em;color:#ffffff}
.ver{color:var(--muted);font:12px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;margin:0 0 24px}
aside nav{display:flex;flex-direction:column;gap:3px}
aside nav a{color:var(--muted);padding:7px 10px;border-radius:6px;font-size:14px;display:flex;justify-content:space-between}
aside nav a:hover{background:var(--panel);color:#fff;text-decoration:none}
aside nav span{opacity:.55;font-size:12px}
main{padding:44px clamp(20px,5vw,64px) 100px;max-width:1200px}
.hero-head{border-bottom:1px solid var(--line);padding-bottom:28px;margin-bottom:32px}
.brand-lg{display:flex;align-items:center;gap:14px}
.brand-lg svg{width:44px;height:44px;border-radius:9px;flex:none}
.brand-lg h1{font-size:clamp(34px,5vw,54px);line-height:1;letter-spacing:-.05em;color:#ffffff;margin:0;font-weight:800}
.lead{color:var(--muted);font-size:17px;max-width:760px;margin:18px 0 0}
.panel{background:linear-gradient(145deg,#14181e,#0e1115);border:1px solid var(--line);border-radius:14px;padding:24px;margin-bottom:30px;scroll-margin-top:20px}
h2{font-size:21px;letter-spacing:-.02em;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid var(--line);color:#fff}
h2 span{font-size:12px;color:var(--muted);font-weight:400;margin-left:8px}
h3{font-size:13px;margin:22px 0 8px;color:var(--accent);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;text-transform:uppercase;letter-spacing:.1em}
pre{background:#080a0c;border:1px solid var(--line);border-radius:8px;padding:12px 14px;overflow:auto;margin:8px 0 0}
pre code{font:13px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;color:#d2dbe4}
code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
table{width:100%;border-collapse:collapse;font-size:14px}
td,th{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.1em}
td code{color:#ffb087}
.search{width:100%;background:#0b0e12;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:12px 14px;font-size:15px;margin-bottom:22px}
.search:focus{outline:2px solid var(--accent);outline-offset:1px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.cmd,.doc-card{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:16px}
.doc-card.small{min-width:0}
.cmd-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.cmd-head code{color:#ffc19b;font-size:14px;font-weight:600}
.alias{font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:1px 8px}
.cmd-desc{color:var(--muted);font-size:13px;margin:8px 0 0}
.cmd pre,.doc-card pre{margin-top:10px;padding:8px 10px}
.cmd pre code,.doc-card pre code{font-size:12px}
.cat{margin-bottom:42px;scroll-margin-top:20px}
.empty{display:none;color:var(--muted);padding:20px 0}
.note{font-size:13px;color:var(--muted);border-left:2px solid var(--accent);padding-left:14px;margin:18px 0}
@media(max-width:820px){.wrap{grid-template-columns:1fr}aside{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}aside nav{flex-direction:row;flex-wrap:wrap}}
</style>
</head>
<body>
<div class="wrap">
<aside>
  <div class="brand">${LOGO}<b>kuza</b></div>
  <p class="ver">project reference · ${VERSION}</p>
  <nav>${nav}</nav>
</aside>
<main>
  <div class="hero-head">
    <div class="brand-lg">${LOGO}<h1>Kuza documentation</h1></div>
    <p class="lead">This page was generated when the project was created and sits right next to your files. <code>kuza docs</code> always opens this local copy — no dead links, no connection needed.</p>
  </div>

  <div class="panel" id="start">
    <h2>Quick start</h2>
    <pre><code>npm install kuza-lang
npm run dev      # http://localhost:5173
npm run build    # production site in dist/
npm run check    # check syntax without running</code></pre>
    <h3>Project layout</h3>
    <table>
      <tr><th>File</th><th>Purpose</th></tr>
      <tr><td><code>main.kuza</code></td><td>the whole site: markup, logic and state</td></tr>
      <tr><td><code>index.html</code></td><td>page shell, Tailwind already connected</td></tr>
      <tr><td><code>public/</code></td><td>static assets copied into dist/</td></tr>
      <tr><td><code>pages/*.kuza</code></td><td>extra routes: /about → dist/about/index.html</td></tr>
      <tr><td><code>kuza.config.js</code></td><td>plugins and custom commands</td></tr>
      <tr><td><code>.env</code></td><td>AI keys — never commit it</td></tr>
      <tr><td><code>public/docs.html</code></td><td>this reference</td></tr>
    </table>
    <div class="note">Kuza files use <code>.kuza</code>. There is no <code>.qza</code> extension and no <code>main.html</code>; the build always produces <code>dist/index.html</code>.</div>
  </div>

  <div class="panel" id="cli">
    <h2>CLI commands</h2>
    <table>
      <tr><th>Command</th><th>What it does</th></tr>
      <tr><td><code>kuza</code></td><td>interactive REPL</td></tr>
      <tr><td><code>kuza -v</code></td><td>print CLI and core versions</td></tr>
      <tr><td><code>kuza new my-site</code></td><td>create a project (aliases: init, create)</td></tr>
      <tr><td><code>kuza start</code></td><td>dev server at http://localhost:5173 (alias: dev)</td></tr>
      <tr><td><code>kuza build</code></td><td>build into dist/</td></tr>
      <tr><td><code>kuza check</code></td><td>check every .kuza file (alias: doctor)</td></tr>
      <tr><td><code>kuza serve server.kuza</code></td><td>start a backend with route/respond</td></tr>
      <tr><td><code>kuza ai "question"</code></td><td>AI assistant that reads your files (alias: ask)</td></tr>
      <tr><td><code>kuza agent "task"</code></td><td>AI developer: reads, patches, installs, fetches, checks (alias: do)</td></tr>
      <tr><td><code>kuza agent --init</code></td><td>create AGENTS.md with the rules the agent follows</td></tr>
      <tr><td><code>kuza upgrade</code></td><td>install kuza-lang@latest in this project</td></tr>
      <tr><td><code>kuza docs</code></td><td>open this page in your browser</td></tr>
      <tr><td><code>kuza run main.kuza</code></td><td>execute a file in Node.js</td></tr>
      <tr><td><code>kuza build main.kuza --lib</code></td><td>build an ES module for React / Vue / Svelte / Node</td></tr>
      <tr><td><code>kuza watch --web</code></td><td>watch a file for changes</td></tr>
      <tr><td><code>kuza help</code></td><td>short help in the terminal</td></tr>
    </table>
  </div>

  <div class="panel" id="ai">
    <h2>AI assistant</h2>
    <p>Copy <code>.env.example</code> to <code>.env</code>, uncomment the block you need and paste your key.</p>
    <pre><code>kuza ai "explain main.kuza"
kuza ai "add a dark theme" --file main.kuza
kuza agent "add a pricing section and check it"
kuza agent --init
kuza agent --print-prompt</code></pre>
    <p><code>kuza agent</code> works like a developer: it reads and searches the project, patches files, creates pages, installs npm packages, downloads data, runs <code>npm run …</code> / <code>kuza check</code> and refuses to finish while the project does not compile. It follows <code>AGENTS.md</code> / <code>KUZA.md</code> / <code>CLAUDE.md</code>, stays inside the project and never touches <code>.env</code>. Every write asks for confirmation (<code>--yes</code> disables it).</p>
    <p>The prompt is generated from the installed compiler: every command, structure, table/frontend/backend feature, version and common pitfall — so the model knows the same Kuza you do.</p>
    <h3>OpenAI</h3>
    <pre><code>KUZA_AI_PROVIDER=openai
KUZA_AI_KEY=sk-...
KUZA_AI_MODEL=gpt-4o-mini</code></pre>
    <h3>OpenRouter / Groq / Ollama / Freebuff</h3>
    <pre><code>KUZA_AI_PROVIDER=openai
KUZA_AI_KEY=your-provider-key
KUZA_AI_BASE_URL=https://openrouter.ai/api/v1
KUZA_AI_MODEL=openai/gpt-4o-mini</code></pre>
    <h3>Anthropic Claude</h3>
    <pre><code>KUZA_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
KUZA_AI_MODEL=claude-3-5-sonnet-latest</code></pre>
    <p class="note">The key is read from the environment only, is never printed, and <code>.env</code> is already in <code>.gitignore</code>.</p>
  </div>

  <div class="panel" id="language">
    <h2>Language constructs</h2>
    <p>These are the building blocks you write by hand. Every one of them compiles to plain JavaScript.</p>
    ${structures}
    <h3>Keywords and operators</h3>
    <div class="grid">${keywords}</div>
  </div>

  <div class="panel" id="server">
    <h2>Backend and plugins</h2>
    <pre><code>func home<> >> [
  respond >> &lt;{ ok: true }, 200&gt;;
];
route >> &lt;"GET", "/", home&gt;;
listen >> 3000;</code></pre>
    <p>Run it with <code>kuza serve server.kuza</code>. Request helpers: <code>param</code>, <code>query</code>, <code>requestBody</code>, <code>header</code>, <code>method</code> and <code>serverPath</code>.</p>
    <p>Plugins live in <code>kuza.config.js</code> with <code>commands</code> and <code>plugins</code> arrays. Hooks: <code>onCompile</code>, <code>onBuild</code> and <code>onRun</code>.</p>
  </div>

  <div class="panel" id="commands">
    <h2>Built-in commands</h2>
    <input class="search" id="q" placeholder="Search commands and descriptions…" autocomplete="off" />
    <div id="empty" class="empty">Nothing found</div>
  </div>
  ${categories}
</main>
</div>
<script>
const q = document.getElementById('q');
const empty = document.getElementById('empty');
q.addEventListener('input', () => {
  const value = q.value.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll('.cmd').forEach((el) => {
    const show = !value || el.dataset.search.includes(value);
    el.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  empty.style.display = visible ? 'none' : 'block';
});
</script>
</body>
</html>`;
}
