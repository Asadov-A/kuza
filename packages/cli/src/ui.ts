/**
 * Оформление консоли: ASCII-лого, цвета, рамки.
 * Тема влияет только на оттенки — тёмная (по умолчанию) и светлая.
 */

import boxen from "boxen";
import chalk from "chalk";
import gradient from "gradient-string";
import { NAME, VERSION, FILE_EXT, COLORS } from "kuza-core";
import { t } from "./i18n.js";

/** English by default; the core tagline is kept for other locales. */
const TAGLINE_EN = "a small language that compiles to JavaScript";

export type ThemeName = "dark" | "light";

let theme: ThemeName = "dark";

export function setTheme(name: ThemeName): void {
  theme = name;
}

export function getTheme(): ThemeName {
  return theme;
}

function pick(darkHex: string, lightHex: string) {
  return (text: string) => chalk.hex(theme === "dark" ? darkHex : lightHex)(text);
}

/** Основной цвет бренда: оранжевый. */
export const primary = (text: string) => pick(COLORS.primary, "#b45309")(text);
/** Второй цвет градиента: светлый оранжевый. */
export const accent = (text: string) => pick(COLORS.accent, "#c2410c")(text);
/** Кремовый текст бренда. */
export const brandText = (text: string) => pick(COLORS.text, "#3f2d20")(text);
/** Приглушённый текст. */
export const dim = (text: string) => chalk.gray(text);
/** Жирный текст. */
export const bold = (text: string) => chalk.bold(text);
/** Успех. */
export const success = (text: string) => pick("#3ddc84", "#15803d")(text);
/** Ошибка. */
export const danger = (text: string) => pick("#ff5c7a", "#b91c1c")(text);
/** Предупреждение. */
export const warning = (text: string) => pick("#ffcc02", "#a16207")(text);
/** Подсказка-команда. */
export const code = (text: string) => chalk.hex(theme === "dark" ? "#ffd479" : "#92400e")(text);

const ASCII_LOGO = [
  "  ██╗  ██╗██╗   ██╗███████╗ █████╗ ",
  "  ██║ ██╔╝██║   ██║╚══███╔╝██╔══██╗",
  "  █████╔╝ ██║   ██║  ███╔╝ ███████║",
  "  ██╔═██╗ ██║   ██║ ███╔╝  ██╔══██║",
  "  ██║  ██╗╚██████╔╝███████╗██║  ██║",
  "  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝",
].join("\n");

export function printBanner(): void {
  // Градиент логотипа: от светлого оранжевого к акценту.
  const painted = gradient([...COLORS.gradient]).multiline(ASCII_LOGO);

  console.log("");
  console.log(painted);
  console.log("");

  const title = `${bold(brandText(NAME))} ${dim("v" + VERSION)}  ${dim("·  " + FILE_EXT)}`;
  const lines = [
    `${title}  ${dim("·")}  ${brandText(TAGLINE_EN)}`,
    "",
    `${accent("›")} ${brandText(t("welcome"))} ${primary(NAME)}`,
    `${dim(t("hint"))}`,
    "",
    `${brandText(t("commandsHint"))}`,
  ];

  console.log(
    boxen(lines.join("\n"), {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 0, right: 0 },
      borderStyle: "round",
      borderColor: theme === "dark" ? COLORS.primary : "#C2410C",
      ...(theme === "dark" ? { backgroundColor: COLORS.bg } : {}),
    }),
  );
}

export function printCompileError(text: string): void {
  console.error(danger(text));
}
