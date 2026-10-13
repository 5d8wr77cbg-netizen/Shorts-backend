// ============================================================================
//  Сюжетные действия для длинных роликов (формат «What if…», как у Ifverse
//  Tales, но в стиле канала: чёрный фон, белые человечки, золото).
//  Тот же контракт, что в actions.js: { view, duration, about, params, render }.
//  Пол на y = 1000, ширина сцены 1080; области видимости — горизонтальные (16:9).
// ============================================================================

import { drawFigure, ground, walkPose, lerpPose, reach, POSES, clamp, lerp, ease, easeOutBack } from "./figure.js";
import { glow, floor, lightPool, coinStack, coin, trophy } from "./props.js";
import { label, color, fitSize, measure } from "./text.js";

const G = 1000;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

function wrap(ctx, text, maxW, size, weight = 500) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (measure(ctx, test, size, weight) > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

function money(n, prefix = "$", suffix = "") {
  const v = Math.round(Number(n) || 0);
  return `${v < 0 ? "-" : ""}${prefix}${Math.abs(v).toLocaleString("en-US")}${suffix}`;
}

const SIT = { torso: 4, head: 6, la1: 40, la2: 80, ra1: 45, ra2: 85, ll1: 88, ll2: 2, rl1: 92, rl2: 0 };

// Облако-реплика
function bubble(ctx, x, y, text, { w = 420, tail = "down", alpha = 1, size = 30, thought = false } = {}) {
  const lines = wrap(ctx, text, w - 50, size);
  const h = lines.length * size * 1.25 + 40;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = "#f2f2f2";
  if (thought) {
    ctx.beginPath(); ctx.ellipse(x, y - h / 2, w / 2 + 20, h / 2 + 22, 0, 0, Math.PI * 2); ctx.fill();
    for (const [dx, dy, r] of [[-30, 30, 16], [-55, 62, 10]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 22); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 20, y - 2); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x - 26, y + 34); ctx.closePath(); ctx.fill();
  }
  lines.forEach((ln, i) => label(ctx, ln, x, y - h + 20 + size * 0.65 + i * size * 1.25, { size, weight: 600, color: "#111" }));
  ctx.restore();
}

// ── Диалог ────────────────────────────────────────────────────────────────
function talk(ctx, t, T, p) {
  floor(ctx, 120, 960, G);
  const sp = p.speaker === "right" ? 1 : 0;
  const gest = Math.sin(t * 5) * 0.5 + 0.5;
  const figs = [
    { x: 360, dir: 1, palette: p.leftColor === "grey" ? "grey" : "hero" },
    { x: 720, dir: -1, palette: p.rightColor === "grey" ? "grey" : "hero" },
  ];
  figs.forEach((f, i) => {
    let fig = ground({ ...POSES.stand, x: f.x, U: 40, dir: f.dir, palette: f.palette, head: i === sp ? -4 + gest * 4 : 4 }, G);
    if (i === sp) fig = { ...fig, ra1: 50 + gest * 30, ra2: 80 + gest * 40 };
    drawFigure(ctx, fig);
    const lb = i ? p.right : p.left;
    if (lb) label(ctx, lb, f.x, G + 50, { size: 30, color: "grey" });
  });
  const a = ease(seg(t, 0.2, 0.6));
  bubble(ctx, figs[sp].x + (sp ? -60 : 60), G - 360, p.text || "", { alpha: a, w: 460 });
}

