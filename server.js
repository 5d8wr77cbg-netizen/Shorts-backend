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
// ============================================================================

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import OpenAI from "openai";
import dotenv from "dotenv";

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

// ── Helper: запуск ffmpeg как промис ────────────────────────────────────────
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("FFmpeg error:\n" + stderr.slice(-1500)));
    });
    proc.on("error", reject);
  });
}

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
//  POST /api/generate-image  — DALL-E 3
//  body: { prompt, size? }
//  returns: image/png (binary)
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, size } = req.body;
    if (!prompt) return res.status(400).json({ error: "Нужен prompt" });

    // Размеры DALL-E 3: 1024x1024, 1024x1792 (вертикаль), 1792x1024 (гориз.)

    const imgSize = size || "1024x1536";

const result = await openai.images.generate({
  model: "gpt-image-1",
  prompt: prompt + " — high quality, cinematic, vertical 9:16, no text, no watermark",
  n: 1,
  size: imgSize,
});

const imageUrl = result.data?.[0]?.url;
const b64 = result.data?.[0]?.b64_json;

let buffer;

if (b64) {
  buffer = Buffer.from(b64, "base64");
} else if (imageUrl) {
  const imageResp = await fetch(imageUrl);
  if (!imageResp.ok) throw new Error("Failed to download generated image");
  buffer = Buffer.from(await imageResp.arrayBuffer());
} else {
  throw new Error("OpenAI did not return image data");
}

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
//    - field "manifest": JSON [{ duration, subtitle }] по сценам
//    - files "images": картинки по сценам (по порядку)
//    - files "audios": аудио по сценам (опционально, по порядку)
//    - field "format": "9:16" | "16:9" | "1:1"
//  returns: video/mp4 (binary)
// ════════════════════════════════════════════════════════════════════════════
app.post(
  "/api/build-video",
  upload.fields([{ name: "images", maxCount: 12 }, { name: "audios", maxCount: 12 }]),
  async (req, res) => {
    const jobId = "job_" + Date.now();
    const jobDir = path.join(TMP, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    try {
      const manifest = JSON.parse(req.body.manifest || "[]");
      const format = req.body.format || "9:16";
      const dims = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080] }[format] || [1080, 1920];
      const [W, H] = dims;

      const images = (req.files.images || []).sort((a, b) => a.originalname.localeCompare(b.originalname));
      const audios = (req.files.audios || []).sort((a, b) => a.originalname.localeCompare(b.originalname));

      if (images.length === 0) {
        return res.status(400).json({ error: "Нет картинок для сборки" });
      }

      // 1) Готовим список клипов: каждая картинка → видеосегмент нужной длины
      const segmentPaths = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const dur = manifest[i]?.duration || 4;
        const subtitle = (manifest[i]?.subtitle || "").replace(/'/g, "\u2019").replace(/:/g, " ");
        const segPath = path.join(jobDir, `seg_${String(i).padStart(2, "0")}.mp4`);

        // Масштабируем картинку под формат + добавляем субтитр снизу
        const vf = [
          `scale=${W}:${H}:force_original_aspect_ratio=increase`,
          `crop=${W}:${H}`,
          // subtitle через drawtext
          subtitle
            ? `drawtext=text='${subtitle}':fontcolor=white:fontsize=${Math.round(W * 0.045)}:` +
              `box=1:boxcolor=black@0.6:boxborderw=20:x=(w-text_w)/2:y=h-h*0.18`
            : null,
        ].filter(Boolean).join(",");

        const args = [
          "-y",
          "-loop", "1",
          "-i", img.path,
        ];

        // Если есть аудио для сцены — подмешиваем
        const audio = audios[i];
        if (audio) {
          args.push("-i", audio.path);
        }

        args.push(
          "-t", String(dur),
          "-vf", vf,
          "-r", "30",
          "-pix_fmt", "yuv420p",
          "-c:v", "libx264",
          "-preset", "veryfast",
        );

        if (audio) {
          args.push("-c:a", "aac", "-shortest");
        } else {
          // тишина, чтобы все сегменты имели аудиодорожку (для concat)
          args.splice(args.indexOf("-loop"), 0, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
          args.push("-c:a", "aac", "-shortest");
        }

        args.push(segPath);
        await runFfmpeg(args);
        segmentPaths.push(segPath);
      }

      // 2) Конкатенация всех сегментов
      const listFile = path.join(jobDir, "list.txt");
      fs.writeFileSync(listFile, segmentPaths.map((p) => `file '${p}'`).join("\n"));

      const outPath = path.join(jobDir, "final.mp4");
      await runFfmpeg([
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", listFile,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        outPath,
      ]);

      // 3) Отдаём готовый MP4
      res.set("Content-Type", "video/mp4");
      const stream = fs.createReadStream(outPath);
      stream.pipe(res);
      stream.on("close", () => {
        // Чистим временные файлы
        fs.rm(jobDir, { recursive: true, force: true }, () => {});
      });
    } catch (e) {
      console.error("build-video error:", e.message);
      fs.rm(jobDir, { recursive: true, force: true }, () => {});
      res.status(500).json({ error: e.message });
    }
  }
);

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
