// ============================================================================
//  Фоновая музыка длинного ролика — генерируется кодом под каждый ролик,
//  чтобы под голосом всегда что-то звучало (как у Ifverse Tales).
//  Тихий «документальный» эмбиент 70 BPM: пэд, бас, арпеджио «фортепиано»
//  и лёгкий шум воздуха. Настроение меняется по главам:
//    neutral — загадочный минор (Am–F–C–G),
//    tense   — тревожный (кризис, обвал, звонок под дождём): Dm–B♭–Gm–A, пульс,
//    warm    — тёплый мажор (финал, дом у моря, победа): C–G–Am–F.
// ============================================================================

import { SR } from "./sfx.js";

const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const BEAT = 60 / 70;
const CHORD = BEAT * 8; // аккорд держится 2 такта

const MOODS = {
  neutral: { chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55, 60], [55, 59, 62]], bass: [45, 41, 36, 43], arp: true },
  tense: { chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50, 55], [45, 49, 52]], bass: [38, 34, 43, 45], arp: false },
  warm: { chords: [[48, 52, 55, 59], [43, 47, 50, 55], [45, 48, 52, 55], [41, 45, 48, 52]], bass: [36, 43, 45, 41], arp: true },
};

// вес «тревожных» и «тёплых» сцен; глава тревожная, только если таких сцен много
const TENSE = { news_crash: 2, balcony_rain: 2, debt_ball: 1 };
const WARM = { beach_house: 2, victory: 2, coins_pour: 1, house: 1 };

// Настроение главы по её сценам
export function chapterMood(beats) {
  let tense = 0, warm = 0;
  for (const b of beats) for (const pn of b.panels || []) {
    tense += TENSE[pn.action] || 0;
    if (pn.action === "line_chart" && pn.params?.trend === "crash") tense += 1;
    if (pn.action === "crowd_react" && pn.params?.mood === "shock") tense += 1;
    warm += WARM[pn.action] || 0;
  }
  return tense >= 2 && tense > warm ? "tense" : warm >= 2 && warm >= tense ? "warm" : "neutral";
}

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s / 4294967296) * 2 - 1; };
}

function add(track, at, len, fn) {
  const o = Math.round(at * SR), n = Math.round(len * SR);
  for (let i = 0; i < n; i++) { const j = o + i; if (j >= 0 && j < track.length) track[j] += fn(i / SR); }
}

// Пэд: несколько расстроенных голосов с мягкими обертонами, медленная атака
function pad(track, at, len, notes, gain) {
  const voices = [];
  for (const m of notes) for (const det of [-0.0016, 0.0016]) voices.push(mtof(m) * (1 + det));
  add(track, at, len, (t) => {
    const env = Math.min(1, t / 1.8) * Math.min(1, (len - t) / 2.2);
    let v = 0;
    for (const f of voices) v += Math.sin(TAU * f * t) + 0.28 * Math.sin(TAU * 2 * f * t) + 0.1 * Math.sin(TAU * 3 * f * t);
    return v * env * gain * (0.9 + 0.1 * Math.sin(TAU * 0.25 * t));
  });
}

function bass(track, at, len, m, gain) {
  const f = mtof(m);
  add(track, at, len, (t) => (Math.sin(TAU * f * t) + 0.2 * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / 0.4) * Math.min(1, (len - t) / 1.5) * gain);
}

// Нота «фортепиано»: затухающие обертоны
function pluck(track, at, m, gain) {
  const f = mtof(m);
  add(track, at, 1.6, (t) => {
    let v = 0;
    [1, 0.45, 0.2, 0.08].forEach((a, i) => { v += a * Math.sin(TAU * f * (i + 1) * t) * Math.exp(-t * (2.2 + i * 1.6)); });
    return v * Math.min(1, t / 0.004) * gain;
  });
}

// beats — с полем chapter; durs — длительности битов (с)
export function buildMusicBed(beats, durs, { level = -24 } = {}) {
  const total = durs.reduce((a, b) => a + b, 0);
  const track = new Float32Array(Math.ceil((total + 3) * SR));
  // время начала каждой главы и её настроение
  const chStart = [], chBeats = [];
  let t = 0;
  beats.forEach((b, i) => {
    const c = b.chapter || 0;
    if (chStart[c] === undefined) chStart[c] = t;
    (chBeats[c] ||= []).push(b);
    t += durs[i];
  });
  const moods = chBeats.map((bs) => chapterMood(bs || []));
  const moodAt = (time) => { let m = moods[0] || "neutral"; chStart.forEach((s, c) => { if (s !== undefined && time >= s - 0.01) m = moods[c] || m; }); return m; };

  const r = rng(7);
  for (let slot = 0, at = 0; at < total; slot++, at += CHORD) {
    const mood = MOODS[moodAt(at)];
    const k = slot % 4;
    const chord = mood.chords[k];
    pad(track, at, CHORD + 2, chord, mood === MOODS.tense ? 0.05 : 0.045);
    bass(track, at, CHORD + 1, mood.bass[k], 0.16);
    if (mood.arp) {
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      for (let s = 0; s < 16; s++) {
        if (r() < -0.7) continue; // иногда пропуск — «живее»
        const m = chord[pat[s % 8] % chord.length] + 12;
        pluck(track, at + s * (BEAT / 2), m, (s % 4 === 0 ? 0.09 : 0.06) * (mood === MOODS.warm ? 1.1 : 1));
      }
    } else {
      // тревожный пульс на четвертях + высокая «струнная» нота
      for (let s = 0; s < 8; s++) {
        const f = mtof(mood.bass[k] + 12);
        add(track, at + s * BEAT, 0.6, (tt) => Math.sin(TAU * f * tt) * Math.exp(-tt * 7) * Math.min(1, tt / 0.01) * 0.16);
      }
      const hf = mtof(chord[0] + 24);
      add(track, at, CHORD, (tt) => Math.sin(TAU * hf * tt) * 0.025 * Math.sin(Math.PI * tt / CHORD) * (0.8 + 0.2 * Math.sin(TAU * 5 * tt)));
    }
  }
  // шум воздуха — фон никогда не бывает «мёртвой» тишиной
  const n = rng(11);
  let lp = 0;
  for (let i = 0; i < track.length; i++) { lp += (n() - lp) * 0.06; track[i] += lp * 0.05; }
  // плавное начало/конец и громкость до нужного уровня
  const fadeN = Math.round(2 * SR), endN = Math.round(total * SR);
  for (let i = 0; i < fadeN; i++) { track[i] *= i / fadeN; const j = endN - 1 - i; if (j > 0) track[j] *= i / fadeN; }
  let ss = 0;
  for (let i = 0; i < endN; i++) ss += track[i] * track[i];
  const gain = Math.pow(10, level / 20) / Math.sqrt(ss / endN + 1e-12);
  const out = Buffer.alloc(endN * 2);
  for (let i = 0; i < endN; i++) out.writeInt16LE(Math.round(Math.tanh(track[i] * gain) * 32000), i * 2);
  return out;
}
