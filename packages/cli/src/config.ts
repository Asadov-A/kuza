/**
 * Поддержка kuza.config.js: плагины, хуки и свои команды.
 *
 * Файл лежит рядом с package.json и подключается перед компиляцией.
 * Ошибка в конфиге не должна ломать CLI — показываем предупреждение.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { defineCommand, type CommandDef } from "kuza-core";

export interface CompileContext {
  source: string;
  filename: string;
}

export interface BuildContext {
  code: string;
  filename: string;
  output: string;
}

export interface RunContext {
  result: unknown;
  filename: string;
}

export interface PluginApi {
  defineCommand(command: CommandDef): CommandDef;
  onCompile(hook: (context: CompileContext) => string | void): void;
  onBuild(hook: (context: BuildContext) => string | void): void;
  onRun(hook: (context: RunContext) => unknown): void;
}

export interface Plugin {
  name: string;
  setup(api: PluginApi): void | Promise<void>;
}

export interface ProjectConfig {
  commands?: CommandDef[];
  plugins?: Plugin[];
}

export interface LoadedConfig {
  compile: Array<(context: CompileContext) => string | void>;
  build: Array<(context: BuildContext) => string | void>;
  run: Array<(context: RunContext) => unknown>;
  warnings: string[];
}

export async function loadProjectConfig(dir: string = process.cwd()): Promise<LoadedConfig> {
  const loaded: LoadedConfig = { compile: [], build: [], run: [], warnings: [] };
  const path = join(dir, "kuza.config.js");
  if (!existsSync(path)) return loaded;

  try {
    const module = (await import(pathToFileURL(path).href + "?t=" + Date.now())) as {
      default?: ProjectConfig;
    } & ProjectConfig;
    const config = module.default ?? module;

    for (const command of config.commands ?? []) defineCommand(command);

    const api: PluginApi = {
      defineCommand,
      onCompile: (hook) => loaded.compile.push(hook),
      onBuild: (hook) => loaded.build.push(hook),
      onRun: (hook) => loaded.run.push(hook),
    };
    for (const plugin of config.plugins ?? []) {
      await plugin.setup(api);
    }
  } catch (error) {
    loaded.warnings.push(
      `kuza.config.js: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return loaded;
}

export function applyCompileHooks(config: LoadedConfig, context: CompileContext): string {
  let source = context.source;
  for (const hook of config.compile) {
    source = hook({ ...context, source }) ?? source;
  }
  return source;
}

export function applyBuildHooks(config: LoadedConfig, context: BuildContext): string {
  let code = context.code;
  for (const hook of config.build) {
    code = hook({ ...context, code }) ?? code;
  }
  return code;
}

export function applyRunHooks(config: LoadedConfig, context: RunContext): unknown {
  let result = context.result;
  for (const hook of config.run) {
    result = hook({ ...context, result }) ?? result;
  }
  return result;
}
