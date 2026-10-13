// ============================================================================
//  Музыка по смыслу сцен («скоринг», как в кино).
//  1. У каждой сцены есть настроение: calm | curious | tension | sad |
//     hopeful | triumph. Его ставит сценарист (ИИ или библиотека), а если
//     не поставил — оно определяется по сцене и словам диктора.
//  2. Соседние сцены с одним настроением склеиваются в «кью»; короткие
//     всплески (< MIN_CUE) вливаются в соседний кусок, чтобы музыка не
//     дёргалась на каждой склейке.
//  3. На каждое настроение — свой настоящий трек; если настроение
//     возвращается, трек продолжается с того места, где остановился.
//  4. Смена кью — плавный кроссфейд; перед заставкой главы и перед
//     «ударными» сценами (обвал, звонок) музыка уходит в тишину, чтобы
//     удар прозвучал, и возвращается после.
//  5. Под голосом музыку приглушает sidechain (в build.js).
// ============================================================================

import path from "path";
import { runFfmpeg } from "../video.js";
import { MUSIC, MOODS, musicFile } from "./assets.js";

const MIN_CUE = 12;      // с — короче не меняем музыку
const XFADE = 2.5;       // с — кроссфейд между кью
const GROUP = { calm: 0, curious: 0, hopeful: 1, triumph: 1, tension: 2, sad: 2 };

