// ============================================================================
//  Встроенная библиотека фраз: ролики без ИИ и без ключей.
//  Для каждой анимированной сцены — готовые «истории» из 2–3 подписей,
//  которые идут по ходу анимации: крючок → середина → вывод.
//  Формат подписи: "текст|слово-выделение".
// ============================================================================

const STORIES = {
  saver_vs_spender: {
    labels: { en: ["Saver", "Spender"], ru: ["Копит", "Тратит"] },
    keywords: ["save", "saving", "spend", "habit", "paycheck", "salary", "коп", "трат", "привыч", "зарплат", "сбереж"],
    en: [
      ["Same paycheck. Different habits.|habits", "One builds quietly.|quietly", "One wonders where it went.|went"],
      ["Both earned the same.|same", "Only one kept it.|kept", "Wealth is what you keep.|keep"],
      ["Spending feels good today.|today", "Saving feels good forever.|forever"],
      ["One looked rich.|looked", "One became rich.|became", "Don't confuse the two.|confuse"],
      ["Every coin is a choice.|choice", "Keep it or lose it.|keep", "Small choices. Big difference.|difference"],
      ["Nobody sees you saving.|saving", "Everyone sees you spending.|spending", "Only one makes you free.|free"],
      ["Income doesn't make you rich.|rich", "Habits do.|Habits"],
      ["Pay yourself first.|first", "Spend what's left.|left", "Not the other way around.|around"],
    ],
    ru: [
      ["Одна зарплата. Разные привычки.|привычки", "Один копит молча.|молча", "Другой не понимает, куда всё ушло.|ушло"],
      ["Оба заработали одинаково.|одинаково", "Сохранил только один.|Сохранил", "Богатство — это то, что остаётся.|остаётся"],
      ["Тратить приятно сегодня.|сегодня", "Копить приятно всегда.|всегда"],
      ["Один выглядел богатым.|выглядел", "Другой стал богатым.|стал", "Не путай эти вещи.|путай"],
      ["Каждая монета — это выбор.|выбор", "Сохранить или потерять.|Сохранить", "Маленький выбор. Большая разница.|разница"],
      ["Никто не видит, как ты копишь.|копишь", "Все видят, как ты тратишь.|тратишь", "Свободу даёт только одно.|Свободу"],
      ["Доход не делает богатым.|богатым", "Привычки делают.|Привычки"],
      ["Сначала заплати себе.|себе", "Потом трать остальное.|остальное", "Не наоборот.|наоборот"],
    ],
  },

  compound_stairs: {
    keywords: ["compound", "invest", "interest", "grow", "early", "time", "patience", "сложн", "инвест", "процент", "рост", "время", "терпен"],
    en: [
      ["Small amounts look useless.|useless", "Then time does the work.|time", "Start before it makes sense.|before"],
      ["Year one: nothing happens.|nothing", "Year ten: everything changes.|everything"],
      ["Compound interest is quiet.|quiet", "Until it isn't.|isn't"],
      ["Don't wait to invest.|wait", "Time is the multiplier.|Time"],
      ["Slow at first.|Slow", "Then all at once.|once"],
      ["Money makes money.|makes", "If you let it stay.|stay"],
      ["The best time to start was yesterday.|yesterday", "The second best is today.|today"],
      ["Patience is the strategy.|Patience", "Growth is the reward.|reward"],
    ],
    ru: [
      ["Маленькие суммы кажутся бесполезными.|бесполезными", "Потом работает время.|время", "Начни раньше, чем кажется нужным.|раньше"],
      ["Первый год: ничего не происходит.|ничего", "Десятый год: меняется всё.|всё"],
      ["Сложный процент работает тихо.|тихо", "Пока не станет громко.|громко"],
      ["Не жди, чтобы инвестировать.|жди", "Время — главный множитель.|Время"],
      ["Сначала медленно.|медленно", "Потом сразу.|сразу"],
      ["Деньги делают деньги.|делают", "Если дать им остаться.|остаться"],
      ["Лучшее время начать было вчера.|вчера", "Следующее лучшее — сегодня.|сегодня"],
      ["Терпение — это стратегия.|Терпение", "Рост — это награда.|награда"],
    ],
  },

  crowd_follow: {
    keywords: ["crowd", "consum", "buy", "shop", "trend", "impress", "status", "толп", "покуп", "потреб", "тренд", "впечатл", "статус"],
    en: [
      ["Everyone buys what everyone buys.|everyone", "Few ask where it leads.|leads", "Walk the other way.|other"],
      ["Don't spend to impress.|impress", "They are not even looking.|looking"],
      ["The crowd is always shopping.|shopping", "The crowd is always broke.|broke"],
      ["Normal is living on credit.|Normal", "Be weird. Be free.|free"],
      ["New phone. New car. New debt.|debt", "Same direction for everyone.|direction", "Turn around.|around"],
      ["Following the crowd is easy.|easy", "Being broke is easier.|broke"],
      ["Buy now, pay later.|later", "Later always comes.|always"],
      ["Rich people don't follow trends.|trends", "They own them.|own"],
    ],
    ru: [
      ["Все покупают то, что покупают все.|все", "Мало кто спрашивает, куда это ведёт.|ведёт", "Иди в другую сторону.|другую"],
      ["Не трать, чтобы впечатлить.|впечатлить", "На тебя даже не смотрят.|смотрят"],
      ["Толпа всегда покупает.|покупает", "Толпа всегда без денег.|без"],
      ["Норма — жить в кредит.|Норма", "Будь странным. Будь свободным.|свободным"],
      ["Новый телефон. Новая машина. Новый долг.|долг", "Все идут в одну сторону.|одну", "Развернись.|Развернись"],
      ["Идти за толпой легко.|легко", "Остаться без денег ещё легче.|легче"],
      ["Купи сейчас, плати потом.|потом", "«Потом» всегда наступает.|всегда"],
      ["Богатые не гонятся за трендами.|трендами", "Они ими владеют.|владеют"],
    ],
  },

  debt_ball: {
    keywords: ["debt", "credit", "loan", "card", "mortgage", "долг", "кредит", "займ", "ипотек", "карт"],
    en: [
      ["Debt feels light at first.|light", "Then it grows.|grows", "Then it decides where you go.|decides"],
      ["Minimum payment.|Minimum", "Maximum interest.|Maximum", "Endless weight.|weight"],
      ["A credit card is a loan.|loan", "With a heavy price.|heavy"],
      ["You bought it once.|once", "You keep paying for it.|keep"],
      ["Interest never sleeps.|never", "Neither does your debt.|debt"],
      ["Every loan says yes.|yes", "Your future pays for it.|future"],
      ["The chain is invisible.|invisible", "The weight is not.|weight"],
      ["Freedom is having no debt.|Freedom", "Not having more things.|things"],
    ],
    ru: [
      ["Сначала долг кажется лёгким.|лёгким", "Потом он растёт.|растёт", "Потом он решает, куда тебе идти.|решает"],
      ["Минимальный платёж.|Минимальный", "Максимальные проценты.|Максимальные", "Бесконечный груз.|груз"],
      ["Кредитка — это тоже долг.|долг", "И очень тяжёлый.|тяжёлый"],
      ["Купил один раз.|раз", "Платишь до сих пор.|Платишь"],
      ["Проценты никогда не спят.|никогда", "Твой долг тоже.|долг"],
      ["Кредит легко говорит «да».|да", "Платит за это твоё будущее.|будущее"],
      ["Цепь не видна.|видна", "Вес — виден.|виден"],
      ["Свобода — это жить без долгов.|Свобода", "А не иметь больше вещей.|вещей"],
    ],
  },

  ladder_climb: {
    keywords: ["step", "discipline", "goal", "wealth", "freedom", "climb", "progress", "шаг", "дисциплин", "цел", "богатств", "свобод", "прогресс"],
    en: [
      ["Wealth is built one step at a time.|step", "Nobody sees the climb.|climb", "Everyone sees the top.|top"],
      ["Save a little.|little", "Then a little more.|more", "Keep climbing.|climbing"],
      ["No shortcut to the top.|shortcut", "Only the next step.|next"],
      ["Every saved dollar is a step.|step", "Don't look down.|down"],
      ["Discipline is boring.|boring", "Freedom is not.|Freedom"],
      ["Rich is not a moment.|moment", "It's a ladder.|ladder"],
      ["Start where you are.|Start", "Climb with what you have.|Climb"],
      ["Slow progress is still progress.|still", "Keep going up.|up"],
    ],
    ru: [
      ["Богатство строится по ступеньке.|ступеньке", "Никто не видит подъём.|подъём", "Все видят вершину.|вершину"],
      ["Отложи немного.|немного", "Потом ещё немного.|ещё", "Продолжай подниматься.|подниматься"],
      ["Короткого пути наверх нет.|нет", "Есть только следующий шаг.|следующий"],
      ["Каждый сохранённый рубль — ступень.|ступень", "Не смотри вниз.|вниз"],
      ["Дисциплина — это скучно.|скучно", "Свобода — нет.|Свобода"],
      ["Богатство — не момент.|момент", "Это лестница.|лестница"],
      ["Начни там, где ты есть.|Начни", "Поднимайся с тем, что есть.|Поднимайся"],
      ["Медленный прогресс — тоже прогресс.|тоже", "Продолжай идти вверх.|вверх"],
    ],
  },

  door_light: {
    keywords: ["opportunit", "action", "raise", "business", "yourself", "fear", "chance", "возможн", "действ", "повышен", "бизнес", "себя", "страх", "шанс"],
    en: [
      ["Opportunity rarely knocks.|rarely", "You have to knock first.|knock"],
      ["Ask for the raise.|raise", "The worst answer is no.|no"],
      ["Money loves action.|action", "Doors open for those who knock.|knock"],
      ["Your first business feels scary.|scary", "Staying broke is scarier.|scarier"],
      ["Invest in yourself.|yourself", "It pays the best interest.|best"],
      ["Nobody will open it for you.|Nobody", "Knock.|Knock"],
      ["Fear keeps doors closed.|Fear", "Action opens them.|Action"],
      ["Behind every door is a chance.|chance", "Most never knock.|never"],
    ],
    ru: [
      ["Возможности редко стучат сами.|редко", "Стучать нужно тебе.|тебе"],
      ["Попроси повышение.|повышение", "Худший ответ — «нет».|нет"],
      ["Деньги любят действие.|действие", "Двери открываются тем, кто стучит.|стучит"],
      ["Свой бизнес — это страшно.|страшно", "Жить без денег страшнее.|страшнее"],
      ["Вкладывай в себя.|себя", "Это самые высокие проценты.|высокие"],
      ["Никто не откроет за тебя.|Никто", "Стучи.|Стучи"],
      ["Страх держит двери закрытыми.|Страх", "Действие их открывает.|Действие"],
      ["За каждой дверью — шанс.|шанс", "Большинство так и не стучит.|Большинство"],
    ],
  },

  paycheck_treadmill: {
    keywords: ["rat race", "paycheck", "lifestyle", "salary", "work", "broke", "крысин", "зарплат", "работ", "образ жизни", "нищет"],
    en: [
      ["Money comes in.|in", "Money goes out.|out", "You keep running.|running"],
      ["Working harder isn't the answer.|harder", "Keeping more is.|Keeping"],
      ["Bigger salary. Bigger spending.|Bigger", "Same treadmill.|treadmill"],
      ["Living paycheck to paycheck|paycheck", "is running in place.|place"],
      ["Your salary is not your wealth.|wealth", "What stays is.|stays"],
      ["Fast in. Fast out.|Fast", "Then you're just running.|running"],
      ["The rat race has no finish line.|finish", "Step off.|off"],
      ["Earn. Spend. Repeat.|Repeat", "Break the loop.|loop"],
    ],
    ru: [
      ["Деньги приходят.|приходят", "Деньги уходят.|уходят", "А ты всё бежишь.|бежишь"],
      ["Работать больше — не выход.|больше", "Выход — оставлять больше.|оставлять"],
      ["Больше зарплата. Больше трат.|Больше", "Та же дорожка.|дорожка"],
      ["Жить от зарплаты до зарплаты —|зарплаты", "значит бежать на месте.|месте"],
      ["Зарплата — это не богатство.|богатство", "Богатство — то, что осталось.|осталось"],
      ["Быстро пришло. Быстро ушло.|Быстро", "И ты просто бежишь.|бежишь"],
      ["У крысиных бегов нет финиша.|финиша", "Сойди с дорожки.|Сойди"],
      ["Заработал. Потратил. Повторил.|Повторил", "Разорви этот круг.|круг"],
    ],
  },
};

