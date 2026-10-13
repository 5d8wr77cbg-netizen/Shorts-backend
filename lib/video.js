// ============================================================================
//  Сборка видео через FFmpeg.
//  Текст рисуется через libass (фильтр "ass"): в сборке ffmpeg-static нет
//  фильтра drawtext, а libass есть и умеет плавные появления и выделение слов.
// ============================================================================

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const FPS = 30;
const FADE = 0.35; // затемнение между сценами, сек
const FONT = process.env.CAPTION_FONT || "Inter";
const FONTS_DIR = process.env.FONTS_DIR || "";
// Экономный x264: каждый поток и каждый буферный кадр 1080×1920 стоят памяти.
// С этими настройками ffmpeg держится около 200 МБ (бесплатные хостинги дают ~512 МБ);
// на простой графике на чёрном фоне разница в качестве почти не видна.
export const X264_ARGS = [
  "-c:v", "libx264",
  "-threads", String(process.env.FFMPEG_THREADS || 2),
  "-rc-lookahead", "5", "-bf", "0", "-refs", "1",
];
// Декодеры и фильтры — в один поток, им больше и не нужно
const LOW_MEM_INPUT = ["-threads", "1", "-filter_threads", "1"];

// VIDEO_SIZE — короткая сторона кадра. 1080 по умолчанию; 720 — вдвое быстрее
// на слабом сервере (например, бесплатном с 0.1 CPU).
const SIZE = [720, 1080].includes(+process.env.VIDEO_SIZE) ? +process.env.VIDEO_SIZE : 1080;
const px = (v) => Math.round((v * SIZE) / 1080 / 2) * 2;
export const FORMATS = {
  "9:16": [px(1080), px(1920)],
  "16:9": [px(1920), px(1080)],
  "1:1": [px(1080), px(1080)],
};

export function runFfmpeg(args) {
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

// ── ASS-субтитры ────────────────────────────────────────────────────────────
function assTime(sec) {
  const cs = Math.max(0, Math.round(sec * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}

function assEscape(text) {
  return String(text).replace(/\\/g, "＼").replace(/[{}]/g, "").replace(/\r?\n/g, "\\N");
}

// Текст «печатается» по буквам; слова из highlight выделяются жирным.
function typewriter(text, highlight, msPerChar) {
  const marked = new Set(
    String(highlight || "").toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean)
  );
  let out = "";
  let t = 0;
  for (const word of String(text).split(/(\s+)/)) {
    if (!word) continue;
    if (/^\s+$/.test(word)) { out += " "; t += msPerChar; continue; }
    const bold = marked.has(word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
    if (bold) out += "{\\b1}";
    for (const ch of word) {
      out += `{\\alpha&HFF&\\t(${t},${t + 120},\\alpha&H00&)}${assEscape(ch)}`;
      t += msPerChar;
    }
    if (bold) out += "{\\b0}";
  }
  return out;
}

function buildAss(scenes, style, W, H) {
  const caption = Math.round(W * 0.044);
  const label = Math.round(W * 0.036);
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${W}`,
    `PlayResY: ${H}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // minimal: тонкий белый текст сверху, без плашки (как у Simply Animated)
    `Style: Caption,${FONT},${caption},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,0,0,8,${Math.round(W * 0.08)},${Math.round(W * 0.08)},${Math.round(H * 0.095)},1`,
    `Style: Label,${FONT},${label},&H00E6E6E6,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,0,0,8,0,0,0,1`,
    // classic: субтитр снизу на полупрозрачной плашке
    `Style: Classic,${FONT},${Math.round(W * 0.045)},&H00FFFFFF,&H00FFFFFF,&H66000000,&H66000000,1,0,0,0,100,100,0,0,3,18,0,2,${Math.round(W * 0.06)},${Math.round(W * 0.06)},${Math.round(H * 0.15)},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  let start = 0;
  let count = 0;
  for (const s of scenes) {
    const end = start + s.duration;
    if (style === "minimal") {
      const t0 = start + FADE;
      const t1 = end - 0.05;
      // В сцене может быть несколько фраз подряд: делим время поровну
      const caps = Array.isArray(s.captions) && s.captions.length
        ? s.captions.filter((c) => c && c.text)
        : s.caption ? [{ text: s.caption, highlight: s.highlight }] : [];
      const slot = (t1 - t0) / Math.max(caps.length, 1);
      caps.forEach((c, k) => {
        const c0 = t0 + k * slot;
        const c1 = k === caps.length - 1 ? t1 : c0 + slot - 0.1;
        const chars = [...c.text].length;
        const msPerChar = Math.min(45, Math.floor((slot * 1000 * 0.35) / Math.max(chars, 1)));
        const fadeOut = k === caps.length - 1 ? FADE * 1000 : 250;
        lines.push(`Dialogue: 0,${assTime(c0)},${assTime(c1)},Caption,,0,0,0,,{\\fad(0,${fadeOut})}${typewriter(c.text, c.highlight, msPerChar)}`);
        count++;
      });
      const labels = Array.isArray(s.labels) ? s.labels.filter(Boolean).slice(0, 2) : [];
      if (labels.length === 2) {
        const y = Math.round(H * (caps.length ? 0.21 : 0.15));
        labels.forEach((l, i) => {
          const x = Math.round(W * (i === 0 ? 0.28 : 0.72));
          lines.push(`Dialogue: 0,${assTime(t0)},${assTime(t1)},Label,,0,0,0,,{\\pos(${x},${y})\\fad(400,${FADE * 1000})}${assEscape(l)}`);
          count++;
        });
      }
    } else if (s.caption) {
      lines.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Classic,,0,0,0,,${assEscape(s.caption)}`);
      count++;
    }
    start = end;
  }
  return count ? lines.join("\n") + "\n" : null;
}

