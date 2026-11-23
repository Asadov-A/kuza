# Команды Kuza

> Файл сгенерирован из `packages/core/commands.json`. Хочешь новую команду — добавь запись туда и запусти `npm run generate`.

Версия: 0.5.7. Расширение файлов: `.kuza`. маленький язык, который компилируется в JavaScript.

Всего команд: **186**.

## Синтаксис

| Конструкция | Что делает |
| --- | --- |
| `:name = value;` | Объявить переменную. Внутри функции/цикла повторное ":name = ..." для уже существующей переменной становится присваиванием. |
| `func name<a, b> >> [ ... ]` | Объявить функцию с параметрами. |
| `?cond >> [ ... ] || ?cond2 >> [ ... ] || [ ... ]` | Условие: "?" — это if, "||" — это else if / else. |
| `while<cond> >> [ ... ]` | Цикл, который повторяется, пока условие истинно. |
| `for<init; cond; step> >> [ ... ]` | Цикл со счётчиком. |
| `foreach<item : array> >> [ ... ]` | Перебрать все элементы массива. |
| `try >> [ ... ] catch<e> >> [ ... ]` | Поймать ошибку и обработать её. |
| `:users = table<id, name, age>;` | Создать таблицу с колонками — основной способ хранить данные. Строки добавляются через insert into или users.add<...>, сохраняются через tableSave и читаются через tableLoad (JSON). |
| `select колонки from таблица where условие order by колонка desc limit N` | Запрос к таблице: выбрать колонки, отфильтровать, отсортировать и ограничить. Колонки читаются как переменные. |
| `update таблица set колонка = значение where условие;` | Изменить строки таблицы, подходящие под условие. В значении можно использовать колонки: age = age + 1. |
| `delete from таблица where условие;` | Удалить строки таблицы, подходящие под условие. |
| `view Name<> >> [ ... ]` | реактивный экран Kuza: вызывается один раз и при каждом изменении своих переменных |
| `insert into users values <1, "Аня", 30>;` | Добавить строку в таблицу. Значения идут по порядку колонок table<...>; можно передать и объект: insert into users <{ id: 1, name: "Аня" }>. |
| `use "lodash";
use math;
use "./helpers.kuza";` | Подключить модуль: встроенный (math, time, random, text, json), свой файл (путь в кавычках) или пакет из npm (имя в кавычках). Пакеты загружаются через import, поэтому в браузере нужен import map или сборщик. |

### Пример программы

```kuza
:name = "Kuza";
log >> `Привет, ${name}!`;

func add<a, b> >> [
  return a + b;
]

?add<2, 3> > 4 >> [
  log >> "больше четырёх";
] || [
  log >> "мало";
]
```

## Ключевые слова

| Ключевое слово | Что делает |
| --- | --- |
| `func` | Объявить функцию |
| `while` | Цикл «пока условие верно» |
| `for` | Цикл со счётчиком |
| `foreach` | Перебор массива |
| `try` | Попробовать выполнить блок |
| `catch` | Поймать ошибку из try |
| `return` | Вернуть значение из функции |
| `break` | Выйти из цикла |
| `continue` | Перейти к следующей итерации |
| `throw` | Выбросить ошибку |
| `and` | Логическое И |
| `or` | Логическое ИЛИ |
| `not` | Логическое НЕ |
| `true` | Логическая истина |
| `false` | Логическая ложь |
| `null` | Пустое значение |
| `select` | Запрос к таблице: колонки, where, order by, limit |
| `update` | Изменить строки таблицы |
| `delete` | Удалить строки таблицы |
| `view` | экран: функция, которая рисует страницу и обновляется при изменении переменных |

## Команды по категориям

### Вывод

