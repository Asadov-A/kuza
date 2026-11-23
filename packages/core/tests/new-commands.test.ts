import { describe, expect, it } from "vitest";
import { run } from "../dist/index.js";

/** Вывод log >> object печатается с отступами — сравниваем без пробелов. */
function compact(value: string): string {
  return value.replace(/\s+/g, "");
}

async function messages(source: string): Promise<string[]> {
  const result = await run(source);
  if (!result.ok && result.error) throw new Error(result.error.message);
  return result.output.map((entry) => entry.message);
}

describe("новые команды коллекций", () => {
  it("reduce сворачивает массив", async () => {
    expect(await messages(":total = reduce >> <[1, 2, 3], (acc, x) -> acc + x, 0>;\nlog >> total;")).toEqual([
      "6",
    ]);
  });

  it("partition делит массив на две группы", async () => {
    const out = await messages(":parts = partition >> <[1, 2, 3, 4], (x) -> x > 2>;\nlog >> parts;");
    expect(compact(out[0] ?? "")).toBe("[[3,4],[1,2]]");
  });

  it("zip, difference и union работают вместе", async () => {
    const out = await messages(
      [
        ':p = zip >> <[1, 2], ["a", "b"]>;',
        "log >> p;",
        "log >> difference >> <[1, 2, 3], [2]>;",
        "log >> union >> <[1, 2], [2, 3]>;",
      ].join("\n"),
    );
    expect(out.map(compact)).toEqual(['[[1,"a"],[2,"b"]]', "[1,3]", "[1,2,3]"]);
  });

  it("уникализация по ключу", async () => {
    const out = await messages(
      [
        ':rows = [{id: 1, mail: "a"}, {id: 2, mail: "a"}, {id: 3, mail: "b"}];',
        ":u = uniqueBy >> <rows, (r) -> r.mail>;",
        "log >> u;",
      ].join("\n"),
    );
    expect(compact(out[0] ?? "")).toBe('[{"id":1,"mail":"a"},{"id":3,"mail":"b"}]');
  });
});

describe("таблицы как основной вид данных", () => {
  it("считает и выбирает строки", async () => {
    const out = await messages(
      [
        ':users = tableFromRows >> <[{id: 1, age: 20}, {id: 2, age: 30}]>;',
        "log >> rowCount >> users;",
        "log >> firstRow >> users;",
        "log >> lastRow >> users;",
      ].join("\n"),
    );
    expect(out[0]).toBe("2");
    expect(compact(out[1] ?? "")).toBe('{"id":1,"age":20}');
    expect(compact(out[2] ?? "")).toBe('{"id":2,"age":30}');
  });

  it("сортирует и объединяет таблицы", async () => {
    const out = await messages(
      [
        ':a = tableFromRows >> <[{id: 1, age: 40}, {id: 2, age: 20}]>;',
        ':b = tableFromRows >> <[{id: 3, age: 30}]>;',
        ':sorted = sortRowsBy >> <a, "age">;',
        ":all = mergeTables >> <sorted, b>;",
        'log >> pluck >> <all, "age">;',
      ].join("\n"),
    );
    expect(out.map(compact)).toEqual(["[20,40,30]"]);
  });

  it("distinctRows убирает повторы по колонке", async () => {
    const out = await messages(
      [
        ':t = tableFromRows >> <[{mail: "a"}, {mail: "a"}, {mail: "b"}]>;',
        ":u = distinctRows >> <t, (r) -> r.mail>;",
        "log >> rowCount >> u;",
      ].join("\n"),
    );
    expect(out).toEqual(["2"]);
  });
});

describe("интеграция с хостом", () => {
  it("emit возвращает полезную нагрузку без браузера", async () => {
    const out = await messages('log >> emit >> <"kuza:test", { x: 1 }>;');
    expect(compact(out[0] ?? "")).toBe('{"x":1}');
  });

  it("hostValue читает globalThis", async () => {
    (globalThis as Record<string, unknown>).__kuzaHostTest = 42;
    expect(await messages('log >> hostValue >> "__kuzaHostTest";')).toEqual(["42"]);
  });

  it("requestHeader вне сервера возвращает пустую строку", async () => {
    const out = await messages(':h = requestHeader >> "x-test";\nlog >> "[" + h + "]";');
    expect(out).toEqual(["[]"]);
  });
});
