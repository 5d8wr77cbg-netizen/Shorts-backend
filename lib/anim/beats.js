// ============================================================================
//  Биты — сцены ролика в формате конкурента.
//  Ролик ≈ 30–35 секунд = 3–5 битов. Бит — это раскладка кадра и панели:
//    single — одна сцена на весь кадр;
//    stack2 — две панели друг над другом («Что видят / Чего не видят»);
//    stack3 — три панели («Сегодня / Через месяц / Через год»);
//    side2  — две панели рядом («Копит | Тратит»);
//    grid4  — четыре панели 2×2.
//  В каждой панели — действие (lib/anim/actions.js или старая сцена из scenes.js)
//  со своими параметрами и подписью над ней.
// ============================================================================

import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { createCanvas } from "@napi-rs/canvas";
import { ACTIONS } from "./actions.js";
import { STORY_ACTIONS } from "./story_actions.js";
import { WORLD_ACTIONS } from "./world.js";
import { TEMPLATES } from "./scenes.js";
import { background } from "./props.js";
import { label, fitSize } from "./text.js";
import { X264_ARGS } from "../video.js";

const STAGE_W = 1080, STAGE_H = 1920;
const FADE = 0.35;

// Старые сцены (пол на y = 1460) — с областями видимости для панелей
const LEGACY_VIEWS = {
  saver_vs_spender: [60, 980, 960, 560],
  compound_stairs: [40, 760, 1000, 780],
  crowd_follow: [0, 1060, 1080, 560],
  debt_ball: [60, 1080, 1020, 500],
  ladder_climb: [160, 620, 760, 900],
  door_light: [100, 960, 920, 560],
  paycheck_treadmill: [180, 960, 760, 600],
};

export const ALL_ACTIONS = {
  ...ACTIONS,
  ...STORY_ACTIONS,
  ...WORLD_ACTIONS,
  ...Object.fromEntries(Object.entries(TEMPLATES).map(([k, v]) => [k, { ...v, view: LEGACY_VIEWS[k], params: "" }])),
};

// Верх кадра (до y≈330) — под фразы; панели ниже
export const LAYOUTS = {
  single: [[0, 340, 1080, 1440]],
  stack2: [[0, 340, 1080, 760], [0, 1110, 1080, 760]],
  stack3: [[0, 330, 1080, 520], [0, 860, 1080, 520], [0, 1390, 1080, 520]],
  side2: [[0, 380, 540, 1300], [540, 380, 540, 1300]],
  grid4: [[0, 380, 540, 700], [540, 380, 540, 700], [0, 1100, 540, 700], [540, 1100, 540, 700]],
};

// Горизонтальный кадр 16:9 (длинные ролики): сцена 1920×1080, снизу место под субтитры
export const LAYOUTS_WIDE = {
  single: [[80, 40, 1760, 900]],
  stack2: [[0, 30, 1920, 470], [0, 500, 1920, 470]],
  stack3: [[0, 60, 640, 880], [640, 60, 640, 880], [1280, 60, 640, 880]],
  side2: [[0, 60, 960, 880], [960, 60, 960, 880]],
  grid4: [[0, 30, 960, 470], [960, 30, 960, 470], [0, 500, 960, 470], [960, 500, 960, 470]],
};

export function beatDuration(beat) {
  if (+beat.duration) return Math.min(Math.max(+beat.duration, beat.narrated ? 1.5 : 4), beat.narrated ? 60 : 15);
  const ds = (beat.panels || []).map((p) => ALL_ACTIONS[p.action]?.duration || 7);
  return Math.max(6, ...ds);
}

// Проверка бита; бросает ошибку с понятным текстом
export function validateBeat(beat) {
  if (!LAYOUTS[beat.layout || "single"]) throw new Error(`Неизвестная раскладка: ${beat.layout}`);
  const panels = beat.panels || [];
  if (!panels.length) throw new Error("В бите нет панелей");
  const bad = panels.find((p) => !ALL_ACTIONS[p.action]);
  if (bad) throw new Error(`Неизвестное действие: ${bad.action}`);
}

