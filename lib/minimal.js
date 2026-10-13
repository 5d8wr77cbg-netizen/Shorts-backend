// ============================================================================
//  Стиль "minimal" — минималистичные 3D-анимации про деньги.
//  Формула по разбору канала Simply Animated (сотни тысяч–миллионы просмотров):
//    • чёрный фон, белые глянцевые человечки, один источник света;
//    • ОДНА идея = ОДНА визуальная метафора (стена, лестница, толпа, дверь);
//    • 1 короткая фраза сверху, печатается по буквам, одно слово жирным;
//    • иногда 2 подписи-противопоставления над героями ("Saver" / "Spender");
//    • 2–4 сцены, 10–20 секунд, финальная сцена — поворот/вывод;
//    • никаких цифр, графиков, таблиц и «туториала».
// ============================================================================

export const MINIMAL_IMAGE_STYLE =
  "Minimalist 3D render on a pure black background (#000000). " +
  "Characters: smooth glossy white mannequin stick figures with round heads, no faces, simple rounded limbs, all identical. " +
  "Props (coins, banknote stacks, bricks, ladders, doors, ropes, chains) are matte white or light grey clay, simple shapes. " +
  "Lighting: one soft top spotlight, subtle glow, soft contact shadows on an invisible floor, no visible environment. " +
  "Monochrome, high contrast, calm and cinematic, lots of empty black negative space. " +
  "Composition: subject in the lower-middle of a vertical 9:16 frame, the top 30% of the frame is empty black. " +
  "Absolutely no text, letters, numbers, symbols, logos or watermark.";

export function minimalImagePrompt(scene) {
  return `${MINIMAL_IMAGE_STYLE}\n\nScene: ${scene}`;
}

const LANG = { en: "English", ru: "Russian", es: "Spanish", de: "German" };

export function planSystemPrompt({ language = "en", scenes = 3 }) {
  const lang = LANG[language] || language;
  return `You write viral faceless YouTube Shorts in the "minimal 3D metaphor" format about MONEY (saving, spending, debt, investing, compound interest, inflation, income, habits of rich vs poor, financial freedom, lifestyle inflation, consumerism).

How the format works (copy it exactly):
- ONE money truth, shown through ONE simple visual metaphor with white mannequin figures on a black background.
- ${scenes} scenes, 3-6 seconds each, 10-20 seconds total. No voiceover: the picture and a short caption carry everything.
- Each caption: max 7 words, calm, quiet, like a truth whispered. Not clickbait, no emojis, no hashtags, no numbers or $ amounts.
- "highlight": the one key word of the caption that will be shown bold (must be a word from the caption), or "".
- Optional "labels": exactly two short words naming the two characters in a comparison scene, e.g. ["Saver","Spender"], ["Buyer","Owner"], ["Employee","Investor"]. Use them only when two figures are compared side by side, otherwise [].
- Scene 1 is the hook: a clear contrast or a strange situation that makes people stay. The last scene is the twist / lesson.
- The SAME characters and props continue across scenes so the story progresses (e.g. the saver's coin tower keeps growing while the spender's pile shrinks).

Proven patterns to adapt:
1. Contrast over time: two figures side by side, one builds slowly (coins, bricks), the other spends; at the end one is on top.
2. Crowd vs one: a crowd walks blindly into a shop / towards a credit card trap; one figure turns away.
3. Obstacle metaphor: a ladder, a wall of debt, a door, a rope, a treadmill, chains, a cage made of bills.
4. Trap reveal: something looks like a gift (a loan, a sale, a new car) and turns into a weight or a cage.

"imagePrompt": English, describe ONLY what is in the frame: number of figures, their poses and actions, props, their position and relative size. Keep it concrete and simple (1-3 sentences). Do not describe style, lighting or background and never ask for text in the image.

Captions, labels, title and description are written in ${lang}. imagePrompt is always English.

Answer with JSON only:
{"title":"<=60 chars, curiosity, no clickbait caps","description":"1-2 sentences","hashtags":["#money", "..."],
 "scenes":[{"caption":"...","highlight":"...","labels":[],"imagePrompt":"...","duration":4}]}`;
}

