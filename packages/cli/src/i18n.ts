/**
 * Переводы консоли: русский, узбекский, английский.
 * Переключаются командой /lang внутри REPL.
 */

export type Lang = "ru" | "uz" | "en";

const dictionaries = {
  ru: {
    welcome: "Добро пожаловать в консоль языка",
    hint: "Пиши код и нажимай Enter. Пустая строка в блоке — продолжение ввода.",
    commandsHint: "Все команды: /commands   Примеры: /examples   Помощь: /help   Выход: /exit",
    bye: "Пока! Хорошего кода.",
    unknownCommand: "Неизвестная команда",
    fileNotFound: "Файл не найден",
    running: "Запускаю",
    built: "Собрано в",
    runWithNode: "Запустить можно так",
    openInBrowser: "Открой в браузере",
    watching: "Слежу за файлом. Остановить: Ctrl+C",
    watchChanged: "Файл изменён — пересобираю",
    compileError: "Ошибка компиляции",
    runtimeError: "Ошибка выполнения",
    initCreated: "Создан файл",
    initExists: "Файл уже существует",
    initNext: "Теперь запусти",
    aiNoKey: "ИИ не настроен. Задай переменную окружения KUZA_AI_KEY (или OPENAI_API_KEY / ANTHROPIC_API_KEY).",
    aiNoKeyHint: "Подробная инструкция: раздел «ИИ-помощник» в README.md",
    aiThinking: "Думаю",
    aiError: "ИИ ответил ошибкой",
    aiModeOn: "Режим ИИ включён. Обычный текст уходит модели, /ai — выключить",
    aiModeOff: "Режим ИИ выключен",
    aiAddUsage: 'Использование: /ai add-command "что должна делать команда"',
    aiAddProposal: "Предложение новой команды",
    aiAddConfirm: "Добавить её в commands.json? (y/n)",
    aiAddCancel: "Отменено",
    aiAddDone: "Команда добавлена в commands.json",
    aiAddRebuild: "Чтобы она заработала, пересобери ядро: npm run build -w kuza-core — и перезапусти консоль.",
    aiAddInvalid: "Ответ модели не похож на корректную команду",
    cleared: "Консоль очищена",
    langSet: "Язык переключён на русский",
    themeSet: "Тема переключена",
    examplesTitle: "Примеры программ",
    examplesUsage: "Запустить пример: /examples run hello",
    commandsTitle: "Команды",
    commandsFiltered: "Ничего не найдено по запросу",
    helpTitle: "Помощь",
    helpBody: [
      "Пиши программы на Kuza прямо в консоли:",
      '  :x = 5;            объявить переменную',
      '  log >> x * 2;      вывести значение',
      "  2 + 2              простое выражение напечатается само",
      "",
      "Слэш-команды:",
      "  /help              эта справка",
      "  /commands [фильтр] список команд языка",
      "  /examples          примеры; /examples run hello — запустить",
      "  /clear             очистить экран и сбросить переменные",
      "  /ai [вопрос/задача] единый ИИ: сам решит, ответить или менять файлы",
      "  /agent [задача]    принудительно запустить агента (правит файлы)",
      "  /mode precise|creative|engineering — стиль работы агента",
      "  /ai add-command \"...\"  — добавить команду языка",
      "  /lang ru|uz|en     язык интерфейса",
      "  /theme dark|light  тема",
      "  /exit              выход",
    ],
    sessionRestart: "История ввода сброшена",
  },
  uz: {
    welcome: "Kuza tili konsoliga xush kelibsiz",
    hint: "Kod yozing va Enter bosing. Blok ichida bo'sh qator — davomi.",
    commandsHint: "Barcha buyruqlar: /commands   Misollar: /examples   Yordam: /help   Chiqish: /exit",
    bye: "Xayr! Yaxshi kod.",
    unknownCommand: "Noma'lum buyruq",
    fileNotFound: "Fayl topilmadi",
    running: "Ishga tushiryapman",
    built: "Yig'ildi",
    runWithNode: "Bunday ishga tushirish mumkin",
    openInBrowser: "Brauzerda oching",
    watching: "Faylni kuzatyapman. To'xtatish: Ctrl+C",
    watchChanged: "Fayl o'zgardi — qayta yig'aman",
    compileError: "Kompilyatsiya xatosi",
    runtimeError: "Bajarish xatosi",
    initCreated: "Fayl yaratildi",
    initExists: "Fayl allaqachon mavjud",
    initNext: "Endi ishga tushiring",
    aiNoKey: "AI sozlanmagan. KUZA_AI_KEY (yoki OPENAI_API_KEY / ANTHROPIC_API_KEY) muhit o'zgaruvchisini bering.",
    aiNoKeyHint: "Batafsil: README.md dagi «AI yordamchi» bo'limi",
    aiThinking: "O'ylayapman",
    aiError: "AI xato qaytardi",
    aiModeOn: "AI rejimi yoqildi. Oddiy matn modelga ketadi, /ai — o'chirish",
    aiModeOff: "AI rejimi o'chirildi",
    aiAddUsage: 'Foydalanish: /ai add-command "buyruq nima qilishi kerak"',
    aiAddProposal: "Yangi buyruq taklifi",
    aiAddConfirm: "Uni commands.json ga qo'shamizmi? (y/n)",
    aiAddCancel: "Bekor qilindi",
    aiAddDone: "Buyruq commands.json ga qo'shildi",
    aiAddRebuild: "Ishlashi uchun yadroni qayta yig'ing: npm run build -w kuza-core — va konsolni qayta ishga tushiring.",
    aiAddInvalid: "Model javobi to'g'ri buyruqqa o'xshamaydi",
    cleared: "Konsol tozalandi",
    langSet: "Til o'zgartirildi",
    themeSet: "Mavzu o'zgartirildi",
    examplesTitle: "Misollar",
    examplesUsage: "Misolni ishga tushirish: /examples run hello",
    commandsTitle: "Buyruqlar",
    commandsFiltered: "So'rov bo'yicha hech narsa topilmadi",
    helpTitle: "Yordam",
    helpBody: [
      "Kuza dasturlarini to'g'ridan-to'g'ri konsolda yozing:",
      '  :x = 5;            o\'zgaruvchi e\'lon qilish',
      '  log >> x * 2;      qiymatni chiqarish',
      "  2 + 2              oddiy ifoda o'zi chop etiladi",
      "",
      "Slash buyruqlar:",
      "  /help              yordam",
      "  /commands [filtr]  buyruqlar ro'yxati",
      "  /examples          misollar; /examples run hello",
      "  /clear             ekranni tozalash",
      "  /ai [savol/vazifa]  yagona AI: javob berishni yoki faylni tahrirlashni o'zi hal qiladi",
      "  /agent [vazifa]    majburan agentni ishga tushirish (fayllarni o'zgartiradi)",
      "  /mode precise|creative|engineering — agent uslubi",
      '  /ai add-command "..."  — til buyrug\'ini qo\'shish',
      "  /lang ru|uz|en     interfeys tili",
      "  /theme dark|light  mavzu",
      "  /exit              chiqish",
    ],
    sessionRestart: "Kiritish tarixi tozalandi",
  },
  en: {
    welcome: "Welcome to the console of",
    hint: "Type code and press Enter. Inside a block, an empty line continues input.",
    commandsHint: "All commands: /commands   Examples: /examples   Help: /help   Exit: /exit",
    bye: "Bye! Happy coding.",
    unknownCommand: "Unknown command",
    fileNotFound: "File not found",
    running: "Running",
    built: "Built to",
    runWithNode: "Run it with",
    openInBrowser: "Open it in a browser",
    watching: "Watching the file. Stop with Ctrl+C",
    watchChanged: "File changed — rebuilding",
    compileError: "Compile error",
    runtimeError: "Runtime error",
    initCreated: "Created file",
    initExists: "File already exists",
    initNext: "Now run",
    aiNoKey: "AI is not configured. Set KUZA_AI_KEY (or OPENAI_API_KEY / ANTHROPIC_API_KEY).",
    aiNoKeyHint: "Details: the AI assistant section in README.md",
    aiThinking: "Thinking",
    aiError: "AI returned an error",
    aiModeOn: "AI mode on. Plain text goes to the model, /ai turns it off",
    aiModeOff: "AI mode off",
    aiAddUsage: 'Usage: /ai add-command "what the command should do"',
    aiAddProposal: "Proposed new command",
    aiAddConfirm: "Add it to commands.json? (y/n)",
    aiAddCancel: "Cancelled",
    aiAddDone: "Command added to commands.json",
    aiAddRebuild: "To make it work, rebuild the core: npm run build -w kuza-core — then restart the console.",
    aiAddInvalid: "The model answer is not a valid command",
    cleared: "Console cleared",
    langSet: "Language switched",
    themeSet: "Theme switched",
    examplesTitle: "Examples",
    examplesUsage: "Run an example: /examples run hello",
    commandsTitle: "Commands",
    commandsFiltered: "Nothing found for",
    helpTitle: "Help",
    helpBody: [
      "Write Kuza programs right in the console:",
      '  :x = 5;            declare a variable',
      '  log >> x * 2;      print a value',
      "  2 + 2              a bare expression prints itself",
      "",
      "Slash commands:",
      "  /help              this help",
      "  /commands [filter] list language commands",
      "  /examples          examples; /examples run hello",
      "  /clear             clear screen and reset variables",
      "  /ai [question/task] unified AI: decides whether to answer or edit files",
      "  /agent [task]      force the coding agent (edits files)",
      "  /mode precise|creative|engineering — agent behavior",
      '  /ai add-command "..."  — add a language command',
      "  /lang ru|uz|en     interface language",
      "  /theme dark|light  theme",
      "  /exit              quit",
    ],
    sessionRestart: "Input history reset",
  },
} as const;

export type MessageKey = keyof typeof dictionaries.ru;
/** Ключи, значения которых — строка (helpBody — массив). */
export type TextKey = Exclude<MessageKey, "helpBody">;

let current: Lang = "en";

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
}

export function isLang(value: string): value is Lang {
  return value === "ru" || value === "uz" || value === "en";
}

export function t(key: TextKey): string {
  const dictionary = dictionaries[current] as Record<string, unknown>;
  const value = dictionary[key];
  if (typeof value === "string") return value;
  const fallback = (dictionaries.ru as Record<string, unknown>)[key];
  return typeof fallback === "string" ? fallback : String(key);
}

export function helpLines(): string[] {
  return [...(dictionaries[current].helpBody as readonly string[])];
}
