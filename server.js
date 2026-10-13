// ============================================================================
//  Shorts Studio — Backend (Node.js + Express)
//  Безопасно хранит API-ключи в .env и проксирует запросы к ИИ.
//  Работает и без ключей: анимированные ролики собираются из библиотеки фраз.
//  Эндпоинты:
//    GET  /                 — страница «Сделать ролик» (public/index.html), удобно с телефона
//    GET  /health           — проверка живости
//    POST /api/script       — генерация сценария (GPT)
//    POST /api/scene-prompts — разбивка сценария на сцены + DALL-E промпты
//    POST /api/generate-image — генерация картинки (DALL-E 3)
//    POST /api/tts          — озвучка текста (OpenAI TTS)
//    POST /api/build-video  — сборка финального MP4 через FFmpeg
//    POST /api/minimal/ideas  — идеи роликов про деньги в стиле "minimal"
//    POST /api/minimal/plan   — сценарий ролика в стиле "minimal"
//    POST /api/minimal/render — весь ролик "под ключ": план → анимация → MP4
//    GET  /api/anim/templates — список анимированных сцен
//    POST /api/anim/render    — собрать ролик из анимированных сцен (без GPT)
//    POST /api/jobs           — то же в фоне: { id } → GET /api/jobs/:id, /api/jobs/:id/video
//                               mode=long — длинный ролик 9+ мин 16:9 с озвучкой (+ /thumb)
// ============================================================================

import "dotenv/config"; // первым: ключи нужны модулям ниже при импорте
import express from "express";
import cors from "cors";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import { buildVideo } from "./lib/video.js";
import {
  minimalImagePrompt, planSystemPrompt, ideasSystemPrompt, normalizePlan, beatsPlanSystemPrompt, normalizeBeatsPlan,
} from "./lib/minimal.js";
import { TEMPLATES } from "./lib/anim/scenes.js";
import { renderBeat, beatDuration, validateBeat, sceneToBeat, ALL_ACTIONS, LAYOUTS } from "./lib/anim/beats.js";
import { STORIES, storyPlan, pickStory } from "./lib/stories.js";
import { FORMATS } from "./lib/video.js";
import { chat, chatJson, requireOpenAI, LLM_PROVIDER, LLM_MODEL } from "./lib/llm.js";
import { libraryPlan } from "./lib/phrases.js";
import { createLimiter } from "./lib/queue.js";
import { LONG_STORIES } from "./lib/longform/library.js";
import { mountTrader } from "./lib/trader/index.js";
import { writeLongScript, withChapterCards } from "./lib/longform/script.js";
import { buildLongVideo } from "./lib/longform/build.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

// ── App setup ───────────────────────────────────────────────────────────────
const app = express();

// CORS — разрешаем фронтенду обращаться к бэкенду.
// Для продакшена замени "*" на свой домен (например https://my-app.vercel.app)
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "25mb" }));

// Страница «Сделать ролик»
app.use(express.static(path.join(__dirname, "public")));

// Код доступа: если задан ACCESS_CODE, все POST /api/* требуют заголовок X-Access-Code.
// Нужен, когда сервер открыт в интернете, чтобы чужие не тратили его ресурсы и лимиты ИИ.
const ACCESS_CODE = process.env.ACCESS_CODE || "";
app.use("/api", (req, res, next) => {
  if (!ACCESS_CODE || req.method !== "POST") return next();
  if (req.get("X-Access-Code") === ACCESS_CODE) return next();
  res.status(401).json({ error: "Неверный код доступа" });
});

// Временная папка для файлов рендера
const TMP = path.join(os.tmpdir(), "shorts-studio");
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// multer — для приёма загруженных файлов (картинки/аудио со сцен)
const upload = multer({ dest: TMP, limits: { fileSize: 15 * 1024 * 1024 } });

// Сколько роликов собирать одновременно. На сервере с 512 МБ — только 1.
const renderSlot = createLimiter(Math.max(1, +process.env.RENDER_CONCURRENCY || 1));