| Команда | Что делает | Пример |
| --- | --- | --- |
| `log` (print, logln) | Вывести значение в консоль | `log >> "Привет, мир!";` |
| `warn` (warning) | Вывести предупреждение (жёлтым) | `warn >> "Осторожно!";` |
| `err` (logError) | Вывести ошибку (красным) | `err >> "Что-то пошло не так";` |
| `alert` (notify) | Показать всплывающее окно (в браузере) или строку в консоли (в Node) | `alert >> "Готово!";` |
| `clear` (cls) | Очистить консоль | `clear;` |
| `table` | Вывести массив или объект таблицей | `table >> users;` |

### Типы и переменные

| Команда | Что делает | Пример |
| --- | --- | --- |
| `typeof` (type) | Тип значения: number, string, object, boolean... | `:t = typeof >> 42;` |
| `int` (toInt) | Превратить в целое число | `:n = int >> "42";` |
| `float` (toFloat) | Превратить в число с дробной частью | `:x = float >> "3.14";` |
| `str` (toStr) | Превратить в строку | `:s = str >> 42;` |
| `bool` (toBool) | Превратить в true/false | `:ok = bool >> 1;` |
| `isNum` (isNumber) | Проверить, что это число | `?isNum >> x >> [ log >> "число"; ]` |
| `isStr` (isString) | Проверить, что это строка | `?isStr >> x >> [ log >> "строка"; ]` |
| `isArr` (isArray) | Проверить, что это массив | `?isArr >> items >> [ log >> "массив"; ]` |
| `isObj` (isObject) | Проверить, что это объект | `?isObj >> user >> [ log >> "объект"; ]` |

### Математика

| Команда | Что делает | Пример |
| --- | --- | --- |
| `abs` | Модуль числа (без знака) | `:n = abs >> -5;` |
| `max` | Самое большое из чисел | `:m = max >> <42, 17>;` |
| `min` | Самое маленькое из чисел | `:m = min >> <42, 17>;` |
| `round` | Округлить до ближайшего целого | `:n = round >> 3.6;` |
| `floor` | Округлить вниз | `:n = floor >> 3.9;` |
| `ceil` | Округлить вверх | `:n = ceil >> 3.1;` |
| `sqrt` | Квадратный корень | `:n = sqrt >> 16;` |
| `pow` | Возвести число в степень | `:n = pow >> <2, 10>;` |
| `rand` (random) | Случайное целое от 0 до max-1 | `:n = rand >> 100;` |
| `randRange` (randBetween) | Случайное целое от from до to включительно | `:n = randRange >> <1, 6>;` |
| `randPick` (pick) | Случайный элемент массива | `:who = randPick >> ["Аня", "Боря", "Вера"];` |
| `sum` | Сумма чисел массива | `:total = sum >> [1, 2, 3];` |
| `avg` (average, mean) | Среднее арифметическое массива | `:m = avg >> [1, 2, 3, 4];` |
| `clamp` | Ограничить число диапазоном | `:n = clamp >> <150, 0, 100>;` |
| `sign` | Знак числа: -1, 0 или 1 | `:s = sign >> -5;` |

### Строки

