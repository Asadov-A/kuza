# Kuza — start here

You already have a working Kuza project.

```text
index.html — minimal page shell (Tailwind is already connected)
main.kuza — the whole application
public/styles.css — optional starter design, safe to delete
public/favicon.svg — the site icon
public/docs.html — all commands and instructions, opens in your browser
AGENTS.md — project rules the AI agent follows
START.md — this short instruction
.env.example — copy to .env to connect AI
```

> Kuza files use `.kuza`. `index.qza` / `main.qza` are not used — the language is
> **Kuza**, so the extension is `.kuza`.

## 1. Run it

```bash
npm run dev      # http://localhost:5173
npm run build    # production site in dist/
npm run check    # compile without running
npx kuza docs    # open public/docs.html in your browser
npm test         # if you add tests
```

`npm start` is an alias for `npm run dev`.

## 2. Change it

Open `main.kuza`. The `view` block is the screen:

```kuza
:count = 0;

view App<> >> [
  body<"p-8"> >> [
    heading >> <"Count: {count}", "text-2xl font-bold">;
    button >> <"Add one", increase, "rounded bg-orange-500 px-4 py-2">;
  ];
  render;
];

func increase<> >> [
  count = count + 1;   // the screen updates automatically
];
```

Classes are Tailwind classes, written right in Kuza. Containers also accept
classes: `card >> <"p-4">` or `card<"p-4"> >> [ ... ]`.

The look of the starter lives in `public/styles.css`. To begin with a blank
page, delete that file **and** the `<link rel="stylesheet" href="/styles.css" />`
line in `index.html` — the structure stays in `main.kuza`.

## 3. More pages

Create `pages/about.kuza`. It becomes available at `/about` in dev and
`dist/about/index.html` after build. `main.kuza` stays the home page;
`pages/index.kuza` maps to `/index`. Page files live directly in `pages/`
(nested folders are not scanned yet).

All pages share the same `index.html` shell, so Tailwind, fonts and your
stylesheet are connected once. Files in `public/` are copied to `dist/` as-is
and are available at the site root (`/favicon.svg`, `/styles.css`). Link between
pages with `link<"About", "/about", "text-orange-400">;`.

`kuza start` prints the full route list and reloads the browser when any
`.kuza` file changes. `kuza build` writes every route into `dist/`.

## 4. CLI

```bash
npx kuza new my-site          # create a project in ./my-site
npx kuza start                # same as kuza dev
npx kuza build                # build into dist/
npx kuza check                # check syntax
npx kuza ai "explain main.kuza"  # answers from your project files
npx kuza ai "add a dark theme"   # automatically switches to the agent for edits
npx kuza agent "add a pricing card" # AI developer: edits files, installs packages, checks
npx kuza agent --mode creative "add a hero"
npx kuza agent --init         # create AGENTS.md with project rules
npx kuza doctor               # diagnose a stale global `kuza` / PATH issue
npx kuza upgrade              # update kuza-lang in this project
npx kuza docs                 # open local public/docs.html in the browser
npx kuza help                 # short terminal help
```

`public/docs.html` is created together with the project and contains every language
command, CLI command, AI setup example and plugin/backend reference. `kuza docs`
never points to a dead external link: it opens that local file.

## 5. AI assistant and agent

`kuza ai` is the single entry point. It reads `.kuza`, `.html`, `.js`, `.ts`,
`.json` and `.md` files from the current folder, can open URLs from your prompt,
and decides by itself whether to answer or to edit the project. Copy
`.env.example` to `.env`, uncomment the block you need and paste your key:

```dotenv
# OpenAI
KUZA_AI_PROVIDER=openai
KUZA_AI_KEY=sk-...
KUZA_AI_MODEL=gpt-4o-mini
```

```dotenv
# OpenRouter / Groq / Ollama / Freebuff — any OpenAI-compatible API
KUZA_AI_PROVIDER=openai
KUZA_AI_KEY=your-provider-key
KUZA_AI_BASE_URL=https://openrouter.ai/api/v1
KUZA_AI_MODEL=openai/gpt-4o-mini
```

```dotenv
# Anthropic Claude
KUZA_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
KUZA_AI_MODEL=claude-3-5-sonnet-latest
```