// ════════════════════════════════════════════════════════════════════════════
//  GET /health
// ════════════════════════════════════════════════════════════════════════════
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "shorts-studio-backend",
    time: Date.now(),
    ai: LLM_PROVIDER ? `${LLM_PROVIDER}:${LLM_MODEL}` : "library",
    openaiMedia: Boolean(process.env.OPENAI_API_KEY),
    accessCode: Boolean(ACCESS_CODE),
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/script  — генерация сценария
//  body: { topic, niche, tone, duration, hook }
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/script", async (req, res) => {
  try {
    const { topic, niche, tone, duration, hook } = req.body;
    if (!topic) return res.status(400).json({ error: "Нужна тема (topic)" });

    const system = `Ты — эксперт по созданию вирусных YouTube Shorts. Пиши только на русском.
Структурируй сценарий строго по блокам:
ХУУК (первые 3 секунды): ...
ОСНОВНАЯ ЧАСТЬ: ...
КУЛЬМИНАЦИЯ: ...
ПРИЗЫВ К ДЕЙСТВИЮ: ...
СУБТИТРЫ (ключевые фразы покадрово): ...
Короткие предложения, активные глаголы, разговорный стиль.`;

    const user = `Тема: "${topic}"
Ниша: ${niche || "—"} | Тон: ${tone || "—"} | Длительность: ${duration || "60 сек"}
${hook ? `Желаемый хук: "${hook}"` : ""}`;

    res.json({ script: await chat({ system, user, maxTokens: 1200, temperature: 0.8 }) });
  } catch (e) {
    console.error("script error:", e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/scene-prompts  — разбивка сценария на сцены
//  body: { script }
//  returns: { scenes: [{label,text,subtitle,duration,imagePrompt}] }
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/scene-prompts", async (req, res) => {
  try {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: "Нужен сценарий (script)" });

    const system = `Разбей сценарий на 4-7 сцен для YouTube Shorts.
Ответь ТОЛЬКО валидным JSON-массивом, без markdown, без пояснений:
[{"label":"ХУУК","text":"текст на экране до 80 символов","subtitle":"субтитр до 50 символов","duration":3,"imagePrompt":"detailed DALL-E prompt in English, cinematic vertical 9:16, no text on image"}]
Правила: text — главная фраза, subtitle — короткая версия, duration — секунды 3-8.`;

    let raw = (await chat({
      system,
      user: `Сценарий:\n${script}\n\nВерни JSON-массив сцен.`,
      maxTokens: 1200,
      temperature: 0.7,
    })).trim();
    raw = raw.replace(/```json|```/g, "").trim();

    // ИИ иногда оборачивает массив в объект {scenes:[...]}
    let scenes;
    try {
      const parsed = JSON.parse(raw);
      scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || parsed.items || []);
    } catch {
      return res.status(500).json({ error: "Не удалось разобрать ответ ИИ" });
    }

    scenes = scenes.map((s, i) => ({
      id: i,
      label: s.label || `СЦЕНА ${i + 1}`,
      text: (s.text || "").slice(0, 120),
      subtitle: (s.subtitle || s.text || "").slice(0, 60),
      duration: Math.min(Math.max(+s.duration || 4, 2), 12),
      imagePrompt: s.imagePrompt || `${s.text}, cinematic, vertical 9:16`,
    }));

    res.json({ scenes });
  } catch (e) {
    console.error("scene-prompts error:", e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/generate-image  — gpt-image-1
//  body: { prompt, size?, style? }   style: "minimal" — белые 3D-человечки на чёрном
//  returns: image/png (binary)
// ════════════════════════════════════════════════════════════════════════════
async function generateImage(prompt, { size, style } = {}) {
  const result = await requireOpenAI("Генерация картинок").images.generate({
    model: "gpt-image-1",
    prompt: style === "minimal"
      ? minimalImagePrompt(prompt)
      : prompt + " — high quality, cinematic, vertical 9:16, no text, no watermark",
    n: 1,
    size: size || "1024x1536",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, "base64");

  const imageUrl = result.data?.[0]?.url;
  if (!imageUrl) throw new Error("OpenAI did not return image data");
  const imageResp = await fetch(imageUrl);
  if (!imageResp.ok) throw new Error("Failed to download generated image");
  return Buffer.from(await imageResp.arrayBuffer());
}

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, size, style } = req.body;
    if (!prompt) return res.status(400).json({ error: "Нужен prompt" });

    const buffer = await generateImage(prompt, { size, style });
    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (e) {
    console.error("generate-image error:", e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/tts  — OpenAI Text-to-Speech
//  body: { text, voice? }   voice: alloy|echo|fable|onyx|nova|shimmer
//  returns: audio/mpeg (binary)
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) return res.status(400).json({ error: "Нужен text" });

    const mp3 = await requireOpenAI("Озвучка").audio.speech.create({
      model: "tts-1",
      voice: voice || "nova", // nova хорошо звучит на русском
      input: text.slice(0, 4000),
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (e) {
    console.error("tts error:", e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/build-video  — сборка финального MP4 через FFmpeg
//  Принимает multipart/form-data:
//    - field "manifest": JSON [{ duration, subtitle | caption, highlight?, labels? }] по сценам
//    - files "images": картинки по сценам (по порядку)
//    - files "audios": аудио по сценам (опционально, по порядку)
//    - file  "music": фоновая музыка (опционально)
//    - field "format": "9:16" | "16:9" | "1:1"
//    - field "style": "classic" (по умолчанию) | "minimal"
//    - field "musicVolume": 0..1 (по умолчанию 0.25)
//  returns: video/mp4 (binary)
// ════════════════════════════════════════════════════════════════════════════
function sendVideo(res, outPath, jobDir) {
  res.set("Content-Type", "video/mp4");
  const stream = fs.createReadStream(outPath);
  stream.pipe(res);
  stream.on("close", () => {
    // Чистим временные файлы
    fs.rm(jobDir, { recursive: true, force: true }, () => {});
  });
}

app.post(
  "/api/build-video",
  upload.fields([
    { name: "images", maxCount: 12 },
    { name: "audios", maxCount: 12 },
    { name: "music", maxCount: 1 },
  ]),
  async (req, res) => {
    const jobId = "job_" + Date.now();
    const jobDir = path.join(TMP, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    try {
      const manifest = JSON.parse(req.body.manifest || "[]");
      const files = req.files || {};
      const images = (files.images || []).sort((a, b) => a.originalname.localeCompare(b.originalname));
      const audios = (files.audios || []).sort((a, b) => a.originalname.localeCompare(b.originalname));

      if (images.length === 0) {
        fs.rm(jobDir, { recursive: true, force: true }, () => {});
        return res.status(400).json({ error: "Нет картинок для сборки" });
      }

      const scenes = images.map((img, i) => ({
        imagePath: img.path,
        audioPath: audios[i]?.path,
        duration: Math.min(Math.max(+manifest[i]?.duration || 4, 1), 30),
        caption: manifest[i]?.caption || manifest[i]?.subtitle || "",
        highlight: manifest[i]?.highlight,
        labels: manifest[i]?.labels,
      }));

      const outPath = await buildVideo({
        scenes,
        jobDir,
        format: req.body.format || "9:16",
        style: req.body.style === "minimal" ? "minimal" : "classic",
        musicPath: files.music?.[0]?.path,
        musicVolume: Math.min(Math.max(+req.body.musicVolume || 0.25, 0), 1),
      });

      sendVideo(res, outPath, jobDir);
    } catch (e) {
      console.error("build-video error:", e.message);
      fs.rm(jobDir, { recursive: true, force: true }, () => {});
      res.status(e.status || 500).json({ error: e.message });
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
//  Стиль "minimal": ролики про деньги в формате «3D-человечки на чёрном фоне»
// ════════════════════════════════════════════════════════════════════════════
//  engine: "anim"    — ролик ~32 с из 4 сцен в формате конкурента; сценарий пишет ИИ,
//                      а без ключа ИИ — берётся из библиотеки сюжетов (по умолчанию)
//          "library" — всегда библиотека сюжетов, без ИИ
//          "images"  — картинки gpt-image-1 с наездом камеры (нужен OPENAI_API_KEY)
//  story — id сюжета из библиотеки; template — старая одиночная сцена (короткий ролик)
// Свои фразы: строка i → фраза сцены i; *слово* — выделение жирным
function applyLines(plan, lines) {
  const list = String(lines || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!list.length || !Array.isArray(plan.beats)) return plan;
  plan.beats.forEach((b, i) => {
    if (!list[i]) return;
    const m = list[i].match(/\*([^*]+)\*/);
    b.captions = [{ text: list[i].replace(/\*/g, ""), highlight: m ? m[1].trim().split(/\s+/)[0] : "" }];
  });
  plan.description = plan.beats.flatMap((b) => (b.captions || []).map((c) => c.text)).join(" ");
  plan.title = plan.beats[plan.beats.length - 1]?.captions?.[0]?.text?.replace(/[.!]+$/, "") || plan.title;
  return plan;
}

async function makeMinimalPlan(body) {
  const plan = await makePlanInner(body);
  return body.lines ? applyLines(plan, body.lines) : plan;
}

async function makePlanInner({ topic, language, scenes, engine, template, story }) {
  const user = topic ? `Topic: ${topic}` : "Pick one strong money truth yourself (not the most obvious one).";
  if (engine === "images") {
    requireOpenAI("Режим с картинками (engine=images)");
    const count = Math.min(Math.max(+scenes || 3, 2), 6);
    const plan = normalizePlan(await chatJson(planSystemPrompt({ language: language || "en", scenes: count }), user), count);
    if (!plan.scenes.length) throw new Error("ИИ не вернул сцены");
    return { engine: "images", ...plan };
  }
  const chosen = STORIES.find((st) => st.id === story);
  if (chosen) return storyPlan(chosen, language);
  if (TEMPLATES[template]) return libraryPlan({ topic, language, template });
  if (engine === "library" || !LLM_PROVIDER) return storyPlan(pickStory(topic), language);
  try {
    const plan = normalizeBeatsPlan(
      await chatJson(beatsPlanSystemPrompt({ language: language || "en", actions: ALL_ACTIONS, layouts: LAYOUTS }), user, 3000),
      { actions: ALL_ACTIONS, layouts: LAYOUTS }
    );
    if (plan.beats.length < 2) throw new Error("ИИ не вернул сцены");
    return { engine: "anim", source: LLM_PROVIDER, ...plan };
  } catch (e) {
    // ИИ недоступен или исчерпан бесплатный лимит — ролик всё равно делаем
    console.warn(`ИИ (${LLM_PROVIDER}) не ответил, беру сюжет из библиотеки:`, e.message);
    return storyPlan(pickStory(topic), language);
  }
}

// Рендерит биты (сцены) и собирает финальный ролик
async function renderBeats(beats, { jobDir, format, musicPath, musicVolume }) {
  const [W, H] = FORMATS[format] || FORMATS["9:16"];
  const scenes = [];
  for (let i = 0; i < beats.length; i++) {
    const beat = sceneToBeat(beats[i]);
    const clipPath = path.join(jobDir, `clip_${i}.mp4`);
    const { duration } = await renderBeat({ beat, W, H, outPath: clipPath });
    // подписи над героями рисуются в кадре, в ASS идут только фразы сверху
    scenes.push({ clipPath, duration, prefaded: true, captions: beat.captions, caption: beat.caption, highlight: beat.highlight });
  }
  return buildVideo({ scenes, jobDir, format, style: "minimal", musicPath, musicVolume });
}

function parseJsonField(v, fallback) {
  if (typeof v !== "string") return v ?? fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

//  POST /api/minimal/ideas  body: { language?, count? }  → { ideas: [{topic, metaphor | template}] }
app.post("/api/minimal/ideas", async (req, res) => {
  try {
    const { language, count } = req.body;
    const n = Math.min(Math.max(+count || 10, 1), 30);
    if (!LLM_PROVIDER) {
      const lang = language === "ru" ? "ru" : "en";
      return res.json({ ideas: STORIES.slice(0, n).map((st) => ({ topic: st.title[lang], story: st.id })) });
    }
    const data = await chatJson(ideasSystemPrompt({ language: language || "en", count: n }), "Give the ideas.", 2000);
    res.json({ ideas: Array.isArray(data.ideas) ? data.ideas : [] });
  } catch (e) {
    console.error("minimal/ideas error:", e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

//  POST /api/minimal/plan  body: { topic?, language?, engine?, template?, scenes? }
//  engine "anim":   → { scenes: [{template, duration, labels, captions:[{text, highlight}]}] }
//                     собрать: POST /api/anim/render { scenes }
//  engine "images": → { scenes: [{caption, highlight, labels, imagePrompt, duration}] }
//                     картинки: POST /api/generate-image { prompt, style: "minimal" },
//                     сборка: POST /api/build-video со style=minimal и manifest = scenes
app.post("/api/minimal/plan", async (req, res) => {
  try {
    res.json(await makeMinimalPlan(req.body));
  } catch (e) {
    console.error("minimal/plan error:", e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

class BadRequest extends Error {
  constructor(msg) { super(msg); this.status = 400; }
}

// Проверка своих сцен до постановки в очередь
function customScenes(body) {
  const raw = body.beats !== undefined && body.beats !== "" ? body.beats : body.scenes;
  if (raw === undefined || raw === "") return null;
  const list = parseJsonField(raw, []);
  if (!Array.isArray(list) || list.length === 0) throw new BadRequest("Нужен массив scenes или beats");
  if (list.length > 6) throw new BadRequest("Максимум 6 сцен");
  const beats = list.map((s) => sceneToBeat(s || {}));
  for (const bt of beats) {
    try { validateBeat(bt); } catch (e) { throw new BadRequest(`${e.message}. Список: GET /api/anim/templates`); }
  }
  return beats;
}

// Собирает ролик: свои сцены (body.scenes) или план от ИИ / библиотеки.
// Возвращает { outPath, plan }.
async function produceVideo(body, { jobDir, musicPath }) {
  const format = body.format || "9:16";
  const musicVolume = Math.min(Math.max(+body.musicVolume || 0.6, 0), 1);
  const own = customScenes(body);
  if (own) {
    const outPath = await renderBeats(own, { jobDir, format, musicPath, musicVolume });
    return { outPath, plan: { engine: "anim", source: "custom", beats: own } };
  }

  const plan = await makeMinimalPlan(body);
  if (plan.engine === "anim") {
    return { outPath: await renderBeats(plan.beats || plan.scenes, { jobDir, format, musicPath, musicVolume }), plan };
  }
  const images = await Promise.all(
    plan.scenes.map((s) => generateImage(s.imagePrompt, { style: "minimal" }))
  );
  const scenes = plan.scenes.map((s, i) => {
    const imagePath = path.join(jobDir, `img_${i}.png`);
    fs.writeFileSync(imagePath, images[i]);
    return { ...s, imagePath };
  });
  return { outPath: await buildVideo({ scenes, jobDir, format, style: "minimal", musicPath, musicVolume }), plan };
}

// Длинный ролик «What if…» (формат Ifverse Tales в стиле канала): сценарий от ИИ
// (или готовый из библиотеки) → озвучка OpenAI → рендер 16:9 → обложка и главы
async function produceLong(body, { jobDir, musicPath, onProgress }) {
  const language = body.language === "ru" ? "ru" : "en";
  let script;
  const chosen = LONG_STORIES.find((st) => st.id === body.story);
  if (chosen) script = chosen;
  else if (LLM_PROVIDER && body.engine !== "library") {
    script = await writeLongScript({
      topic: body.topic, language, minutes: Math.min(Math.max(+body.minutes || 9, 6), 15),
      actions: ALL_ACTIONS, layouts: LAYOUTS, onProgress,
    });
  } else script = LONG_STORIES[0];
  script = withChapterCards(script, language);
  const result = await buildLongVideo({
    script, jobDir, format: "16:9", musicPath,
    musicVolume: Math.min(Math.max(+body.musicVolume || 0.12, 0), 1), onProgress,
    minSeconds: Math.min(Math.max(+body.minutes || 9, 6), 15) * 60,
  });
  return { outPath: result.outPath, thumbPath: result.thumbPath, plan: { mode: "long", ...result.meta } };
}

// Синхронный вариант: ответ — сразу MP4 (удобно для curl)
async function renderNow(req, res, label) {
  const jobDir = path.join(TMP, "job_" + crypto.randomUUID());
  fs.mkdirSync(jobDir, { recursive: true });
  const musicPath = req.file?.path;
  try {
    customScenes(req.body);
    const { outPath, plan } = await renderSlot.run(() => produceVideo(req.body, { jobDir, musicPath }));
    if (musicPath) fs.rm(musicPath, { force: true }, () => {});
    res.set("X-Short-Plan", encodeURIComponent(JSON.stringify(plan)));
    res.set("Access-Control-Expose-Headers", "X-Short-Plan");
    sendVideo(res, outPath, jobDir);
  } catch (e) {
    console.error(`${label} error:`, e.message);
    fs.rm(jobDir, { recursive: true, force: true }, () => {});
    if (musicPath) fs.rm(musicPath, { force: true }, () => {});
    res.status(e.status || 500).json({ error: e.message });
  }
}

//  POST /api/minimal/render  — весь ролик за один запрос
//  multipart/form-data или JSON: { topic?, language?, engine?, template?, scenes?, format?, musicVolume? }
//  + file "music" (опционально)
//  returns: video/mp4, план ролика — в заголовке X-Short-Plan (JSON, URI-encoded)
app.post("/api/minimal/render", upload.single("music"), (req, res) => renderNow(req, res, "minimal/render"));

// ════════════════════════════════════════════════════════════════════════════
//  Анимированные сцены (lib/anim) — работают без OpenAI
// ════════════════════════════════════════════════════════════════════════════

//  GET /api/anim/templates → { templates: [{ name, duration, labels, about }] }
//  + actions (все действия для битов), layouts (раскладки), stories (готовые сюжеты)
app.get("/api/anim/templates", (req, res) => {
  const lang = req.query.lang === "ru" ? "ru" : "en";
  res.json({
    templates: Object.entries(TEMPLATES).map(([name, t]) => ({
      name, duration: t.duration, labels: t.labels || [], about: t.about,
    })),
    actions: Object.entries(ALL_ACTIONS).map(([name, a]) => ({ name, duration: a.duration, params: a.params || "", about: a.about })),
    layouts: Object.fromEntries(Object.entries(LAYOUTS).map(([k, v]) => [k, v.length])),
    stories: STORIES.map((st) => ({ id: st.id, title: st.title[lang], seconds: Math.round(storyPlan(st, lang).beats.reduce((sum, b) => sum + beatDuration(b), 0)) })),
  });
});

//  POST /api/anim/render — ролик из выбранных сцен с твоими подписями
//  JSON или multipart: { scenes: [{ template, duration?, labels?, captions: [{text, highlight?}] }],
//                        format?, musicVolume? } + file "music" (опционально)
//  returns: video/mp4
app.post("/api/anim/render", upload.single("music"), (req, res) => {
  const empty = (v) => v === undefined || v === "";
  if (empty(req.body.scenes) && empty(req.body.beats)) {
    if (req.file) fs.rm(req.file.path, { force: true }, () => {});
    return res.status(400).json({ error: "Нужен массив scenes или beats" });
  }
  renderNow(req, res, "anim/render");
});

// ════════════════════════════════════════════════════════════════════════════
//  Фоновые задачи: на медленном сервере сборка идёт минуты, а телефон может
//  заблокироваться или закрыть вкладку. Задача живёт на сервере, страница
//  просто спрашивает её статус.
//    POST /api/jobs            — те же поля, что у /api/minimal/render → 202 { id }
//    GET  /api/jobs/:id        — { status: queued|running|done|error, position, plan, error }
//    GET  /api/jobs/:id/video  — готовый MP4 (хранится JOB_TTL_MIN минут, по умолчанию 60)
// ════════════════════════════════════════════════════════════════════════════
const jobs = new Map();
const JOB_TTL_MS = (+process.env.JOB_TTL_MIN || 60) * 60 * 1000;
const MAX_QUEUE = 10;

function dropJob(id) {
  const job = jobs.get(id);
  if (job) fs.rm(job.jobDir, { recursive: true, force: true }, () => {});
  jobs.delete(id);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if ((job.status === "done" || job.status === "error") && now - job.finishedAt > JOB_TTL_MS) dropJob(id);
  }
}, 5 * 60 * 1000).unref();

app.post("/api/jobs", upload.single("music"), (req, res) => {
  const musicPath = req.file?.path;
  const long = req.body.mode === "long";
  try {
    if (long && process.env.TTS_FAKE !== "1" && !process.env.ELEVENLABS_API_KEY) requireOpenAI("Озвучка длинных роликов");
    else customScenes(req.body);
    if (renderSlot.size >= MAX_QUEUE) {
      if (musicPath) fs.rm(musicPath, { force: true }, () => {});
      return res.status(429).json({ error: "Сервер занят, попробуй через пару минут" });
    }
  } catch (e) {
    if (musicPath) fs.rm(musicPath, { force: true }, () => {});
    return res.status(e.status || 500).json({ error: e.message });
  }

  const id = crypto.randomUUID();
  const jobDir = path.join(TMP, "job_" + id);
  fs.mkdirSync(jobDir, { recursive: true });
  const job = { status: "queued", createdAt: Date.now(), jobDir };
  jobs.set(id, job);

  renderSlot
    .run(async () => {
      job.status = "running";
      job.startedAt = Date.now();
      if (long) {
        const r = await produceLong(req.body, { jobDir, musicPath, onProgress: (m) => { job.stage = m; } });
        Object.assign(job, { status: "done", outPath: r.outPath, thumbPath: r.thumbPath, plan: r.plan });
      } else {
        const { outPath, plan } = await produceVideo(req.body, { jobDir, musicPath });
        Object.assign(job, { status: "done", outPath, plan });
      }
    })
    .catch((e) => {
      console.error("job error:", e.message);
      Object.assign(job, { status: "error", error: e.message });
      fs.rm(jobDir, { recursive: true, force: true }, () => {});
    })
    .finally(() => {
      job.finishedAt = Date.now();
      if (musicPath) fs.rm(musicPath, { force: true }, () => {});
    });

  res.status(202).json({ id });
});

app.get("/api/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Задача не найдена (сервер мог перезапуститься)" });
  const position = job.status === "queued"
    ? [...jobs.values()].filter((j) => j.status === "queued" && j.createdAt <= job.createdAt).length
    : 0;
  const now = Date.now();
  res.json({
    status: job.status,
    position,
    seconds: Math.round(((job.finishedAt || now) - (job.startedAt || job.createdAt)) / 1000),
    stage: job.stage,
    plan: job.plan,
    error: job.error,
    thumb: Boolean(job.thumbPath),
  });
});

app.get("/api/jobs/:id/thumb", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || !job.thumbPath) return res.status(404).json({ error: "Обложки нет" });
  res.sendFile(job.thumbPath, { headers: { "Content-Type": "image/jpeg" } });
});

app.get("/api/jobs/:id/video", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.status !== "done") return res.status(404).json({ error: "Ролик не готов или удалён" });
  res.sendFile(job.outPath, { headers: { "Content-Type": "video/mp4" } });
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/generate-text  — универсальный текст (для идей, плана, субтитров)
//  body: { system, user, maxTokens? }
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/generate-text", async (req, res) => {
  try {
    const { system, user, maxTokens } = req.body;
    if (!user) return res.status(400).json({ error: "Нужен user-текст" });
    const text = await chat({
      system: system || "Ты — полезный ассистент. Отвечай на русском.",
      user,
      maxTokens: maxTokens || 1000,
      temperature: 0.8,
    });
    res.json({ text });
  } catch (e) {
    console.error("generate-text error:", e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ── Бумажный трейдер в Telegram (если задан TELEGRAM_BOT_TOKEN) ─────────────
const traderOn = mountTrader(app);

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Shorts Studio backend запущен`);
  console.log(`   → http://localhost:${PORT}  (страница «Сделать ролик»)`);
  console.log(`   → health: http://localhost:${PORT}/health`);
  console.log(`   → FFmpeg: ${ffmpegPath}`);
  console.log(`   → ИИ для текста: ${LLM_PROVIDER ? `${LLM_PROVIDER} (${LLM_MODEL})` : "нет ключа — подписи из встроенной библиотеки"}`);
  console.log(`   → Картинки и озвучка OpenAI: ${process.env.OPENAI_API_KEY ? "включены" : "выключены (нет OPENAI_API_KEY)"}`);
  console.log(`   → Бумажный трейдер в Telegram: ${traderOn ? "включён" : "выключен (нет TELEGRAM_BOT_TOKEN)"}\n`);
});