| Команда | Что делает | Пример |
| --- | --- | --- |
| `upper` (uppercase, toUpper) | Перевести строку в ВЕРХНИЙ регистр | `:s = upper >> "привет";` |
| `lower` (lowercase, toLower) | Перевести строку в нижний регистр | `:s = lower >> "ПРИВЕТ";` |
| `trim` | Убрать пробелы по краям | `:s = trim >> "  hi  ";` |
| `len` (length, size) | Длина строки, массива или число ключей объекта | `:n = len >> "привет";` |
| `split` | Разбить строку на массив по разделителю | `:parts = split >> <"a,b,c", ",">;` |
| `join` | Склеить массив в строку через разделитель | `:s = join >> <["a", "b"], " \| ">;` |
| `replace` (replaceAll) | Заменить все вхождения подстроки | `:s = replace >> <"a-b-c", "-", "+">;` |
| `contains` (includes, has) | Проверить, есть ли подстрока или элемент | `?contains >> <greeting, "привет"> >> [ log >> "есть"; ]` |
| `startsWith` (beginsWith) | Начинается ли строка с подстроки | `?startsWith >> <url, "https"> >> [ log >> "https"; ]` |
| `endsWith` | Заканчивается ли строка подстрокой | `?endsWith >> <file, ".kuza"> >> [ log >> "наш файл"; ]` |
| `indexOf` (findIndex) | Позиция подстроки или элемента, -1 если нет | `:i = indexOf >> <items, 42>;` |
| `slice` (substr) | Взять часть строки или массива | `:s = slice >> <"Kuza язык", 0, 4>;` |
| `repeat` | Повторить строку несколько раз | `:line = repeat >> <"-", 20>;` |
| `charAt` (char) | Символ по номеру позиции | `:c = charAt >> <"Kuza", 0>;` |
| `padLeft` (padStart) | Дополнить строку слева до нужной длины | `:s = padLeft >> <"7", 3, "0">;` |
| `padRight` (padEnd) | Дополнить строку справа до нужной длины | `:s = padRight >> <"7", 3, ".">;` |
| `words` | Разбить строку на слова по пробелам | `:w = words >> "я учу kuza";` |
| `capitalize` | Сделать первую букву заглавной | `:s = capitalize >> "kuza";` |

### Массивы

| Команда | Что делает | Пример |
| --- | --- | --- |
| `push` (add) | Добавить элемент в конец массива | `push >> <items, 42>;` |
| `pop` | Забрать последний элемент массива | `:last = pop >> items;` |
| `shift` | Забрать первый элемент массива | `:first = shift >> items;` |
| `unshift` | Добавить элемент в начало массива | `unshift >> <items, 0>;` |
| `filter` (where) | Оставить элементы, для которых проверка вернула true | `:adults = filter >> <users, (u) -> u.age >= 18>;` |
| `map` (transform) | Превратить каждый элемент массива через функцию | `:squares = map >> <items, (x) -> x * x>;` |
| `find` (firstMatch) | Найти первый элемент, подходящий под проверку | `:adult = find >> <users, (u) -> u.age >= 18>;` |
| `each` (forEach) | Выполнить действие для каждого элемента | `each >> <items, (x) -> log >> x>;` |
| `sort` (sorted) | Отсортировать массив (возвращает копию) | `:sorted = sort >> [3, 1, 2];` |
| `reverse` (reversed) | Перевернуть массив или строку (возвращает копию) | `:r = reverse >> [1, 2, 3];` |
| `unique` (uniq) | Убрать повторяющиеся элементы | `:u = unique >> [1, 1, 2, 3, 3];` |
| `removeAt` | Удалить элемент по позиции (возвращает копию) | `:r = removeAt >> <items, 0>;` |
| `count` | Сколько раз значение встречается в массиве | `:n = count >> <[1, 2, 1], 1>;` |
| `flatten` (flat) | Склеить вложенные массивы на один уровень | `:f = flatten >> [[1, 2], [3]];` |
| `last` (tail) | Последний элемент массива | `:x = last >> [1, 2, 3];` |
| `take` (first) | Первые n элементов (копия) | `:top3 = take >> <items, 3>;` |
| `drop` (skip) | Массив без первых n элементов (копия) | `:rest = drop >> <items, 2>;` |
| `chunk` (chunks) | Разбить массив на группы по size элементов | `:pages = chunk >> <items, 10>;` |
| `sumOf` (totalOf) | Сумма значений, которые возвращает функция | `:total = sumOf >> <items, (x) -> x.price>;` |
| `reduce` (fold) | Свернуть массив в одно значение: (acc, item) -> acc | `:total = reduce >> <items, (acc, x) -> acc + x, 0>;` |
| `flatMap` | Преобразовать каждый элемент и слить результаты в один массив | `:tags = flatMap >> <posts, (p) -> p.tags>;` |
| `partition` | Разделить массив на [подходящие, остальные] | `:groups = partition >> <users, (u) -> u.active>;` |
| `zip` | Объединить два массива в пары по индексу | `:pairs = zip >> <names, ages>;` |
| `uniqueBy` | Убрать дубликаты по результату функции | `:once = uniqueBy >> <users, (u) -> u.email>;` |
| `union` | Объединение двух массивов без дубликатов | `:all = union >> <a, b>;` |
| `intersect` | Пересечение двух массивов | `:both = intersect >> <a, b>;` |
| `difference` | Элементы первого массива, которых нет во втором | `:onlyA = difference >> <a, b>;` |