// ── Телефон с балансом ────────────────────────────────────────────────────
function phone(ctx, t, T, p) {
  const k = ease(seg(t, T * 0.15, T * 0.75));
  const from = Number(p.from) || 0, to = Number(p.to ?? 1000);
  const val = lerp(from, to, k);
  const up = to >= from;
  const px = 640, py = 470, pw = 300, ph = 540;
  floor(ctx, 120, 960, G);
  drawFigure(ctx, ground({ ...POSES.stand, head: 12, x: 330, U: 40, dir: 1 }, G));
  ctx.fillStyle = "#1a1a1a"; ctx.strokeStyle = "#d8d8d8"; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 40); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#050505"; ctx.beginPath(); ctx.roundRect(px + 18, py + 30, pw - 36, ph - 60, 24); ctx.fill();
  label(ctx, p.label || "Balance", px + pw / 2, py + 120, { size: 30, color: "grey" });
  const txt = money(val, p.prefix ?? "$", p.suffix || "");
  label(ctx, txt, px + pw / 2, py + 200, { size: fitSize(ctx, txt, pw - 50, 56, 800), weight: 800, color: p.color || (up ? "green" : "red") });
  // столбики трат/доходов
  for (let i = 0; i < 6; i++) {
    const hh = 30 + 90 * Math.abs(Math.sin(i * 1.7 + 1)) * (up ? 0.5 + k * 0.5 : 1 - k * 0.6);
    ctx.fillStyle = color(up ? "green" : "red"); ctx.globalAlpha = 0.5;
    ctx.fillRect(px + 50 + i * 36, py + ph - 70 - hh, 24, hh); ctx.globalAlpha = 1;
  }
  if (p.notice) {
    const a = ease(seg(t, T * 0.5, T * 0.65));
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = "#2a2a2a"; ctx.beginPath(); ctx.roundRect(px - 40, py - 90 + (1 - a) * -30, pw + 80, 70, 16); ctx.fill();
    label(ctx, p.notice, px + pw / 2, py - 55 + (1 - a) * -30, { size: fitSize(ctx, p.notice, pw + 50, 26, 600), weight: 600 });
    ctx.restore();
  }
}

// ── Крупный счётчик ───────────────────────────────────────────────────────
function bigNumber(ctx, t, T, p) {
  const k = ease(seg(t, T * 0.1, T * 0.8));
  const val = lerp(Number(p.from) || 0, Number(p.to ?? 1000000), k);
  const txt = money(val, p.prefix ?? "$", p.suffix || "");
  const pop = 1 + 0.06 * easeOutBack(seg(t, T * 0.8, T * 0.9)) * (1 - seg(t, T * 0.9, T));
  ctx.save(); ctx.translate(540, 700); ctx.scale(pop, pop);
  label(ctx, txt, 0, 0, { size: fitSize(ctx, txt, 980, 150, 900), weight: 900, color: p.color || "gold", glow: k > 0.95 });
  ctx.restore();
  if (p.label) label(ctx, p.label, 540, 830, { size: 40, color: "grey" });
}

// ── Возраст / годы ────────────────────────────────────────────────────────
function ageCounter(ctx, t, T, p) {
  const from = Number(p.from ?? 18), to = Number(p.to ?? 65);
  const k = ease(seg(t, T * 0.1, T * 0.8));
  const v = Math.round(lerp(from, to, k));
  floor(ctx, 160, 920, G);
  label(ctx, p.label || "AGE", 680, 560, { size: 40, color: "grey" });
  label(ctx, String(v), 680, 700, { size: 190, weight: 900, color: p.color || "white" });
  const old = clamp((v - 50) / 30, 0, 1);
  drawFigure(ctx, ground({ ...lerpPose(POSES.stand, POSES.sad, old * 0.6), x: 320, U: 42, dir: 1 }, G));
}

