// ============================================================================
//  Библиотека сценариев v2 — ролики ~32 секунды в формате конкурента.
//  Разбор канала Simply Animated (156 роликов, 147 млн просмотров):
//    • топ-ролики длятся 31–38 с (медиана 34 с), слабые — 10–22 с;
//    • одна мысль → 3–5 коротких сцен-сравнений → вывод в конце;
//    • чёрный фон, белые человечки, золото = успех/деньги, красный = проблемы;
//    • экран часто делится: «Сегодня / Через месяц / Через год»,
//      «Что видят / Чего не видят», «Копит | Тратит»;
//    • название = короткая цитата без хэштегов, хэштеги — в описании.
//  Здесь — готовые истории про деньги. Каждая строка задаётся сразу на двух
//  языках: L("English", "Русский").
// ============================================================================

const L = (en, ru) => ({ en, ru });
const C = (en, ru, hlEn = "", hlRu = "") => ({ text: L(en, ru), highlight: L(hlEn, hlRu) });

const YEARS = (lang) => (lang === "ru" ? ["1 год", "5 лет", "10 лет", "20 лет", "30 лет"] : ["Y1", "Y5", "Y10", "Y20", "Y30"]);

export const STORIES = [
  {
    id: "money_works",
    keywords: ["work", "passive", "invest", "salary", "работ", "пассив", "инвест", "зарплат"],
    title: L("Make money work for you", "Пусть деньги работают на тебя"),
    beats: [
      { layout: "single", panels: [{ action: "paycheck_treadmill" }],
        captions: [C("Most people work for money.", "Большинство работает ради денег.", "work", "работает"), C("Money comes. Money goes.", "Деньги приходят. Деньги уходят.", "goes", "уходят")] },
      { layout: "stack2", panels: [
        { action: "tree_grow", label: L("Spend it", "Потратить"), params: { from: 0.05, grow: 0.08 } },
        { action: "tree_grow", label: L("Plant it", "Посадить"), labelColor: "gold", params: { from: 0.05, grow: 1, harvest: true } }],
        captions: [C("Or you can plant it.", "А можно их посадить.", "plant", "посадить")] },
      { layout: "single", panels: [{ action: "bars_growth", params: { bars: "years" } }],
        captions: [C("Then time does the work.", "Дальше работает время.", "time", "время")] },
      { layout: "single", panels: [{ action: "mountain_climb", params: { top: L("FREEDOM", "СВОБОДА") } }],
        captions: [C("Work for money once.", "Поработай на деньги один раз.", "once", "раз"), C("Let money work for you forever.", "Пусть они работают на тебя всегда.", "forever", "всегда")] },
    ],
  },
  {
    id: "small_amounts",
    keywords: ["small", "compound", "little", "start", "маленьк", "сложн", "процент", "начн", "мало"],
    title: L("Small amounts build big results", "Маленькие суммы дают большой результат"),
    beats: [
      { layout: "stack3", panels: [
        { action: "jar_fill", label: L("Today", "Сегодня"), params: { from: 0, level: 0.08, dropping: false } },
        { action: "jar_fill", label: L("In a month", "Через месяц"), params: { from: 0.08, level: 0.3 } },
        { action: "jar_fill", label: L("In a year", "Через год"), labelColor: "gold", params: { from: 0.3, level: 1 } }],
        captions: [C("Saving a little feels useless.", "Откладывать понемногу кажется бесполезным.", "useless", "бесполезным")] },
      { layout: "single", panels: [{ action: "hammer_rock", params: { hits: 100, break: true } }],
        captions: [C("Every deposit is one more hit.", "Каждый взнос — ещё один удар.", "hit", "удар"), C("You never know which one breaks it.", "Не знаешь, какой станет решающим.", "breaks", "решающим")] },
      { layout: "single", panels: [{ action: "bars_growth", params: { bars: "years" } }],
        captions: [C("That's compound interest.", "Это и есть сложный процент.", "compound", "сложный")] },
      { layout: "single", panels: [{ action: "stairs_goal", params: { steps: [L("Save", "Копи"), L("Invest", "Вложи"), L("Wait", "Жди"), L("Repeat", "Повтори")], reward: "coins" } }],
        captions: [C("Start small. Start today.", "Начни с малого. Начни сегодня.", "today", "сегодня")] },
    ],
  },
  {
    id: "debt_trap",
    keywords: ["debt", "credit", "loan", "card", "долг", "кредит", "займ", "карт"],
    title: L("Debt always pushes back", "Долг всегда давит в ответ"),
    beats: [
      { layout: "single", panels: [{ action: "debt_ball" }],
        captions: [C("Debt feels light at first.", "Сначала долг кажется лёгким.", "light", "лёгким")] },
      { layout: "single", panels: [{ action: "push_boulder", params: { label: L("DEBT", "ДОЛГ"), outcome: "slip" } }],
        captions: [C("Minimum payments.", "Минимальные платежи.", "Minimum", "Минимальные"), C("Maximum interest.", "Максимальные проценты.", "Maximum", "Максимальные")] },
      { layout: "single", panels: [{ action: "seesaw", params: { left: L("Income", "Доход"), right: L("Payments", "Платежи"), rightGrow: true, leftWeight: 1, rightWeight: 1.3 } }],
        captions: [C("Soon payments outweigh income.", "Скоро платежи перевешивают доход.", "outweigh", "перевешивают")] },
      { layout: "single", panels: [{ action: "word_stack", params: { words: "BUY", final: L("PAY IT OFF", "ЗАКРОЙ ДОЛГ") } }],
        captions: [C("Break the cycle.", "Разорви этот круг.", "Break", "Разорви")] },
    ],
  },
  {
    id: "what_people_see",
    keywords: ["rich", "wealth", "success", "see", "богат", "успех", "видят"],
    title: L("Nobody sees what's underneath", "Никто не видит, что внизу"),
    beats: [
      { layout: "single", panels: [{ action: "pillars", params: { pillars: [
        { label: L("Employee", "Сотрудник"), h: 0.3 }, { label: L("Manager", "Менеджер"), h: 0.55 }, { label: L("Owner", "Владелец"), h: 1, color: "gold", text: "$" }] } }],
        captions: [C("Everyone wants the top.", "Все хотят наверх.", "top", "наверх")] },
      { layout: "single", panels: [{ action: "iceberg", params: { top: L("WEALTH", "БОГАТСТВО"), below: [L("Saving", "Сбережения"), L("Budgeting", "Бюджет"), L("Patience", "Терпение"), L("Saying no", "Умение отказать"), L("Sacrifice", "Жертвы"), L("Discipline", "Дисциплина")] } }],
        captions: [C("Nobody sees what's underneath.", "Никто не видит, что внизу.", "underneath", "внизу")] },
      { layout: "stack2", panels: [
        { action: "line_chart", label: L("What people expect", "Чего ждут люди"), params: { trend: "steady_up" } },
        { action: "line_chart", label: L("What it really looks like", "Как это на самом деле"), labelColor: "gold", params: { trend: "volatile_up" } }],
        captions: [C("Growth is never a straight line.", "Рост никогда не бывает ровным.", "never", "никогда")] },
      { layout: "single", panels: [{ action: "mountain_climb", params: { top: L("WEALTH", "БОГАТСТВО") } }],
        captions: [C("Keep climbing.", "Продолжай подниматься.", "climbing", "подниматься")] },
    ],
  },
  {
    id: "crowd",
    keywords: ["crowd", "consum", "buy", "shop", "trend", "толп", "покуп", "потреб", "тренд"],
    title: L("Don't spend like everyone else", "Не трать как все"),
    beats: [
      { layout: "single", panels: [{ action: "crowd_follow" }],
        captions: [C("Everyone buys what everyone buys.", "Все покупают то, что покупают все.", "everyone", "все")] },
      { layout: "side2", panels: [
        { action: "jar_fill", label: L("Spender", "Тратит"), labelColor: "red", params: { from: 0.4, level: 0.02, dropping: false } },
        { action: "jar_fill", label: L("Saver", "Копит"), labelColor: "gold", params: { from: 0.1, level: 0.9 } }],
        captions: [C("Few ask where it leads.", "Мало кто спрашивает, куда это ведёт.", "leads", "ведёт")] },
      { layout: "single", panels: [{ action: "word_stack", params: { words: "SPEND", final: L("SAVE", "КОПИ") } }],
        captions: [C("Spend less than you earn.", "Трать меньше, чем зарабатываешь.", "less", "меньше")] },
      { layout: "single", panels: [{ action: "door_light" }],
        captions: [C("Walk the other way.", "Иди в другую сторону.", "other", "другую")] },
    ],
  },
  {
    id: "market_crash",
    keywords: ["market", "crash", "stock", "panic", "рын", "акци", "паник", "обвал", "бирж"],
    title: L("Zoom out", "Посмотри шире"),
    beats: [
      { layout: "single", panels: [{ action: "line_chart", params: { trend: "crash" } }],
        captions: [C("The market drops.", "Рынок падает.", "drops", "падает"), C("Everyone panics.", "Все в панике.", "panics", "панике")] },
      { layout: "single", panels: [{ action: "line_chart", params: { trend: "zoom_out" } }],
        captions: [C("Now zoom out.", "А теперь посмотри шире.", "zoom", "шире")] },
      { layout: "stack2", panels: [
        { action: "tree_grow", label: L("Sold in panic", "Продал в панике"), labelColor: "red", params: { from: 0.4, grow: 0.06 } },
        { action: "tree_grow", label: L("Stayed invested", "Остался в рынке"), labelColor: "gold", params: { from: 0.4, grow: 1, harvest: true } }],
        captions: [C("Time in the market beats timing it.", "Время в рынке важнее угадывания.", "Time", "Время")] },
      { layout: "single", panels: [{ action: "bars_growth", params: { bars: "years" } }],
        captions: [C("Patience pays.", "Терпение окупается.", "pays", "окупается")] },
    ],
  },
  {
    id: "nine_to_five",
    keywords: ["business", "job", "9-5", "boss", "own", "бизнес", "работа", "начальн", "своё", "свое"],
    title: L("Build your own door", "Построй свою дверь"),
    beats: [
      { layout: "single", panels: [{ action: "paycheck_treadmill" }],
        captions: [C("9 to 5. Paycheck to paycheck.", "С 9 до 6. От зарплаты до зарплаты.", "Paycheck", "зарплаты")] },
      { layout: "single", panels: [{ action: "gap_jump", params: { left: L("9-5 job", "Работа 9-18"), right: L("Own business", "Своё дело") } }],
        captions: [C("The jump looks scary.", "Прыжок кажется страшным.", "scary", "страшным"), C("Staying is scarier.", "Оставаться — страшнее.", "scarier", "страшнее")] },
      { layout: "single", panels: [{ action: "pillars", params: { pillars: [
        { label: L("Employee", "Сотрудник"), h: 0.3 }, { label: L("Manager", "Менеджер"), h: 0.55 }, { label: L("Owner", "Владелец"), h: 1, color: "gold", text: "$" }] } }],
        captions: [C("Owners decide how high you go.", "Владелец решает, как высоко ты поднимешься.", "Owners", "Владелец")] },
      { layout: "single", panels: [{ action: "door_light" }],
        captions: [C("Knock on your own door.", "Постучи в свою дверь.", "own", "свою")] },
    ],
  },
  {
    id: "lifestyle_inflation",
    keywords: ["raise", "lifestyle", "salary", "more", "повышен", "образ жизни", "зарплат", "больше"],
    title: L("Raise your savings, not your lifestyle", "Повышай сбережения, а не расходы"),
    beats: [
      { layout: "single", panels: [{ action: "meters", params: { bars: [
        { label: L("Income", "Доход"), from: 0.35, level: 0.8, color: "green" }, { label: L("Spending", "Расходы"), from: 0.3, level: 0.85, color: "red" }] } }],
        captions: [C("You got a raise.", "Тебе подняли зарплату.", "raise", "подняли"), C("So did your spending.", "Расходы тоже выросли.", "spending", "Расходы")] },
      { layout: "single", panels: [{ action: "paycheck_treadmill" }],
        captions: [C("Bigger salary. Same treadmill.", "Больше зарплата. Та же дорожка.", "Same", "Та же")] },
      { layout: "single", panels: [{ action: "seesaw", params: { left: L("Savings", "Сбережения"), right: L("Lifestyle", "Расходы"), leftGrow: true, leftWeight: 1.3, rightWeight: 1, leftColor: "gold" } }],
        captions: [C("Shift the weight.", "Перенеси вес.", "weight", "вес")] },
      { layout: "single", panels: [{ action: "stairs_goal", params: { steps: [L("Earn", "Заработай"), L("Save", "Отложи"), L("Invest", "Вложи"), L("Grow", "Расти")] } }],
        captions: [C("Raise your savings, not your lifestyle.", "Повышай сбережения, а не расходы.", "savings", "сбережения")] },
    ],
  },
  {
    id: "today_year",
    keywords: ["habit", "daily", "year", "day", "привыч", "каждый", "год", "день"],
    title: L("One year can change everything", "Один год может изменить всё"),
    beats: [
      { layout: "stack3", panels: [
        { action: "tree_grow", label: L("Today", "Сегодня"), params: { from: 0.05, grow: 0.1 } },
        { action: "tree_grow", label: L("In a month", "Через месяц"), params: { from: 0.1, grow: 0.35 } },
        { action: "tree_grow", label: L("In a year", "Через год"), labelColor: "gold", params: { from: 0.35, grow: 1, harvest: true } }],
        captions: [C("Nothing changes in a day.", "За день ничего не меняется.", "day", "день")] },
      { layout: "single", panels: [{ action: "stairs_goal", params: { steps: [L("Day 1", "День 1"), L("Day 30", "День 30"), L("Day 100", "День 100"), L("Day 365", "День 365")], reward: "trophy" } }],
        captions: [C("But every day is a step.", "Но каждый день — это ступенька.", "step", "ступенька")] },
      { layout: "single", panels: [{ action: "bars_growth", params: { bars: "years" } }],
        captions: [C("Steps become stairs.", "Ступеньки становятся лестницей.", "stairs", "лестницей")] },
      { layout: "single", panels: [{ action: "mountain_climb", params: { top: L("FREEDOM", "СВОБОДА") } }],
        captions: [C("Make yourself proud.", "Сделай так, чтобы гордиться собой.", "proud", "гордиться")] },
    ],
  },
  {
    id: "first_step",
    keywords: ["fear", "start", "risk", "first", "страх", "начать", "риск", "первый"],
    title: L("What if it works?", "А что, если получится?"),
    beats: [
      { layout: "single", panels: [{ action: "gap_jump", params: { left: L("Comfort", "Комфорт"), right: L("Wealth", "Богатство"), outcome: "fall" } }],
        captions: [C("What if I fail?", "А если не получится?", "fail", "получится")] },
      { layout: "single", panels: [{ action: "gap_jump", params: { left: L("Comfort", "Комфорт"), right: L("Wealth", "Богатство"), reward: "trophy" } }],
        captions: [C("What if it works?", "А что, если получится?", "works", "получится")] },
      { layout: "single", panels: [{ action: "hammer_rock", params: { hits: 50, break: true } }],
        captions: [C("Most people quit before the last hit.", "Большинство сдаётся перед последним ударом.", "quit", "сдаётся")] },
      { layout: "single", panels: [{ action: "door_light" }],
        captions: [C("Start before you're ready.", "Начни, пока не готов.", "Start", "Начни")] },
    ],
  },
  {
    id: "income_expenses",
    keywords: ["budget", "expenses", "income", "бюджет", "расход", "доход", "трат"],
    title: L("It's not what you earn", "Дело не в том, сколько ты зарабатываешь"),
    beats: [
      { layout: "single", panels: [{ action: "seesaw", params: { left: L("Income", "Доход"), right: L("Expenses", "Расходы"), rightGrow: true, leftWeight: 1, rightWeight: 1.2 } }],
        captions: [C("It's not what you earn.", "Важно не сколько зарабатываешь.", "earn", "зарабатываешь")] },
      { layout: "side2", panels: [
        { action: "jar_fill", label: L("High salary", "Высокая зарплата"), params: { from: 0.3, level: 0.02, dropping: false } },
        { action: "jar_fill", label: L("Low salary", "Скромная зарплата"), labelColor: "gold", params: { from: 0.05, level: 0.7 } }],
        captions: [C("It's what you keep.", "А сколько оставляешь.", "keep", "оставляешь")] },
      { layout: "single", panels: [{ action: "saver_vs_spender" }], labels: L(["Saver", "Spender"], ["Копит", "Тратит"]),
        captions: [C("Same start. Different endings.", "Старт одинаковый. Финал разный.", "Different", "разный")] },
      { layout: "single", panels: [{ action: "stairs_goal", params: { steps: [L("Budget", "Бюджет"), L("Save", "Копи"), L("Invest", "Вложи"), L("Freedom", "Свобода")] } }],
        captions: [C("Keep more. Grow more.", "Оставляй больше. Расти больше.", "Grow", "Расти")] },
    ],
  },
  {
    id: "discipline_boring",
    keywords: ["discipline", "boring", "patience", "consisten", "дисциплин", "скучн", "терпен", "постоян"],
    title: L("Discipline looks boring until it pays", "Дисциплина скучна, пока не окупится"),
    beats: [
      { layout: "stack2", panels: [
        { action: "meters", label: L("Motivation", "Мотивация"), params: { bars: [{ label: L("Savings", "Сбережения"), from: 0.6, level: 0.15, color: "red" }] } },
        { action: "meters", label: L("Discipline", "Дисциплина"), labelColor: "gold", params: { bars: [{ label: L("Savings", "Сбережения"), from: 0.1, level: 0.9, color: "gold" }] } }],
        captions: [C("Motivation fades.", "Мотивация проходит.", "fades", "проходит"), C("Discipline stays.", "Дисциплина остаётся.", "stays", "остаётся")] },
      { layout: "single", panels: [{ action: "hammer_rock", params: { hits: 120, break: true } }],
        captions: [C("Same deposit. Every month.", "Один и тот же взнос. Каждый месяц.", "Every", "Каждый")] },
      { layout: "single", panels: [{ action: "line_chart", params: { trend: "zoom_out" } }],
        captions: [C("Boring up close.", "Вблизи — скучно.", "Boring", "скучно"), C("Beautiful from afar.", "Издалека — красиво.", "Beautiful", "красиво")] },
      { layout: "single", panels: [{ action: "mountain_climb", params: { top: L("RESULTS", "РЕЗУЛЬТАТ") } }],
        captions: [C("Discipline looks boring until it pays.", "Дисциплина скучна, пока не окупится.", "pays", "окупится")] },
    ],
  },
];