### Объекты и JSON

| Команда | Что делает | Пример |
| --- | --- | --- |
| `keys` | Список ключей объекта | `:k = keys >> user;` |
| `values` | Список значений объекта | `:v = values >> user;` |
| `hasKey` (hasOwn) | Есть ли такой ключ в объекте | `?hasKey >> <user, "name"> >> [ log >> user.name; ]` |
| `merge` (assign) | Склеить два объекта в новый | `:all = merge >> <base, extra>;` |
| `jsonParse` (fromJson) | Строка JSON → объект | `:user = jsonParse >> "{\"name\":\"Аня\"}";` |
| `jsonStringify` (toJson) | Объект → красивая строка JSON | `:text = jsonStringify >> user;` |

### Время и ожидание

| Команда | Что делает | Пример |
| --- | --- | --- |
| `now` (timestamp) | Текущее время в миллисекундах | `:t = now;` |
| `today` | Сегодняшняя дата в формате 2026-11-21 | `log >> today;` |
| `date` (formatDate) | Дата в местном формате | `:d = date;` |
| `year` | Текущий год | `log >> year;` |
| `month` | Текущий месяц (1-12) | `log >> month;` |
| `day` | Текущий день месяца | `log >> day;` |
| `wait` (sleep) | Подождать указанное число миллисекунд | `wait >> 1000;` |

### Ввод

| Команда | Что делает | Пример |
| --- | --- | --- |
| `prompt` (ask, input) | Спросить у пользователя текст | `:name = prompt >> "Как тебя зовут?";` |
| `confirm` (yesno) | Спросить да/нет | `:ok = confirm >> "Продолжить?";` |

### Файлы (Node.js)

| Команда | Что делает | Пример |
| --- | --- | --- |
| `readFile` (read) | Прочитать текстовый файл (только Node.js) | `:text = readFile >> "data.txt";` |
| `writeFile` (write) | Записать текст в файл, перезаписав его (только Node.js) | `writeFile >> <"out.txt", "привет">;` |
| `appendFile` (append) | Дописать текст в конец файла (только Node.js) | `appendFile >> <"log.txt", "ещё строка">;` |
| `exists` (fileExists) | Существует ли файл или папка (только Node.js) | `?exists >> "data.txt" >> [ log >> readFile >> "data.txt"; ]` |
| `listDir` (ls) | Список файлов в папке (только Node.js) | `log >> listDir >> ".";` |
| `removeFile` (deleteFile) | Удалить файл (только Node.js, осторожно!) | `removeFile >> "temp.txt";` |

### HTTP-запросы

| Команда | Что делает | Пример |
| --- | --- | --- |
| `httpGet` (get) | GET-запрос, вернуть текст ответа | `:html = httpGet >> "https://example.com";` |
| `httpJson` (getJson) | GET-запрос, вернуть разобранный JSON | `:data = httpJson >> "https://api.github.com";` |
| `httpPost` (post) | POST-запрос с телом, вернуть текст ответа | `:res = httpPost >> <url, jsonStringify >> payload>;` |

### DOM (браузер)