const HASHTAGS = {
  en: ["#money", "#finance", "#personalfinance", "#mindset", "#shorts"],
  ru: ["#деньги", "#финансы", "#финансоваяграмотность", "#мышление", "#shorts"],
};

const parse = (line) => {
  const [text, highlight = ""] = line.split("|");
  return { text, highlight };
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Сцена по ключевым словам темы; без совпадений — случайная
function matchTemplate(topic) {
  const names = Object.keys(STORIES);
  if (!topic) return pick(names);
  const q = String(topic).toLowerCase();
  let best = null, bestScore = 0;
  for (const name of names) {
    const score = STORIES[name].keywords.filter((k) => q.includes(k)).length;
    if (score > bestScore) { best = name; bestScore = score; }
  }
  return best || pick(names);
}

// План ролика без ИИ, в том же формате, что и от ИИ (engine "anim")
export function libraryPlan({ topic, language = "en", template } = {}) {
  const lang = language === "ru" ? "ru" : "en";
  const name = STORIES[template] ? template : matchTemplate(topic);
  const set = STORIES[name];
  const captions = pick(set[lang]).map(parse);
  return {
    engine: "anim",
    source: "library",
    title: captions[0].text.replace(/[.—-]+$/, "").trim(),
    description: captions.map((c) => c.text).join(" "),
    hashtags: HASHTAGS[lang],
    scenes: [{
      id: 0,
      template: name,
      duration: captions.length >= 3 ? 10 : 8,
      labels: set.labels ? set.labels[lang] : [],
      captions,
    }],
  };
}

// Идеи без ИИ: первые фразы историй
export function libraryIdeas({ language = "en", count = 10 } = {}) {
  const lang = language === "ru" ? "ru" : "en";
  const all = Object.entries(STORIES).flatMap(([name, set]) =>
    set[lang].map((story) => ({ topic: story.map((l) => parse(l).text).join(" "), template: name }))
  );
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count);
}
