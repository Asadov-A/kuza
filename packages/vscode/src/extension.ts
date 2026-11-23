/**
 * РАСШИРЕНИЕ VS CODE.
 *
 * Что делает:
 *   • подсветка синтаксиса — из TextMate-грамматики (её генерирует commands.json);
 *   • автодополнение всех команд с описанием и примером;
 *   • подсказка при наведении на команду или ключевое слово;
 *   • подсветка ошибок компилятора прямо в редакторе;
 *   • кнопка ▶ «Run Kuza file» в заголовке редактора.
 */

import * as vscode from "vscode";
import {
  COMMANDS,
  EXT,
  FILE_EXT,
  KEYWORDS,
  NAME,
  compile,
  findCommand,
  type CommandDef,
} from "kuza-core";

const LANGUAGE_ID = EXT;
const CONFIG_SECTION = "kuza";

let diagnostics: vscode.DiagnosticCollection;
let timers = new Map<string, NodeJS.Timeout>();

function signature(command: CommandDef): string {
  if (command.args === "none") return command.name;
  if (command.args === "single") return `${command.name} >> value`;
  return `${command.name} >> <${command.params.join(", ")}>`;
}

function commandMarkdown(command: CommandDef): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = false;
  md.appendCodeblock(signature(command), EXT);
  md.appendMarkdown(`\n${command.description}\n\n`);
  if (command.aliases.length > 0) {
    md.appendMarkdown(`Алиасы: \`${command.aliases.join("`, `")}\`\n\n`);
  }
  if (command.returns) {
    md.appendMarkdown(`Возвращает: \`${command.returns}\`\n\n`);
  }
  md.appendMarkdown(`**Пример**\n`);
  md.appendCodeblock(command.example, EXT);
  return md;
}

function insertSnippet(command: CommandDef): vscode.SnippetString | string {
  if (command.args === "none") return command.name;
  if (command.args === "single") return new vscode.SnippetString(`${command.name} >> $0`);
  const args = command.params.map((param, index) => `\${${index + 1}:${param}}`).join(", ");
  return new vscode.SnippetString(`${command.name} >> <${args}>$0`);
}

/** Проверить документ и показать ошибки компилятора. */
function validate(document: vscode.TextDocument): void {
  if (document.languageId !== LANGUAGE_ID) {
    diagnostics.delete(document.uri);
    return;
  }

  const source = document.getText();
  const result = compile(source, { mode: "body" });

  if (result.ok || result.errors.length === 0) {
    diagnostics.delete(document.uri);
    return;
  }

  const items = result.errors.map((error) => {
    const line = Math.min(Math.max(error.line - 1, 0), Math.max(document.lineCount - 1, 0));
    const lineText = document.lineAt(line).text;
    const start = Math.min(Math.max(error.column - 1, 0), lineText.length);
    const end = Math.min(start + 1, lineText.length);
    const range = new vscode.Range(line, start, line, Math.max(end, start));
    const item = new vscode.Diagnostic(
      range,
      error.hint ? `${error.message}\nHint: ${error.hint}` : error.message,
      vscode.DiagnosticSeverity.Error,
    );
    item.source = NAME;
    return item;
  });

  diagnostics.set(document.uri, items);
}

function scheduleValidate(document: vscode.TextDocument, delay = 350): void {
  const key = document.uri.toString();
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      validate(document);
    }, delay),
  );
}