// ── Работа за столом, время летит ─────────────────────────────────────────
function deskWork(ctx, t, T, p) {
  floor(ctx, 120, 960, G);
  // стол и ноутбук
  ctx.fillStyle = "#cfcfcf"; ctx.fillRect(470, 760, 380, 14);
  ctx.fillRect(820, 774, 12, 226); ctx.fillRect(490, 774, 12, 226);
  ctx.fillStyle = "#3a3a3a"; ctx.beginPath(); ctx.moveTo(560, 760); ctx.lineTo(700, 760); ctx.lineTo(720, 650); ctx.lineTo(590, 650); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(110,139,224,0.5)"; ctx.fillRect(600, 662, 110, 80);
  // стул
  ctx.fillStyle = "#555"; ctx.fillRect(330, 830, 150, 12); ctx.fillRect(330, 700, 12, 140); ctx.fillRect(400, 842, 10, 158);
  // фигура сидит и печатает
  const typing = Math.sin(t * 14) * 4;
  let f = ground({ ...SIT, x: 420, U: 40, dir: 1 }, 850);
  f = reach(f, "r", [600 + typing, 748]);
  f = reach(f, "l", [585 - typing, 750]);
  drawFigure(ctx, f);
  // часы на стене
  const cx = 860, cy = 420, r = 70;
  ctx.strokeStyle = "#e6e6e6"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  const speed = p.fast === false ? 0.2 : 2.5;
  const hAng = t * speed * 0.6, mAng = t * speed * 7;
  ctx.lineCap = "round";
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(hAng) * r * 0.5, cy - Math.cos(hAng) * r * 0.5); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(mAng) * r * 0.8, cy - Math.cos(mAng) * r * 0.8); ctx.stroke();
  if (p.coins) coinStack(ctx, 780, 760, Math.round(1 + seg(t, 0, T) * (Number(p.coins) || 6)), 26);
  if (p.label) label(ctx, p.label, 540, 1060, { size: 32, color: "grey" });
}

// ── Заставка главы ────────────────────────────────────────────────────────
function chapterCard(ctx, t, T, p) {
  const a = ease(seg(t, 0.1, 0.8)) * (1 - ease(seg(t, T - 0.6, T)));
  const line = ease(seg(t, 0.3, 1.2));
  if (p.number) label(ctx, p.number, 540, 600, { size: 34, weight: 600, color: "gold", alpha: a });
  label(ctx, p.title || "", 540, 690, { size: fitSize(ctx, p.title || "", 960, 84, 800), weight: 800, alpha: a });
  ctx.fillStyle = color("gold"); ctx.globalAlpha = a;
  ctx.fillRect(540 - 220 * line, 760, 440 * line, 4); ctx.globalAlpha = 1;
}

// ── Дом ───────────────────────────────────────────────────────────────────
function house(ctx, t, T, p) {
  floor(ctx, 100, 980, G);
  const k = ease(seg(t, 0.1, T * 0.5));
  const hx = 620, hw = 340, hh = 260;
  ctx.strokeStyle = "#e6e6e6"; ctx.lineWidth = 6; ctx.lineJoin = "round";
  const pts = [[hx - hw / 2, G], [hx - hw / 2, G - hh], [hx, G - hh - 170], [hx + hw / 2, G - hh], [hx + hw / 2, G]];
  const total = pts.length - 1, drawn = k * total;
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  for (let i = 1; i <= total; i++) {
    const f = clamp(drawn - (i - 1), 0, 1);
    if (f <= 0) break;
    ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
  }
  ctx.stroke();
  const doorA = seg(t, T * 0.45, T * 0.6);
  ctx.fillStyle = `rgba(232,195,58,${0.85 * doorA})`; ctx.fillRect(hx - 40, G - 140, 80, 140);
  ctx.fillStyle = `rgba(255,255,255,${0.5 * doorA})`; ctx.fillRect(hx - 130, G - 200, 60, 60); ctx.fillRect(hx + 70, G - 200, 60, 60);
  if (doorA > 0) glow(ctx, hx, G - 70, 200, 0.25 * doorA);
  const wk = ease(seg(t, T * 0.4, T * 0.85));
  const x = lerp(180, hx - 70, wk);
  drawFigure(ctx, ground({ ...(wk > 0 && wk < 1 ? walkPose((x / 90) * Math.PI) : wk >= 1 ? POSES.cheer : POSES.stand), x, U: 36, dir: 1 }, G));
  if (p.label) label(ctx, p.label, hx, G - hh - 230, { size: 40, weight: 700, color: "gold", alpha: seg(t, T * 0.6, T * 0.75) });
}

