// ============================================================================
//  Звуковые эффекты длинного ролика (как в роликах Ifverse Tales): свуши на
//  склейках, удары на заставках и больших цифрах, звон монет, уведомления
//  телефона, тиканье часов, дождь с громом, гул кофейни и офиса, басы
//  вечеринки, аплодисменты, «победный» перезвон.
//  Все звуки синтезируются кодом — свои, без лицензий и Content ID.
//  Результат — отдельная дорожка PCM 24 кГц, которая подмешивается под голос.
// ============================================================================

export const SR = 24000;
const TAU = Math.PI * 2;

// Детерминированный шум: одинаковый ролик → одинаковый звук
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s / 4294967296) * 2 - 1; };
}

// Фильтр (state-variable): lp / bp / hp с меняющейся частотой
function svf() {
  let lp = 0, bp = 0;
  return (x, f, q = 0.7) => {
    const F = 2 * Math.sin(Math.PI * Math.min(Math.max(f, 20), SR / 6.5) / SR);
    const hp = x - lp - q * bp;
    bp += F * hp; lp += F * bp;
    return { lp, bp, hp };
  };
}

const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
const each = (b, fn) => { for (let i = 0; i < b.length; i++) b[i] = fn(i / SR, i / b.length); return b; };
const att = (t, a = 0.004) => Math.min(1, t / a);

