/**
 * postinstall для kuza-lang.
 *
 * npm вызывает его из папки самого пакета, поэтому настоящую папку проекта
 * берём из INIT_CWD. Скаффолдим только «свежий» проект: если уже есть другой
 * код или зависимости, молча ничего не трогаем.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const cwd = process.env.INIT_CWD ? resolve(process.env.INIT_CWD) : process.cwd();

if (process.env.npm_config_global === "true") process.exit(0);

const has = (name) => existsSync(join(cwd, name));
if (has("index.html") || has("src") || has("app") || has("pages") || has("main.kuza")) {
  process.exit(0);
}

try {
  const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const other = Object.keys(deps).filter((name) => name !== "kuza-lang");
  if (other.length > 0 || /kuza-monorepo/.test(String(pkg.name || ""))) process.exit(0);
} catch {
  // package.json ещё нет — это тоже свежий проект, создадим его.
}

try {
  const { scaffoldProject } = await import(new URL("../dist/scaffold.js", import.meta.url));
  const created = scaffoldProject(cwd);
  if (created.length > 0) {
    console.log("\nKuza: created " + created.join(", "));
    console.log("Kuza: run `npm run dev` → http://localhost:5173\n");
  }
} catch {
  // postinstall никогда не должен ломать установку.
}
