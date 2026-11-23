# Kuza

Kuza — язык программирования для сайтов, консольных программ и небольшого
бэкенда. Он компилируется в обычный JavaScript и остаётся понятным: `:` для
переменных, `>>` для команд, `<...>` для аргументов, `[ ... ]` для блоков,
`? ... || ...` для условий и SQL-подобные запросы к таблицам.

```kuza
:count = 0;

view App<> >> [
  body<"p-8"> >> [
    heading >> <"Hello, Kuza!", "text-3xl font-bold">;
    para >> <"Count: {count}", "text-orange-400">;
    button >> <"Add one", increase, "rounded bg-orange-500 px-4 py-2">;
  ];
  render;
];

func increase<> >> [
  count = count + 1; // экран обновится сам
];
```

## Пакеты

| Пакет | Что это |
| --- | --- |
| `kuza-core` | компилятор и рантайм: `compile`, `run`, `parse`, команды. Нужен, чтобы встроить Kuza в другой проект (React, Node.js, свой инструмент). |
| `kuza-lang` | CLI `kuza`: `new`, `start`, `build`, `check`, `serve`, `ai`, REPL. Зависит от `kuza-core`. |
| `kuza-vscode` | расширение VS Code: подсветка, автодополнение, ошибки, кнопки Run/Dev/Build/AI. |

`npm install kuza-lang` в пустой папке создаёт базовый проект:
`index.html`, `main.kuza`, `public/favicon.svg`, `START.md`, `README.md`,
`.gitignore` и обновляет `package.json`. В уже существующем проекте с другими зависимостями postinstall
ничего не трогает.

## Быстрый старт

```bash
mkdir my-site && cd my-site
npm install kuza-lang
npm run dev        # http://localhost:5173
npm run build      # dist/index.html
```

Короткие команды через CLI:

```bash
npx kuza-lang new my-site
cd my-site
kuza start         # или kuza dev
kuza build
kuza check
kuza ai "объясни main.kuza"
kuza doctor         # проверить, какой kuza реально запускается в терминале
```

Полная инструкция после установки — в `START.md`. Полный список команд:
[docs/commands.md](docs/commands.md) (186 команд, генерируется из
`packages/core/commands.json`).

## Таблицы, npm-пакеты и React/Vue/Svelte

Таблица — основной способ хранить данные: `table<...>` задаёт колонки,
`insert into` добавляет строки, `select`, `update`, `delete`, `orderBy`,
`groupBy` и `sumBy` работают как SQL, а `tableSave` / `tableLoad` кладут
таблицу в JSON-файл и читают обратно.

```kuza
:users = table<id, name, age>;
insert into users values <1, "Аня", 17>;
insert into users values <2, "Боря", 22>;

log >> select name from users where age >= 18 order by age desc;
update users set age = 18 where id = 1;
tableSave >> <users, "users.json">;
```

Пакеты из npm подключаются через `use "имя"` — это обычный `import`, поэтому
пакет должен быть установлен (`npm i lodash`), а в браузере нужен сборщик
или import map. Встроенные модули (`math`, `time`, `text`, `json`) и свои
файлы (`use "./helpers.kuza"`) работают без установки.

```kuza
use "lodash";
log >> lodash.chunk<[1, 2, 3, 4], 2>;
```

Чтобы вызвать код Kuza из React, Vue, Svelte или Node.js, собери его как
ES-модуль:

```bash
kuza build logic.kuza --lib     # → logic.js с export function ...
```

```js
// React / Vue / Svelte / Node.js
import { total } from "./logic.js";
console.log(total([1, 2, 3])); // 6
```

Короткие формы CLI: `kuza n my-site` (new), `kuza d` (dev), `kuza b` (build),
`kuza c` (check), `kuza r main.kuza` (run), `kuza s server.kuza` (serve),
`kuza a "вопрос"` (ai), `kuza g "задача"` (agent), `kuza u` (upgrade).

## ИИ-помощник и агент

`kuza ai` — единый вход. Он сам решает: ответить на вопрос (прочитав файлы
проекта и, если нужно, страницу по ссылке) или реально менять файлы:
последние команды уходят агенту. `kuza agent` — явный переход к агентству,
даже если формулировка похожа на вопрос.

```bash
kuza ai "объясни main.kuza"                         # ответ без изменений
kuza ai "посмотри https://example.com/docs и добавь раздел"  # агент + веб-контекст
kuza ai "добавь тёмную тему"                        # автоматически станет agent
kuza agent "добавь раздел с тарифами из users.json" # принудительно агент
kuza agent --init                                   # создать AGENTS.md с правилами
kuza agent --print-prompt                           # показать промпт и режим
kuza agent --mode engineering "оптимизируй таблицы" # precise|creative|engineering
kuza doctor                                         # диагностика старого глобального kuza
kuza upgrade                                        # обновить kuza-lang в проекте
```

В REPL (`kuza` без аргументов) работают `/ai`, `/agent`, `/mode precise|creative|engineering`,
`/ai add-command "..."`. `/ai` с намерением правки закрывает REPL, отдаёт агенту
stdin для подтверждений и открывает новую сессию после задачи.

Что важно:

- **Правила проекта** из `AGENTS.md`, `KUZA.md`, `CLAUDE.md`; `kuza new` создаёт
  `AGENTS.md` сразу.
- **Знание языка** собирается из компилятора: все 186 команд, таблицы, страницы,
  бэкенд, npm-модули, версии ядра и CLI. После `npm run generate` модель знает
  новые команды автоматически.