// ── Отдельные звуки ────────────────────────────────────────────────────────
const S = {
  // свуш склейки: шум с «пролетающим» полосовым фильтром
  whoosh(seed, dur = 0.55, down = false) {
    const n = rng(seed), f = svf();
    return each(buf(dur), (t, k) => {
      const fc = down ? 2600 * Math.pow(0.06, k) : 250 + 2600 * Math.pow(Math.sin(Math.PI * k), 1.6);
      return f(n(), fc, 0.55).bp * Math.pow(Math.sin(Math.PI * k), 2) * 1.6;
    });
  },
  // мягкий «поп» появления
  pop(seed) {
    const n = rng(seed); let ph = 0;
    return each(buf(0.12), (t) => {
      ph += TAU * (320 + 650 * Math.exp(-t * 40)) / SR;
      return (Math.sin(ph) * Math.exp(-t * 38) + (t < 0.004 ? n() * 0.3 : 0)) * att(t, 0.002) * 0.8;
    });
  },
  // удар: низкий «бум» с падающей частотой + шумовой хлопок
  impact(seed, dur = 1.8) {
    const n = rng(seed), f = svf(); let ph = 0;
    return each(buf(dur), (t) => {
      ph += TAU * (38 + 70 * Math.exp(-t * 6)) / SR;
      const body = Math.sin(ph) * Math.exp(-t * 2.2);
      const crack = f(n(), 900 * Math.exp(-t * 3) + 120, 0.8).lp * Math.exp(-t * 9) * 1.3;
      return Math.tanh((body + crack) * 1.6) * att(t, 0.003) * 0.9;
    });
  },
  // нарастание перед ударом
  riser(seed, dur = 1.6) {
    const n = rng(seed), f = svf(); let ph = 0;
    return each(buf(dur), (t, k) => {
      ph += TAU * (180 * Math.pow(5, k)) / SR;
      const v = f(n(), 300 * Math.pow(12, k), 0.5).bp * 1.4 + Math.sin(ph) * 0.18;
      return v * k * k * (k > 0.96 ? (1 - k) / 0.04 : 1);
    });
  },
  // колокольчик / звон (набор негармоничных обертонов)
  bell(seed, base = 1320, dur = 1.2, decay = 4, parts = [1, 2.0, 2.76, 4.07]) {
    const n = rng(seed);
    const det = parts.map(() => 1 + n() * 0.004);
    return each(buf(dur), (t) => {
      let v = 0;
      parts.forEach((p, i) => { v += Math.sin(TAU * base * p * det[i] * t) * Math.exp(-t * decay * (1 + i * 0.7)) / (1 + i * 1.2); });
      return v * att(t, 0.002) * 0.55;
    });
  },
  coin(seed) { const n = rng(seed); return S.bell(seed, 2093 * (1 + n() * 0.06), 0.5, 9, [1, 1.52, 2.03, 2.71]); },
  // «ка-чинг» кассы
  kaching(seed) {
    const out = buf(1.4), n = rng(seed);
    for (let i = 0; i < SR * 0.015; i++) out[i] += n() * 0.5 * (1 - i / (SR * 0.015));
    for (let i = 0; i < SR * 0.25; i++) { const t = i / SR; out[i] += Math.sin(TAU * 110 * t) * Math.exp(-t * 25) * 0.5; }
    mixInto(out, S.bell(seed + 1, 1760, 1.2, 3.2), 0.11, 0.9);
    mixInto(out, S.bell(seed + 2, 2637, 1.0, 4), 0.13, 0.5);
    return out;
  },
  // уведомление телефона (два тона)
  notify(seed) {
    const out = buf(0.8);
    mixInto(out, S.bell(seed, 1568, 0.5, 9, [1, 2]), 0, 0.8);
    mixInto(out, S.bell(seed + 1, 2093, 0.6, 7, [1, 2]), 0.11, 0.8);
    return out;
  },
  // вибрация телефона: две «жужжалки»
  buzz() {
    const f = svf();
    return each(buf(0.9), (t) => {
      const on = (t < 0.32 || (t > 0.48 && t < 0.8)) ? 1 : 0;
      return f(Math.sign(Math.sin(TAU * 165 * t)) * on, 500, 0.9).lp * 0.45;
    });
  },
  // тик часов
  tick(seed, hi = true) {
    const n = rng(seed), f = svf();
    return each(buf(0.05), (t) => (f(n(), hi ? 3800 : 2400, 0.3).bp * 1.5 + Math.sin(TAU * (hi ? 2600 : 1900) * t) * 0.3) * Math.exp(-t * 220));
  },
  // сердцебиение «тук-тук»
  heartbeat() {
    const out = buf(1.0);
    const th = (a) => each(buf(0.3), (t) => Math.sin(TAU * (48 + 30 * Math.exp(-t * 30)) * t) * Math.exp(-t * 16) * att(t, 0.005) * a);
    mixInto(out, th(1), 0, 1); mixInto(out, th(0.7), 0.26, 1);
    return out;
  },
  // клавиатура
  typing(seed, dur) {
    const out = buf(dur), n = rng(seed);
    for (let t = 0.05; t < dur - 0.05; t += 0.07 + Math.abs(n()) * 0.12) {
      const f = svf(), a = 0.35 + Math.abs(n()) * 0.4, fc = 2200 + n() * 900;
      mixInto(out, each(buf(0.03), (tt) => f(n(), fc, 0.4).bp * Math.exp(-tt * 300) * a * 2), t, 1);
    }
    return out;
  },
  // аплодисменты: сотни хлопков
  applause(seed, dur = 3) {
    const out = buf(dur), n = rng(seed);
    const claps = Math.round(dur * 70);
    for (let c = 0; c < claps; c++) {
      const t = Math.abs(n()) * dur, f = svf(), fc = 1100 + n() * 500;
      const a = 0.25 * Math.sin(Math.PI * Math.min(1, t / dur)) + 0.05;
      mixInto(out, each(buf(0.025), (tt) => f(n(), fc, 0.6).bp * Math.exp(-tt * 260) * a * 3), t, 1);
    }
    return out;
  },
  // гром: треск и раскат
  thunder(seed, dur = 3.5) {
    const n = rng(seed), f = svf(), g = svf(), lfo = rng(seed + 7);
    let m = 0;
    return each(buf(dur), (t) => {
      m += (lfo() - m) * 0.0006;
      const rumble = f(n(), 110 + 180 * Math.exp(-t * 1.5), 0.6).lp * Math.exp(-t * 0.9) * (0.7 + 2.5 * Math.abs(m));
      const crack = g(n(), 2500, 0.7).hp * Math.exp(-t * 14) * 0.5;
      return Math.tanh((rumble * 2.2 + crack) * att(t, 0.01));
    });
  },
  // успех: арпеджио колокольчиков (до-ми-соль-до)
  success(seed) {
    const out = buf(2.2);
    [523.25, 659.25, 783.99, 1046.5].forEach((fq, i) => mixInto(out, S.bell(seed + i, fq, 1.6, 2.5, [1, 2, 3]), i * 0.11, 0.7));
    return out;
  },
};

