import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compile, defineCommand, formatDiagnostic, run } from "../dist/index.js";

const examplesDir = new URL("../examples/", import.meta.url);

function body(source: string): string {
  const result = compile(source, { mode: "body" });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.code;
}

async function messages(source: string): Promise<string[]> {
  const result = await run(source);
  if (!result.ok && result.error) throw new Error(result.error.message);
  return result.output.map((entry) => entry.message);
}

describe("компилятор", () => {
  it("компилирует переменную и вывод", () => {
    const code = body(':name = "Alex";\nlog >> name;');
    expect(code).toBe('let name = "Alex";\nconsole.log(name);');
  });

  it("повторное :x внутри блока становится присваиванием, а не новым let", () => {
    const code = body(":count = 3;\nwhile<count > 0> >> [\n  :count = count - 1;\n]");
    expect(code.match(/let count/g)).toHaveLength(1);
    expect(code).toContain("count = (count - 1);");
  });

  it("вызов функции работает внутри выражения", () => {
    const code = body("func inc<n> >> [\n  return n + 1;\n]\nlog >> inc<2> + inc<3>;");
    expect(code).toContain("inc(2)");
    expect(code).toContain("inc(3)");
  });

  it("вложенные if внутри foreach компилируются оба", () => {
    const code = body(
      "foreach<n : [1, 2]> >> [\n  ?n > 1 >> [\n    log >> \"big\";\n  ] || [\n    log >> \"small\";\n  ]\n]",
    );
    expect(code).toContain("for (const n of [1, 2])");
    expect(code).toContain('if ((n > 1))');
    expect(code).toContain('console.log("big")');
    expect(code).toContain('console.log("small")');
  });

  it("понимает else if через ||", () => {
    const code = body(":n = 5;\n?n > 10 >> [\n  log >> \"a\";\n] || ?n > 3 >> [\n  log >> \"b\";\n] || [\n  log >> \"c\";\n]");
    expect(code).toContain("else if");
    expect(code).toContain("else {");
  });

  it("шаблонные строки и объекты", () => {
    const code = body(':who = "мир";\nlog >> `привет ${who}`;\n:user = { name: "Аня" };');
    expect(code).toContain("`привет ${who}`");
    expect(code).toContain("{ name: \"Аня\" }");
  });

  it("команда в условии сравнивается с результатом, а не с аргументом", () => {
    const code = body(':nums = [1, 2, 3, 4];\n?len >> nums > 3 >> [\n  log >> "да";\n]');
    expect(code).toContain("__kz.len(nums) > 3");
  });

  it("аргумент-команда не съедает арифметику вокруг", () => {
    const code = body('log >> "Сумма: " + sum >> [1, 2];');
    expect(code).toContain('"Сумма: " + __kz.sum([1, 2])');
  });

  it("комментарии не попадают в JavaScript", () => {
    const code = body("## комментарий\n// ещё один\nlog >> 1;");
    expect(code).not.toContain("комментарий");
    expect(code).toBe("console.log(1);");
  });
});

describe("ошибки", () => {
  it("сообщает строку и столбец неизвестной команды", () => {
    const result = compile(':x = 5;\n:y = lenn >> items;');
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.line).toBe(2);
    expect(result.errors[0]!.column).toBe(6);
    expect(result.errors[0]!.message).toContain("Неизвестная команда");
  });

  it("подсказывает похожее имя", () => {
    const result = compile("log >> lenn >> items;");
    expect(result.errors[0]!.hint).toContain("len");
  });

  it("проверяет число аргументов", () => {
    const result = compile("log >> <1, 2>;");
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.message).toContain("2 аргумента");
  });

  it("ловит незакрытый блок", () => {
    const result = compile("?true >> [\n  log >> 1;\n");
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.message).toContain("Не закрыт блок");
  });

  it("ловит опечатку в объявлении переменной", () => {
    const result = compile("let x = 5;");
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.hint).toContain(":");
  });

  it("возвращает пустой код при ошибке", () => {
    const result = compile("func <> [ ]");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("");
  });
});

