// ============================================================================
//  Shorts Studio — Backend (Node.js + Express)
//  Безопасно хранит API-ключи в .env и проксирует запросы к OpenAI.
//  Эндпоинты:
//    GET  /health           — проверка живости
//    POST /api/script       — генерация сценария (GPT)
//    POST /api/scene-prompts — разбивка сценария на сцены + DALL-E промпты
//    POST /api/generate-image — генерация картинки (DALL-E 3)
//    POST /api/tts          — озвучка текста (OpenAI TTS)
//    POST /api/build-video  — сборка финального MP4 через FFmpeg
//    POST /api/minimal/ideas  — идеи роликов про деньги в стиле "minimal"
//    POST /api/minimal/plan   — сценарий ролика в стиле "minimal"
//    POST /api/minimal/render — весь ролик "под ключ": план → картинки → MP4
// ============================================================================

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import OpenAI from "openai";
import dotenv from "dotenv";
import { buildVideo } from "./lib/video.js";
import { minimalImagePrompt, planSystemPrompt, ideasSystemPrompt, normalizePlan } from "./lib/minimal.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("\n❌ OPENAI_API_KEY не найден в .env!");
  console.error("   Создай файл .env и добавь строку: OPENAI_API_KEY=sk-...\n");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ── App setup ───────────────────────────────────────────────────────────────
const app = express();

// CORS — разрешаем фронтенду обращаться к бэкенду.
// Для продакшена замени "*" на свой домен (например https://my-app.vercel.app)
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "25mb" }));

// Временная папка для файлов рендера
const TMP = path.join(os.tmpdir(), "shorts-studio");
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// multer — для приёма загруженных файлов (картинки/аудио со сцен)
const upload = multer({ dest: TMP, limits: { fileSize: 15 * 1024 * 1024 } });

// ════════════════════════════════════════════════════════════════════════════
//  GET /health
// ════════════════════════════════════════════════════════════════════════════
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "shorts-studio-backend", time: Date.now() });
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 1200,
    });

    res.json({ script: completion.choices[0].message.content });
  } catch (e) {
    console.error("script error:", e.message);
    res.status(500).json({ error: e.message });
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Сценарий:\n${script}\n\nВерни JSON-массив сцен.` },
      ],
      max_tokens: 1200,
    });

    let raw = completion.choices[0].message.content.trim();
    raw = raw.replace(/```json|```/g, "").trim();

    // GPT иногда оборачивает массив в объект {scenes:[...]}
    let scenes;
    try {
      const parsed = JSON.parse(raw);
      scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || parsed.items || []);
    } catch {
      return res.status(500).json({ error: "Не удалось разобрать ответ GPT" });
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
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/generate-image  — gpt-image-1
//  body: { prompt, size?, style? }   style: "minimal" — белые 3D-человечки на чёрном
//  returns: image/png (binary)
// ════════════════════════════════════════════════════════════════════════════
async function generateImage(prompt, { size, style } = {}) {
  const result = await openai.images.generate({
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
    res.status(500).json({ error: e.message });
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

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice || "nova", // nova хорошо звучит на русском
      input: text.slice(0, 4000),
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (e) {
    console.error("tts error:", e.message);
    res.status(500).json({ error: e.message });
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
      res.status(500).json({ error: e.message });
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
//  Стиль "minimal": ролики про деньги в формате «3D-человечки на чёрном фоне»
// ════════════════════════════════════════════════════════════════════════════
async function chatJson(system, user, maxTokens = 1500) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: maxTokens,
    temperature: 0.9,
  });
  return JSON.parse(completion.choices[0].message.content);
}

async function makeMinimalPlan({ topic, language, scenes }) {
  const count = Math.min(Math.max(+scenes || 3, 2), 6);
  const plan = await chatJson(
    planSystemPrompt({ language: language || "en", scenes: count }),
    topic ? `Topic: ${topic}` : "Pick one strong money truth yourself (not the most obvious one)."
  );
  const normalized = normalizePlan(plan, count);
  if (!normalized.scenes.length) throw new Error("GPT не вернул сцены");
  return normalized;
}

//  POST /api/minimal/ideas  body: { language?, count? }  → { ideas: [{topic, metaphor}] }
app.post("/api/minimal/ideas", async (req, res) => {
  try {
    const { language, count } = req.body;
    const n = Math.min(Math.max(+count || 10, 1), 30);
    const data = await chatJson(ideasSystemPrompt({ language: language || "en", count: n }), "Give the ideas.", 2000);
    res.json({ ideas: Array.isArray(data.ideas) ? data.ideas : [] });
  } catch (e) {
    console.error("minimal/ideas error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

//  POST /api/minimal/plan  body: { topic?, language?, scenes? }
//  → { title, description, hashtags, scenes: [{caption, highlight, labels, imagePrompt, duration}] }
//  Картинки для сцен: POST /api/generate-image { prompt: imagePrompt, style: "minimal" }
//  Сборка: POST /api/build-video со style=minimal и manifest = scenes
app.post("/api/minimal/plan", async (req, res) => {
  try {
    res.json(await makeMinimalPlan(req.body));
  } catch (e) {
    console.error("minimal/plan error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

//  POST /api/minimal/render  — весь ролик за один запрос (занимает 1–3 минуты)
//  multipart/form-data или JSON: { topic?, language?, scenes?, format? } + file "music" (опционально)
//  returns: video/mp4, план ролика — в заголовке X-Short-Plan (JSON, URI-encoded)
app.post("/api/minimal/render", upload.single("music"), async (req, res) => {
  const jobId = "job_" + Date.now();
  const jobDir = path.join(TMP, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  try {
    const plan = await makeMinimalPlan(req.body);

    const images = await Promise.all(
      plan.scenes.map((s) => generateImage(s.imagePrompt, { style: "minimal" }))
    );
    const scenes = plan.scenes.map((s, i) => {
      const imagePath = path.join(jobDir, `img_${i}.png`);
      fs.writeFileSync(imagePath, images[i]);
      return { ...s, imagePath };
    });

    const outPath = await buildVideo({
      scenes,
      jobDir,
      format: req.body.format || "9:16",
      style: "minimal",
      musicPath: req.file?.path,
      musicVolume: Math.min(Math.max(+req.body.musicVolume || 0.6, 0), 1),
    });

    if (req.file) fs.rm(req.file.path, { force: true }, () => {});
    res.set("X-Short-Plan", encodeURIComponent(JSON.stringify(plan)));
    res.set("Access-Control-Expose-Headers", "X-Short-Plan");
    sendVideo(res, outPath, jobDir);
  } catch (e) {
    console.error("minimal/render error:", e.message);
    fs.rm(jobDir, { recursive: true, force: true }, () => {});
    if (req.file) fs.rm(req.file.path, { force: true }, () => {});
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/generate-text  — универсальный текст (для идей, плана, субтитров)
//  body: { system, user, maxTokens? }
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/generate-text", async (req, res) => {
  try {
    const { system, user, maxTokens } = req.body;
    if (!user) return res.status(400).json({ error: "Нужен user-текст" });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system || "Ты — полезный ассистент. Отвечай на русском." },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens || 1000,
    });
    res.json({ text: completion.choices[0].message.content });
  } catch (e) {
    console.error("generate-text error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Shorts Studio backend запущен`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → health: http://localhost:${PORT}/health`);
  console.log(`   → FFmpeg: ${ffmpegPath}\n`);
});