// ── Фоновые звуки (на всю длину сцены) ─────────────────────────────────────
const AMB = {
  // гул помещения (кофейня, офис, квартира)
  room(seed, dur, level = 1) {
    const n = rng(seed), f = svf(); let b = 0;
    return fade(each(buf(dur), () => { b = b * 0.995 + n() * 0.05; return f(b, 300, 0.7).lp * 2.2 * level; }), 0.4);
  },
  rain(seed, dur) {
    const n = rng(seed), f = svf(), h = svf(), out = buf(dur);
    each(out, (t) => f(n(), 3200, 0.7).lp * 0.55 + h(n(), 6000, 0.7).hp * 0.12);
    for (let t = 0; t < dur; t += 0.01 + Math.abs(n()) * 0.04) {
      const g = svf(), fc = 2500 + n() * 1500, a = Math.abs(n()) * 0.25;
      mixInto(out, each(buf(0.02), (tt) => g(n(), fc, 0.5).bp * Math.exp(-tt * 350) * a), t, 1);
    }
    return fade(out, 0.5);
  },
  // волны у дома на берегу
  waves(seed, dur) {
    const n = rng(seed), f = svf();
    return fade(each(buf(dur), (t) => f(n(), 500 + 900 * (0.5 + 0.5 * Math.sin(TAU * t / 5.5)), 0.6).lp * (0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(TAU * t / 5.5 - 1), 2)) * 0.9), 0.8);
  },
  // ночной город: далёкий гул машин
  city(seed, dur) {
    const n = rng(seed), f = svf(); let b = 0;
    return fade(each(buf(dur), (t) => { b = b * 0.998 + n() * 0.03; return f(b, 180 + 60 * Math.sin(TAU * t / 7), 0.6).lp * 1.7; }), 0.6);
  },
  // вечеринка за стеной: приглушённая бочка 124 BPM и бас
  club(seed, dur) {
    const out = buf(dur), beat = 60 / 124;
    for (let t = 0; t < dur; t += beat) {
      mixInto(out, each(buf(0.35), (tt) => Math.sin(TAU * (45 + 110 * Math.exp(-tt * 25)) * tt) * Math.exp(-tt * 8) * att(tt, 0.003) * 0.9), t, 1);
    }
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR, step = Math.floor(t / (beat / 2));
      ph += TAU * [55, 55, 65.4, 49][step % 4] / SR;
      out[i] += Math.sin(ph) * 0.18 * (0.6 + 0.4 * Math.sin(TAU * t / beat));
    }
    return fade(out, 0.4);
  },
  // тревожный гул (новости, кризис)
  drone(seed, dur) {
    const n = rng(seed);
    const fr = [55, 58.3, 82.4];
    return fade(each(buf(dur), (t) => fr.reduce((v, fq, i) => v + Math.sin(TAU * fq * t + i) * 0.22, 0) * (0.8 + 0.2 * Math.sin(TAU * t * 0.3)) + n() * 0.01), 1.0);
  },
  // тёплый аккорд-подложка (финал, эмоции)
  pad(seed, dur) {
    const fr = [130.81, 196.0, 261.63, 329.63];
    return fade(each(buf(dur), (t) => fr.reduce((v, fq, i) => v + Math.sin(TAU * fq * t * (1 + 0.002 * Math.sin(TAU * t * 0.2 + i))) * 0.12, 0)), 1.2);
  },
};

