// ============================================================================
//  Готовые длинные сценарии (режим без ИИ и образец для ИИ).
//  Структура как у Ifverse Tales: холодное начало → «как это работает» →
//  эскалация → цена → кульминация-выбор → развязка → «Is any of this real?» →
//  вопрос зрителю. Повествование от второго лица, короткие фразы.
//  Математика: $10 в день = $3,650 в год, 7% годовых (реальная доходность
//  рынка акций США с поправкой на инфляцию — долгосрочное среднее).
// ============================================================================

// Бит: narration — текст диктора; visual — раскладка и действие
const B = (narration, action, params = {}, extra = {}) => ({
  narration,
  layout: extra.layout || "single",
  panels: extra.panels || [{ action, params }],
  ...(extra.captions ? { captions: extra.captions } : {}),
});
const CH = (number, title) => ({ narration: "", layout: "single", panels: [{ action: "chapter_card", params: { number, title } }], duration: 3 });
const P = (action, params = {}, label = "", labelColor = "white") => ({ action, params, label, labelColor });

export const LONG_STORIES = [
  {
    id: "ten_dollars_a_day",
    title: "What If You Invested $10 a Day Starting at 18?",
    thumbnail: ["$10", "A DAY."],
    tags: ["what if", "investing", "compound interest", "money animation", "stickman animation", "personal finance", "how to get rich", "financial freedom", "10 dollars a day", "stock market"],
    hashtags: ["#whatif", "#money", "#investing", "#animation", "#finance"],
    chapters: [
      {
        title: "The coffee",
        beats: [
          B("It's seven in the morning. You're eighteen years old, and you're late, as always. On the way to class you grab a coffee. Five dollars.", "coffee_shop", { text: "That'll be five dollars.", price: "-$5" }),
          B("At lunch, a sandwich. Five more. Ten dollars, gone before noon. You don't even notice. Nobody ever notices.", "street_night", { sign: "LUNCH $5", from: 210, to: 200 }),
          B("But tonight, lying in bed, you do some math you've never done before. Ten dollars a day. Every day. For the rest of your life.", "bedroom_night", { text: "Where does it all go?" }),
          B("So here's the question. What if, starting tomorrow, you never spent those ten dollars again?", "thought", { text: "What if I kept the $10?" }),
          B("What if you put them somewhere, every single day, no matter what, and simply never touched them?", "jar_fill", { from: 0, level: 0.15 }),
          B("Would anything really change? Or would you just be the weird kid with no coffee?", "big_number", { from: 0, to: 10, label: "per day" }),
        ],
      },
      {
        title: "How it works",
        beats: [
          CH("Chapter 1", "How it works"),
          B("Here's how it works. Ten dollars a day is seventy dollars a week. Three hundred a month. Three thousand six hundred and fifty dollars a year.", "big_number", { from: 10, to: 3650, label: "per year" }),
          B("You don't hide it under your bed. You put it into a simple index fund. One click, and you own a tiny slice of the five hundred biggest companies in America.", "pillars", { pillars: [{ label: "Apple", h: 0.6 }, { label: "Amazon", h: 0.7 }, { label: "You", h: 0.25, color: "gold", text: "$" }] }),
          B("When they grow, you grow. When they pay dividends, so do you. You're not a customer anymore. You're an owner.", "pillars", { pillars: [{ label: "Customer", h: 0.3 }, { label: "Employee", h: 0.5 }, { label: "Owner", h: 1, color: "gold", text: "$" }] }),
          B("Over the last hundred years, that kind of fund has grown about seven percent a year after inflation. Some years up thirty. Some years down forty. But on average, seven.", "line_chart", { trend: "volatile_up" }),
          B("Seven percent doesn't sound like much. Your friends laugh at it. But here's the trick nobody explains in school.", "talk", { text: "Seven percent? That's it?", speaker: "right", left: "You", right: "Jake" }),
          B("Your money earns money. Then that money earns money too. And then that money earns money. It grows on itself, like a tree that drops seeds that grow into more trees.", "tree_grow", { from: 0.05, grow: 0.7 }),
          B("It's called compound interest. Einstein supposedly called it the eighth wonder of the world. And at the beginning, it is painfully, unbelievably slow.", "hammer_rock", { hits: 365, break: false }),
        ],
      },
      {
        title: "The boring years",
        beats: [
          CH("Chapter 2", "The boring years"),
          B("Year one. You skip the coffee. Every single day. You make your own sandwiches. By December, you've saved about three thousand seven hundred dollars.", "phone", { from: 0, to: 3777, label: "Investments" }),
          B("Meanwhile, your friends are living. New phones. New sneakers. Concert tickets. A trip to Ibiza that everyone posts about for a month.", "party", { label: "IBIZA" }),
          B("And they invite you every time.", "apartment_night", { text: "You're coming, right? Everyone's going." }),
          B("You stay home. You scroll through their photos. It feels like the whole world is having fun without you.", "thought", { text: "Am I wasting my youth?" }),
          B("Year three. Year four. Year five. Twenty-one thousand dollars.", "bars_growth", { bars: [{ label: "Y1", value: 3.8 }, { label: "Y2", value: 7.8 }, { label: "Y3", value: 12 }, { label: "Y4", value: 16.4 }, { label: "Y5", value: 21, text: "$21K" }] }),
          B("It sounds like a lot. But look closer. Almost all of it is just your own coffee money. The market has added barely three thousand dollars.", "seesaw", { left: "Yours", right: "Growth", leftWeight: 1.6, rightWeight: 0.5, leftColor: "white", rightColor: "gold" }),
          B("Five years of sacrifice, for three thousand dollars of growth. This is the exact moment where most people quit.", "push_boulder", { label: "BORING", labelColor: "white", outcome: "slip" }),
          B("You almost do too. But you made yourself one rule. Ten dollars. Every day. No matter what.", "stairs_goal", { steps: ["Day 1", "Day 500", "Day 1000", "Day 1825"], reward: "none" }),
        ],
      },
      {
        title: "The crash",
        beats: [
          CH("Chapter 3", "The crash"),
          B("Age thirty. Twelve years in. You've built sixty-five thousand dollars, and for the first time, it feels real.", "phone", { from: 50000, to: 65300, label: "Investments" }),
          B("Then, one morning, you open the news. Everything is red.", "news_crash"),
          B("The market drops thirty-five percent in six weeks. Your sixty-five thousand becomes forty-two.", "phone", { from: 65300, to: 42400, label: "Investments", notice: "Market down -35%" }),
          B("Twenty-three thousand dollars. Gone. That's six years of coffee, wiped out while you were asleep.", "big_number", { from: 0, to: -23000, color: "red", label: "in 6 weeks" }),
          B("Everyone around you is selling. Every expert on TV says it's going lower. Your coworkers say they got out just in time.", "crowd_react", { mood: "shock", label: "SELL EVERYTHING", labelColor: "red" }),
          B("Your finger is on the button. Sell. Save what's left. Stop the bleeding. It's the most natural thing in the world.", "split_paths", { left: "Sell", right: "Hold", choice: "right" }),
          B("You don't. You close the app. You go for a walk. And the next morning, you put in ten more dollars. Like always.", "jar_fill", { from: 0.4, level: 0.5 }),
          B("In fact, those ten dollars just bought more than ever. Everything is on sale. You just can't see it yet.", "thought", { text: "Everything is on sale." }),
        ],
      },
      {
        title: "The snowball",
        beats: [
          CH("Chapter 4", "The snowball"),
          B("Two years later, the market is back. Not just back. Higher than before. And the people who sold? They bought back in at the top.", "line_chart", { trend: "zoom_out" }),
          B("The shares you bought during the crash grew the fastest of all.", "stack2", {}, { layout: "stack2", panels: [P("tree_grow", { from: 0.3, grow: 0.08 }, "Sold in panic", "red"), P("tree_grow", { from: 0.3, grow: 1, harvest: true }, "Stayed invested", "gold")] }),
          B("Age thirty-eight. A hundred and fifty thousand dollars. You still drink the cheap coffee. You still make your sandwiches.", "big_number", { from: 65000, to: 150000, label: "age 38" }),
          B("And now something strange happens. In a single year, the market earns you more than you put in. Ten thousand dollars of growth, from three and a half thousand of savings.", "seesaw", { left: "Yours", right: "Growth", leftWeight: 1, rightWeight: 1.6, leftColor: "white", rightColor: "gold" }),
          B("Your money is officially working harder than you are. While you sit in meetings, it works. While you sleep, it works.", "office", {}),
          B("Age forty-eight. Three hundred and forty-five thousand dollars.", "bars_growth", { bars: [{ label: "28", value: 50 }, { label: "38", value: 150 }, { label: "48", value: 345, text: "$345K" }] }),
          B("The snowball has stopped rolling. Now it's an avalanche. Every year it adds more than the year before.", "coins_pour"),
        ],
      },
      {
        title: "The call",
        beats: [
          CH("Chapter 5", "The call"),
          B("Then, one night, your phone rings. It's Jake. Your best friend since school.", "balcony_rain", { caller: "Jake" }),
          B("The guy with the new phones. The trips. The car on credit. The one who always said you only live once.", "debt_ball"),
          B("His voice is shaking. He's forty-eight thousand dollars in debt. Credit cards, a car loan, a second mortgage. The bank is taking his house.", "balcony_rain", { text: "Jake, slow down. How much?", lightning: false }),
          B("You could help him. You have the money. But you know the math better than anyone.", "thought", { text: "$48,000 today... or $186,000 at 65?" }),
          B("Every dollar you pull out today is almost four dollars you won't have at sixty-five. Forty-eight thousand today is a hundred and eighty-six thousand later.", "big_number", { from: 48000, to: 186000, label: "what it costs you", color: "red" }),
          B("Your money, or your best friend.", "split_paths", { left: "Keep it", right: "Help Jake", choice: "right" }),
          B("You close the calculator. Some things don't compound. But some things are worth more than compound interest.", "thought", { text: "Some things don't compound." }),
          B("You pay off his debt. And you give him one more thing. A folded note. It says: ten dollars a day.", "talk", { text: "Skip the coffee. Trust me.", speaker: "left", left: "You", right: "Jake" }),
        ],
      },
      {
        title: "Sixty-five",
        beats: [
          CH("Chapter 6", "Sixty-five"),
          B("Seventeen years pass. The crashes come and go, like weather. You keep going. Ten dollars a day.", "age_counter", { from: 48, to: 65 }),
          B("On your sixty-fifth birthday, you finally sit down and look at the numbers.", "desk_work", { fast: false }),
          B("You put in a hundred and seventy-one thousand dollars of your own money. Ten dollars at a time.", "big_number", { from: 0, to: 171550, color: "white", label: "your money" }),
          B("Your account says one point two million.", "phone", { from: 171550, to: 1198000, label: "Investments" }),
          B("Over a million dollars that the market made for you. Not from a lottery. Not from a genius trade. From skipping a coffee.", "coins_pour", { label: "$1,198,000" }),
          B("You buy a small house by the sea. Cash. No bank. No mortgage. No one can ever take it.", "beach_house", { label: "PAID IN FULL", friend: false }),
          B("And one evening, there's a knock on the door. It's Jake. He's holding two coffees. Cheap ones.", "beach_house", { text: "I kept your note." }),
          B("Ten dollars a day. It didn't just change your life. It changed his.", "victory", { label: "TWO LIVES" }),
        ],
      },
      {
        title: "Is any of this real?",
        beats: [
          CH("Chapter 7", "Is any of this real?"),
          B("So, is any of this real? Mostly, yes.", "thought", { text: "Could this actually work?" }),
          B("Since the late nineteen-twenties, the S&P 500 has returned roughly ten percent a year on average. Around seven percent after inflation.", "line_chart", { trend: "volatile_up" }),
          B("And seven percent a year on three thousand six hundred and fifty dollars, for forty-seven years, really does end near one point two million in today's money.", "bars_growth", { bars: [{ label: "18", value: 1 }, { label: "28", value: 50 }, { label: "38", value: 150 }, { label: "48", value: 345 }, { label: "58", value: 730 }, { label: "65", value: 1198, text: "$1.2M" }] }),
          B("Crashes are real too. The market fell more than thirty percent in 1987, in 2008, and again in 2020. And each time, it eventually came back.", "line_chart", { trend: "crash" }),
          B("Studies of investor behavior keep finding the same thing. Many people earn less than the funds they own, because they sell in panic and buy back too late.", "stack2", {}, { layout: "stack2", panels: [P("meters", { bars: [{ label: "Fund", level: 0.8, color: "gold" }] }, "The fund"), P("meters", { bars: [{ label: "Investor", level: 0.55, color: "red" }] }, "The average investor", "red")] }),
          B("Of course, the future isn't guaranteed, and seven percent is an average, not a promise. This isn't financial advice.", "seesaw", { left: "Risk", right: "Time", leftWeight: 1, rightWeight: 1.4, leftColor: "red", rightColor: "gold" }),
          B("But the pattern is real. The superpower isn't picking stocks. It's time. And the discipline to not touch it.", "timeline", { points: [{ label: "18", sub: "$10/day" }, { label: "30", sub: "crash" }, { label: "48" }, { label: "65", sub: "$1.2M" }] }),
        ],
      },
      {
        title: "What do you think?",
        beats: [
          B("So, what would you do? Keep the coffee, or keep the ten dollars?", "split_paths", { left: "Coffee", right: "$10/day", choice: "right" }),
          B("And would you have helped Jake, knowing what it would cost you? Tell us in the comments.", "crowd_react", { mood: "clap" }),
          B("And if you'd have skipped that coffee too, hit like and subscribe for more money what ifs.", "victory", { label: "SUBSCRIBE" }),
        ],
      },
    ],
  },
];