// ── Толпа реагирует ───────────────────────────────────────────────────────
function crowdReact(ctx, t, T, p) {
  floor(ctx, 60, 1020, G);
  const mood = p.mood || "cheer";
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x = 160 + i * 127, hero = i === 3;
    const ph = t * 6 + i;
    let pose = POSES.stand;
    if (mood === "cheer") pose = lerpPose(POSES.stand, POSES.cheer, 0.6 + 0.4 * Math.sin(ph));
    else if (mood === "clap") pose = { ...POSES.stand, ra1: 70, ra2: 100 + 25 * Math.sin(ph * 2), la1: 70, la2: 100 - 25 * Math.sin(ph * 2) };
    else if (mood === "shock") pose = { ...POSES.stand, torso: -10, la1: 120, la2: 150, ra1: 120, ra2: 150 };
    else if (mood === "laugh") pose = { ...POSES.stand, torso: 15 + 8 * Math.sin(ph * 2), head: -10 };
    const f = ground({ ...pose, x, U: hero ? 38 : 32, dir: i < 3 ? 1 : -1, palette: hero ? "hero" : "grey" }, G);
    drawFigure(ctx, hero && mood !== "cheer" ? ground({ ...POSES.stand, x, U: 38, dir: 1 }, G) : f);
  }
  lightPool(ctx, 540, G, 200, 0.25);
  if (p.label) label(ctx, p.label, 540, 560, { size: 40, weight: 700, color: p.labelColor || "white", alpha: seg(t, 0.3, 1) });
}

// ── Мысль ─────────────────────────────────────────────────────────────────
function thought(ctx, t, T, p) {
  floor(ctx, 200, 880, G);
  drawFigure(ctx, ground({ ...POSES.stand, head: -14, ra1: 150, ra2: 200, x: 420, U: 42, dir: 1 }, G));
  const a = ease(seg(t, 0.3, 1));
  if (p.text) bubble(ctx, 640, 560, p.text, { alpha: a, w: 460, thought: true });
  else {
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = "#f2f2f2"; ctx.beginPath(); ctx.ellipse(640, 470, 170, 120, 0, 0, Math.PI * 2); ctx.fill();
    coinStack(ctx, 640, 530, 5, 50);
    ctx.restore();
  }
}

// ── Дождь из монет ────────────────────────────────────────────────────────
function coinsPour(ctx, t, T, p) {
  floor(ctx, 120, 960, G);
  const k = seg(t, 0, T * 0.85);
  const pile = Math.round(k * 14);
  coinStack(ctx, 640, G, pile, 60);
  coinStack(ctx, 760, G, Math.round(pile * 0.6), 50);
  for (let i = 0; i < 10; i++) {
    const ph = (t * 0.9 + i * 0.37) % 1;
    if (t > T * 0.85) break;
    coin(ctx, 560 + ((i * 97) % 280), 300 + ph * 650, 26, ph * 6 + i);
  }
  const final = ease(seg(t, T * 0.7, T * 0.9));
  drawFigure(ctx, ground({ ...lerpPose(POSES.stand, POSES.cheer, final), x: 360, U: 40, dir: 1 }, G));
  if (p.label) label(ctx, p.label, 640, 260, { size: 56, weight: 800, color: "gold", alpha: final, glow: true });
}