export function drawBeatFrame(ctx, beat, t, T, wide = false) {
  const rects = (wide ? LAYOUTS_WIDE : LAYOUTS)[beat.layout || "single"];
  const panels = (beat.panels || []).slice(0, rects.length);
  const multi = rects.length > 1;
  panels.forEach((pn, i) => {
    const act = ALL_ACTIONS[pn.action];
    const [rx, ry, rw, rh] = rects[i];
    const start = clamp01(pn.start ?? 0) * T;
    const lt = t - start, LT = T - start;
    if (lt < 0) return;
    const appear = Math.min(1, lt / 0.35);
    if (!CLEAN.has(pn)) CLEAN.set(pn, sanitizeParams(pn.params || {}));
    const params = CLEAN.get(pn);
    // подпись панели
    let top = ry;
    if (pn.label) {
      const size = fitSize(ctx, pn.label, rw - 40, multi ? 34 : 38, 600);
      label(ctx, pn.label, rx + rw / 2, ry + 36, { size, weight: 600, color: pn.labelColor || "white", alpha: appear });
      top += 70;
    }
    // старые сцены «копит/тратит» — две подписи над героями
    if (!multi && Array.isArray(beat.labels) && beat.labels.length === 2) {
      beat.labels.forEach((l, j) => label(ctx, l, rx + rw * (j ? 0.72 : 0.28), ry + 40, { size: 34, weight: 500, alpha: appear }));
      top += 70;
    }
    const view = typeof act.view === "function" ? act.view(params) : act.view || [0, 300, 1080, 1300];
    const [vx, vy, vw, vh] = view;
    // окружение (улица, комната) заполняет весь кадр, как у Ifverse
    if (act.fill && !multi) {
      const FW = wide ? 1920 : STAGE_W, FH = wide ? 1080 : STAGE_H;
      const sc = Math.max(FW / vw, FH / vh) * (1 + 0.035 * (lt / LT));
      ctx.save();
      ctx.globalAlpha = appear;
      ctx.translate(FW / 2, FH / 2); ctx.scale(sc, sc); ctx.translate(-(vx + vw / 2), -(vy + vh / 2));
      try { act.render(ctx, lt, LT, params); } catch (e) { if (!WARNED.has(pn)) { console.warn(`action ${pn.action} failed:`, e.message); WARNED.add(pn); } }
      ctx.restore();
      return;
    }
    const regionH = ry + rh - top;
    // в 16:9 сцена крупнее: поля области видимости можно немного обрезать
    const s = Math.min(rw / vw, regionH / vh) * (wide && !multi ? 1.14 : 0.96) * (1 + 0.04 * (lt / LT));
    ctx.save();
    ctx.globalAlpha = appear;
    if (multi) { ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip(); }
    ctx.translate(rx + rw / 2, top + regionH / 2);
    ctx.scale(s, s);
    ctx.translate(-(vx + vw / 2), -(vy + vh / 2));
    try {
      act.render(ctx, lt, LT, params);
    } catch (e) {
      // кривые параметры от ИИ не должны ронять весь ролик — панель просто пустая
      if (!WARNED.has(pn)) { console.warn(`action ${pn.action} failed:`, e.message); WARNED.add(pn); }
    }
    ctx.restore();
  });
  if (beat.layout === "side2" || (wide && beat.layout === "stack3")) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (const r of rects.slice(1)) ctx.fillRect(r[0] - 1, r[1] + 20, 2, r[3] - 40);
  }
}

const clamp01 = (v) => Math.min(Math.max(+v || 0, 0), 0.9);

// Числовые параметры от ИИ: нечисла убираем (действие возьмёт значение по умолчанию),
// числа зажимаем в разумные рамки. NaN в отрисовке роняет весь процесс, а не панель.
const NUMERIC = {
  level: [0, 1], grow: [0, 1], h: [0, 1], value: [0, 1e9],
  from: [-1e12, 1e12], to: [-1e12, 1e12], // у банки/дерева сами зажимаются в 0..1, у счётчиков — любые числа
  leftWeight: [0.2, 3], rightWeight: [0.2, 3], hits: [1, 9999], size: [40, 200],
};
const CLEAN = new WeakMap();
const WARNED = new WeakSet();

export function sanitizeParams(v, key) {
  if (Array.isArray(v)) return v.slice(0, 12).map((x) => sanitizeParams(x));
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      const r = sanitizeParams(x, k);
      if (r !== undefined) out[k] = r;
    }
    return out;
  }
  if (key in NUMERIC) {
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    const [lo, hi] = NUMERIC[key];
    return Math.min(Math.max(n, lo), hi);
  }
  if (typeof v === "string") return v.slice(0, 60);
  return v;
}

// Рендер одного бита в MP4 (без звука)
// final: true — сразу финальное качество (длинные ролики склеиваются без перекодирования)
export function renderBeat({ beat, W = 1080, H = 1920, fps = 30, outPath, final = false }) {
  validateBeat(beat);
  const T = beatDuration(beat);
  const frames = Math.round(T * fps);

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      "-y",
      "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(fps), "-i", "-",
      // промежуточный файл: быстрое кодирование почти без потерь, финал перекодируется
      ...X264_ARGS, "-preset", final ? "veryfast" : "ultrafast", "-crf", final ? "21" : "14", "-pix_fmt", "yuv420p",
      ...(final ? ["-g", "60"] : []),
      outPath,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve({ outPath, duration: T });
      else reject(new Error("FFmpeg error:\n" + stderr.slice(-1500)));
    });

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const wide = W > H;
    const SW = wide ? 1920 : STAGE_W, SH = wide ? 1080 : STAGE_H;
    const fit = Math.min(W / SW, H / SH);

    (async () => {
      try {
        for (let i = 0; i < frames; i++) {
          const t = i / fps;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          background(ctx, W, H);
          ctx.translate((W - SW * fit) / 2, (H - SH * fit) / 2);
          ctx.scale(fit, fit);
          drawBeatFrame(ctx, beat, t, T, wide);
          // затемнение в начале и в конце бита (вместо отдельного прохода ffmpeg)
          const fade = Math.min(1, t / FADE, (T - t) / FADE);
          if (fade < 1) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = `rgba(0,0,0,${(1 - Math.max(0, fade)).toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
          }
          if (!proc.stdin.write(canvas.data())) {
            await new Promise((r) => proc.stdin.once("drain", r));
          }
        }
        proc.stdin.end();
      } catch (e) {
        proc.kill("SIGKILL");
        reject(e);
      }
    })();
  });
}

// Старый формат сцены { template, duration, captions, labels } → бит
export function sceneToBeat(s) {
  if (s.layout || s.panels) return s;
  return {
    layout: "single",
    panels: [{ action: s.template, params: s.params || {} }],
    labels: s.labels,
    captions: s.captions,
    caption: s.caption,
    highlight: s.highlight,
    duration: s.duration,
  };
}