// ── Сборка ──────────────────────────────────────────────────────────────────
//  scenes: [{ imagePath | clipPath, audioPath?, duration, caption?, highlight?, captions?, labels? }]
//          clipPath — готовая анимация (lib/anim), imagePath — статичная картинка
//  style:  "minimal" — медленный наезд камеры, затемнения, текст сверху
//          "classic" — статичная картинка, субтитр снизу на плашке
//  musicPath: фоновая музыка (зацикливается под длину ролика)
export async function buildVideo({ scenes, jobDir, format = "9:16", style = "classic", musicPath, musicVolume = 0.25 }) {
  const [W, H] = FORMATS[format] || FORMATS["9:16"];
  // Быстрый путь: готовые анимации с затемнениями, нарисованными при рендере
  // (lib/anim/beats.js), склеиваются без перекодирования — одним проходом меньше
  const fast = scenes.every((s) => s.clipPath && s.prefaded && !s.audioPath);
  const segments = fast ? scenes.map((s) => s.clipPath) : [];

  for (let i = 0; !fast && i < scenes.length; i++) {
    const s = scenes[i];
    const dur = s.duration;
    const frames = Math.round(dur * FPS);
    const segPath = path.join(jobDir, `seg_${String(i).padStart(2, "0")}.mp4`);

    const fades = `fade=t=in:st=0:d=${FADE},fade=t=out:st=${(dur - FADE).toFixed(2)}:d=${FADE}`;
    const vf = s.clipPath
      ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},${fades}`
      : style === "minimal"
      ? [
          `scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase`,
          `crop=${W * 2}:${H * 2}`,
          `zoompan=z='1+0.06*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}`,
          fades,
        ].join(",")
      : `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`;

    const args = ["-y", ...LOW_MEM_INPUT];
    if (s.clipPath) args.push("-i", s.clipPath);
    else if (style === "minimal") args.push("-i", s.imagePath);
    else args.push("-loop", "1", "-i", s.imagePath);

    if (s.audioPath) args.push("-i", s.audioPath);
    else args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");

    args.push(
      "-map", "0:v", "-map", "1:a",
      "-vf", vf,
      "-af", "apad,aresample=44100,aformat=channel_layouts=stereo",
      "-t", String(dur),
      "-r", String(FPS),
      "-pix_fmt", "yuv420p",
      ...X264_ARGS,
      "-preset", "veryfast",
      "-c:a", "aac",
      segPath,
    );
    await runFfmpeg(args);
    segments.push(segPath);
  }

  const listFile = path.join(jobDir, "list.txt");
  fs.writeFileSync(listFile, segments.map((p) => `file '${p}'`).join("\n"));
  const joined = path.join(jobDir, "joined.mp4");
  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", joined]);

  // Финальный проход: текст + фоновая музыка
  const outPath = path.join(jobDir, "final.mp4");
  const ass = buildAss(scenes, style, W, H);
  const args = ["-y", ...LOW_MEM_INPUT, "-i", joined];
  if (musicPath) args.push("-stream_loop", "-1", "-i", musicPath);
  else if (fast) args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");

  const filters = [];
  if (ass) {
    const assPath = path.join(jobDir, "captions.ass");
    fs.writeFileSync(assPath, ass);
    filters.push(`[0:v]ass=filename='${assPath}'${FONTS_DIR ? `:fontsdir='${FONTS_DIR}'` : ""}[v]`);
  }
  if (musicPath) {
    filters.push(fast
      ? `[1:a]volume=${musicVolume}[a]`
      : `[1:a]volume=${musicVolume}[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]`);
  }
  if (filters.length) args.push("-filter_complex", filters.join(";"));
  args.push("-map", ass ? "[v]" : "0:v", "-map", musicPath ? "[a]" : fast ? "1:a" : "0:a");
  if (fast) args.push("-t", scenes.reduce((sum, s) => sum + s.duration, 0).toFixed(3));
  args.push(
    ...X264_ARGS,
    "-preset", "veryfast",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-movflags", "+faststart",
    outPath,
  );
  await runFfmpeg(args);
  return outPath;
}