| Команда | Что делает | Пример |
| --- | --- | --- |
| `domGet` | Найти элемент по CSS-селектору (браузер) | `:title = domGet >> "h1";` |
| `domText` (text) | Поставить текст элемента (браузер) | `domText >> <"h1", "Привет!">;` |
| `domHtml` (html) | Поставить HTML внутрь элемента (браузер) | `domHtml >> <"#app", "<b>Привет</b>">;` |
| `domStyle` (css) | Изменить CSS-свойство элемента (браузер) | `domStyle >> <"h1", "color", "tomato">;` |
| `domOn` (on) | Подписаться на событие элемента (браузер) | `domOn >> <"#btn", "click", onClick>;` |
| `domAdd` (domAppend) | Добавить HTML в конец элемента (браузер) | `domAdd >> <"#list", "<li>новый</li>">;` |
| `domValue` (value) | Прочитать или записать value поля ввода (браузер) | `:text = domValue >> <"#name", null>;` |

### Утилиты

| Команда | Что делает | Пример |
| --- | --- | --- |
| `error` (newError) | Создать объект ошибки | `:e = error >> "сообщение";` |
| `assert` (expect) | Упасть с ошибкой, если условие ложно | `assert >> <age >= 18, "нужно 18+">;` |
| `uuid` (id) | Случайный уникальный идентификатор | `:id = uuid;` |
| `clone` (copy, deepCopy) | Глубокая копия массива или объекта | `:copy = clone >> items;` |
| `env` (getEnv) | Прочитать переменную окружения (Node.js) | `:key = env >> "KUZA_API_KEY";` |
| `args` (cliArgs) | Аргументы командной строки | `log >> args;` |

### Таблицы

| Команда | Что делает | Пример |
| --- | --- | --- |
| `tableFrom` (fromRows, rowsToTable) | Превратить массив объектов в таблицу | `:users = tableFrom >> data;` |
| `tableSave` (saveTable) | Сохранить таблицу в JSON-файл (только Node.js) | `tableSave >> <users, "users.json">;` |
| `tableLoad` (loadTable) | Загрузить таблицу из JSON-файла (только Node.js) | `:users = tableLoad >> "users.json";` |
| `whereRows` (filterRows) | Строки таблицы, подходящие под условие | `:adults = whereRows >> <users, (row) -> row.age >= 18>;` |
| `orderBy` (sortRows) | Отсортировать строки по колонке (direction: "asc" или "desc") | `:sorted = orderBy >> <users, "age", "desc">;` |
| `groupBy` (groupRows) | Сгруппировать строки по значению колонки | `:byCity = groupBy >> <users, "city">;` |
| `pluck` (columnOf) | Массив значений одной колонки | `:names = pluck >> <users, "name">;` |
| `sumBy` (totalBy) | Сумма числовой колонки | `:revenue = sumBy >> <orders, "amount">;` |
| `avgBy` (averageBy) | Среднее значение числовой колонки | `:average = avgBy >> <orders, "amount">;` |
| `countBy` (tally) | Сколько раз встречается каждое значение колонки | `:stats = countBy >> <users, "city">;` |
| `indexBy` (keyedBy) | Сделать объект вида {значение колонки: строка} для быстрого поиска | `:byId = indexBy >> <users, "id">;` |
| `updateRows` (patchRows) | Новая таблица: у подходящих строк колонки заменяются на результат change | `:updated = updateRows >> <users, (row) -> row.age >= 18, (row) -> {active: true}>;` |
| `columns` (selectColumns, pickColumns) | Оставить в каждой строке только указанные колонки | `:brief = pick >> <users, ["id", "name"]>;` |
| `rowCount` (rowsCount) | Количество строк таблицы | `:n = rowCount >> users;` |
| `firstRow` | Первая строка таблицы или null | `:user = firstRow >> users;` |
| `lastRow` | Последняя строка таблицы или null | `:user = lastRow >> users;` |
| `takeRows` | Первые n строк таблицы | `:top = takeRows >> <users, 10>;` |
| `dropRows` | Строки таблицы без первых n | `:rest = dropRows >> <users, 10>;` |
| `distinctRows` | Уникальные строки по колонке или функции | `:once = distinctRows >> <users, (u) -> u.email>;` |
| `sortRowsBy` | Отсортировать таблицу по колонке, вернуть новую таблицу | `:sorted = sortRowsBy >> <users, "age", "desc">;` |
| `mergeTables` | Объединить строки двух таблиц, сохранив все колонки | `:all = mergeTables >> <admins, users>;` |
| `tableFromRows` | Создать таблицу из массива объектов (колонки можно задать явно) | `:users = tableFromRows >> <data, ["id", "name"]>;` |