export function ideasSystemPrompt({ language = "en", count = 10 }) {
  const lang = LANG[language] || language;
  return `You generate ideas for faceless YouTube Shorts about MONEY in the "minimal 3D metaphor" format: white mannequin figures on a black background, one money truth shown through one visual metaphor, 10-20 seconds, a single short caption per scene.
Give ${count} different ideas. Each idea: "topic" (the money truth, in ${lang}) and "metaphor" (one sentence, English, what the viewer sees).
Answer with JSON only: {"ideas":[{"topic":"...","metaphor":"..."}]}`;
}

export function normalizePlan(plan, maxScenes = 6) {
  const scenes = (Array.isArray(plan?.scenes) ? plan.scenes : []).slice(0, maxScenes).map((s, i) => {
    const caption = String(s.caption || "").trim().slice(0, 80);
    const highlight = String(s.highlight || "").trim();
    return {
      id: i,
      caption,
      highlight: caption.toLowerCase().includes(highlight.toLowerCase()) ? highlight : "",
      labels: Array.isArray(s.labels) && s.labels.length === 2 ? s.labels.map((l) => String(l).slice(0, 20)) : [],
      imagePrompt: String(s.imagePrompt || caption),
      duration: Math.min(Math.max(+s.duration || 4, 3), 7),
    };
  });
  return {
    title: String(plan?.title || "").slice(0, 100),
    description: String(plan?.description || ""),
    hashtags: Array.isArray(plan?.hashtags) ? plan.hashtags.slice(0, 8) : [],
    scenes,
  };
}

// ── Анимированный режим: GPT выбирает готовые анимированные сцены ─────────
export function animPlanSystemPrompt({ language = "en", templates }) {
  const lang = LANG[language] || language;
  const list = Object.entries(templates).map(([name, t]) => `- ${name} (${t.duration}s): ${t.about}`).join("\n");
  return `You write viral faceless YouTube Shorts about MONEY in the "minimal 3D metaphor" format: white mannequin figures on a black background, no voiceover, one quiet caption at a time on top of the animation.

You can only use these ready-made animations:
${list}

Rules:
- Pick ONE money truth and the ONE animation that shows it best (use two animations only if the idea really needs a second beat). Total 9-20 seconds.
- For each animation write 2-3 captions that appear one after another while it plays. The first caption is the hook, the last one is the twist / lesson. The captions must match what is happening on screen at that moment (beginning, middle, end of the animation).
- Each caption: max 7 words, calm, quiet, like a truth whispered. No clickbait, no emojis, no hashtags, no numbers or $ amounts.
- "highlight": one key word from that caption to show bold, or "".
- "labels": only for saver_vs_spender — two short words naming the left and right figure (default ["Saver","Spender"]); otherwise [].
- Captions, labels, title and description are written in ${lang}.

Answer with JSON only:
{"title":"<=60 chars","description":"1-2 sentences","hashtags":["#money","..."],
 "scenes":[{"template":"<name>","duration":10,"labels":[],"captions":[{"text":"...","highlight":"..."}]}]}`;
}

export function normalizeAnimPlan(plan, templates) {
  const scenes = (Array.isArray(plan?.scenes) ? plan.scenes : [])
    .filter((s) => templates[s?.template])
    .slice(0, 3)
    .map((s, i) => {
      const tpl = templates[s.template];
      const captions = (Array.isArray(s.captions) ? s.captions : [])
        .map((c) => (typeof c === "string" ? { text: c } : c))
        .filter((c) => c && c.text)
        .slice(0, 4)
        .map((c) => {
          const text = String(c.text).trim().slice(0, 80);
          const hl = String(c.highlight || "").trim();
          return { text, highlight: hl && text.toLowerCase().includes(hl.toLowerCase()) ? hl : "" };
        });
      const labels = Array.isArray(s.labels) && s.labels.length === 2
        ? s.labels.map((l) => String(l).slice(0, 20))
        : tpl.labels || [];
      return {
        id: i,
        template: s.template,
        duration: Math.min(Math.max(+s.duration || tpl.duration, 6), 15),
        labels,
        captions,
      };
    });
  return {
    title: String(plan?.title || "").slice(0, 100),
    description: String(plan?.description || ""),
    hashtags: Array.isArray(plan?.hashtags) ? plan.hashtags.slice(0, 8) : [],
    scenes,
  };
}
