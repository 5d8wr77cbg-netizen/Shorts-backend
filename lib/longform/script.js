// ============================================================================
//  Сценарии длинных роликов «What if…» про деньги — через ИИ.
//  Разбор Ifverse Tales (2,7 млн просмотров у ролика недельного канала):
//    • 7–9 минут, повествование от второго лица («You…»), настоящее время,
//      короткие рубленые фразы, 115–130 слов в минуту;
//    • холодное начало-крючок → «Here's how it works» с реальными цифрами →
//      эскалация (примеры всё круче) → цена способности → кульминация с
//      моральным выбором → развязка с поворотом → «Is any of this real?» с
//      настоящими фактами → вопрос зрителю + «like and subscribe»;
//    • главы с таймкодами, обложка — 2 слова крупно (белое + жёлтое).
//  Генерация в два шага: план (главы) → каждая глава (биты с текстом и картинкой).
// ============================================================================

import { chatJson } from "../llm.js";
import { LONG_STORIES } from "./library.js";

const LANG = { en: "English", ru: "Russian", es: "Spanish", de: "German" };

function sampleChapter() {
  const ch = LONG_STORIES[0].chapters[3]; // «The crash» — эталон тона и темпа
  return JSON.stringify({ title: ch.title, beats: ch.beats.slice(1, 6).map((b) => ({ narration: b.narration, mood: b.mood, layout: b.layout, panels: b.panels })) });
}

export function outlinePrompt({ language = "en", minutes = 9 }) {
  const lang = LANG[language] || language;
  return `You are the head writer of a faceless YouTube channel that makes ${minutes}+ minute animated "What if...?" films about MONEY (white stick figures on a black background, gold accents, a calm deep narrator). The format copies the channel Ifverse Tales, whose film "What If Your Reaction Time Was 10x Faster?" got 2.7M views in a week.

Their storytelling formula (follow it exactly, adapted to money):
1. Cold open (2-4 beats): drop the viewer into a vivid everyday money moment, second person, then ask the "What if" question.
2. "Here's how it works": the mechanism with REAL numbers (interest rates, prices, averages) explained simply.
3. Escalation chapters: each chapter raises the stakes; concrete examples get bigger and crazier; time jumps (age 18 → 30 → 48 → 65 or day 1 → year 5).
4. The cost: what the "power" costs the hero (social pressure, boredom, a crash, temptation, lost friends).
5. Climax: a moral choice between money and a person or a value (like "the ball or the boy?").
6. Resolution with a twist and an emotional payoff.
7. "Is any of this real?": real-world facts and studies that support or limit the premise (accurate, hedged where needed, plus "this isn't financial advice").
8. "What do you think?": a question for the comments and "Hit like and subscribe for more money what ifs."

The hero is "you" (second person). Give side characters short names. Keep facts accurate; never invent precise statistics you are not sure about — use rounded, widely known figures and hedge ("about", "roughly").

Write in ${lang}. Plan 8-10 chapters for a ${minutes}-${minutes + 2} minute film (about ${Math.round(minutes * 140)} narrated words in total).

Answer with JSON only:
{"title":"What If ...? (max 60 chars, like 'What If Your Reaction Time Was 10x Faster?')","thumbnail":["WORD1","WORD2."],
 "description":"Two short paragraphs separated by a blank line: 1) a vivid hook that starts with 'What if' and paints the moment; 2) the setup: the hero, the stakes, and the impossible choice, ending on a cliffhanger",
 "descriptionEnd":"Two short paragraphs: 1) 'Is any of this real? We look at what ... says: ...' (name the real facts covered, add 'This isn't financial advice.'); 2) questions for the comments + 'And which money \"what if\" should we do next? Tell us in the comments.'",
 "tags":["20 tags: 'what if', 'moneylearn', 'what if animation', 'animated short film', 'stickman animation', 'money story', the full title in lowercase, then topic keywords, 'animation', 'animated story', 'stickman', 'could this really happen'"],"hashtags":["exactly 5: #whatif #money #animation + 2 topic tags"],
 "chapters":[{"title":"short chapter title","plan":"2-4 sentences: what happens, key numbers, emotional beat","words":140}]}`;
}

export function chapterPrompt({ language = "en", actions, layouts }) {
  const lang = LANG[language] || language;
  const list = Object.entries(actions).map(([n, a]) => `- ${n}${a.params ? ` {${a.params}}` : ""}: ${a.about}`).join("\n");
  return `You write one chapter of a long animated "What if...?" money film (format of Ifverse Tales): narrated in second person ("you"), present tense, short punchy sentences, concrete numbers, vivid everyday details, rising tension. Each beat is one shot: 1-3 sentences of narration (12-40 words) plus the animation shown while it is spoken.

Visual rules: pick the animation that literally shows what the narration says; vary them (do not repeat the same action twice in a row); use phone/big_number for money amounts, age_counter/timeline for time jumps, talk for dialogue lines (the bubble text is the spoken line, max 12 words), split_paths for choices, line_chart for markets, crowd_react for social pressure, stack2/side2 layouts for comparisons. Labels and params are short and in ${lang}.

Layouts: ${Object.keys(layouts).join(", ")} (panel count must match: single 1, stack2 2, side2 2, stack3 3, grid4 4).
Animations (use only these names; params in braces):
${list}

Example chapter (tone, pacing and visual choices to imitate):
${sampleChapter()}

Music follows each beat's "mood" (pick the feeling of that moment, the soundtrack crossfades when it changes): calm (everyday life), curious (explaining, numbers, questions), tension (crash, danger, panic, hard choice), sad (loss, loneliness, regret), hopeful (growth, recovery, warmth), triumph (big win, payoff, finale).

Write narration in ${lang}. Answer with JSON only:
{"beats":[{"narration":"...","mood":"calm","layout":"single","panels":[{"action":"<name>","label":"","labelColor":"white","params":{}}]}]}`;
}

