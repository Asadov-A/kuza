# Kuza for VS Code

The extension adds Kuza language support to VS Code: syntax highlighting,
completions for all 132 commands, hover docs, compiler diagnostics, and
Run / Dev / Build / New / AI commands.

It understands the full 0.5.0 syntax: `view`, `render`, Tailwind classes in
`<"..." >`, tables `table<id, name>`, `select ... from ... where ...`,
`update`, `delete`, lambdas `(x) -> x * 2`, pipelines `|>` and ranges `1..10`.

## Installation

### From VSIX (local)

1. Install the CLI: `npm i -g kuza-lang`.
2. Build the package: `npm run package:vscode` from the repo root (or
   `npm run package` in this folder).
3. In VS Code open **Extensions** (Ctrl+Shift+X).
4. `⋯` → **Install from VSIX…** → pick
   `packages/vscode/kuza-vscode-0.5.0.vsix`.

### From Marketplace

Open **Extensions** and search for **Kuza**. If it is not found, the published
version is not up to date yet — install the local VSIX as described above.

For the extension to appear in search, the owner must register the `kuza`
publisher at the [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage),
create a personal access token, and run `npm run publish:vscode` with it.
Without an account and token, publishing is impossible — that is a Microsoft
requirement, not a code error. Make sure the `version` in
`packages/vscode/package.json` is bumped before publishing.

## Features

- **Highlighting and snippets** are generated from
  `packages/core/commands.json` by `npm run generate`.
- **Completions** for commands (`log`, `view`, `route`, `storeGet`, …) with
  descriptions and examples.
- **Diagnostics** — compiler errors appear in the editor as you type and save
  a `.kuza` file.
- **Editor title buttons** for `.kuza` files: Run, Dev and Build. The command
  palette also offers Kuza: New project and Kuza: Ask AI about this project.

Terminal commands use the executable from the `kuza.executable` setting
(default `kuza`; you can set `npx kuza-lang`). The dev-server port is set by
`kuza.port` (default 5173).

## Development

```bash
npm run build           # from the repo root: core + CLI + extension
npm run package:vscode  # build kuza-vscode-0.5.0.vsix
```

`dist/extension.js` is bundled from `src/extension.ts` with esbuild. The
manifest, grammar, language configuration and snippets are refreshed by the
core generator.

License: MIT.
