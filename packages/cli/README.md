# kuza-lang

`kuza-lang` provides the `kuza` command: create projects, run a local site,
build it, check it, start a backend, ask an AI assistant, and use the REPL.
The compiler lives in the separate `kuza-core` package, already installed as a
dependency.

## Install and your first site

```bash
mkdir my-site && cd my-site
npm install kuza-lang
npm run dev
```

`postinstall` creates this in an empty folder:

```text
index.html          minimal page shell: Tailwind, one stylesheet link, {main.kuza}
main.kuza           the whole app: structure, logic and state
public/styles.css   optional starter design (delete the link in index.html to reset)
public/favicon.svg  site icon
START.md            short getting-started guide
public/docs.html           full local reference (132 commands, CLI, AI, backend)
.env.example        copy to .env to connect AI
README.md
.gitignore
```

Installing into an existing project (React, Next.js, etc.) **never overwrites**
your files — scaffolding only runs when the folder is effectively empty.
Without installing, use `npx kuza-lang@latest new my-site`. Always include
`@latest`: npx caches older releases and plain `npx kuza-lang` can silently run
an outdated version. Inside a project, `npx kuza` uses the installed local one.

## CLI commands

| Command | What it does |
| --- | --- |
| `kuza new <dir>` (`init`, `create`) | create a project; `--script` for a console app, `--force` to overwrite |
| `kuza start` (`dev`) | dev server at `http://localhost:5173`; `--port=3000` |
| `kuza build` | build `dist/index.html` and `dist/<page>/index.html` |
| `kuza check` (`doctor`) | check every `.kuza` file without running |
| `kuza serve server.kuza` | start the HTTP server described in Kuza |
| `kuza ai "question" --file main.kuza` | AI assistant that reads your project |
| `kuza agent "task"` | AI developer: reads/patches files, installs packages, fetches data, runs checks |
| `kuza agent --init` | create `AGENTS.md` with the rules the agent follows |
| `kuza agent --print-prompt` | print the language knowledge sent to the model |
| `kuza upgrade` | install `kuza-lang@latest` in this project |
| `kuza run main.kuza` | execute a file in Node.js |
| `kuza build main.kuza` | build a standalone `.js`; `--lib` for an ES module (`export function …`) |
| `kuza watch main.kuza --web` | rebuild HTML on changes |
| `kuza docs` | open the local `public/docs.html` in your browser (recreates it if missing) |
| `kuza -v` | print CLI and core versions |
| `kuza help` | short terminal help |

`npm start` in a generated project is an alias for `npm run dev`.

## Sites in Kuza

```kuza
:count = 0;

view App<> >> [
  page >> "Hello, Kuza!";

  body<"mx-auto max-w-2xl p-8"> >> [
    heading >> <"Hello, Kuza!", "text-4xl font-bold">;
    para >> <"Count: {count}", "text-orange-400">;
    button >> <"Add one", increase, "rounded bg-orange-500 px-4 py-2">;
  ];

  render;
];

func increase<> >> [
  count = count + 1; // the view redraws itself
];
```

`view` is a single reactive screen. Variables it uses become reactive: a plain
assignment is enough, no manual `draw<>()` mosaic. Classes inside `<"..." >`
are Tailwind utilities; the generated `index.html` already loads Tailwind and
sets `tailwind.config = { important: true }` so they override Kuza's base CSS.

Containers: `body`, `section`, `nav`, `row`, `column`, `card`, `box`. Inside
them: `heading`, `para`, `button`, `field`, `list`, `link`, `image`.
`render` draws the assembled tree.

### Multiple pages

`main.kuza` is the home page. `pages/about.kuza` becomes `/about` in the dev
server and `dist/about/index.html` after a build. `pages/index.kuza` maps to
`/index`; page files must sit directly in `pages/`. Every page uses the same
`index.html` shell. Static files from `public/` are copied into `dist/` and
served from the site root. Link pages with
`link<"About", "/about", "text-orange-400">;`.

## Storage and backend

```kuza
storeSet >> <"visits", 3>;
:visits = storeGet >> <"visits", 0>;
```

```kuza
func home<> >> [
  respond >> <{ ok: true, name: query >> "name" }, 200>;
];

route >> <"GET", "/", home>;
listen >> 3000;
```

Run with `kuza serve server.kuza`. Routes support `/users/:id` parameters;
read the request with `param`, `query`, `requestBody`, `header`, `method` and
`serverPath`.

## Plugins

`kuza.config.js` next to `package.json`:

```js
export default {
  commands: [
    {
      id: "shout", name: "shout", aliases: [], category: "output",
      args: "single", params: ["text"],
      description: "Uppercase text", example: 'shout >> "hi";',
      codegen: "console.log(String({0}).toUpperCase())",
    },
  ],
  plugins: [
    {
      name: "example",
      setup(api) {
        api.onCompile(({ source }) => source);
        api.onBuild(({ code }) => code);
        api.onRun(({ result }) => result);
      },
    },
  ],
};
```

A plugin command becomes available in `.kuza` files and in syntax highlighting
after restarting the CLI.

## AI

The key is read from `.env` or the environment:

```dotenv
KUZA_AI_KEY=sk-...
KUZA_AI_PROVIDER=openai
KUZA_AI_MODEL=gpt-4o-mini
KUZA_AI_BASE_URL=https://api.openai.com/v1
```

OpenAI, OpenRouter, Groq, Ollama, Freebuff and Anthropic (`ANTHROPIC_API_KEY`)
are supported. `kuza ai` reads your project files and compile errors; the key
is never printed and `.env` is in `.gitignore`.

`kuza agent` is a full developer loop. The prompt is generated from the
compiler itself, so the model always sees every command, structure, version and
common mistake of the installed Kuza — not a stale text description. Project
rules come from `AGENTS.md`, `KUZA.md` or `CLAUDE.md`. Available actions:
`plan`, `glob`, `grep`, `list`, `read`, `write`, `append`, `replace`, `delete`,
`mkdir`, `check`, `run`, `install`, `fetch`, `version`, `upgrade`, `done`.
Several actions can be requested in one model reply, and `done` is refused while
`kuza check` reports errors. All writes, installs and fetches ask for
confirmation (`--yes` disables questions). The agent never leaves the project
folder, never touches `.env`, and never runs `npm publish` or `git push`.

Shortcuts: `kuza n`, `d`, `b`, `c`, `r`, `s`, `a`, `g`, `u`.

## Links

- Full local reference: `npx kuza docs` → `public/docs.html`
- Compiler as a library: `kuza-core`
- Editor extension: `kuza-vscode`

License: MIT.