function fade(b, sec) {
  const k = Math.min(b.length / 2, Math.round(sec * SR));
  for (let i = 0; i < k; i++) { const g = i / k; b[i] *= g; b[b.length - 1 - i] *= g; }
  return b;
}

function mixInto(track, clip, atSec, gain = 1) {
  const o = Math.round(atSec * SR);
  for (let i = 0; i < clip.length; i++) {
    const j = o + i;
    if (j >= 0 && j < track.length) track[j] += clip[i] * gain;
  }
}

// ── Какие звуки в какой сцене ──────────────────────────────────────────────
// t — начало сцены (с), d — длительность, p — параметры панели, seed — номер
function cuesFor(action, p, t, d, seed, add, amb) {
  const s = seed * 31;
  switch (action) {
    case "chapter_card": add(S.whoosh(s, 0.7), t - 0.2, 0.5); add(S.impact(s), t + 0.25, 0.75); break;
    case "big_number": {
      add(S.riser(s, 1.4), t, 0.3);
      for (let k = t + 0.3; k < t + d * 0.55; k += 0.09) add(S.tick(s + k * 100), k, 0.18);
      add(S.impact(s, 1.4), t + d * 0.58, 0.55); add(S.coin(s), t + d * 0.58, 0.3);
      break;
    }
    case "phone": add(S.notify(s), t + 0.4, 0.45); for (let k = t + 0.9; k < t + d * 0.6; k += 0.1) add(S.tick(s + k * 50), k, 0.1); break;
    case "coins_pour": case "jar_fill": case "tree_grow":
      for (let k = 0; k < (action === "coins_pour" ? 26 : 10); k++) add(S.coin(s + k), t + 0.4 + (k / (action === "coins_pour" ? 26 : 10)) * d * 0.75, action === "coins_pour" ? 0.28 : 0.18);
      break;
    case "age_counter": case "timeline":
      for (let k = t + 0.3; k < t + d * 0.8; k += action === "timeline" ? d * 0.18 : 0.25) add(action === "timeline" ? S.pop(s + k) : S.tick(s + k * 10, false), k, action === "timeline" ? 0.4 : 0.35);
      break;
    case "line_chart":
      if (p?.trend === "crash") { add(S.whoosh(s, 1.2, true), t + d * 0.45, 0.5); add(S.impact(s, 1.6), t + d * 0.62, 0.5); amb(AMB.drone(s, d), t, 0.12); }
      else add(S.riser(s, d * 0.7), t + 0.2, 0.2);
      break;
    case "bars_growth": case "pillars": case "stairs_goal": case "meters":
      for (let k = 0; k < 4; k++) add(S.pop(s + k), t + 0.4 + k * d * 0.17, 0.35);
      break;
    case "split_paths": case "seesaw": add(S.whoosh(s, 0.5), t + d * 0.45, 0.25); add(S.pop(s), t + d * 0.6, 0.3); break;
    case "thought": case "talk": add(S.pop(s), t + 0.3, 0.3); break;
    case "hammer_rock": for (let k = t + 0.5; k < t + d * 0.85; k += 0.55) add(S.impact(s + k, 0.5), k, 0.25); break;
    case "push_boulder": case "debt_ball": amb(AMB.city(s, d), t, 0.2); add(S.impact(s, 1.2), t + d * 0.6, 0.35); break;
    case "desk_work": add(S.typing(s, d), t, 0.35); amb(AMB.room(s, d), t, 0.12); break;
    case "crowd_react":
      if (p?.mood === "shock") { add(S.impact(s, 1.2), t + 0.3, 0.45); add(S.heartbeat(), t + 1.4, 0.5); }
      else add(S.applause(s, Math.min(d, 3.5)), t + 0.2, 0.45);
      break;
    case "victory": add(S.success(s), t + 0.3, 0.45); add(S.applause(s, Math.min(d, 3)), t + 0.6, 0.3); amb(AMB.pad(s, d), t, 0.12); break;
    case "house": add(S.pop(s), t + 0.5, 0.3); amb(AMB.pad(s, d), t, 0.1); break;
    case "city_walk": case "street_night": amb(AMB.city(s, d), t, 0.4); if (action === "street_night") add(S.notify(s), t + d * 0.3, 0.3); break;
    // локации во весь кадр
    case "coffee_shop": amb(AMB.room(s, d), t, 0.25); add(S.kaching(s), t + d * 0.55, 0.4); add(S.bell(s, 3136, 0.4, 12), t + 1.1, 0.08); break;
    case "bedroom_night": amb(AMB.room(s, d, 0.6), t, 0.2); for (let k = t + 0.5; k < t + d; k += 1) add(S.tick(s + k), k, 0.12); add(S.buzz(), t + d * 0.35, 0.3); break;
    case "apartment_night": amb(AMB.room(s, d, 0.6), t, 0.25); for (let k = t + 0.5; k < t + d; k += 1) add(S.tick(s + k), k, 0.1); break;
    case "office": amb(AMB.room(s, d), t, 0.22); add(S.typing(s, d), t, 0.2); break;
    case "party": amb(AMB.club(s, d), t, 0.5); break;
    case "news_crash": add(S.impact(s, 1.8), t + 0.2, 0.6); add(S.whoosh(s, 1.0, true), t + 1.0, 0.35); amb(AMB.drone(s, d), t, 0.2); break;
    case "balcony_rain": {
      amb(AMB.rain(s, d), t, 0.45);
      if (p?.lightning !== false) for (let k = 0; k < d; k += 4.5) add(S.thunder(s + k), t + k + 0.5, 0.5);
      if (p?.caller) add(S.buzz(), t + 0.3, 0.4);
      break;
    }
    case "beach_house": amb(AMB.waves(s, d), t, 0.4); amb(AMB.pad(s, d), t, 0.1); break;
    default: break;
  }
}

