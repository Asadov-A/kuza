/** Открыть локальный файл в системном браузере. */

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Возвращает true, если команда запущена. Точный успех браузером не гарантирован
 * (например, в headless-окружении), поэтому вызывающий всегда печатает путь.
 */
export function openInBrowser(filePath: string): boolean {
  const url = pathToFileURL(resolve(filePath)).href;

  let command: string;
  let args: string[];
  if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => undefined);
    child.unref();
    return true;
  } catch {
    return false;
  }
}