- **Контекст и память:** карта файлов в `.kuza/agent/project-map.json`, решения —
  в `.kuza/agent/project-memory.md`, состояния задачи — в `.kuza/agent/task-state.json`.
  История сжимается, поэтому длинные задачи не съедают контекст.
- **Маршрутизация и бюджет:** для простых/сложных задач можно задать разные
  модели, есть запасная модель и лимит токенов. Имена моделей берутся только из
  env-переменных — в ядре нет захардкоженных моделей.
- **QA-цикл:** после каждой правки агент запускает `check`, читает диагностику
  и исправляет её сам; `done` доступен только когда проект компилируется.
- **Инструменты:** `plan`, `list`, `info`, `glob`, `grep`, `read`, `write`,
  `append`, `replace`, `delete`, `mkdir`, `check`, `run`, `install`, `fetch`,
  `version`, `upgrade`, `done`.
- **Безопасность:** только папка проекта, без `.env` и секретов (результаты
  инструментов фильтруются), `fetch` с проверкой хостов, команды запускаются без
  оболочки, запись/установка/создание папок — с подтверждением (`--yes` отключает
  вопросы), `npm publish` и `git push` агент не выполняет.

Переменные окружения (пример — в `.env.example`):

| Переменная | Назначение |
| --- | --- |
| `KUZA_AI_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | ключ провайдера |
| `KUZA_AI_PROVIDER`, `KUZA_AI_MODEL`, `KUZA_AI_BASE_URL` | провайдер, модель, URL OpenAI-совместимого API |
| `KUZA_AI_MODEL_SIMPLE`, `KUZA_AI_MODEL_COMPLEX` | модели для простых и сложных задач |
| `KUZA_AI_FALLBACK_MODEL` | запасная модель при недоступности основной |
| `KUZA_AI_ROUTE=auto\|simple\|medium\|complex\|off` | принудительный уровень маршрутизации |
| `KUZA_AI_MODE=precise\|creative\|engineering` | стиль работы агента |
| `KUZA_AI_MAX_TOKENS`, `KUZA_AI_MAX_STEPS` | бюджет токенов и максимум шагов |
| `KUZA_AI_FETCH_HOSTS` | список разрешённых хостов для `fetch` через запятую |

Без ключа доступны только чтение и диагностика: `kuza agent --print-prompt`
покажет системный промпт, а `kuza check` проверит код.

## Что нового в 0.5.7

- Единый `/ai`: сам выбирает между ответом и правкой проекта; `/agent` остался
  явным принудительным режимом.
- Три режима поведения (`precise`, `creative`, `engineering`), маршрутизация
  моделей по сложности, запасная модель, учёт токенов и кеш промпта.
- Карта проекта и постоянная память агента в `.kuza/agent/`, сжатие истории,
  QA-цикл с автоисправлением после `check`.
- Новые команды коллекций (`reduce`, `flatMap`, `partition`, `zip`, `union`,
  `intersect`, `difference`, `uniqueBy`), таблиц (`rowCount`, `firstRow`,
  `takeRows`, `sortRowsBy`, `mergeTables`, `tableFromRows` и др.) и интеграций
  (`emit`, `onEvent`, `hostCall`, `hostValue`, `requestHeader`, `cors`).
- `kuza doctor`: показывает, какой CLI запускается, версию глобальной установки
  и проблемы PowerShell execution policy.
- Усиленные маркеры Kuza в `dist/index.html` (`generator`, `data-kuza`,
  `window.__KUZA__`) для Wappalyzer и похожих инструментов.

## Что нового в 0.5.0

- `view` — один экран вместо мозаики маленьких функций. Изменение переменной
  экрана автоматически перерисовывает страницу.
- Tailwind-классы прямо в Kuza, включая контейнеры `body`, `card`, `row` и др.
- Многостраничность: `pages/about.kuza` → `/about` и `dist/about/index.html`.
- Dev-сервер с live reload и правильными MIME-типами.
- Хранилище: `storeGet`, `storeSet`, `storeRemove`, `storeClear`.
- Бэкенд: `route`, `respond`, `param`, `query`, `requestBody`, `listen` +
  `kuza serve server.kuza`.
- Плагины и хуки через `kuza.config.js` (`onCompile`, `onBuild`, `onRun`,
  свои команды).
- ИИ в CLI: `kuza ai "вопрос" --file main.kuza` читает файлы проекта.
- Расширение VS Code с командами Dev/Build/New/AI.

## VS Code: как установить из Marketplace

1. Установи расширение **Kuza** через поиск в Extensions (Ctrl+Shift+X).
2. Если его нет: это значит, что версия ещё не опубликована. Локально можно
   поставить VSIX: `npm run package:vscode`, затем в VS Code
   **Install from VSIX…** и выбрать `packages/vscode/kuza-vscode-0.5.7.vsix`.
3. Чтобы расширение появилось в поиске для всех пользователей, владелец должен
   зарегистрировать publisher `kuza` на
   [Marketplace](https://marketplace.visualstudio.com/manage) и выполнить
   `npm run publish:vscode` с личным PAT. Без аккаунта и токена опубликовать
   расширение технически нельзя — это ограничение Microsoft, а не код.

Подробности — [packages/vscode/README.md](packages/vscode/README.md).

## Разработка

```bash
npm install
npm run build
npm test
```

`commands.json` — единственный источник команд. После его изменения запусти
`npm run generate`: обновятся компилятор, документация, подсветка и сниппеты.

Лицензия: MIT. Проект начал Frebuffalo; архитектура и язык развиваются дальше.