describe("выполнение программ", () => {
  it("считает обратный отсчёт", async () => {
    expect(
      await messages(":n = 3;\nwhile<n > 0> >> [\n  log >> n;\n  :n = n - 1;\n]"),
    ).toEqual(["3", "2", "1"]);
  });

  it("считает сумму в for", async () => {
    expect(
      await messages(":total = 0;\nfor<:i = 1; i <= 10; i++> >> [\n  :total = total + i;\n]\nlog >> total;"),
    ).toEqual(["55"]);
  });

  it("рекурсия работает", async () => {
    expect(
      await messages(
        "func f<n> >> [\n  ?n <= 1 >> [\n    return 1;\n  ]\n  return n * f<n - 1>;\n]\nlog >> f<6>;",
      ),
    ).toEqual(["720"]);
  });

  it("вложенные условия в цикле выполняются", async () => {
    const output = await messages(
      'foreach<n : [1, 20]> >> [\n  ?n > 10 >> [\n    log >> "большое";\n  ] || [\n    log >> "маленькое";\n  ]\n]',
    );
    expect(output).toEqual(["маленькое", "большое"]);
  });

  it("встроенные команды работают", async () => {
    expect(
      await messages('log >> upper >> "kuza";\nlog >> len >> <"abcd">;\nlog >> max >> <3, 9, 4>;'),
    ).toEqual(["KUZA", "4", "9"]);
  });

  it("try/catch ловит ошибку", async () => {
    const output = await messages(
      'try >> [\n  throw >> "бум";\n]\ncatch<e> >> [\n  log >> "поймали: " + e.message;\n]',
    );
    expect(output).toEqual(["поймали: бум"]);
  });

  it("логические операторы and/or/not работают", async () => {
    expect(
      await messages('?1 < 2 and not false >> [\n  log >> "да";\n] || [\n  log >> "нет";\n]'),
    ).toEqual(["да"]);
  });

  it("ошибка выполнения попадает в вывод", async () => {
    const result = await run('assert >> <false, "не прошло">;');
    expect(result.ok).toBe(false);
    expect(result.output.at(-1)!.message).toContain("не прошло");
  });
});

describe("шаг A: удобства языка", () => {
  it("подстановка в строке", async () => {
    expect(await messages(':name = "Асад";\nlog >> "Привет, {name}!";')).toEqual(["Привет, Асад!"]);
  });

  it("выражение внутри подстановки", async () => {
    expect(await messages(':age = 17;\nlog >> "В следующем году {age + 1}";')).toEqual([
      "В следующем году 18",
    ]);
  });

  it("двойные скобки дают обычные скобки в строке", async () => {
    expect(await messages('log >> "текст {{тут}} ok";')).toEqual(["текст {тут} ok"]);
  });

  it("диапазон в for", async () => {
    expect(await messages("for<:i = 1..3> >> [\n  log >> i;\n]")).toEqual(["1", "2", "3"]);
  });

  it("срез массива включительно", async () => {
    expect(
      await messages(':items = [10, 20, 30, 40, 50];\nlog >> join >> <items[1..3], ", ">;'),
    ).toEqual(["20, 30, 40"]);
  });

  it("лямбда и filter", async () => {
    expect(
      await messages(':nums = [1, 2, 3, 4];\nlog >> join >> <filter >> <nums, (x) -> x > 2>, ", ">;'),
    ).toEqual(["3, 4"]);
  });

  it("цепочка с map и join", async () => {
    expect(await messages(':nums = [1, 2, 3];\nlog >> nums |> map<(x) -> x * x> |> join<", ">;')).toEqual([
      "1, 4, 9",
    ]);
  });

  it("значения по умолчанию у функции", async () => {
    expect(
      await messages(
        'func greet<who = "друг"> >> [\n  return "Привет, {who}!";\n]\nlog >> greet<>;\nlog >> greet<"Аня">;',
      ),
    ).toEqual(["Привет, друг!", "Привет, Аня!"]);
  });

  it("деструктуризация массива и объекта", async () => {
    expect(
      await messages(':[a, b] = [1, 2];\n:{name} = { name: "Аня" };\nlog >> a + b;\nlog >> name;'),
    ).toEqual(["3", "Аня"]);
  });

  it("if с простой переменной в условии", async () => {
    expect(
      await messages(':ready = true;\n?ready >> [\n  log >> "готов";\n] || [\n  log >> "нет";\n]'),
    ).toEqual(["готов"]);
  });

  it("not с переменной", async () => {
    expect(
      await messages(':ready = false;\n?not ready >> [\n  log >> "не готов";\n]'),
    ).toEqual(["не готов"]);
  });

  it("модуль math", async () => {
    expect(await messages("use math;\nlog >> math.sqrt<16>;")).toEqual(["4"]);
  });

  it("свой файл подключается через use", () => {
    const result = compile('use "./helpers.kuza";\nlog >> hello<"мир">;', {
      mode: "body",
      resolveModule: () => 'func hello<name> >> [\n  return "привет, " + name;\n]',
    });
    expect(result.ok).toBe(true);
    expect(result.code).toContain("function hello(name)");
    expect(result.code).toContain("hello(\"мир\")");
  });

  it("ошибка показывает готовое исправление", () => {
    const source = ":n = lenn >> items;";
    const result = compile(source, { mode: "body" });
    const text = formatDiagnostic(result.errors[0]!, source);
    expect(text).toContain("Исправление:");
    expect(text).toContain("len >> items");
  });
});