// ── Развилка ──────────────────────────────────────────────────────────────
function splitPaths(ctx, t, T, p) {
  const choice = p.choice === "left" ? -1 : 1;
  const base = [540, 1000], fork = [540, 780];
  const ends = [[250, 480], [830, 480]];
  const chosenGlow = ease(seg(t, T * 0.55, T * 0.75));
  ctx.lineCap = "round";
  const road = (a, b, c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };
  road(base, fork, "#cfcfcf", 10);
  ends.forEach((e, i) => {
    const chosen = (i === 0 ? -1 : 1) === choice;
    road(fork, e, chosen && chosenGlow > 0 ? color("gold") : "#6a6a6a", 10);
    const lbl = i ? p.right : p.left;
    if (lbl) label(ctx, lbl, e[0], e[1] - 60, { size: fitSize(ctx, lbl, 380, 40, 700), weight: 700, color: chosen && chosenGlow > 0.5 ? "gold" : "white" });
  });
  const k1 = ease(seg(t, 0.2, T * 0.45)), k2 = ease(seg(t, T * 0.55, T * 0.95));
  const end = ends[choice < 0 ? 0 : 1];
  const x = k2 > 0 ? lerp(fork[0], end[0], k2 * 0.7) : lerp(base[0], fork[0], k1);
  const y = k2 > 0 ? lerp(fork[1], end[1], k2 * 0.7) : lerp(base[1], fork[1], k1);
  const moving = (k1 > 0 && k1 < 1) || (k2 > 0 && k2 < 1);
  const sc = lerp(1, 0.6, (1000 - y) / 520);
  drawFigure(ctx, ground({ ...(moving ? walkPose(t * 7) : POSES.stand), x, U: 34 * sc, dir: k2 > 0 ? choice : 1 }, y));
}