// Дорожка эффектов на весь ролик. beats: [{panels, layout}], durs: длительности (с)
export function buildSfxTrack(beats, durs, { volume = 0.5 } = {}) {
  const total = durs.reduce((a, b) => a + b, 0);
  const track = new Float32Array(Math.ceil((total + 1) * SR));
  const ambTrack = new Float32Array(track.length);
  let t = 0, prev = "";
  beats.forEach((b, i) => {
    const d = durs[i];
    const add = (clip, at, g) => mixInto(track, clip, at, g);
    const amb = (clip, at, g) => mixInto(ambTrack, clip, at, g);
    const acts = (b.panels || []).map((pn) => pn.action);
    const key = `${b.layout}:${acts.join(",")}`;
    // свуш на склейке, если сцена сменилась (у заставок — свой)
    if (i > 0 && key !== prev && acts[0] !== "chapter_card") add(S.whoosh(i * 7 + 3, 0.5), t - 0.22, 0.3);
    (b.panels || []).forEach((pn, k) => cuesFor(pn.action, pn.params || {}, t, d, i * 10 + k + 1, add, amb));
    prev = key;
    t += d;
  });
  // фон чуть тише, мягкий лимитер, перевод в 16 бит
  const out = Buffer.alloc(Math.round(total * SR) * 2);
  for (let i = 0; i < out.length / 2; i++) {
    const v = Math.tanh((track[i] + ambTrack[i] * 0.8) * volume * 1.2) * 0.95;
    out.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return out;
}

export const SFX_NAMES = Object.keys(S).concat(Object.keys(AMB).map((k) => `amb:${k}`));
export { S as SOUNDS, AMB as AMBIENCE };