const MOODS = new Set(["calm", "curious", "tension", "sad", "hopeful", "triumph"]);

export function normalizeLongBeats(raw, { actions, layouts }) {
  const colors = new Set(["white", "gold", "red", "green", "blue", "grey"]);
  return (Array.isArray(raw?.beats) ? raw.beats : [])
    .map((b) => {
      const narration = String(b?.narration || "").trim().slice(0, 600);
      const layout = layouts[b?.layout] ? b.layout : "single";
      const slots = layouts[layout].length;
      let panels = (Array.isArray(b?.panels) ? b.panels : [])
        .filter((pn) => actions[pn?.action])
        .slice(0, slots)
        .map((pn) => ({
          action: pn.action,
          label: pn.label ? String(pn.label).slice(0, 40) : "",
          labelColor: colors.has(pn.labelColor) ? pn.labelColor : "white",
          params: pn.params && typeof pn.params === "object" ? pn.params : {},
        }));
      if (panels.length !== slots) {
        // раскладка не сошлась — оставляем первую валидную панель на весь кадр
        if (!panels.length) panels = [{ action: "thought", label: "", labelColor: "white", params: {} }];
        return narration ? { narration, layout: "single", panels: panels.slice(0, 1), ...(MOODS.has(b?.mood) ? { mood: b.mood } : {}) } : null;
      }
      return narration ? { narration, layout, panels, ...(MOODS.has(b?.mood) ? { mood: b.mood } : {}) } : null;
    })
    .filter(Boolean)
    .slice(0, 14);
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

// Полный сценарий через ИИ: { title, thumbnail, description, tags, hashtags, chapters:[{title, beats}] }
export async function writeLongScript({ topic, language = "en", minutes = 9, actions, layouts, onProgress }) {
  const ask = topic
    ? `Premise / topic: ${topic}. Turn it into a "What if...?" money film.`
    : "Pick a strong, surprising money 'What if...?' premise yourself (not 'what if you won the lottery').";
  onProgress?.("План сценария");
  const outline = await chatJson(outlinePrompt({ language, minutes }), ask, 3000);
  const chapters = (Array.isArray(outline?.chapters) ? outline.chapters : []).slice(0, 11);
  if (chapters.length < 5) throw new Error("ИИ не вернул план глав");
  const system = chapterPrompt({ language, actions, layouts });
  let done = 0;
  const written = await mapLimit(chapters, 3, async (ch, i) => {
    const context = chapters.map((c, j) => `${j + 1}. ${c.title}: ${c.plan}`).join("\n");
    const user = `Film: ${outline.title}\nFull plan:\n${context}\n\nWrite chapter ${i + 1} "${ch.title}" now: ${ch.plan}\nTarget about ${Math.max(60, +ch.words || 140)} narrated words in ${Math.round(Math.max(60, +ch.words || 140) / 25)} beats.${i === 0 ? " This is the cold open: hook first, end with the What if question." : ""}`;
    const res = await chatJson(system, user, 4000);
    onProgress?.(`Главы сценария ${++done}/${chapters.length}`);
    return { title: String(ch.title || `Chapter ${i + 1}`).slice(0, 60), beats: normalizeLongBeats(res, { actions, layouts }) };
  });
  const good = written.filter((c) => c.beats.length);
  if (good.length < 5) throw new Error("ИИ не написал главы");
  return {
    title: String(outline.title || "").slice(0, 100),
    thumbnail: Array.isArray(outline.thumbnail) ? outline.thumbnail.slice(0, 2).map((x) => String(x).slice(0, 14)) : ["WHAT", "IF?"],
    description: String(outline.description || ""),
    descriptionEnd: String(outline.descriptionEnd || ""),
    tags: Array.isArray(outline.tags) ? outline.tags.slice(0, 20).map(String) : [],
    hashtags: Array.isArray(outline.hashtags) ? outline.hashtags.slice(0, 5).map(String) : ["#whatif", "#money", "#animation"],
    chapters: good,
  };
}

// Заставки глав добавляются автоматически (кроме первой — холодного начала)
export function withChapterCards(script, language = "en") {
  const word = language === "ru" ? "Глава" : "Chapter";
  return {
    ...script,
    chapters: script.chapters.map((ch, i) => {
      if (i === 0 || ch.beats[0]?.panels?.[0]?.action === "chapter_card") return ch;
      return { ...ch, beats: [{ narration: "", layout: "single", panels: [{ action: "chapter_card", params: { number: `${word} ${i}`, title: ch.title } }], duration: 3 }, ...ch.beats] };
    }),
  };
}