export function activate(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection(NAME);
  context.subscriptions.push(diagnostics);

  // ── автодополнение ──────────────────────────────────────────────────
  const completionProvider = vscode.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    provideCompletionItems() {
      const items = COMMANDS.map((command) => {
        const item = new vscode.CompletionItem(command.name, vscode.CompletionItemKind.Function);
        item.detail = signature(command);
        item.documentation = commandMarkdown(command);
        item.insertText = insertSnippet(command);
        // Поиск работает и по алиасам: набери "верх" — найдётся upper.
        item.filterText = [command.name, ...command.aliases].join(" ");
        item.sortText = command.name;
        return item;
      });

      for (const keyword of KEYWORDS) {
        const item = new vscode.CompletionItem(keyword.name, vscode.CompletionItemKind.Keyword);
        item.detail = "ключевое слово";
        item.documentation = new vscode.MarkdownString(
          `${keyword.description}\n\n\`\`\`${EXT}\n${keyword.example}\n\`\`\``,
        );
        items.push(item);
      }

      return items;
    },
  });

  // ── подсказки при наведении ─────────────────────────────────────────
  const hoverProvider = vscode.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, /[\p{L}\p{N}_$]+/u);
      if (!range) return undefined;
      const word = document.getText(range);

      const command = findCommand(word);
      if (command) return new vscode.Hover(commandMarkdown(command), range);

      const keyword = KEYWORDS.find((entry) => entry.name === word);
      if (keyword) {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${keyword.name}** — ${keyword.description}\n\n`);
        md.appendCodeblock(keyword.example, EXT);
        return new vscode.Hover(md, range);
      }

      return undefined;
    },
  });

  // ── терминальные команды ────────────────────────────────────────────
  const executable =
    vscode.workspace.getConfiguration(CONFIG_SECTION).get<string>("executable") || NAME.toLowerCase();
  const workspaceDir =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  const terminalFor = (title: string, cwd?: string): vscode.Terminal =>
    vscode.window.terminals.find((candidate) => candidate.name === title) ??
    vscode.window.createTerminal({ name: title, cwd });

  const runCommand = vscode.commands.registerCommand("kuza.run", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage(`Открой файл ${FILE_EXT}, чтобы запустить его.`);
      return;
    }
    if (editor.document.isDirty) await editor.document.save();
    const terminal = terminalFor(`${NAME} Run`);
    terminal.show(true);
    terminal.sendText(`${executable} run "${editor.document.uri.fsPath}"`);
  });

  const devCommand = vscode.commands.registerCommand("kuza.dev", () => {
    const port = vscode.workspace.getConfiguration(CONFIG_SECTION).get<number>("port") ?? 5173;
    const terminal = terminalFor(`${NAME} Dev`, workspaceDir);
    terminal.show(true);
    terminal.sendText(`${executable} start --port=${port}`);
  });

  const buildCommand = vscode.commands.registerCommand("kuza.build", () => {
    const terminal = terminalFor(`${NAME} Build`, workspaceDir);
    terminal.show(true);
    terminal.sendText(`${executable} build`);
  });

  const newCommand = vscode.commands.registerCommand("kuza.new", async () => {
    const name = await vscode.window.showInputBox({
      prompt: "Folder for the new Kuza project",
      placeHolder: "my-site",
    });
    if (!name) return;
    const terminal = terminalFor(`${NAME} New`, workspaceDir);
    terminal.show(true);
    terminal.sendText(`${executable} new "${name.replace(/"/g, '\\"')}"`);
  });

  const aiCommand = vscode.commands.registerCommand("kuza.ai", async () => {
    const question = await vscode.window.showInputBox({
      prompt: "Ask Kuza AI about this project",
      placeHolder: "Explain main.kuza",
    });
    if (!question) return;
    const terminal = terminalFor(`${NAME} AI`, workspaceDir);
    terminal.show(true);
    terminal.sendText(`${executable} ai "${question.replace(/"/g, '\\"')}"`);
  });

  // ── проверка при открытии, наборе и сохранении ──────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => validate(document)),
    vscode.workspace.onDidSaveTextDocument((document) => validate(document)),
    vscode.workspace.onDidChangeTextDocument((event) => scheduleValidate(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnostics.delete(document.uri);
      const timer = timers.get(document.uri.toString());
      if (timer) clearTimeout(timer);
      timers.delete(document.uri.toString());
    }),
    completionProvider,
    hoverProvider,
    runCommand,
    devCommand,
    buildCommand,
    newCommand,
    aiCommand,
  );

  for (const document of vscode.workspace.textDocuments) validate(document);
}

export function deactivate(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers = new Map();
  diagnostics?.dispose();
}