### Сайт (браузер)

| Команда | Что делает | Пример |
| --- | --- | --- |
| `page` | Начать страницу: сбросить содержимое и задать заголовок вкладки | `page >> "Мой сайт";` |
| `heading` | Крупный заголовок страницы | `heading >> "Привет!";` |
| `para` | Абзац текста | `para >> "Мой первый сайт на Kuza.";` |
| `button` | Кнопка; второй аргумент — обработчик, третий — Tailwind class list | `button<"Нажми", onClick>;` |
| `field` | Поле ввода; имя нужно, чтобы прочитать значение командой fieldValue | `field<"Твоё имя", "name">;` |
| `fieldValue` | Прочитать то, что ввёл пользователь в поле с таким именем | `log >> fieldValue >> "name";` |
| `list` | Список: каждый элемент массива станет пунктом | `list >> ["Первый", "Второй"];` |
| `link` | Ссылка; третий аргумент — Tailwind class list | `link<"Документация", "https://example.com">;` |
| `image` | Картинка по адресу | `image<"./logo.png", "Логотип">;` |
| `render` | Нарисовать то, что собрано командами страницы (браузер) | `render;` |
| `body` | Контейнер body; в <> можно передать Tailwind-классы | `body<"flex gap-4"> >> [ para >> "Текст"; ];` |
| `box` | Контейнер box; в <> можно передать Tailwind-классы | `box<"flex gap-4"> >> [ para >> "Текст"; ];` |
| `row` | Контейнер row; в <> можно передать Tailwind-классы | `row<"flex gap-4"> >> [ para >> "Текст"; ];` |
| `column` (col) | Контейнер column; в <> можно передать Tailwind-классы | `column<"flex gap-4"> >> [ para >> "Текст"; ];` |
| `card` | Контейнер card; в <> можно передать Tailwind-классы | `card<"flex gap-4"> >> [ para >> "Текст"; ];` |
| `section` | Контейнер section; в <> можно передать Tailwind-классы | `section<"flex gap-4"> >> [ para >> "Текст"; ];` |
| `nav` | Контейнер nav; в <> можно передать Tailwind-классы | `nav<"flex gap-4"> >> [ para >> "Текст"; ];` |
| `header` | Шапка страницы; в <> можно передать Tailwind-классы | `header >> [ para >> "Текст"; ];` |
| `footer` | Подвал страницы; в <> можно передать Tailwind-классы | `footer >> [ para >> "Текст"; ];` |
| `main` | Главная область страницы; в <> можно передать Tailwind-классы | `main >> [ para >> "Текст"; ];` |
| `article` | Статья: текст с заголовками; в <> можно передать Tailwind-классы | `article >> [ para >> "Текст"; ];` |
| `aside` | Боковая колонка; в <> можно передать Tailwind-классы | `aside >> [ para >> "Текст"; ];` |
| `grid` | Сетка: карточки сами разложатся по ширине; в <> можно передать Tailwind-классы | `grid >> [ para >> "Текст"; ];` |
| `hero` | Крупный первый экран страницы; в <> можно передать Tailwind-классы | `hero >> [ para >> "Текст"; ];` |
| `form` | Форма: поля и кнопка отправки; в <> можно передать Tailwind-классы | `form >> [ para >> "Текст"; ];` |
| `center` | Центрированный блок; в <> можно передать Tailwind-классы | `center >> [ para >> "Текст"; ];` |
| `subheading` (subhead, h2) | Подзаголовок второго уровня | `subheading >> "Возможности";` |
| `small` (muted) | Мелкий приглушённый текст | `small >> "Работает без сборщика";` |
| `badge` (tagBadge) | Маленькая плашка-метка | `badge >> "beta";` |
| `quote` (cite) | Цитата с необязательным автором | `quote<"Язык должен быть простым", "Кто-то">;` |
| `divider` (hr) | Горизонтальная линия-разделитель | `divider;` |
| `codeBlock` (code) | Блок кода с моно-шрифтом | `codeBlock >> 'log >> "привет";';` |
| `checkbox` (check) | Флажок; значение читается через fieldValue | `checkbox<"Согласен", "agree">;` |
| `choices` (dropdown) | Выпадающий список вариантов | `choices<"План", ["Free", "Pro"], "plan">;` |