describe("шаг B: таблицы", () => {
  const sample = [
    ":users = table<id, name, age>;",
    'users.add<1, "Аня", 17>;',
    'users.add<2, "Боря", 22>;',
    'users.add<3, "Вера", 30>;',
  ].join("\n");

  it("создаёт таблицу и добавляет строки", async () => {
    expect(await messages(`${sample}\nlog >> len >> users;`)).toEqual(["3"]);
  });

  it("компилирует select в запрос с условием и сортировкой", () => {
    const code = body(`${sample}\n:adults = select name from users where age >= 18 order by age desc;`);
    expect(code).toContain("__kz.select(users");
    expect(code).toContain("const age = __r.age;");
    expect(code).toContain("desc: true");
  });

  it("select фильтрует и сортирует", async () => {
    expect(
      await messages(
        `${sample}\n:adults = select name from users where age >= 18 order by age desc;\nlog >> adults |> map<(u) -> u.name> |> join<", ">;`,
      ),
    ).toEqual(["Вера, Боря"]);
  });

  it("select * сохраняет все колонки", async () => {
    expect(
      await messages(`${sample}\n:young = select * from users where age < 18;\nlog >> young[0].name;`),
    ).toEqual(["Аня"]);
  });

  it("limit ограничивает результат", async () => {
    expect(
      await messages(`${sample}\nlog >> len >> select * from users order by age desc limit 2;`),
    ).toEqual(["2"]);
  });

  it("update меняет подходящие строки и видит колонки", async () => {
    expect(
      await messages(`${sample}\nupdate users set age = age + 1 where id = 1;\nlog >> users[0].age;`),
    ).toEqual(["18"]);
  });

  it("delete удаляет подходящие строки", async () => {
    expect(await messages(`${sample}\ndelete from users where age < 18;\nlog >> len >> users;`)).toEqual([
      "2",
    ]);
  });

  it("add принимает объект", async () => {
    expect(
      await messages(':u = table<name, city>;\nu.add<{ name: "Аня", city: "Москва" }>;\nlog >> u[0].city;'),
    ).toEqual(["Москва"]);
  });

  it("метод where фильтрует таблицу", async () => {
    expect(await messages(`${sample}\nlog >> len >> users.where<(u) -> u.age > 18>;`)).toEqual(["2"]);
  });

  it("сохраняет и загружает таблицу из файла", async () => {
    const path = join(tmpdir(), `kuza-table-${Date.now()}.json`);
    const source = [
      sample,
      `tableSave >> <users, ${JSON.stringify(path)}>;`,
      `:back = tableLoad >> ${JSON.stringify(path)};`,
      'log >> back[0].name + "/" + len >> back;',
    ].join("\n");
    expect(await messages(source)).toEqual(["Аня/3"]);
  });

  it("объясняет, что в select забыли from", () => {
    const result = compile("select name users;");
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.message).toContain("from");
  });
});

