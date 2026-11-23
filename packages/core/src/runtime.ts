/**
 * РАНТАЙМ.
 *
 * Часть встроенных команд — это простые выражения JavaScript (например
 * Math.abs). Но некоторым нужен «помощник»: случайное число в диапазоне,
 * чтение файла, запрос в интернет, работа с DOM.
 *
 * RUNTIME_SOURCE — это готовая строка с JavaScript-кодом. Генератор
 * вставляет её в начало программы, поэтому скомпилированный .js файл
 * работает сам по себе, без установки Kuza.
 *
 * ⚠️ Правило для этого файла: внутри RUNTIME_SOURCE нельзя использовать
 * обратные кавычки и ${...}, иначе строка сломается. Пишем через "+".
 */

export const RUNTIME_SOURCE = String.raw`const __kz = {
  isNode() {
    return typeof process !== "undefined" && !!(process.versions && process.versions.node);
  },
  isNum: (v) => typeof v === "number" && !Number.isNaN(v),
  isStr: (v) => typeof v === "string",
  isArr: (v) => Array.isArray(v),
  isObj: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  len: (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "string" || Array.isArray(v)) return v.length;
    if (typeof v === "object") return Object.keys(v).length;
    return 0;
  },
  randRange: (from, to) => Math.floor(Math.random() * (to - from + 1)) + from,
  randPick: (arr) => (Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined),
  sum: (arr) => (Array.isArray(arr) ? arr.reduce((a, b) => a + Number(b), 0) : 0),
  avg: (arr) => (Array.isArray(arr) && arr.length ? __kz.sum(arr) / arr.length : 0),
  clamp: (value, low, high) => Math.min(Math.max(value, low), high),
  range: (from, to) => {
    const start = Number(from);
    const end = Number(to);
    const out = [];
    const step = end >= start ? 1 : -1;
    for (let i = start; step > 0 ? i <= end : i >= end; i += step) out.push(i);
    return out;
  },
  join: (arr, sep) => (Array.isArray(arr) ? arr : []).join(sep === undefined || sep === null ? ", " : String(sep)),
  replaceAll: (text, search, replacement) => String(text).split(String(search)).join(String(replacement)),
  contains: (value, item) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.includes(String(item));
    if (Array.isArray(value)) return value.includes(item);
    if (typeof value === "object") return Object.prototype.hasOwnProperty.call(value, item);
    return false;
  },
  indexOf: (value, item) => {
    if (typeof value === "string") return value.indexOf(String(item));
    if (Array.isArray(value)) return value.indexOf(item);
    return -1;
  },
  slice: (value, start, end) => {
    if (value === null || value === undefined) return value;
    if (end === undefined || end === null) return value.slice(start);
    return value.slice(start, end);
  },
  padLeft: (text, length, fill) => String(text).padStart(length, fill === undefined || fill === null ? " " : String(fill)),
  padRight: (text, length, fill) => String(text).padEnd(length, fill === undefined || fill === null ? " " : String(fill)),
  words: (text) => String(text).trim().split(/\s+/).filter((w) => w.length > 0),
  capitalize: (text) => {
    const s = String(text);
    return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  },
  sort: (arr, key) => {
    const copy = Array.isArray(arr) ? arr.slice() : [];
    copy.sort((a, b) => {
      const x = key ? a[key] : a;
      const y = key ? b[key] : b;
      if (typeof x === "number" && typeof y === "number") return x - y;
      return String(x).localeCompare(String(y));
    });
    return copy;
  },
  reverse: (value) => {
    if (Array.isArray(value)) return value.slice().reverse();
    if (typeof value === "string") return value.split("").reverse().join("");
    return value;
  },
  unique: (arr) => (Array.isArray(arr) ? Array.from(new Set(arr)) : []),
  removeAt: (arr, index) => (Array.isArray(arr) ? arr.filter((_, i) => i !== index) : []),
  count: (arr, value) => (Array.isArray(arr) ? arr.filter((x) => x === value).length : 0),
  flatten: (arr) => (Array.isArray(arr) ? arr.reduce((acc, x) => acc.concat(x), []) : []),
  // ── коллекции: свёртка, группировка, работа с последовательностями ──
  reduce: (arr, fn, initial) => (Array.isArray(arr) ? arr.reduce(fn, initial) : initial),
  flatMap: (arr, fn) => (Array.isArray(arr) ? arr.flatMap(fn) : []),
  partition: (arr, fn) => {
    const yes = [];
    const no = [];
    for (const item of Array.isArray(arr) ? arr : []) (fn(item) ? yes : no).push(item);
    return [yes, no];
  },
  zip: (left, right) => {
    const a = Array.isArray(left) ? left : [];
    const b = Array.isArray(right) ? right : [];
    return a.slice(0, b.length).map((item, i) => [item, b[i]]);
  },
  take: (arr, count) => (Array.isArray(arr) ? arr.slice(0, Math.max(0, Number(count) || 0)) : []),
  drop: (arr, count) => (Array.isArray(arr) ? arr.slice(Math.max(0, Number(count) || 0)) : []),
  chunk: (arr, size) => {
    const width = Math.max(1, Number(size) || 1);
    const source = Array.isArray(arr) ? arr : [];
    const out = [];
    for (let i = 0; i < source.length; i += width) out.push(source.slice(i, i + width));
    return out;
  },
  uniqueBy: (arr, fn) => {
    const seen = new Set();
    const out = [];
    for (const item of Array.isArray(arr) ? arr : []) {
      const key = fn(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  },
  intersect: (left, right) => {
    const b = new Set(Array.isArray(right) ? right : []);
    return (Array.isArray(left) ? left : []).filter((item) => b.has(item));
  },
  difference: (left, right) => {
    const b = new Set(Array.isArray(right) ? right : []);
    return (Array.isArray(left) ? left : []).filter((item) => !b.has(item));
  },
  union: (left, right) =>
    Array.from(new Set([...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])])),
  // ── таблицы как основной вид данных ────────────────────────────────
  rowCount: (table) => (Array.isArray(table) ? table.length : 0),
  firstRow: (table) => (Array.isArray(table) && table.length ? table[0] : null),
  lastRow: (table) => (Array.isArray(table) && table.length ? table[table.length - 1] : null),
  takeRows: (table, count) => __kz.makeTable(__kz.columnNames(table), __kz.take(table, count)),
  dropRows: (table, count) => __kz.makeTable(__kz.columnNames(table), __kz.drop(table, count)),
  distinctRows: (table, key) => __kz.makeTable(__kz.columnNames(table), __kz.uniqueBy(table, key)),
  sortRowsBy: (table, key, direction) => {
    const rows = __kz.sort(Array.isArray(table) ? table.slice() : [], key);
    return __kz.makeTable(__kz.columnNames(table), String(direction) === "desc" ? rows.reverse() : rows);
  },
  mergeTables: (left, right) => {
    const columns = Array.from(new Set([...__kz.columnNames(left), ...__kz.columnNames(right)]));
    return __kz.makeTable(
      columns,
      [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])],
    );
  },
  tableFromRows: (rows, columns) => __kz.makeTable(Array.isArray(columns) ? columns : __kz.columnNames(rows), Array.isArray(rows) ? rows : []),
  // ── интеграция с host-окружением (React/Vue/Node) ──────────────────
  emitEvent: (name, detail) => {
    if (typeof window === "undefined" || typeof window.CustomEvent !== "function") return detail;
    window.dispatchEvent(new window.CustomEvent(String(name), { detail }));
    return detail;
  },
  onEvent: (name, handler) => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return () => {};
    window.addEventListener(String(name), (event) => handler(event.detail));
    return () => window.removeEventListener(String(name), handler);
  },
  callHost: (name, ...args) => {
    const host = typeof globalThis !== "undefined" ? globalThis[String(name)] : undefined;
    if (typeof host !== "function") throw new Error("Host function not found: " + String(name));
    return host(...args);
  },
  hostValue: (name) => (typeof globalThis !== "undefined" ? globalThis[String(name)] : undefined),
  serverCors: (origin) => {
    __kz.__serverCors = String(origin);
    return __kz.__serverCors;
  },
  hasKey: (obj, key) => obj !== null && obj !== undefined && Object.prototype.hasOwnProperty.call(obj, key),
  formatDate: (value) => (value === undefined || value === null ? new Date() : new Date(value)).toLocaleDateString(),
  toError: (value) => (value instanceof Error ? value : new Error(String(value))),
  assert: (condition, message) => {
    if (!condition) throw new Error(message === undefined || message === null ? "Проверка не прошла" : String(message));
  },
  clone: (value) => {
    if (value === null || typeof value !== "object") return value;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  },
  uuid: () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
  env: (name) => (__kz.isNode() ? process.env[String(name)] || "" : ""),
  argv: () => (__kz.isNode() ? process.argv.slice(2) : []),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, Number(ms) || 0)),
  alert: (message) => {
    if (typeof globalThis.alert === "function" && typeof document !== "undefined") globalThis.alert(message);
    else console.log(message);
  },
  async prompt(message) {
    const text = message === undefined || message === null ? "" : String(message);
    if (typeof document !== "undefined" && typeof globalThis.prompt === "function") return globalThis.prompt(text, "");
    if (!__kz.isNode()) return "";
    if (!process.stdin || process.stdin.isTTY === false) return "";
    const readline = await import("node:readline/promises");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(text + " ");
    rl.close();
    return answer;
  },
  async confirm(message) {
    const text = message === undefined || message === null ? "Продолжить? (y/n)" : String(message);
    if (typeof document !== "undefined" && typeof globalThis.confirm === "function") return globalThis.confirm(text);
    if (!__kz.isNode()) return false;
    if (!process.stdin || process.stdin.isTTY === false) return false;
    const readline = await import("node:readline/promises");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(text + " ")).trim().toLowerCase();
    rl.close();
    return answer === "y" || answer === "yes" || answer === "д" || answer === "да" || answer === "1";
  },
  async fs() {
    if (!__kz.isNode()) throw new Error("Файловые команды работают только в Node.js, а не в браузере");
    // getBuiltinModule работает и внутри new Function (его использует kuza run).
    if (typeof process.getBuiltinModule === "function") return process.getBuiltinModule("node:fs/promises");
    if (typeof __kzImport === "function") return __kzImport("node:fs/promises");
    return import("node:fs/promises");
  },
  async readFile(path) {
    const fs = await __kz.fs();
    return fs.readFile(String(path), "utf8");
  },
  async writeFile(path, text) {
    const fs = await __kz.fs();
    await fs.writeFile(String(path), String(text), "utf8");
  },
  async appendFile(path, text) {
    const fs = await __kz.fs();
    await fs.appendFile(String(path), String(text), "utf8");
  },
  async exists(path) {
    const fs = await __kz.fs();
    try {
      await fs.access(String(path));
      return true;
    } catch {
      return false;
    }
  },
  async listDir(path) {
    const fs = await __kz.fs();
    return fs.readdir(String(path === undefined || path === null ? "." : path));
  },
  async removeFile(path) {
    const fs = await __kz.fs();
    await fs.unlink(String(path));
  },
  async httpGet(url) {
    const response = await fetch(String(url));
    if (!response.ok) throw new Error("HTTP " + response.status + " для " + url);
    return response.text();
  },
  async httpJson(url) {
    const response = await fetch(String(url));
    if (!response.ok) throw new Error("HTTP " + response.status + " для " + url);
    return response.json();
  },
  async httpPost(url, body) {
    const response = await fetch(String(url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    if (!response.ok) throw new Error("HTTP " + response.status + " для " + url);
    return response.text();
  },
  dom(selector) {
    if (typeof document === "undefined") throw new Error("DOM-команды работают только в браузере");
    const el = document.querySelector(String(selector));
    if (!el) throw new Error("Элемент не найден: " + selector);
    return el;
  },
  domGet: (selector) => __kz.dom(selector),
  domText: (selector, text) => {
    __kz.dom(selector).textContent = String(text);
  },
  domHtml: (selector, html) => {
    __kz.dom(selector).innerHTML = String(html);
  },
  domStyle: (selector, property, value) => {
    __kz.dom(selector).style.setProperty(String(property), String(value));
  },
  domOn: (selector, event, handler) => {
    __kz.dom(selector).addEventListener(String(event), handler);
  },
  domAdd: (selector, html) => {
    __kz.dom(selector).insertAdjacentHTML("beforeend", String(html));
  },
  table(columns) {
    return __kz.makeTable(Array.isArray(columns) ? columns.slice() : [], []);
  },
  makeTable(columns, rows) {
    const list = Array.isArray(rows) ? rows : [];
    Object.defineProperty(list, "columns", {
      value: Array.isArray(columns) ? columns.slice() : [],
      enumerable: false,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(list, "add", {
      value: function (...values) {
        const row = {};
        if (values.length === 1 && __kz.isObj(values[0])) {
          for (const column of list.columns) {
            row[column] = values[0][column] === undefined ? null : values[0][column];
          }
        } else {
          list.columns.forEach((column, index) => {
            row[column] = values[index] === undefined ? null : values[index];
          });
        }
        list.push(row);
        return row;
      },
      enumerable: false,
    });
    Object.defineProperty(list, "where", {
      value: function (check) {
        return __kz.makeTable(list.columns.slice(), list.filter((row) => check(row)));
      },
      enumerable: false,
    });
    Object.defineProperty(list, "first", {
      value: function (check) {
        return check ? list.find((row) => check(row)) : list[0];
      },
      enumerable: false,
    });
    return list;
  },
  columnNames(source) {
    if (source && Array.isArray(source.columns)) return source.columns.slice();
    if (Array.isArray(source) && source.length > 0 && __kz.isObj(source[0])) return Object.keys(source[0]);
    return [];
  },
  tableFrom(value) {
    return __kz.makeTable(__kz.columnNames(value), Array.isArray(value) ? value : []);
  },
  select(source, options) {
    const opts = options || {};
    const rows = Array.isArray(source) ? source : [];
    let result = opts.where ? rows.filter((row) => opts.where(row)) : rows.slice();
    if (opts.order) {
      const direction = opts.desc ? -1 : 1;
      result.sort((a, b) => {
        const x = opts.order(a);
        const y = opts.order(b);
        if (typeof x === "number" && typeof y === "number") return (x - y) * direction;
        return String(x).localeCompare(String(y)) * direction;
      });
    }
    if (opts.limit !== undefined && opts.limit !== null) result = result.slice(0, Number(opts.limit));

    let columns = __kz.columnNames(source);
    if (opts.columns && opts.columns !== "*") {
      const wanted = opts.columns;
      columns = wanted.map((column) =>
        typeof column === "string" ? column : column.alias || column.name,
      );
      result = result.map((row) => {
        const out = {};
        for (const column of wanted) {
          const from = typeof column === "string" ? column : column.name;
          const to = typeof column === "string" ? column : column.alias || column.name;
          out[to] = row[from];
        }
        return out;
      });
    }

    return __kz.makeTable(columns, result);
  },
  update(table, match, patch) {
    if (!Array.isArray(table)) return 0;
    let changed = 0;
    for (const row of table) {
      if (match && !match(row)) continue;
      for (const column of Object.keys(patch)) row[column] = patch[column](row);
      changed++;
    }
    return changed;
  },
  removeRows(table, match) {
    if (!Array.isArray(table)) return 0;
    let removed = 0;
    for (let i = table.length - 1; i >= 0; i--) {
      if (!match || match(table[i])) {
        table.splice(i, 1);
        removed++;
      }
    }
    return removed;
  },
  async tableSave(table, path) {
    const fs = await __kz.fs();
    const rows = Array.isArray(table) ? table.slice() : [];
    await fs.writeFile(
      String(path),
      JSON.stringify({ columns: __kz.columnNames(table), rows: rows }, null, 2),
      "utf8",
    );
    return rows.length;
  },
  async tableLoad(path) {
    const fs = await __kz.fs();
    const data = JSON.parse(await fs.readFile(String(path), "utf8"));
    if (Array.isArray(data)) return __kz.makeTable(__kz.columnNames(data), data);
    return __kz.makeTable(
      Array.isArray(data.columns) ? data.columns : [],
      Array.isArray(data.rows) ? data.rows : [],
    );
  },
  modules: {
    math: {
      pi: Math.PI,
      e: Math.E,
      sqrt: (x) => Math.sqrt(Number(x)),
      abs: (x) => Math.abs(Number(x)),
      round: (x) => Math.round(Number(x)),
      floor: (x) => Math.floor(Number(x)),
      ceil: (x) => Math.ceil(Number(x)),
      pow: (a, b) => Math.pow(Number(a), Number(b)),
      min: (a, b, c) => Math.min(Number(a), Number(b), c === undefined ? Number(a) : Number(c)),
      max: (a, b, c) => Math.max(Number(a), Number(b), c === undefined ? Number(a) : Number(c)),
      random: () => Math.random(),
    },
    time: {
      now: () => Date.now(),
      date: (value) => (value === undefined ? new Date() : new Date(value)),
      iso: () => new Date().toISOString(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, Number(ms) || 0)),
    },
    random: {
      int: (max) => Math.floor(Math.random() * Number(max)),
      range: (from, to) => __kz.randRange(from, to),
      pick: (list) => __kz.randPick(list),
      bool: () => Math.random() < 0.5,
    },
    text: {
      upper: (s) => String(s).toUpperCase(),
      lower: (s) => String(s).toLowerCase(),
      trim: (s) => String(s).trim(),
      split: (s, sep) => String(s).split(String(sep)),
      join: (list, sep) => __kz.join(list, sep),
      replace: (s, search, replacement) => __kz.replaceAll(s, search, replacement),
      contains: (s, part) => String(s).includes(String(part)),
      len: (s) => __kz.len(s),
      repeat: (s, times) => String(s).repeat(Number(times) || 0),
    },
    json: {
      parse: (text) => JSON.parse(String(text)),
      stringify: (value) => JSON.stringify(value),
      pretty: (value) => JSON.stringify(value, null, 2),
    },
  },
  // ── автообновление экрана (view + присваивание) ──────────────────────
  __view: null,
  __rendering: false,
  stateSet: (name, value) => {
    const render = __kz.__view;
    if (typeof render === "function" && !__kz.__rendering) {
      __kz.__rendering = true;
      try {
        render();
      } finally {
        __kz.__rendering = false;
      }
    }
    return value;
  },
  // ── localStorage: сохранение данных между перезагрузками ─────────────
  storageGet: (key, fallback) => {
    try {
      const raw = localStorage.getItem(String(key));
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  storageSet: (key, value) => {
    try {
      localStorage.setItem(String(key), JSON.stringify(value));
    } catch {
      /* приватный режим или server-side вызов — просто ignore */
    }
    return value;
  },
  storageRemove: (key) => {
    try {
      localStorage.removeItem(String(key));
    } catch {
      /* ignore */
    }
  },
  storageClear: () => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  },
  // ── сайты: page / heading / para / button / field / list / link / image / render ──
  siteBuffer: [],
  siteStack: [],
  siteTitle: "",
  sitePage: (title) => {
    __kz.siteTitle = title === undefined || title === null ? "" : String(title);
    __kz.siteBuffer = [];
    __kz.siteStack = [];
  },
  /** Куда добавлять элемент: в текущий контейнер или в корень страницы. */
  sitePush: (item) => {
    const stack = __kz.siteStack;
    const target = stack.length ? stack[stack.length - 1].children : __kz.siteBuffer;
    target.push(item);
    return item;
  },
  /** Открыть контейнер: body, box, row, column, card, section. */
  uiOpen: (kind, className) => {
    const item = __kz.sitePush({
      type: "container",
      kind: String(kind),
      className: className === undefined || className === null ? "" : String(className),
      children: [],
    });
    __kz.siteStack.push(item);
    return item;
  },
  uiClose: () => {
    __kz.siteStack.pop();
  },
  siteHeading: (text, className) => {
    __kz.sitePush({ type: "h1", text: String(text), className: className ? String(className) : "" });
  },
  sitePara: (text, className) => {
    __kz.sitePush({ type: "p", text: String(text), className: className ? String(className) : "" });
  },
  siteButton: (text, handler, className) => {
    __kz.sitePush({ type: "button", text: String(text), handler, className: className ? String(className) : "" });
  },
  siteField: (placeholder, name) => {
    const caption = placeholder === undefined || placeholder === null ? "" : String(placeholder);
    const key = name === undefined || name === null || name === "" ? caption : String(name);
    __kz.sitePush({ type: "field", placeholder: caption, name: key });
  },
  siteList: (items) => {
    __kz.sitePush({ type: "list", items: Array.isArray(items) ? items.slice() : [items] });
  },
  siteSubheading: (text, className) => {
    __kz.sitePush({ type: "h2", text: String(text), className: className ? String(className) : "" });
  },
  siteSmall: (text, className) => {
    __kz.sitePush({ type: "small", text: String(text), className: className ? String(className) : "" });
  },
  siteBadge: (text, className) => {
    __kz.sitePush({ type: "badge", text: String(text), className: className ? String(className) : "" });
  },
  siteQuote: (text, author, className) => {
    __kz.sitePush({
      type: "quote",
      text: String(text),
      author: author === undefined || author === null ? "" : String(author),
      className: className ? String(className) : "",
    });
  },
  siteDivider: () => {
    __kz.sitePush({ type: "divider" });
  },
  siteCode: (code, className) => {
    __kz.sitePush({ type: "code", text: String(code), className: className ? String(className) : "" });
  },
  siteCheckbox: (text, name) => {
    const caption = text === undefined || text === null ? "" : String(text);
    const key = name === undefined || name === null || name === "" ? caption : String(name);
    __kz.sitePush({ type: "checkbox", text: caption, name: key });
  },
  siteChoices: (label, options, name) => {
    const caption = label === undefined || label === null ? "" : String(label);
    __kz.sitePush({
      type: "choices",
      text: caption,
      name: name === undefined || name === null || name === "" ? caption : String(name),
      options: Array.isArray(options) ? options.slice() : [],
    });
  },
  siteLink: (text, href, className) => {
    __kz.sitePush({ type: "link", text: String(text), href: String(href), className: className ? String(className) : "" });
  },
  siteImage: (src, alt) => {
    __kz.sitePush({
      type: "image",
      src: String(src),
      alt: alt === undefined || alt === null ? "" : String(alt),
    });
  },
  /** Значение поля ввода, списка или чекбокса по имени. */
  siteValue: (name) => {
    if (typeof document === "undefined") return "";
    const key = String(name);
    const fields = document.querySelectorAll("input[data-kuza-field], textarea[data-kuza-field], select[data-kuza-field]");
    for (const field of fields) {
      if (field.getAttribute("data-kuza-field") !== key) continue;
      if (field.type === "checkbox") return field.checked;
      return field.value;
    }
    return "";
  },
  siteStyle: () => {
    if (typeof document === "undefined") return;
    if (document.getElementById("kuza-site-style")) return;
    const style = document.createElement("style");
    style.id = "kuza-site-style";
    style.textContent =
      ":root{--kuza-accent:#F26B21;--kuza-text:#F4EFE6;--kuza-muted:#9AA3AB}" +
      "body{margin:0;background:#101417;color:var(--kuza-text);" +
      "font-family:'Space Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.55}" +
      "#kuza-app{max-width:760px;margin:0 auto;padding:56px 24px;display:flex;flex-direction:column;gap:18px;" +
      "align-items:flex-start}" +
      "#kuza-app h1:not([class]){font-size:clamp(30px,5vw,46px);line-height:1.08;letter-spacing:-0.03em;margin:6px 0 0}" +
      "#kuza-app p:not([class]){margin:0;font-size:18px;color:var(--kuza-muted)}" +
      "#kuza-app ul{margin:0;padding-left:22px;font-size:17px;color:var(--kuza-muted)}" +
      "#kuza-app li{margin:4px 0}" +
      "#kuza-app a{color:var(--kuza-accent)}" +
      "#kuza-app img{max-width:100%;border-radius:14px}" +
      "#kuza-app button:not([class]){border:0;border-radius:12px;padding:11px 20px;font-size:16px;font-weight:600;" +
      "font-family:inherit;background:var(--kuza-accent);color:#101417;cursor:pointer}" +
      "#kuza-app button:not([class]):hover{filter:brightness(1.07)}" +
      "#kuza-app .kuza-field{display:flex;flex-direction:column;gap:6px;font-size:15px;color:var(--kuza-muted)}" +
      "#kuza-app .kuza-field input{background:#171D21;border:1px solid #2A333A;border-radius:10px;" +
      "padding:10px 12px;font-size:16px;color:var(--kuza-text);font-family:inherit}" +
      "#kuza-app .kuza-field input:focus{outline:2px solid var(--kuza-accent);outline-offset:1px}" +
      "#kuza-app .kuza-body{display:flex;flex-direction:column;gap:18px;width:100%;align-items:flex-start}" +
      "#kuza-app .kuza-section{display:flex;flex-direction:column;gap:14px;width:100%}" +
      "#kuza-app .kuza-row{display:flex;gap:16px;flex-wrap:wrap;align-items:stretch;width:100%}" +
      "#kuza-app .kuza-column{display:flex;flex-direction:column;gap:12px;width:100%}" +
      "#kuza-app .kuza-box{display:flex;flex-direction:column;gap:10px;width:100%}" +
      "#kuza-app .kuza-card{background:#171D21;border:1px solid #2A333A;border-radius:16px;padding:20px;" +
      "display:flex;flex-direction:column;gap:8px;min-width:200px;flex:1 1 200px}" +
      "#kuza-app .kuza-nav{display:flex;gap:16px;width:100%}" +
      "#kuza-app .kuza-header{display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;" +
      "padding-bottom:16px;border-bottom:1px solid #2A333A}" +
      "#kuza-app .kuza-footer{display:flex;gap:16px;flex-wrap:wrap;width:100%;padding-top:16px;" +
      "border-top:1px solid #2A333A;color:var(--kuza-muted);font-size:15px}" +
      "#kuza-app .kuza-main{display:flex;flex-direction:column;gap:18px;width:100%}" +
      "#kuza-app .kuza-article{display:flex;flex-direction:column;gap:12px;width:100%}" +
      "#kuza-app .kuza-aside{display:flex;flex-direction:column;gap:10px;width:100%;color:var(--kuza-muted)}" +
      "#kuza-app .kuza-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;width:100%}" +
      "#kuza-app .kuza-hero{display:flex;flex-direction:column;gap:14px;width:100%;padding:32px 0;" +
      "border-bottom:1px solid #2A333A}" +
      "#kuza-app .kuza-hero h1:not([class]){font-size:clamp(34px,6vw,58px)}" +
      "#kuza-app .kuza-form{display:flex;flex-direction:column;gap:12px;width:100%}" +
      "#kuza-app .kuza-center{align-items:center;text-align:center}" +
      "#kuza-app h2:not([class]){font-size:clamp(22px,3vw,30px);margin:8px 0 0;letter-spacing:-0.02em}" +
      "#kuza-app small{color:var(--kuza-muted);font-size:14px}" +
      "#kuza-app .kuza-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;" +
      "font-weight:600;background:#F26B21;color:#101417}" +
      "#kuza-app blockquote{margin:0;padding:8px 0 8px 16px;border-left:3px solid var(--kuza-accent);" +
      "color:var(--kuza-text);font-size:17px}" +
      "#kuza-app blockquote cite{display:block;margin-top:6px;color:var(--kuza-muted);font-size:14px;font-style:normal}" +
      "#kuza-app hr{border:0;border-top:1px solid #2A333A;width:100%;margin:4px 0}" +
      "#kuza-app pre{margin:0;padding:14px 16px;border-radius:12px;background:#171D21;border:1px solid #2A333A;" +
      "overflow:auto;width:100%;font-size:14px}" +
      "#kuza-app pre code{font-family:'JetBrains Mono',ui-monospace,Consolas,monospace;color:#C9D4DC}" +
      "#kuza-app .kuza-check{display:flex;flex-direction:row;align-items:center;gap:8px;font-size:15px;color:var(--kuza-text)}" +
      "#kuza-app .kuza-field select,#kuza-app .kuza-field textarea{background:#171D21;border:1px solid #2A333A;" +
      "border-radius:10px;padding:10px 12px;font-size:16px;color:var(--kuza-text);font-family:inherit}";
    document.head.appendChild(style);
  },
  siteNode: (item) => {
    const make = (tag, text) => {
      const element = document.createElement(tag);
      if (text !== undefined && text !== null) element.textContent = String(text);
      return element;
    };
    if (item.type === "container") {
      const tags = {
        body: "div",
        section: "section",
        nav: "nav",
        row: "div",
        column: "div",
        box: "div",
        card: "div",
        header: "header",
        footer: "footer",
        main: "main",
        article: "article",
        aside: "aside",
        grid: "div",
        hero: "section",
        form: "form",
        center: "div",
      };
      const element = make(tags[item.kind] || "div");
      element.className = "kuza-" + item.kind + (item.className ? " " + item.className : "");
      for (const child of item.children) element.appendChild(__kz.siteNode(child));
      return element;
    }
    if (item.type === "h1") {
      const element = make("h1", item.text);
      if (item.className) element.className = item.className;
      return element;
    }
    if (item.type === "p") {
      const element = make("p", item.text);
      if (item.className) element.className = item.className;
      return element;
    }
    if (item.type === "h2") {
      const element = make("h2", item.text);
      if (item.className) element.className = item.className;
      return element;
    }
    if (item.type === "small") {
      const element = make("small", item.text);
      if (item.className) element.className = item.className;
      return element;
    }
    if (item.type === "badge") {
      const element = make("span", item.text);
      element.className = "kuza-badge" + (item.className ? " " + item.className : "");
      return element;
    }
    if (item.type === "quote") {
      const element = make("blockquote");
      element.appendChild(make("span", item.text));
      if (item.author) element.appendChild(make("cite", item.author));
      if (item.className) element.className = item.className;
      return element;
    }
    if (item.type === "divider") return make("hr");
    if (item.type === "code") {
      const wrap = make("pre");
      const code = make("code", item.text);
      wrap.appendChild(code);
      if (item.className) wrap.className = item.className;
      return wrap;
    }
    if (item.type === "checkbox") {
      const wrap = make("label");
      wrap.className = "kuza-check";
      const element = document.createElement("input");
      element.type = "checkbox";
      element.setAttribute("data-kuza-field", item.name);
      wrap.appendChild(element);
      wrap.appendChild(make("span", item.text));
      return wrap;
    }
    if (item.type === "choices") {
      const wrap = make("label");
      wrap.className = "kuza-field";
      wrap.appendChild(make("span", item.text));
      const element = document.createElement("select");
      element.setAttribute("data-kuza-field", item.name);
      for (const option of item.options) {
        const entry = make("option", typeof option === "object" ? option.label : option);
        entry.value = typeof option === "object" ? option.value : String(option);
        element.appendChild(entry);
      }
      wrap.appendChild(element);
      return wrap;
    }
    if (item.type === "button") {
      const element = make("button", item.text);
      element.type = "button";
      if (item.className) element.className = item.className;
      if (typeof item.handler === "function") element.addEventListener("click", item.handler);
      return element;
    }
    if (item.type === "field") {
      const wrap = make("label");
      wrap.className = "kuza-field";
      wrap.appendChild(make("span", item.placeholder));
      const element = document.createElement("input");
      element.type = "text";
      element.placeholder = item.placeholder;
      element.setAttribute("data-kuza-field", item.name);
      wrap.appendChild(element);
      return wrap;
    }
    if (item.type === "list") {
      const wrap = make("ul");
      for (const entry of item.items) wrap.appendChild(make("li", entry));
      return wrap;
    }
    if (item.type === "link") {
      const element = make("a", item.text);
      element.href = item.href;
      if (item.className) element.className = item.className;
      return element;
    }
    if (item.type === "image") {
      const element = document.createElement("img");
      element.src = item.src;
      element.alt = item.alt;
      return element;
    }
    return make("div");
  },
  /** Нарисовать собранную страницу (только браузер). */
  siteRender: () => {
    if (typeof document === "undefined") {
      console.log("[Kuza] Страница собрана — открой её в браузере: kuza build site.kuza --web");
      return;
    }
    if (__kz.siteTitle) document.title = __kz.siteTitle;
    __kz.siteStyle();
    let root = document.getElementById("kuza-app");
    if (!root) {
      root = document.createElement("main");
      root.id = "kuza-app";
      document.body.appendChild(root);
    }
    root.textContent = "";
    __kz.siteStack = [];
    for (const item of __kz.siteBuffer) root.appendChild(__kz.siteNode(item));
  },
  // ── бэкенд: route / respond / param / query / body / listen ──────────
  __serverRoutes: {},
  __serverContext: null,
  __serverCors: "*",
  importModule: (specifier) => {
    if (typeof globalThis.__kzImport === "function") return globalThis.__kzImport(specifier);
    // Динамический import внутри скомпилированного файла.
    return new Function("specifier", "return import(specifier)")(specifier);
  },
  /** use "lodash"; — пакет из node_modules (или адрес, который понимает import). */
  use: async (specifier) => {
    const loaded = await __kz.importModule(specifier);
    // CommonJS-пакеты и пакеты с одним default: отдаём сам объект.
    if (loaded && typeof loaded === "object") {
      const keys = Object.keys(loaded);
      if (keys.length === 1 && keys[0] === "default") return loaded.default;
    }
    return loaded;
  },
  /** insert into users values <1, "Аня">; */
  tableInsert: (table, ...values) => {
    if (!Array.isArray(table) || typeof table.add !== "function") {
      throw new Error("insert работает только с таблицей: :users = table<id, name>;");
    }
    return table.add(...values);
  },
  serverRoute: (method, path, handler) => {
    const key = String(method).toUpperCase() + " " + String(path);
    __kz.__serverRoutes[key] = handler;
    return handler;
  },
  serverParam: (name) => {
    const ctx = __kz.__serverContext;
    if (!ctx || !ctx.params) return "";
    const value = ctx.params[String(name)];
    return value === undefined ? "" : value;
  },
  serverQuery: (name) => {
    const ctx = __kz.__serverContext;
    if (!ctx || !ctx.query) return "";
    const value = ctx.query.get(String(name));
    return value === null ? "" : value;
  },
  serverBody: () => (__kz.__serverContext ? __kz.__serverContext.body : ""),
  serverHeader: (name) => {
    const ctx = __kz.__serverContext;
    if (!ctx || !ctx.req) return "";
    return ctx.req.headers[String(name).toLowerCase()] || "";
  },
  serverMethod: () => (__kz.__serverContext ? __kz.__serverContext.req.method : ""),
  serverPath: () => (__kz.__serverContext ? __kz.__serverContext.req.url : ""),
  serverRespond: (payload, status, headers) => {
    const ctx = __kz.__serverContext;
    if (!ctx) return payload;
    let code = status;
    let extra = headers;
    // Допускаем и respond<200, payload>, и respond<payload, 200>.
    if (typeof payload === "number" && code !== undefined && typeof code !== "number") {
      const swap = payload;
      payload = code;
      code = swap;
      extra = headers;
    }
    ctx.response = {
      status: code === undefined || code === null ? 200 : Number(code),
      payload,
      headers: extra && typeof extra === "object" ? extra : {},
    };
    return payload;
  },
  serverListen: async (port, onReady) => {
    const http = await __kz.importModule("node:http");
    const server = http.createServer(async (req, res) => {
      let raw = "";
      req.setEncoding("utf8");
      for await (const chunk of req) raw += chunk;
      const url = new URL(req.url || "/", "http://localhost");
      const segments = url.pathname.split("/").filter(Boolean);
      let handled = false;
      for (const key of Object.keys(__kz.__serverRoutes)) {
        const separator = key.indexOf(" ");
        const method = key.slice(0, separator);
        const pattern = key.slice(separator + 1);
        if (method !== req.method) continue;
        const parts = pattern.split("/").filter(Boolean);
        if (parts.length !== segments.length) continue;
        const params = {};
        let matched = true;
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].startsWith(":")) params[parts[i].slice(1)] = decodeURIComponent(segments[i]);
          else if (parts[i] !== segments[i]) {
            matched = false;
            break;
          }
        }
        if (!matched) continue;
        let bodyValue;
        if (raw) {
          try {
            bodyValue = JSON.parse(raw);
          } catch {
            bodyValue = raw;
          }
        }
        const previous = __kz.__serverContext;
        __kz.__serverContext = { req, params, query: url.searchParams, body: bodyValue, response: null };
        try {
          const handler = __kz.__serverRoutes[key];
          await handler();
          const response = __kz.__serverContext.response || { status: 200, payload: "", headers: {} };
          const headers = Object.assign({}, response.headers);
          let output = response.payload;
          if (output !== null && typeof output === "object") {
            if (!headers["content-type"]) headers["content-type"] = "application/json; charset=utf-8";
            output = JSON.stringify(output);
          }
          if (!headers["access-control-allow-origin"]) {
            headers["access-control-allow-origin"] = __kz.__serverCors || "*";
          }
          res.writeHead(response.status, headers);
          res.end(output === undefined || output === null ? "" : String(output));
        } catch (error) {
          res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
          res.end("Kuza server error: " + (error && error.message ? error.message : String(error)));
        } finally {
          __kz.__serverContext = previous;
        }
        handled = true;
        break;
      }
      if (!handled) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
      }
    });
    server.listen(Number(port) || 3000, () => {
      if (typeof onReady === "function") onReady();
    });
    return server;
  },
  domValue: (selector, value) => {
    const el = __kz.dom(selector);
    if (value === undefined || value === null) return el.value;
    el.value = String(value);
    return value;
  },
};`;

/** true, если код запускается в Node.js (без типов Node — работает и в браузере). */
export const IS_NODE: boolean = (() => {
  const runtime = globalThis as unknown as { process?: { versions?: { node?: string } } };
  return !!runtime.process?.versions?.node;
})();
