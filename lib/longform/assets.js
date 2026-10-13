// ============================================================================
//  Настоящая музыка и звуки для длинных роликов.
//  Музыка — Kevin MacLeod (incompetech.com), лицензия CC BY 4.0: бесплатно,
//  монетизация разрешена, в описание автоматически добавляется кредит.
//  Звуки — Mixkit (mixkit.co), бесплатная лицензия Mixkit Sound Effects:
//  коммерческое использование без указания автора.
//  Файлы не хранятся в репозитории: сервер скачивает их при первой сборке
//  и держит в кэше (ASSET_DIR). Нет сети — движок берёт синтезированные звуки.
// ============================================================================

import fs from "fs";
import path from "path";
import os from "os";
import { runFfmpeg } from "../video.js";

export const ASSET_DIR = process.env.ASSET_DIR || path.join(os.tmpdir(), "shorts-assets");
const ENABLED = process.env.ASSETS !== "0";

// ── Музыка по настроениям: { title, len (с), start — откуда начинать } ─────
export const MUSIC = {
  calm: [
    { title: "Groove Grove", len: 206, start: 6 },
    { title: "Clean Soul", len: 307, start: 20 },
    { title: "Late Night Radio", len: 264, start: 4 },
  ],
  curious: [
    { title: "Half Mystery", len: 429, start: 8 },
    { title: "Investigations", len: 94, start: 2 },
  ],
  tension: [
    { title: "Stay the Course", len: 272, start: 20 },
    { title: "I Can Feel it Coming", len: 215, start: 10 },
  ],
  sad: [
    { title: "Past Sadness", len: 213, start: 4 },
    { title: "Promises to Keep", len: 304, start: 2 },
  ],
  hopeful: [
    { title: "Sincerely", len: 375, start: 20 },
    { title: "Almost New", len: 203, start: 6 },
    { title: "Reawakening", len: 214, start: 2 },
  ],
  triumph: [
    { title: "Inspired", len: 286, start: 16 },
    { title: "Infinite Perspective", len: 345, start: 30 },
  ],
};
export const MOODS = Object.keys(MUSIC);

const musicUrl = (title) => `https://incompetech.com/music/royalty-free/mp3-royaltyfree/${encodeURIComponent(title + ".mp3")}`;

// ── Звуки Mixkit: имя → список ID (вариации) ───────────────────────────────
export const SFX = {
  whoosh: [1490, 1492, 3115],
  chapter: [1143],
  impact: [788],
  riser: [790],
  pop: [3005, 2357],
  coin: [1993, 2003, 1999],
  notify: [2354],
  ring: [1359],
  tick: [1061],
  tickFast: [1063],
  heartbeat: [493],
  typing: [2531],
  applause: [485],
  cheer: [462],
  gasp: [966],
  hammer: [833],
  thunderFar: [1278],
  thunder: [1300],
  rain: [1247],
  waves: [1189],
  city: [2678],
  cafe: [444],
  office: [447],
  party: [360],
  success: [937],
};
const sfxUrl = (id) => `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;

async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 2000) return file;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (shorts-backend)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const tmp = file + ".part";
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, file);
  return file;
}

// Путь к mp3 трека (скачивается один раз). null — недоступен.
export async function musicFile(title) {
  if (!ENABLED) return null;
  try { return await download(musicUrl(title), path.join(ASSET_DIR, "music", title + ".mp3")); }
  catch (e) { console.warn("music unavailable:", title, e.message); return null; }
}

// Декодированный звук: Float32Array моно с частотой sr (кэш в памяти на сборку)
export async function loadSfx(names, sr, maxSec = 60) {
  const out = {};
  if (!ENABLED) return out;
  const jobs = [];
  for (const name of names) for (const id of SFX[name] || []) jobs.push([name, id]);
  let i = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (i < jobs.length) {
      const [name, id] = jobs[i++];
      try {
        const mp3 = await download(sfxUrl(id), path.join(ASSET_DIR, "sfx", `${id}.mp3`));
        const raw = path.join(ASSET_DIR, "sfx", `${id}_${sr}.f32`);
        if (!fs.existsSync(raw)) await runFfmpeg(["-y", "-i", mp3, "-t", String(maxSec), "-ac", "1", "-ar", String(sr), "-f", "f32le", raw]);
        const b = fs.readFileSync(raw);
        (out[name] ||= []).push(new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4)));
      } catch (e) { console.warn("sfx unavailable:", name, id, e.message); }
    }
  }));
  return out;
}

export const CREDIT = (titles) => [
  "Music by Kevin MacLeod (incompetech.com)",
  ...titles.map((t) => `"${t}"`),
  // без ссылки: внешние ссылки в описании YouTube требует подтверждать телефоном
  "Licensed under Creative Commons: By Attribution 4.0 License",
].join("\n");