describe("шаг C: сайты", () => {
  it("страница собирается из команд и рисуется", async () => {
    const source = [
      'page >> "Мой сайт";',
      'heading >> "Привет";',
      'para >> "Абзац";',
      'list >> ["раз", "два"];',
      'func onClick<> >> [ log >> "ok"; ];',
      'button >> <"Жми", onClick>;',
      'field >> <"Имя", "name">;',
      'link >> <"Сайт", "https://example.com">;',
      'image >> <"logo.png", "Логотип">;',
      "render;",
    ].join("\n");

    const compiled = compile(source);
    expect(compiled.errors).toEqual([]);
    expect(compiled.code).toContain("__kz.siteRender()");

    const result = await run(source);
    expect(result.error).toBeUndefined();
    expect(result.output.map((entry) => entry.message).join(" ")).toContain("Страница собрана");
  });

  it("render не требует ни скобок, ни аргументов", () => {
    expect(body("render;")).toBe("__kz.siteRender();");
  });

  it("page сбрасывает содержимое страницы", () => {
    const code = body('page >> "A"; heading >> "1"; page >> "B"; para >> "2";');
    expect(code.match(/sitePage/g)).toHaveLength(2);
  });

  it("fieldValue вне браузера возвращает пустую строку", async () => {
    expect(await messages('log >> fieldValue >> "name";')).toEqual([""]);
  });

  it("button без обработчика — просто кнопка", () => {
    const code = body('page >> "t"; button >> <"Жми">;');
    expect(code).toContain('__kz.siteButton("Жми")');
  });

  it("вложенные блоки превращаются в контейнеры", () => {
    const code = body('body >> [ heading >> "x"; box >> [ para >> "y"; ]; ];');
    expect(code.match(/uiOpen/g)).toHaveLength(2);
    expect(code.match(/uiClose/g)).toHaveLength(2);
  });

  it("контейнер можно открыть внутри компонента", () => {
    const code = body("func Card<t> >> [ card >> [ heading >> t; ]; ];");
    expect(code).toContain('__kz.uiOpen("card")');
  });

  it("row и column вкладываются друг в друга", () => {
    const code = body('row >> [ column >> [ para >> "a"; ]; ];');
    expect(code).toContain('__kz.uiOpen("row")');
    expect(code).toContain('__kz.uiOpen("column")');
    expect(code.indexOf('uiOpen("column")')).toBeGreaterThan(code.indexOf('uiOpen("row")'));
  });

  it("блок без [ — понятная ошибка", () => {
    const result = compile('body >> "нет";');
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.message).toContain("блок");
  });
});

describe("шаг D: экран, данные и сервер", () => {
  it("view регистрируется и запускается один раз", () => {
    const code = compile(
      [':count = 0;', 'view App<> >> [ heading >> "Count: {count}"; render; ];'].join("\n"),
    ).code;
    expect(code).toContain("__kz.__view = App");
    expect(code).toContain("App();");
  });

  it("присваивание переменной экрана вызывает перерисовку", async () => {
    const result = await run(
      [
        ":count = 0;",
        'view App<> >> [ heading >> "Count: {count}"; render; ];',
        "count = count + 1;",
      ].join("\n"),
    );
    expect(result.error).toBeUndefined();
    expect(result.output.filter((entry) => entry.message.includes("Страница собрана"))).toHaveLength(2);
  });

  it("контейнер принимает Tailwind-классы", () => {
    expect(body('body<"p-4 flex"> >> [ para >> "x"; ];')).toContain(
      '__kz.uiOpen("body", "p-4 flex")',
    );
  });

  it("команды хранилища компилируются", () => {
    const code = body(
      ['storeSet >> <"name", "Kuza">;', ':name = storeGet >> <"name", "мир">;', "storeClear;"].join(
        "\n",
      ),
    );
    expect(code).toContain('__kz.storageSet("name", "Kuza")');
    expect(code).toContain('__kz.storageGet("name", "мир")');
    expect(code).toContain("__kz.storageClear()");
  });

  it("плагин может добавить свою команду", () => {
    defineCommand({
      id: "__testShout",
      name: "__testShout",
      aliases: [],
      category: "output",
      args: "single",
      params: ["text"],
      description: "тестовая команда плагина",
      example: '__testShout >> "x";',
      codegen: "__kz.testShout({0})",
    });
    expect(body('__testShout >> "hi";')).toContain('__kz.testShout("hi")');
  });

  it("серверные команды компилируются", () => {
    const code = body(
      [
        'route >> <"GET", "/users/:id", show>;',
        'respond >> <{ ok: true }, 200>;',
        ':id = param >> "id";',
        "listen >> 3000;",
      ].join("\n"),
    );
    expect(code).toContain('__kz.serverRoute("GET", "/users/:id", show)');
    expect(code).toContain('__kz.serverRespond({ ok: true }, 200)');
    expect(code).toContain("__kz.serverListen(3000)");
  });
});