// ── Линия жизни ───────────────────────────────────────────────────────────
function timeline(ctx, t, T, p) {
  const pts = (Array.isArray(p.points) && p.points.length ? p.points : [{ label: "18" }, { label: "25" }, { label: "40" }, { label: "65", sub: "Free" }]).slice(0, 6);
  const x0 = 140, x1 = 940, y = 820;
  ctx.fillStyle = "#cfcfcf"; ctx.fillRect(x0, y, (x1 - x0) * ease(seg(t, 0, T * 0.3)), 5);
  const k = ease(seg(t, T * 0.15, T * 0.9));
  pts.forEach((pt, i) => {
    const x = x0 + ((x1 - x0) * i) / Math.max(1, pts.length - 1);
    const a = seg(k * (pts.length - 1) + 0.5, i, i + 0.4);
    const last = i === pts.length - 1;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = last ? color("gold") : "#f2f2f2";
    ctx.beginPath(); ctx.arc(x, y + 2, last ? 16 : 12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    label(ctx, pt.label, x, y + 60, { size: 38, weight: 700, color: last ? "gold" : "white", alpha: a });
    if (pt.sub) label(ctx, pt.sub, x, y + 110, { size: 28, color: "grey", alpha: a });
  });
  const fx = lerp(x0, x1, k);
  drawFigure(ctx, ground({ ...(k < 1 ? walkPose(fx / 30) : POSES.cheer), x: fx, U: 30, dir: 1 }, y));
}

// ── Прогулка по городу ────────────────────────────────────────────────────
function cityWalk(ctx, t, T, p) {
  // силуэты домов, медленно уезжают (параллакс)
  const off = -t * 40;
  for (let i = 0; i < 14; i++) {
    const w = 70 + ((i * 53) % 60), h = 160 + ((i * 97) % 260);
    const x = ((i * 110 + off) % 1560 + 1560) % 1560 - 240;
    ctx.fillStyle = "#151515"; ctx.fillRect(x, G - h, w, h);
    ctx.fillStyle = "rgba(232,195,58,0.25)";
    for (let wy = G - h + 20; wy < G - 30; wy += 40) for (let wx = x + 12; wx < x + w - 14; wx += 26) if ((wx * 7 + wy) % 5 < 2) ctx.fillRect(wx, wy, 10, 16);
  }
  floor(ctx, 0, 1080, G, 0.4);
  const x = 540 + Math.sin(t * 0.3) * 10;
  drawFigure(ctx, ground({ ...walkPose(t * 6), x, U: 40, dir: 1, palette: p.grey ? "grey" : "hero" }, G));
  if (p.label) label(ctx, p.label, 540, 560, { size: 40, weight: 700, color: p.labelColor || "white", alpha: seg(t, 0.3, 1) });
}

// ── Награда / финал ───────────────────────────────────────────────────────
function victory(ctx, t, T, p) {
  floor(ctx, 200, 880, G);
  const k = ease(seg(t, 0.2, T * 0.6));
  glow(ctx, 540, G - 260, 420, 0.35 * k);
  trophy(ctx, 680, G, 1.3, k);
  drawFigure(ctx, ground({ ...lerpPose(POSES.stand, POSES.cheer, k), x: 440, U: 42, dir: 1 }, G));
  if (p.label) label(ctx, p.label, 540, 520, { size: 52, weight: 800, color: "gold", alpha: k, glow: true });
}

export const STORY_ACTIONS = {
  talk: { render: talk, duration: 6, view: [120, 480, 840, 620], params: "text, speaker left|right, left?, right?",
    about: "Two figures face each other; the speaker's line appears in a speech bubble (text: max ~12 words). left/right: small name labels under the figures." },
  phone: { render: phone, duration: 6, view: [160, 340, 840, 720], params: "from, to, label?, notice?, prefix?",
    about: "A figure looks at a big phone screen where a bank balance counts from `from` to `to` (green if it grows, red if it falls); optional notice banner (e.g. 'Rent paid -$1,200')." },
  big_number: { render: bigNumber, duration: 5, view: [40, 480, 1000, 420], params: "from, to, prefix?, suffix?, label?, color?",
    about: "A huge number counts from `from` to `to` (prefix default $), with a small label under it. Use for key money facts." },
  age_counter: { render: ageCounter, duration: 5, view: [140, 460, 820, 600], params: "from, to, label?",
    about: "A big age/year counter goes from `from` to `to` next to a figure that slowly ages. label default 'AGE' (or 'YEAR')." },
  desk_work: { render: deskWork, duration: 6, view: [200, 300, 760, 780], params: "coins?, fast?, label?",
    about: "A figure types at a laptop while the wall clock spins (time passes); coins: N makes a coin stack grow on the desk." },
  chapter_card: { render: chapterCard, duration: 3, view: [40, 480, 1000, 400], params: "number, title",
    about: "Chapter title card: small gold number line (e.g. 'Chapter 2') and a big white title. Use at the start of each chapter." },
  house: { render: house, duration: 6, view: [100, 450, 880, 620], params: "label?",
    about: "A house outline draws itself, its door lights up gold and a figure walks in and cheers; optional gold label (e.g. 'PAID OFF')." },
  crowd_react: { render: crowdReact, duration: 5, view: [60, 480, 960, 600], params: "mood cheer|clap|shock|laugh, label?",
    about: "A row of grey people around the white hero reacts: cheer, clap, shock or laugh; optional label above." },
  thought: { render: thought, duration: 5, view: [200, 300, 760, 760], params: "text?",
    about: "A thinking figure with a thought cloud containing text (max ~10 words) or coins if no text." },
  coins_pour: { render: coinsPour, duration: 6, view: [160, 220, 860, 840], params: "label?",
    about: "Gold coins rain down into growing piles next to a figure that ends up cheering; optional big gold label (e.g. '$1,000,000')." },
  split_paths: { render: splitPaths, duration: 6, view: [140, 360, 800, 680], params: "left, right, choice left|right",
    about: "A road forks into two labelled paths; the figure walks up and takes `choice`, which lights up gold." },
  timeline: { render: timeline, duration: 7, view: [100, 560, 880, 460], params: "points [{label, sub?}]",
    about: "A horizontal life/time line with up to 6 points (e.g. ages 18, 25, 40, 65 or years) appearing as a figure walks along; the last point is gold." },
  city_walk: { render: cityWalk, duration: 6, view: [0, 520, 1080, 560], params: "label?, grey?",
    about: "A figure walks through a dark city with lit windows (parallax). Good for 'every morning you go to work' moments." },
  victory: { render: victory, duration: 5, view: [160, 420, 760, 640], params: "label?",
    about: "Payoff moment: a figure raises its arms next to a glowing gold trophy; optional gold label." },
};