```bash
npx kuza ai "explain main.kuza"                       # answer, no file changes
npx kuza ai "see https://example.com/docs and add a section" # web context + edits
npx kuza ai "add a dark theme" --file main.kuza       # routes to the agent
```

`.env` is already in `.gitignore`; the key is never printed or sent anywhere
except the chosen provider. Without a key the command prints a hint.

### `kuza agent` — AI developer

`kuza agent` forces the developer mode even for a question-like prompt: it
reads and searches files, patches them, creates pages, installs npm packages,
downloads data, runs `npm run …` / `kuza check`, and keeps fixing until the
project compiles.

```bash
npx kuza agent "add a pricing section to main.kuza"
npx kuza agent "move the table into users.json and load it on start" --yes
npx kuza agent --mode engineering "optimize the tables"
npx kuza agent --print-prompt   # show the language knowledge and current mode
```

- Modes: `precise` (default, minimal literal change), `creative` (elegant UX),
  `engineering` (architecture and reliability). Set with `--mode` or
  `KUZA_AI_MODE`; in REPL use `/mode`.
- Every write, folder creation and install asks for confirmation; `--yes` (or
  answering `a` once) allows all. Tool results are filtered for secrets, and
  `fetch` only accepts allowed hosts.
- It only works in folders with `.kuza` files and never leaves the project.
- It follows `AGENTS.md` / `KUZA.md` / `CLAUDE.md` — put your rules there.
- Project map, decisions and task state are kept in `.kuza/agent/`; the agent
  reads only the files relevant to the current task and compacts old history.
- Simple and complex tasks can use different models, and there is a fallback
  model. All names come from env variables, never hardcoded in the CLI core.
- A token budget (`KUZA_AI_MAX_TOKENS`) and step limit (`KUZA_AI_MAX_STEPS`)
  keep long tasks predictable; the final report marks numbers as provider-reported
  or estimated.

Other settings:

```dotenv
KUZA_AI_MODEL_SIMPLE=gpt-4o-mini
KUZA_AI_MODEL_COMPLEX=claude-3-5-sonnet-latest
KUZA_AI_FALLBACK_MODEL=openai/gpt-4o-mini
KUZA_AI_ROUTE=auto
KUZA_AI_MODE=precise
KUZA_AI_MAX_TOKENS=150000
KUZA_AI_MAX_STEPS=24
KUZA_AI_FETCH_HOSTS=example.com,raw.githubusercontent.com
```

Inside the interactive console (`npx kuza`) use `/ai "question or task"` —
it applies the same routing — and `/agent "task"` to force the agent. `/mode`
changes the behavior mode between sessions. A change request closes the REPL so
the agent can own stdin for confirmations, then a fresh REPL opens.

Everything is checked with `kuza check` before it says “done” — if compilation
fails, it reads the diagnostic and fixes the code instead of handing you a
broken project.

If plain `kuza` in PowerShell behaves like an old version while `npx kuza`
works, run `npx kuza doctor`: it shows the active CLI, the global package version
and the execution policy that may block `kuza.ps1`.

## 6. Backend

```kuza
func home<> >> [
  respond >> <{ ok: true, message: "Hello" }, 200>;
];

route >> <"GET", "/", home>;
listen >> 3000;
```

Run with `kuza serve server.kuza`, then open `http://localhost:3000`.
`param`, `query`, `requestBody`, `header`, `method` and `serverPath` read the
current request.

## 7. Plugins

Create `kuza.config.js` next to `package.json`:

```js
export default {
  commands: [
    {
      id: "shout", name: "shout", aliases: [], category: "output",
      args: "single", params: ["text"],
      description: "Uppercase output", example: 'shout >> "hi";',
      codegen: "console.log(String({0}).toUpperCase())",
    },
  ],
  plugins: [
    {
      name: "my-plugin",
      setup(api) {
        api.onCompile(({ source }) => source);
        api.onBuild(({ code }) => code);
        api.onRun(({ result }) => result);
      },
    },
  ],
};
```

## 8. VS Code

Search for **Kuza** in the Extensions panel, or install the local
`packages/vscode/*.vsix` via **Install from VSIX…**. The extension gives
syntax highlighting, completion, diagnostics and Run/Build/Dev buttons.

## Links

- All commands and full reference: open `public/docs.html` (`npx kuza docs`)
- Compiler API: `import { compile, run } from "kuza-core"`
- Package with CLI: `kuza-lang`