describe("примеры", () => {
  const files = readdirSync(examplesDir).filter((name) => name.endsWith(".kuza"));

  it("примеры существуют", () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  for (const file of files) {
    it(`examples/${file} компилируется и выполняется`, async () => {
      const source = readFileSync(new URL(file, examplesDir), "utf8");
      const compiled = compile(source);
      expect(compiled.errors).toEqual([]);
      const result = await run(source);
      expect(result.error).toBeUndefined();
      expect(result.output.length).toBeGreaterThan(0);
    });
  }
});

describe("шаг E: лямбды и работа с данными", () => {
  it("параметр лямбды с именем команды остаётся переменной", async () => {
    const out = await messages(
      ':rows = [{n: 1}, {n: 5}];\nlog >> whereRows >> <rows, (row) -> row.n > 2>;',
    );
    expect(out.join("\n")).toContain("5");
    expect(out.join("\n")).not.toContain("\"n\": 1");
  });

  it("обращение к полю не превращается в тег", () => {
    const code = body(':user = {name: "A"};\nlog >> user.name;');
    expect(code).toContain("user.name");
    expect(code).not.toContain("uiOpen");
  });

  it("новые команды таблиц считают значения", async () => {
    const out = await messages(
      ':rows = [{n: 1, g: "a"}, {n: 5, g: "a"}, {n: 10, g: "b"}];\n' +
        "log >> sumBy >> <rows, \"n\">;\n" +
        "log >> pluck >> <rows, \"n\">;\n" +
        "log >> countBy >> <rows, \"g\">;",
    );
    expect(out[0]).toContain("16");
    expect(out[1]).toContain("[");
    expect(out[2]).toContain("\"a\": 2");
  });

  it("chunk и take не меняют исходный массив", async () => {
    const out = await messages("log >> chunk >> <[1, 2, 3, 4, 5], 2>;\nlog >> take >> <[1, 2, 3], 2>;");
    expect(out[0].replace(/\s/g, "")).toContain("[1,2],[3,4],[5]");
    expect(out[1].replace(/\s/g, "")).toContain("[1,2]");
  });
});

describe("шаг F: таблицы, npm-пакеты и модули", () => {
  it("insert into добавляет строки по порядку колонок и объектом", async () => {
    const out = await messages(
      ':users = table<id, name>;\n' +
        'insert into users values <1, "Аня">;\n' +
        'insert into users <{ id: 2, name: "Боб" }>;\n' +
        "log >> len >> users;\n" +
        "log >> users[1].name;",
    );
    expect(out[0]).toBe("2");
    expect(out[1]).toBe("Боб");
  });

  it("команда в форме field<...> — это команда, а не вызов функции", () => {
    const code = body('field<"Имя", "name">;\nlink<"Документация", "/docs">;');
    expect(code).toContain('__kz.siteField("Имя", "name")');
    expect(code).toContain('__kz.siteLink("Документация", "/docs")');
  });

  it("use \"пакет\" компилируется в динамический импорт", () => {
    const code = body('use "lodash";\nlog >> lodash.chunk<[1, 2], 1>;');
    expect(code).toContain('const lodash = await __kz.use("lodash")');
    expect(code).toContain("lodash.chunk([1, 2], 1)");
  });

  it("режим module экспортирует функции для React/Vue/Svelte", () => {
    const result = compile("func total<items> >> [\n  return sum >> items;\n]", { mode: "module" });
    expect(result.errors).toEqual([]);
    expect(result.code).toContain("export function total(items)");
  });

  it("новые теги страницы компилируются в вызовы рантайма", () => {
    const code = body(
      'page >> "Сайт";\n' +
        'header >> [ badge >> "beta"; ];\n' +
        'hero >> [ subheading >> "Заголовок"; divider; ];\n' +
        'choices<"План", ["Free", "Pro"], "plan">;',
    );
    expect(code).toContain('__kz.uiOpen("header")');
    expect(code).toContain('__kz.uiOpen("hero")');
    expect(code).toContain("__kz.siteBadge");
    expect(code).toContain("__kz.siteSubheading");
    expect(code).toContain("__kz.siteDivider()");
    expect(code).toContain("__kz.siteChoices");
  });
});