const HASHTAGS = {
  en: ["#money", "#finance", "#investing", "#mindset", "#motivation", "#shorts"],
  ru: ["#деньги", "#финансы", "#инвестиции", "#мышление", "#мотивация", "#shorts"],
};

// Раскрывает L(...) и специальные значения под выбранный язык
function localize(v, lang) {
  if (Array.isArray(v)) return v.map((x) => localize(x, lang));
  if (v && typeof v === "object") {
    if ("en" in v && "ru" in v && Object.keys(v).length === 2) return localize(v[lang], lang);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, localize(x, lang)]));
  }
  return v;
}

function expandParams(action, params, lang) {
  const p = { ...params };
  if (action === "bars_growth" && p.bars === "years") {
    const ys = YEARS(lang);
    p.bars = [1, 1.8, 3.2, 7, 15].map((v, i) => ({ label: ys[i], value: v, text: i === 4 ? "$$$" : undefined }));
  }
  if (action === "word_stack" && typeof p.words === "string") {
    const w = { BUY: L("BUY", "КУПИ"), SPEND: L("SPEND", "ТРАТЬ") }[p.words] || L(p.words, p.words);
    p.words = Array(7).fill(w[lang]);
  }
  return p;
}

export function storyPlan(story, language = "en") {
  const lang = language === "ru" ? "ru" : "en";
  const s = localize(story, lang);
  const beats = s.beats.map((b) => ({
    ...b,
    panels: b.panels.map((pn) => ({ ...pn, params: expandParams(pn.action, pn.params || {}, lang) })),
  }));
  return {
    engine: "anim",
    source: "library",
    story: story.id,
    title: s.title,
    description: beats.flatMap((b) => (b.captions || []).map((c) => c.text)).join(" "),
    hashtags: HASHTAGS[lang],
    beats,
  };
}

export function pickStory(topic) {
  if (topic) {
    const q = String(topic).toLowerCase();
    let best = null, score = 0;
    for (const st of STORIES) {
      const sc = st.keywords.filter((k) => q.includes(k)).length;
      if (sc > score) { best = st; score = sc; }
    }
    if (best) return best;
  }
  return STORIES[Math.floor(Math.random() * STORIES.length)];
}
