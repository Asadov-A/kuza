#!/usr/bin/env node
/**
 * Сборка расширения одним файлом.
 *
 * esbuild складывает наш код и kuza-core в dist/extension.js,
 * поэтому .vsix не тащит node_modules и работает сам по себе.
 */

import { build, context } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

const options = {
  entryPoints: [join(here, "src", "extension.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["vscode"],
  outfile: join(here, "dist", "extension.js"),
  sourcemap: false,
  minify: false,
  logLevel: "info",
};

mkdirSync(join(here, "dist"), { recursive: true });

if (watch) {
  const watcher = await context(options);
  await watcher.watch();
  console.log("esbuild: слежу за изменениями (Ctrl+C — выход)");
} else {
  await build(options);
  console.log("esbuild: dist/extension.js готов");
}
