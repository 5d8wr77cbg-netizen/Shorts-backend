// ============================================================================
//  Сборка длинного ролика: сценарий → озвучка каждого бита → длительности
//  битов по длине речи → рендер 16:9 → склейка без перекодирования →
//  голос + музыка → описание с таймкодами глав → обложка.
// ============================================================================

import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";
import { renderBeat, drawBeatFrame, beatDuration, validateBeat } from "../anim/beats.js";
import { background } from "../anim/props.js";
import { runFfmpeg, FORMATS } from "../video.js";
import { speak, pcmSeconds, silence, wav, TTS_PROVIDER } from "./tts.js";

const LEAD = 0.25; // речь начинается чуть позже начала кадра (после затемнения)
const TAIL = 0.45; // пауза после фразы

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

const ts = (sec) => {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};

// Обложка 1280×720: кадр из кульминации + 2 слова крупно (белое и золотое)
export async function renderThumbnail({ beat, lines, outPath }) {
  const W = 1280, H = 720;
  const c = createCanvas(W, H), ctx = c.getContext("2d");
  background(ctx, W, H);
  const T = beatDuration(beat);
  // сцена — справа, текст — слева (как у Ifverse: персонаж справа, 2 слова слева)
  ctx.save();
  ctx.translate(W * 0.36, H * 0.02); ctx.scale((W / 1920) * 0.78, (H / 1080) * 0.78);
  drawBeatFrame(ctx, beat, T * 0.85, T, true);
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, W * 0.62, 0);
  g.addColorStop(0, "rgba(0,0,0,0.95)"); g.addColorStop(0.75, "rgba(0,0,0,0.6)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const [a = "WHAT", b = "IF?"] = lines || [];
  const draw = (text, y, fill) => {
    let size = 170;
    ctx.font = `900 ${size}px Inter`;
    while (size > 60 && ctx.measureText(text).width > W * 0.55) { size -= 6; ctx.font = `900 ${size}px Inter`; }
    ctx.textBaseline = "alphabetic"; ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.14; ctx.strokeStyle = "#000"; ctx.strokeText(text, 60, y);
    ctx.fillStyle = fill; ctx.fillText(text, 60, y);
  };
  draw(String(a).toUpperCase(), 330, "#ffffff");
  draw(String(b).toUpperCase(), 520, "#E8C33A");
  fs.writeFileSync(outPath, c.toBuffer("image/jpeg", 92));
  return outPath;
}

export async function buildLongVideo({ script, jobDir, format = "16:9", musicPath, musicVolume = 0.12, minSeconds = 540, onProgress }) {
  const [W, H] = FORMATS[format] || FORMATS["16:9"];
  // 1. Плоский список битов с номером главы
  const beats = [];
  script.chapters.forEach((ch, ci) => ch.beats.forEach((b) => beats.push({ ...b, chapter: ci, narrated: true })));
  for (const b of beats) validateBeat(b);

  // 2. Озвучка (параллельно, по 4)
  let spoken = 0;
  const narrated = beats.filter((b) => b.narration).length;
  const audio = await mapLimit(beats, TTS_PROVIDER === "elevenlabs" ? 2 : 4, async (b) => {
    if (!b.narration) return null;
    const pcm = await speak(b.narration);
    onProgress?.(`Озвучка ${++spoken}/${narrated}`);
    return pcm;
  });

  // 3. Длительность каждого бита — по длине речи. Если ролик выходит короче
  //    minSeconds (по умолчанию 9 мин — ниже YouTube не даёт вставить 3+ рекламы
  //    в середину), паузы между фразами чуть удлиняются (до +1 с на фразу).
  const base = beats.map((b, i) => (audio[i] ? LEAD + pcmSeconds(audio[i]) + TAIL : (+b.duration || 3)));
  const sum = base.reduce((a, b) => a + b, 0);
  const extra = narrated ? Math.min(1, Math.max(0, (minSeconds + 5 - sum) / narrated)) : 0;
  beats.forEach((b, i) => { b.duration = base[i] + (audio[i] ? extra : 0); });

  // 4. Дорожка голоса: речь каждого бита, дополненная тишиной до длины бита
  const parts = [];
  beats.forEach((b, i) => {
    const total = Math.round(beatDuration(b) * 30) / 30; // кратно кадру
    const speech = audio[i] || Buffer.alloc(0);
    parts.push(silence(LEAD), speech, silence(Math.max(0, total - LEAD - pcmSeconds(speech))));
  });
  const voicePath = path.join(jobDir, "voice.wav");
  fs.writeFileSync(voicePath, wav(Buffer.concat(parts)));

  // 5. Рендер битов сразу в финальном качестве
  const clips = [];
  for (let i = 0; i < beats.length; i++) {
    const out = path.join(jobDir, `b${String(i).padStart(3, "0")}.mp4`);
    await renderBeat({ beat: beats[i], W, H, outPath: out, final: true });
    clips.push(out);
    onProgress?.(`Рисую сцены ${i + 1}/${beats.length}`);
  }

  // 6. Склейка видео без перекодирования + голос и музыка
  onProgress?.("Склейка и звук");
  const listFile = path.join(jobDir, "list.txt");
  fs.writeFileSync(listFile, clips.map((p) => `file '${p}'`).join("\n"));
  const joined = path.join(jobDir, "joined.mp4");
  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", joined]);
  const total = beats.reduce((s, b) => s + Math.round(beatDuration(b) * 30) / 30, 0);
  const outPath = path.join(jobDir, "long.mp4");
  const args = ["-y", "-i", joined, "-i", voicePath];
  if (musicPath) args.push("-stream_loop", "-1", "-i", musicPath);
  args.push("-filter_complex", musicPath
    ? `[1:a]aresample=48000,aformat=channel_layouts=stereo[v];[2:a]aresample=48000,aformat=channel_layouts=stereo,volume=${musicVolume}[m];[v][m]amix=inputs=2:duration=first:normalize=0[a]`
    : `[1:a]aresample=48000,aformat=channel_layouts=stereo[a]`);
  args.push("-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-t", total.toFixed(3), "-movflags", "+faststart", outPath);
  await runFfmpeg(args);

  // 7. Описание с главами
  let t = 0;
  const starts = [];
  beats.forEach((b) => {
    if (starts[b.chapter] === undefined) starts[b.chapter] = t;
    t += Math.round(beatDuration(b) * 30) / 30;
  });
  const chapterLines = script.chapters.map((ch, i) => `${ts(i === 0 ? 0 : starts[i])} ${ch.title}`);
  const description = [script.description, "", ...chapterLines, "", (script.hashtags || []).join(" ")].join("\n").trim();

  // 8. Обложка: бит из кульминации (последний с монетами/наградой/счётчиком)
  const PREF = ["coins_pour", "victory", "house", "talk", "phone", "split_paths", "thought"];
  const pick = PREF.map((a) => beats.find((b) => b.layout === "single" && b.panels?.[0]?.action === a)).find(Boolean)
    || beats.find((b) => b.panels?.[0]?.action !== "chapter_card" && b.panels?.[0]?.action !== "big_number") || beats[0];
  const thumbPath = path.join(jobDir, "thumb.jpg");
  await renderThumbnail({ beat: pick, lines: script.thumbnail, outPath: thumbPath });

  return {
    outPath,
    thumbPath,
    meta: {
      title: script.title,
      description,
      tags: script.tags || [],
      hashtags: script.hashtags || [],
      seconds: Math.round(total),
      chapters: chapterLines,
    },
  };
}