// ── Настроение сцены ───────────────────────────────────────────────────────
const KW = [
  ["tension", /\b(crash|panic|drops?|falls?|fell|gone|wiped|selling|sell|debt|loan|bank is taking|shaking|lower|fear|risk|danger|red)\b/i],
  ["sad", /\b(alone|without you|quit|lost|sacrifice|miss|cry|sorry|regret|empty)\b/i],
  ["triumph", /\b(million|freedom|free|won|win|victory|avalanche|changed his|changed your life)\b/i],
  ["hopeful", /\b(grow|grows|grew|back|higher|works|snowball|real|keep going|house|worth more|discipline)\b/i],
  ["curious", /\b(how it works|what if|question|imagine|here's|compound|percent|studies|average|math)\b/i],
];
const BY_ACTION = {
  news_crash: "tension", debt_ball: "tension", balcony_rain: "tension", push_boulder: "sad",
  coins_pour: "triumph", victory: "triumph", beach_house: "hopeful", house: "hopeful", tree_grow: "hopeful",
  stairs_goal: "hopeful", bars_growth: "curious", pillars: "curious", seesaw: "curious", meters: "curious",
  line_chart: "curious", hammer_rock: "curious", jar_fill: "curious", big_number: "curious", timeline: "hopeful",
  coffee_shop: "calm", street_night: "calm", bedroom_night: "curious", party: "calm", apartment_night: "sad",
  office: "hopeful", desk_work: "calm", age_counter: "calm", city_walk: "calm", phone: "calm", talk: "calm",
};

export function beatMood(b) {
  if (MOODS.includes(b.mood)) return b.mood;
  const pn = b.panels?.[0] || {};
  if (pn.action === "line_chart" && pn.params?.trend === "crash") return "tension";
  if (pn.action === "crowd_react") return pn.params?.mood === "shock" ? "tension" : "triumph";
  for (const [mood, re] of KW) if (re.test(b.narration || "")) return mood;
  return BY_ACTION[pn.action] || "calm";
}

// Сцены, перед которыми музыка «замирает» (ударные моменты)
const HIT = new Set(["chapter_card", "news_crash"]);

// ── План кью ───────────────────────────────────────────────────────────────
export function planScore(beats, durs) {
  // 1. сегменты одинакового настроения
  let segs = [];
  let t = 0;
  beats.forEach((b, i) => {
    const card = b.panels?.[0]?.action === "chapter_card";
    // заставка главы берёт настроение следующей сцены (музыка новой главы)
    const mood = card ? beatMood(beats[i + 1] || b) : beatMood(b);
    const hit = HIT.has(b.panels?.[0]?.action);
    const last = segs[segs.length - 1];
    if (last && last.mood === mood && !hit) last.dur += durs[i];
    else segs.push({ start: t, dur: durs[i], mood, hit });
    t += durs[i];
  });
  // 2. короткие куски вливаем в соседей (лучше — в близкий по смыслу)
  for (let guard = 0; guard < 500; guard++) {
    let k = -1, best = Infinity;
    segs.forEach((s, i) => { if (s.dur < MIN_CUE && s.dur < best && segs.length > 1) { best = s.dur; k = i; } });
    if (k < 0) break;
    const s = segs[k], L = segs[k - 1], R = segs[k + 1];
    const score = (n) => (!n ? -1 : (GROUP[n.mood] === GROUP[s.mood] ? 1000 : 0) + n.dur);
    // ударную сцену не «растворяем» назад: она должна начинать новый кусок
    // и обычный кусок не вливаем в ударный справа — иначе пауза перед ударом съедет раньше
    const intoLeft = s.hit ? false : R?.hit && L ? true : score(L) >= score(R);
    if (intoLeft && L) { L.dur += s.dur; segs.splice(k, 1); }
    else if (R) { R.start = s.start; R.dur += s.dur; R.hit = R.hit || s.hit; segs.splice(k, 1); }
    else if (L) { L.dur += s.dur; segs.splice(k, 1); }
    else break;
  }
  // соседние с одинаковым настроением (после слияний) — один кусок
  segs = segs.reduce((acc, s) => {
    const p = acc[acc.length - 1];
    if (p && p.mood === s.mood && !s.hit) p.dur += s.dur; else acc.push({ ...s });
    return acc;
  }, []);
  // 3. треки: одно настроение — один главный трек на весь ролик, позиция запоминается
  const pos = {};
  return segs.map((s) => {
    const list = MUSIC[s.mood];
    const track = list[0];
    const at = pos[track.title] ?? track.start;
    const offset = at + s.dur + XFADE > track.len - 3 ? track.start : at;
    pos[track.title] = offset + s.dur;
    return { ...s, track: track.title, offset, alt: list.slice(1).map((x) => x.title) };
  });
}

// ── Рендер дорожки музыки (ffmpeg, без больших буферов в памяти) ──────────
export async function renderScore({ beats, durs, jobDir, onProgress }) {
  const cues = planScore(beats, durs);
  const total = durs.reduce((a, b) => a + b, 0);
  // скачиваем нужные треки; недоступный заменяем запасным того же настроения
  const files = {};
  for (const c of cues) {
    for (const title of [c.track, ...c.alt]) {
      if (files[title] === undefined) files[title] = await musicFile(title);
      if (files[title]) { c.track = title; break; }
    }
    if (!files[c.track]) return null; // нет сети — пусть сработает запасной вариант
  }
  onProgress?.("Музыка по сценам");
  const args = ["-y"];
  const parts = [];
  cues.forEach((c, k) => {
    const fadeIn = k === 0 ? 1.5 : c.hit ? 2.5 : XFADE;
    const lead = k === 0 || c.hit ? 0 : XFADE;          // кроссфейд начинается до границы
    const start = Math.max(0, c.start - lead + (c.hit ? 0.6 : 0)); // после удара — небольшая пауза
    const len = c.dur + lead + (k === cues.length - 1 ? 0 : 0.2) - (c.hit ? 0.6 : 0);
    // перед ударной сценой следующего кью музыка уходит быстрее
    const nextHit = cues[k + 1]?.hit;
    const fadeOut = k === cues.length - 1 ? 3 : nextHit ? 0.8 : XFADE;
    args.push("-stream_loop", "-1", "-ss", c.offset.toFixed(2), "-t", (len + 0.1).toFixed(2), "-i", files[c.track]);
    parts.push(`[${k}:a]loudnorm=I=-20:TP=-2:LRA=9,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,` +
      `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${Math.max(0, len - fadeOut).toFixed(2)}:d=${fadeOut},` +
      `adelay=${Math.round(start * 1000)}:all=1[c${k}]`);
  });
  const outPath = path.join(jobDir, "score.wav");
  const mix = `${cues.map((_, k) => `[c${k}]`).join("")}amix=inputs=${cues.length}:normalize=0:duration=longest,apad=whole_dur=${total.toFixed(2)},atrim=0:${total.toFixed(2)}[m]`;
  args.push("-filter_complex", [...parts, mix].join(";"), "-map", "[m]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", outPath);
  await runFfmpeg(args);
  return { path: outPath, cues, titles: [...new Set(cues.map((c) => c.track))] };
}