### Хранилище

| Команда | Что делает | Пример |
| --- | --- | --- |
| `storeGet` (loadData) | Прочитать значение из localStorage (JSON), при отсутствии вернуть fallback | `:name = storeGet >> <"name", "мир">;` |
| `storeSet` (saveData) | Сохранить значение в localStorage и вернуть его | `storeSet >> <"name", "Kuza">;` |
| `storeRemove` | Удалить значение из localStorage | `storeRemove >> "name";` |
| `storeClear` | Очистить localStorage текущего сайта | `storeClear;` |

### Сервер

| Команда | Что делает | Пример |
| --- | --- | --- |
| `route` | Зарегистрировать HTTP-маршрут; путь поддерживает параметры /users/:id | `route >> <"GET", "/users/:id", showUser>;` |
| `respond` | Ответить на текущий запрос; объект автоматически превращается в JSON | `respond >> <{ ok: true }, 200>;` |
| `param` | Параметр пути из маршрута /users/:id | `:id = param >> "id";` |
| `query` (queryParam) | Параметр строки запроса ?name=value | `:q = query >> "q";` |
| `requestBody` (bodyData) | Тело текущего запроса: JSON-объект или строка | `:data = requestBody;` |
| `method` | HTTP-метод текущего запроса | `:m = method;` |
| `serverPath` | Путь текущего запроса | `:p = serverPath;` |
| `listen` | Запустить HTTP-сервер (только Node.js); используется kuza serve | `listen >> 3000;` |
| `requestHeader` (headerValue) | Заголовок текущего HTTP-запроса | `:auth = requestHeader >> "authorization";` |
| `cors` | Задать Access-Control-Allow-Origin для всех ответов сервера | `cors >> "https://example.com";` |

### Интеграции

| Команда | Что делает | Пример |
| --- | --- | --- |
| `emit` (emitEvent) | Отправить CustomEvent в браузере — слушают React/Vue/любой хост | `emit >> <"kuza:count", { value: 5 }>;` |
| `onEvent` | Подписаться на событие хоста или другой части приложения | `onEvent >> <"kuza:count", (data) -> log >> data>;` |
| `hostCall` | Вызвать функцию, которую хост (React/Vue/Node) положил в globalThis | `:result = hostCall >> <"onLogin", { id: 1 }>;` |
| `hostValue` | Прочитать значение из globalThis хоста | `:token = hostValue >> "__INITIAL_STATE__";` |

## Как добавить свою команду

1. Открой `packages/core/commands.json`.
2. Добавь объект в массив `commands`: имя, категория, аргументы, описание, пример и `codegen`.
3. В `codegen` подставляй аргументы через `{0}`, `{1}` или все сразу через `{rest}`.
4. Запусти `npm run generate` — обновятся компилятор, подсветка, сниппеты и этот файл.

Пример:

```json
{ "id": "shout", "name": "shout", "aliases": ["крик"], "category": "output",
  "args": "single", "params": ["text"], "description": "Вывести громко",
  "example": "shout >> \"привет\";", "codegen": "console.log(String({0}).toUpperCase() + \"!\")" }
```
