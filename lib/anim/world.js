// ============================================================================
//  Окружение для длинных роликов (как у Ifverse Tales: улицы, комнаты, окна,
//  вывески, люди вокруг), но в стиле канала: тёмное пространство почти
//  чёрного цвета, белый герой, все остальные люди — серые.
//  Цвет — только свет: тёплые окна, фонари, неон, экраны.
// ============================================================================

import { drawFigure, ground, walkPose, reach, POSES, lerpPose, clamp, lerp, ease } from "./figure.js";
import { glow, coinStack, bag, jar } from "./props.js";
import { label, fitSize } from "./text.js";

const G = 1000;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
// моргание раз в ~3,5 с, у каждого персонажа своё смещение
const blinkAt = (t, off = 0) => { const ph = (t + off) % 3.5; return ph < 0.12 ? 1 - Math.abs(ph - 0.06) / 0.06 : 0; };
const money = (v) => `$${Math.round(v).toLocaleString("en-US")}`;

// ── Общие элементы ────────────────────────────────────────────────────────
let _t = 0;
const ANIM = () => _t;
export const setWorldTime = (t) => { _t = t; };

// Пылинки, медленно плывущие в луче света
function dust(ctx, x, top, w, h, t, color = "255,220,160") {
  for (let i = 0; i < 22; i++) {
    const px = x - w / 2 + ((rnd(i, 41) * w + Math.sin(t * 0.4 + i) * 20) % w);
    const py = top + ((rnd(i, 42) * h + t * (8 + rnd(i, 43) * 10)) % h);
    ctx.fillStyle = `rgba(${color},${0.15 + 0.35 * rnd(i, 44)})`;
    ctx.beginPath(); ctx.arc(px, py, 1.5 + rnd(i, 45) * 2, 0, Math.PI * 2); ctx.fill();
  }
}

// Реплика в облачке
function speech(ctx, x, y, text, a = 1, tail = "left") {
  if (!text || a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const size = 34, w = Math.min(640, 70 + text.length * 16), h = 92;
  const bx = x - (tail === "left" ? 90 : w - 90), by = y - h - 40;
  ctx.fillStyle = "#e8e8e8"; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 22); ctx.fill();
  const tx = tail === "left" ? bx + 70 : bx + w - 70;
  ctx.beginPath(); ctx.moveTo(tx - 18, by + h - 2); ctx.lineTo(tx + 22, by + h - 2); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
  label(ctx, text, bx + w / 2, by + h / 2, { size: fitSize(ctx, text, w - 40, size, 600), weight: 600, color: "#111" });
  ctx.restore();
}
const talkAmt = (t, start, text) => (text && t > start && t < start + text.split(/\s+/).length * 0.32 ? Math.abs(Math.sin(t * 14)) : 0);
function nightSky(ctx, x0, x1, top, bottom) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, "#020204"); g.addColorStop(1, "#0b0f1c");
  ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, bottom - top);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + rnd(i, 5) * 0.4})`;
    ctx.fillRect(x0 + rnd(i, 2) * (x1 - x0), top + rnd(i, 3) * (bottom - top) * 0.6, 2, 2);
  }
}

function moon(ctx, x, y, r) {
  glow(ctx, x, y, r * 4, 0.12);
  ctx.fillStyle = "#e9e6dc"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// Ряд домов: окна горят тёплым, часть мигает
export function skyline(ctx, x0, x1, base, { seed = 1, minH = 160, maxH = 420, color = "#0e1118", lit = 0.35, t = 0, scale = 1 } = {}) {
  let x = x0, i = 0;
  while (x < x1) {
    const w = (70 + rnd(i, seed) * 90) * scale, h = (minH + rnd(i, seed + 1) * (maxH - minH)) * scale;
    ctx.fillStyle = color; ctx.fillRect(x, base - h, w - 4 * scale, h);
    if (rnd(i, seed + 7) > 0.7) ctx.fillRect(x + w * 0.4, base - h - 30 * scale, 4 * scale, 30 * scale); // антенна
    const cw = 9 * scale, ch = 13 * scale, gx = 22 * scale, gy = 26 * scale;
    for (let wy = base - h + 16 * scale; wy < base - 20 * scale; wy += gy) {
      for (let wx = x + 10 * scale; wx < x + w - 18 * scale; wx += gx) {
        const r = rnd(wx * 0.37 + wy, seed);
        if (r < lit) {
          const flick = rnd(Math.floor(t * 0.5) + wx, seed) < 0.02 ? 0.3 : 1;
          ctx.fillStyle = r < lit * 0.25 ? `rgba(160,190,255,${0.55 * flick})` : `rgba(255,196,110,${0.7 * flick})`;
          ctx.fillRect(wx, wy, cw, ch);
        }
      }
    }
    x += w; i++;
  }
}

function streetLamp(ctx, x, base, h = 380) {
  ctx.fillStyle = "#1c1f26"; ctx.fillRect(x - 5, base - h, 10, h);
  ctx.fillRect(x - 5, base - h, 60, 8);
  // конус света
  const g = ctx.createLinearGradient(0, base - h, 0, base);
  g.addColorStop(0, "rgba(255,200,120,0.28)"); g.addColorStop(1, "rgba(255,200,120,0.02)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x + 40, base - h + 8); ctx.lineTo(x + 70, base - h + 8); ctx.lineTo(x + 190, base); ctx.lineTo(x - 80, base); ctx.closePath(); ctx.fill();
  glow(ctx, x + 55, base - h + 10, 60, 0.6);
  dust(ctx, x + 55, base - h + 40, 220, h - 60, ANIM());
  ctx.save(); ctx.translate(x + 55, base); ctx.scale(1, 0.12);
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 170);
  pool.addColorStop(0, "rgba(255,200,120,0.35)"); pool.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(0, 0, 170, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Витрина с неоновой вывеской
function shopFront(ctx, x, base, w, h, sign, t) {
  ctx.fillStyle = "#14161c"; ctx.fillRect(x, base - h, w, h);
  // витрина
  const g = ctx.createLinearGradient(0, base - h * 0.62, 0, base);
  g.addColorStop(0, "rgba(255,90,90,0.18)"); g.addColorStop(1, "rgba(255,90,90,0.05)");
  ctx.fillStyle = g; ctx.fillRect(x + 20, base - h * 0.62, w - 40, h * 0.62 - 6);
  ctx.strokeStyle = "#2a2e38"; ctx.lineWidth = 4; ctx.strokeRect(x + 20, base - h * 0.62, w - 40, h * 0.62 - 6);
  // манекены-силуэты и коробки в витрине
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#2a2d36";
    ctx.fillRect(x + 50 + i * (w - 100) / 3, base - 120 - (i % 2) * 30, 70, 120 + (i % 2) * 30);
  }
  // неон
  const on = 0.75 + 0.25 * Math.sin(t * 9) * (rnd(Math.floor(t * 4), 9) > 0.85 ? 1 : 0.2);
  ctx.save();
  ctx.shadowColor = "#ff3b3b"; ctx.shadowBlur = 30;
  label(ctx, sign, x + w / 2, base - h * 0.8, { size: fitSize(ctx, sign, w - 40, 64, 800), weight: 800, color: `rgba(255,70,70,${on})` });
  ctx.restore();
  glow(ctx, x + w / 2, base - h * 0.8, w * 0.6, 0.12 * on);
}

// Телефон в руке героя + всплывающий баланс над ним
function phoneBalance(ctx, hand, value, color, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = "#111"; ctx.strokeStyle = "#cfcfcf"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(hand[0] - 14, hand[1] - 36, 28, 48, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(110,160,255,0.85)"; ctx.fillRect(hand[0] - 10, hand[1] - 31, 20, 36);
  glow(ctx, hand[0], hand[1] - 12, 70, 0.25);
  // карточка баланса
  const bx = hand[0] + 40, by = hand[1] - 190;
  ctx.fillStyle = "rgba(20,22,28,0.92)"; ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx, by, 230, 96, 16); ctx.fill(); ctx.stroke();
  label(ctx, "Balance", bx + 115, by + 28, { size: 22, color: "grey" });
  label(ctx, money(value), bx + 115, by + 64, { size: 38, weight: 800, color });
  ctx.restore();
}

// ── Сцена: ночная улица с магазинами и прохожими ──────────────────────────
function streetNight(ctx, t, T, p) {
  _t = t;
  nightSky(ctx, -200, 1300, 0, G);
  moon(ctx, 900, 170, 34);
  skyline(ctx, -200, 1300, G - 60, { seed: 3, minH: 220, maxH: 520, color: "#0a0d15", lit: 0.18, t, scale: 0.8 });
  skyline(ctx, -200, 1300, G, { seed: 8, minH: 260, maxH: 460, color: "#12151d", lit: 0.3, t });
  shopFront(ctx, 520, G, 420, 360, p.sign || "SALE -50%", t);
  streetLamp(ctx, 170, G);
  // тротуар
  ctx.fillStyle = "#0c0d11"; ctx.fillRect(-200, G, 1500, 120);
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(-200, G, 1500, 3);
  // прохожие — серые, с пакетами
  const people = 7;
  for (let i = 0; i < people; i++) {
    const dir = i % 2 ? -1 : 1;
    const speed = 60 + rnd(i, 4) * 40;
    const span = 1500;
    const x = dir > 0 ? ((rnd(i, 6) * span + speed * t) % span) - 200 : 1300 - ((rnd(i, 6) * span + speed * t) % span);
    const U = 30 + rnd(i, 2) * 4;
    const f = ground({ ...walkPose(((x * dir) / (U * 3.2)) * Math.PI), x, U, dir, palette: "grey", face: i % 3 === 0 ? "smile" : "neutral", blink: blinkAt(t, i) }, G + 10 + (i % 3) * 14);
    drawFigure(ctx, f, (c, j) => { if (i % 3 !== 2) bag(c, j.rHand[0], j.rHand[1], U * 1.15, "#4d4d4d"); });
  }
  // герой под фонарём смотрит в телефон, баланс тает
  const k = ease(seg(t, T * 0.25, T * 0.85));
  const val = lerp(Number(p.from ?? 1240), Number(p.to ?? 86), k);
  const mood = k < 0.25 ? "neutral" : k < 0.75 ? "worried" : "sad";
  let hero = ground({ ...POSES.stand, head: 22, torso: 4, x: 240, U: 38, dir: 1, face: mood, blink: blinkAt(t, 0.7) }, G + 20);
  hero = reach(hero, "r", [300, G - 230]);
  const j = drawFigure(ctx, hero);
  phoneBalance(ctx, j.rHand, val, val < (Number(p.from ?? 1240) * 0.3) ? "red" : "white", ease(seg(t, 0.3, 0.9)));
}

// ── Сцена: квартира ночью, окно на город ──────────────────────────────────
// Мебель в масштабе героя (U = 58): сиденье ~ G-100, стол ~ G-190
function apartmentNight(ctx, t, T, p) {
  _t = t;
  const U = 58;
  ctx.fillStyle = "#0b0c10"; ctx.fillRect(-300, 0, 1700, G);
  // окно с городом
  const wx = 60, wy = 330, ww = 560, wh = 400;
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
  nightSky(ctx, wx, wx + ww, wy, wy + wh);
  moon(ctx, wx + ww - 90, wy + 70, 24);
  skyline(ctx, wx - 40, wx + ww + 40, wy + wh, { seed: 12, minH: 110, maxH: 300, color: "#0d1019", lit: 0.35, t, scale: 0.7 });
  ctx.restore();
  ctx.strokeStyle = "#2a2d35"; ctx.lineWidth = 14; ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  ctx.fillStyle = "rgba(160,190,255,0.05)";
  ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx + ww + 140, G); ctx.lineTo(wx - 40, G); ctx.closePath(); ctx.fill();
  // картина и полка на стене — «жилая» комната
  ctx.strokeStyle = "#23262e"; ctx.lineWidth = 6; ctx.strokeRect(720, 420, 130, 90);
  ctx.fillStyle = "#1a1c22"; ctx.fillRect(1000, 470, 200, 10);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = ["#2a2d36", "#30333c", "#25282f"][i % 3]; ctx.fillRect(1010 + i * 22, 410 + (i % 2) * 10, 16, 60 - (i % 2) * 10); }
  // пол
  ctx.fillStyle = "#08090c"; ctx.fillRect(-300, G, 1700, 160);
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(-300, G, 1700, 3);
  // настольная лампа: тёплый свет
  const lampX = 1185;
  const lg = ctx.createRadialGradient(lampX, 760, 10, lampX, 820, 460);
  lg.addColorStop(0, "rgba(255,190,110,0.32)"); lg.addColorStop(1, "rgba(255,190,110,0)");
  ctx.fillStyle = lg; ctx.fillRect(lampX - 500, 340, 1000, 820);
  // стол
  const top = G - 190;
  ctx.fillStyle = "#1d1f26"; ctx.fillRect(870, top, 400, 14); ctx.fillRect(890, top + 14, 12, 176); ctx.fillRect(1240, top + 14, 12, 176);
  // ноутбук с растущим графиком
  ctx.fillStyle = "#2b2e36"; ctx.beginPath(); ctx.moveTo(940, top); ctx.lineTo(1080, top); ctx.lineTo(1098, top - 110); ctx.lineTo(970, top - 110); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(978, top - 100, 112, 82); ctx.clip();
  ctx.fillStyle = "#0e1a14"; ctx.fillRect(978, top - 100, 112, 82);
  const k = ease(seg(t, 0.4, T * 0.9));
  ctx.strokeStyle = "#3ddc6f"; ctx.lineWidth = 3; ctx.beginPath();
  for (let i = 0; i <= 20 * k; i++) { const xx = 982 + i * 5, yy = top - 25 - i * 2.6 - Math.sin(i * 1.7) * 6; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
  ctx.stroke(); ctx.restore();
  glow(ctx, 1034, top - 60, 90, 0.22);
  // лампа и банка с монетами
  ctx.fillStyle = "#cfcfcf"; ctx.fillRect(lampX + 20, top - 70, 6, 70);
  ctx.beginPath(); ctx.moveTo(lampX - 5, top - 70); ctx.lineTo(lampX + 50, top - 70); ctx.lineTo(lampX + 35, top - 102); ctx.lineTo(lampX + 10, top - 102); ctx.closePath(); ctx.fill();
  jar(ctx, 905, top, 50, 70, 0.45 + 0.3 * k);
  // стул и герой
  const seat = G - 100;
  ctx.fillStyle = "#24262d"; ctx.fillRect(700, seat, 170, 12); ctx.fillRect(700, seat - 170, 12, 182); ctx.fillRect(780, seat + 12, 10, 88);
  const typing = Math.sin(t * 13) * 4;
  let hero = { torso: 6, head: 6, la1: 40, la2: 80, ra1: 45, ra2: 85, ll1: 90, ll2: 0, rl1: 92, rl2: -2, x: 790, y: seat - 12, U, dir: 1, face: "determined", blink: blinkAt(t, 1.3) };
  hero = reach(hero, "r", [985 + typing, top - 6]);
  hero = reach(hero, "l", [965 - typing, top - 4]);
  drawFigure(ctx, hero);
  // диван и серый друг
  const cs = G - 110;
  ctx.fillStyle = "#1e2028"; ctx.beginPath(); ctx.roundRect(-40, cs - 170, 520, 150, 26); ctx.fill();
  ctx.fillStyle = "#17191f"; ctx.beginPath(); ctx.roundRect(-60, cs - 20, 560, 120, 22); ctx.fill();
  ctx.fillRect(-60, cs - 90, 60, 190); ctx.fillRect(440, cs - 90, 60, 190);
  const talking = p.text && t > 0.6 && t < 0.6 + p.text.split(/\s+/).length * 0.32;
  const friend = { torso: -8, head: -4, la1: 70, la2: 100, ra1: 75 + Math.sin(t * 3) * 10, ra2: 115, ll1: 88, ll2: 4, rl1: 92, rl2: 2,
    x: 250, y: cs - 30, U, dir: 1, palette: "grey", face: "smile", blink: blinkAt(t, 2.1), talk: talking ? Math.abs(Math.sin(t * 14)) : 0 };
  drawFigure(ctx, friend, (c, j) => {
    // геймпад в руках
    const gx = (j.rHand[0] + j.lHand[0]) / 2, gy = (j.rHand[1] + j.lHand[1]) / 2;
    c.fillStyle = "#2c2f37"; c.beginPath(); c.roundRect(gx - 34, gy - 14, 68, 28, 12); c.fill();
    c.fillStyle = "#e0383b"; c.beginPath(); c.arc(gx + 18, gy - 2, 4, 0, Math.PI * 2); c.fill();
  });
  // реплика друга
  const a = ease(seg(t, 0.6, 1.4));
  if (p.text && a > 0) {
    ctx.save(); ctx.globalAlpha = a;
    const w = Math.min(560, 60 + p.text.length * 16), h = 90, bx = 160, by = 470;
    ctx.fillStyle = "#e8e8e8"; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 22); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx + 70, by + h - 2); ctx.lineTo(bx + 112, by + h - 2); ctx.lineTo(bx + 76, by + h + 36); ctx.closePath(); ctx.fill();
    label(ctx, p.text, bx + w / 2, by + h / 2, { size: fitSize(ctx, p.text, w - 40, 34, 600), weight: 600, color: "#111" });
    ctx.restore();
  }
}

// ── Общие куски интерьера ────────────────────────────────────────────────
function room(ctx, wall = "#0c0d11", floorC = "#08090c") {
  ctx.fillStyle = wall; ctx.fillRect(-300, 0, 1800, G);
  ctx.fillStyle = floorC; ctx.fillRect(-300, G, 1800, 200);
  ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.fillRect(-300, G, 1800, 3);
}
function windowCity(ctx, x, y, w, h, t, { dawn = false, seed = 21 } = {}) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (dawn) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#1a2240"); g.addColorStop(0.7, "#6b4a3a"); g.addColorStop(1, "#c98a4e");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  } else { nightSky(ctx, x, x + w, y, y + h); }
  skyline(ctx, x - 30, x + w + 30, y + h, { seed, minH: h * 0.25, maxH: h * 0.75, color: dawn ? "#141420" : "#0d1019", lit: dawn ? 0.12 : 0.35, t, scale: 0.6 });
  ctx.restore();
  ctx.strokeStyle = "#2a2d35"; ctx.lineWidth = 12; ctx.strokeRect(x, y, w, h);
}
function warmLight(ctx, x, y, r, a = 0.3, color = "255,190,110") {
  const g = ctx.createRadialGradient(x, y, 10, x, y, r);
  g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function pendant(ctx, x, y) {
  ctx.fillStyle = "#1a1c22"; ctx.fillRect(x - 2, 0, 4, y);
  ctx.fillStyle = "#2e3038"; ctx.beginPath(); ctx.moveTo(x - 40, y + 34); ctx.lineTo(x + 40, y + 34); ctx.lineTo(x + 16, y); ctx.lineTo(x - 16, y); ctx.closePath(); ctx.fill();
  glow(ctx, x, y + 40, 90, 0.5);
  const g = ctx.createLinearGradient(0, y + 34, 0, G);
  g.addColorStop(0, "rgba(255,200,130,0.22)"); g.addColorStop(1, "rgba(255,200,130,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 36, y + 34); ctx.lineTo(x + 36, y + 34); ctx.lineTo(x + 200, G); ctx.lineTo(x - 200, G); ctx.closePath(); ctx.fill();
  dust(ctx, x, y + 60, 300, G - y - 80, _t);
}
const STAND = (o) => ({ ...POSES.stand, ...o });
const SIT = (o) => ({ torso: 4, head: 6, la1: 40, la2: 80, ra1: 45, ra2: 85, ll1: 90, ll2: 0, rl1: 92, rl2: -2, ...o });

// ── Кофейня утром ─────────────────────────────────────────────────────────
function coffeeShop(ctx, t, T, p) {
  _t = t;
  room(ctx, "#100e0d");
  windowCity(ctx, 60, 300, 420, 420, t, { dawn: true });
  // доска меню
  ctx.fillStyle = "#161616"; ctx.fillRect(640, 300, 520, 190); ctx.strokeStyle = "#3a332a"; ctx.lineWidth = 8; ctx.strokeRect(640, 300, 520, 190);
  label(ctx, "MENU", 900, 334, { size: 30, weight: 800, color: "#e8dcc4" });
  const items = p.items || [["Coffee", "$5"], ["Sandwich", "$5"], ["Croissant", "$4"]];
  items.slice(0, 3).forEach(([n, pr], i) => {
    label(ctx, n, 700, 382 + i * 38, { size: 26, align: "left", color: "#cfc6b4" });
    label(ctx, pr, 1110, 382 + i * 38, { size: 26, weight: 700, align: "right", color: "gold" });
  });
  pendant(ctx, 760, 560); pendant(ctx, 1060, 560);
  // стойка и кофемашина
  const ct = G - 180;
  ctx.fillStyle = "#1b1612"; ctx.fillRect(560, ct, 700, 180); ctx.fillStyle = "#2a221b"; ctx.fillRect(540, ct - 14, 740, 16);
  ctx.fillStyle = "#2f3138"; ctx.fillRect(1060, ct - 150, 150, 136); ctx.fillStyle = "#555"; ctx.fillRect(1085, ct - 60, 20, 30);
  for (let i = 0; i < 4; i++) { const ph = (t * 0.6 + i * 0.25) % 1; ctx.fillStyle = `rgba(255,255,255,${0.25 * (1 - ph)})`; ctx.beginPath(); ctx.arc(1095 + Math.sin(ph * 6 + i) * 8, ct - 160 - ph * 90, 10 + ph * 14, 0, Math.PI * 2); ctx.fill(); }
  // бариста (серый) за стойкой
  const give = ease(seg(t, T * 0.35, T * 0.6));
  let barista = ground(STAND({ x: 900, U: 50, dir: -1, palette: "grey", face: "smile", blink: blinkAt(t, 1), talk: talkAmt(t, 0.3, p.text) }), G);
  barista = reach(barista, "r", [lerp(860, 760, give), ct - 30]);
  drawFigure(ctx, barista, (c, j) => cup(c, j.rHand[0] - 10, j.rHand[1] - 6, give < 0.98 ? 1 : 0));
  ctx.fillStyle = "#1b1612"; ctx.fillRect(560, ct + 2, 700, 178); // стойка перекрывает ноги баристы
  // герой у стойки
  let hero = ground(STAND({ x: 520, U: 52, dir: 1, face: p.face || (t > T * 0.6 ? "smile" : "neutral"), blink: blinkAt(t, 0.4), talk: talkAmt(t, 0.2, p.heroText) }), G);
  hero = reach(hero, "r", [lerp(600, 740, give), lerp(ct - 120, ct - 30, give)]);
  drawFigure(ctx, hero, (c, j) => { if (give >= 0.98) cup(c, j.rHand[0] + 4, j.rHand[1] - 8, 1); else phoneIn(c, j.rHand); });
  speech(ctx, 920, 640, p.text, ease(seg(t, 0.3, 1)), "right");
  if (p.price) { const a = ease(seg(t, T * 0.55, T * 0.75)); label(ctx, p.price, 400, ct - 330, { size: 64, weight: 900, color: "red", alpha: a * (1 - seg(t, T * 0.9, T)), glow: true }); }
}
function cup(ctx, x, y, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = "#e8e2d6"; ctx.beginPath(); ctx.moveTo(x - 16, y - 40); ctx.lineTo(x + 16, y - 40); ctx.lineTo(x + 12, y); ctx.lineTo(x - 12, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6b4a2b"; ctx.fillRect(x - 15, y - 28, 30, 12);
  ctx.fillStyle = "#cfc6b4"; ctx.fillRect(x - 18, y - 46, 36, 7);
  ctx.restore();
}
function phoneIn(ctx, h) {
  ctx.fillStyle = "#111"; ctx.strokeStyle = "#bdbdbd"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(h[0] - 10, h[1] - 30, 20, 36, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(110,160,255,0.85)"; ctx.fillRect(h[0] - 7, h[1] - 26, 14, 27);
}

// ── Спальня ночью ─────────────────────────────────────────────────────────
function bedroomNight(ctx, t, T, p) {
  _t = t;
  room(ctx, "#0a0b10");
  windowCity(ctx, 820, 260, 380, 380, t);
  ctx.fillStyle = "rgba(160,190,255,0.06)"; ctx.beginPath(); ctx.moveTo(820, 640); ctx.lineTo(1200, 640); ctx.lineTo(1100, G); ctx.lineTo(560, G); ctx.closePath(); ctx.fill();
  // часы
  ctx.fillStyle = "#121318"; ctx.fillRect(140, 640, 150, 70);
  label(ctx, p.time || "2:47", 215, 676, { size: 40, weight: 700, color: "red", glow: true });
  // кровать
  ctx.fillStyle = "#16181e"; ctx.fillRect(300, 760, 560, 130); ctx.fillRect(280, 640, 30, 250);
  ctx.fillStyle = "#23262e"; ctx.beginPath(); ctx.roundRect(320, 720, 140, 50, 18); ctx.fill();
  // герой лежит на спине (голова на подушке слева) и держит телефон над лицом
  const hero = { ...POSES.stand, ra1: 95, ra2: 120, la1: 2, la2: 2, ll1: 0, ll2: 0, rl1: 3, rl2: 3,
    x: 640, y: 742, U: 44, dir: 1, rot: -90, idle: false, face: p.face || "worried", blink: blinkAt(t, 0.9), look: -0.6 };
  drawFigure(ctx, hero, (c, j) => phoneIn(c, j.rHand));
  // одеяло на ногах
  ctx.fillStyle = "#2a2d36"; ctx.beginPath(); ctx.roundRect(630, 712, 240, 62, 26); ctx.fill();
  glow(ctx, 470, 640, 160, 0.25);
  if (p.text) { const a = ease(seg(t, 0.4, 1.2)); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#ececec";
    ctx.beginPath(); ctx.ellipse(470, 470, 220, 70, 0, 0, Math.PI * 2); ctx.fill();
    for (const [dx, dy, r] of [[-30, 70, 14], [-10, 100, 8]]) { ctx.beginPath(); ctx.arc(470 + dx, 470 + dy, r, 0, Math.PI * 2); ctx.fill(); }
    label(ctx, p.text, 470, 470, { size: fitSize(ctx, p.text, 380, 32, 600), weight: 600, color: "#111" }); ctx.restore(); }
}

// ── Вечеринка ─────────────────────────────────────────────────────────────
function party(ctx, t, T, p) {
  _t = t;
  room(ctx, "#07060b", "#050407");
  // лучи
  const beams = [["232,195,58", 200], ["150,90,255", 560], ["60,200,255", 900], ["255,70,120", 1200]];
  beams.forEach(([c, x], i) => {
    const ang = Math.sin(t * 1.2 + i * 1.7) * 0.5;
    ctx.save(); ctx.translate(x, 120); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, `rgba(${c},0.35)`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(140, 900); ctx.lineTo(-140, 900); ctx.closePath(); ctx.fill(); ctx.restore();
  });
  // диджейский пульт
  ctx.fillStyle = "#15131c"; ctx.fillRect(470, 620, 300, 110); glow(ctx, 620, 640, 180, 0.15);
  drawFigure(ctx, ground(STAND({ x: 620, U: 36, dir: 1, palette: "grey", ra1: 120 + Math.sin(t * 8) * 20, ra2: 160, face: "happy" }), 650));
  ctx.fillStyle = "#15131c"; ctx.fillRect(470, 650, 300, 90);
  if (p.label) label(ctx, p.label, 620, 560, { size: 70, weight: 900, color: "gold", glow: true });
  // танцующие (серые)
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 135 + (i % 2) * 30, bob = Math.abs(Math.sin(t * 6 + i)) * 18;
    const f = ground(STAND({ x, U: 44 + (i % 3) * 3, dir: i % 2 ? -1 : 1, palette: "grey", face: i % 3 ? "happy" : "smile",
      ra1: 150 + Math.sin(t * 6 + i) * 25, ra2: 175, la1: 140 + Math.cos(t * 6 + i) * 25, la2: 170, rl1: 6, ll1: -6 }), G + 20 + (i % 2) * 20);
    drawFigure(ctx, { ...f, y: f.y - bob });
  }
}

// ── Офис ──────────────────────────────────────────────────────────────────
function office(ctx, t, T, p) {
  _t = t;
  room(ctx, "#0b0d12");
  windowCity(ctx, 40, 380, 1240, 330, t, { seed: 33, dawn: p.day === true });
  // часы
  ctx.strokeStyle = "#cfcfcf"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(1180, 330, 40, 0, Math.PI * 2); ctx.stroke();
  const sp = p.fast === false ? 0.2 : 2.2;
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(1180, 330); ctx.lineTo(1180 + Math.sin(t * sp * 0.5) * 20, 330 - Math.cos(t * sp * 0.5) * 20); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(1180, 330); ctx.lineTo(1180 + Math.sin(t * sp * 6) * 32, 330 - Math.cos(t * sp * 6) * 32); ctx.stroke();
  // ряды столов с мониторами и коллегами
  const desks = [[180, "grey"], [520, "hero"], [860, "grey"], [1180, "grey"]];
  desks.forEach(([x, pal], i) => {
    const top = G - 170;
    ctx.fillStyle = "#1a1c23"; ctx.fillRect(x - 130, top, 260, 12); ctx.fillRect(x - 120, top + 12, 10, 158); ctx.fillRect(x + 110, top + 12, 10, 158);
    ctx.fillStyle = "#24262e"; ctx.fillRect(x + 10, top - 120, 120, 80); ctx.fillRect(x + 64, top - 40, 10, 40);
    ctx.fillStyle = pal === "hero" ? "rgba(61,220,111,0.25)" : "rgba(110,150,255,0.25)"; ctx.fillRect(x + 16, top - 114, 108, 68);
    glow(ctx, x + 70, top - 80, 110, 0.18);
    const typing = Math.sin(t * 12 + i) * 4;
    let f = { ...SIT({}), x: x - 40, y: G - 100, U: 46, dir: 1, palette: pal === "hero" ? undefined : "grey",
      face: pal === "hero" ? (p.face || "determined") : (i % 2 ? "sad" : "neutral"), blink: blinkAt(t, i * 0.7) };
    f = reach(f, "r", [x + 40 + typing, top - 4]); f = reach(f, "l", [x + 20 - typing, top - 2]);
    ctx.fillStyle = "#202229"; ctx.fillRect(x - 110, G - 100, 120, 10); ctx.fillRect(x - 110, G - 230, 10, 140);
    drawFigure(ctx, f);
  });
  if (p.label) label(ctx, p.label, 640, 340, { size: 44, weight: 700, color: p.labelColor || "white" });
}

// ── Гостиная: по телевизору — обвал рынка ─────────────────────────────────
function newsCrash(ctx, t, T, p) {
  _t = t;
  room(ctx, "#0b0b0e");
  // красное свечение телевизора на комнату
  warmLight(ctx, 820, 490, 700, 0.18 + 0.05 * Math.sin(t * 7), "255,60,60");
  // ТВ
  const tx = 560, ty = 290, tw = 560, th = 320;
  ctx.fillStyle = "#050505"; ctx.fillRect(tx - 14, ty - 14, tw + 28, th + 28);
  ctx.fillStyle = "#140608"; ctx.fillRect(tx, ty, tw, th);
  // падающий график
  const k = ease(seg(t, 0.2, T * 0.8));
  ctx.strokeStyle = "#ff3b3b"; ctx.lineWidth = 6; ctx.lineJoin = "round"; ctx.beginPath();
  const N = 30;
  for (let i = 0; i <= N * k; i++) { const xx = tx + 30 + i * ((tw - 60) / N); const yy = ty + 60 + (i / N) * (th - 120) * (i > N * 0.3 ? 1 : 0.2) + Math.sin(i * 1.9) * 12; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
  ctx.stroke();
  // бегущая строка
  ctx.fillStyle = "#b51d24"; ctx.fillRect(tx, ty + th - 50, tw, 50);
  ctx.save(); ctx.beginPath(); ctx.rect(tx, ty + th - 50, tw, 50); ctx.clip();
  const ticker = p.ticker || "MARKET CRASH  •  S&P 500 -35%  •  PANIC SELLING  •  ";
  label(ctx, ticker + ticker, tx + tw - ((t * 160) % 1400), ty + th - 25, { size: 28, weight: 800, align: "left" });
  ctx.restore();
  label(ctx, p.headline || "BREAKING", tx + 90, ty + 30, { size: 26, weight: 900, color: "#fff" });
  // диван и герой
  ctx.fillStyle = "#1a1b21"; ctx.beginPath(); ctx.roundRect(380, G - 250, 520, 150, 26); ctx.fill();
  ctx.fillStyle = "#14151a"; ctx.beginPath(); ctx.roundRect(360, G - 120, 560, 120, 22); ctx.fill();
  const shock = seg(t, T * 0.3, T * 0.45);
  const hero = { ...SIT({ torso: -6 - shock * 8, la1: 60, la2: 120, ra1: 60 + shock * 70, ra2: 120 + shock * 50 }), x: 640, y: G - 120, U: 54, dir: 1,
    face: p.face || (shock > 0.5 ? "surprised" : "worried"), blink: blinkAt(t, 0.3), rim: "rgba(255,80,80,0.7)" };
  drawFigure(ctx, hero);
}

// ── Балкон под дождём, звонок ─────────────────────────────────────────────
function balconyRain(ctx, t, T, p) {
  _t = t;
  nightSky(ctx, -300, 1500, 0, G);
  skyline(ctx, -300, 1500, G - 120, { seed: 51, minH: 200, maxH: 600, color: "#0a0d15", lit: 0.25, t, scale: 0.9 });
  // вспышка молнии
  const flash = p.lightning !== false && (t % 4.5) < 0.12 ? 0.35 : 0;
  if (flash) { ctx.fillStyle = `rgba(200,210,255,${flash})`; ctx.fillRect(-300, 0, 1800, G); }
  // перила
  ctx.fillStyle = "#15171d"; ctx.fillRect(-300, G - 150, 1800, 14);
  for (let x = -280; x < 1500; x += 60) ctx.fillRect(x, G - 150, 8, 150);
  ctx.fillStyle = "#0b0c10"; ctx.fillRect(-300, G, 1800, 200);
  // герой с телефоном у уха
  let hero = ground(STAND({ x: 560, U: 54, dir: 1, face: p.face || "worried", blink: blinkAt(t, 0.5), rim: "rgba(120,170,255,0.6)" }), G);
  const j0 = drawFigure(ctx, { ...hero, alpha: 0 });
  hero = reach(hero, "r", [j0.head[0] + 34, j0.head[1] + 10]);
  drawFigure(ctx, hero, (c, j) => phoneIn(c, j.rHand));
  // дождь
  ctx.strokeStyle = "rgba(170,190,230,0.35)"; ctx.lineWidth = 2;
  for (let i = 0; i < 160; i++) {
    const x = (rnd(i, 61) * 1800 - 300 + t * 120) % 1800 - 300;
    const y = (rnd(i, 62) * 1200 + t * 900) % 1200 - 100;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 34); ctx.stroke();
  }
  if (p.caller) {
    ctx.fillStyle = "rgba(20,22,28,0.92)"; ctx.beginPath(); ctx.roundRect(150, 470, 300, 90, 18); ctx.fill();
    label(ctx, "Incoming call", 300, 498, { size: 22, color: "grey" });
    label(ctx, p.caller, 300, 532, { size: 34, weight: 800, color: "green" });
  }
  speech(ctx, 640, 520, p.text, ease(seg(t, 0.4, 1.2)));
}

// ── Дом у моря ────────────────────────────────────────────────────────────
function beachHouse(ctx, t, T, p) {
  _t = t;
  nightSky(ctx, -300, 1500, 0, 700);
  moon(ctx, 260, 180, 44);
  // море с лунной дорожкой
  const g = ctx.createLinearGradient(0, 700, 0, G);
  g.addColorStop(0, "#0b1426"); g.addColorStop(1, "#050812");
  ctx.fillStyle = g; ctx.fillRect(-300, 700, 1800, 300);
  for (let i = 0; i < 26; i++) {
    const y = 710 + i * 11, w = 40 + i * 6;
    ctx.fillStyle = `rgba(233,230,220,${0.35 - i * 0.012})`;
    ctx.fillRect(260 - w / 2 + Math.sin(t * 2 + i) * 10, y, w, 3);
  }
  // песок
  ctx.fillStyle = "#151310"; ctx.beginPath(); ctx.moveTo(-300, G); ctx.quadraticCurveTo(600, 930, 1500, 960); ctx.lineTo(1500, 1200); ctx.lineTo(-300, 1200); ctx.closePath(); ctx.fill();
  // дом с тёплыми окнами
  const hx = 980;
  ctx.fillStyle = "#14161c"; ctx.fillRect(hx - 230, 600, 460, 360);
  ctx.beginPath(); ctx.moveTo(hx - 270, 600); ctx.lineTo(hx, 430); ctx.lineTo(hx + 270, 600); ctx.closePath(); ctx.fill();
  for (const [wx, wy] of [[hx - 170, 660], [hx + 90, 660]]) { ctx.fillStyle = "rgba(255,196,110,0.85)"; ctx.fillRect(wx, wy, 80, 90); warmLight(ctx, wx + 40, wy + 45, 160, 0.25); }
  ctx.fillStyle = "rgba(255,196,110,0.9)"; ctx.fillRect(hx - 40, 800, 80, 160);
  // крыльцо и герой
  ctx.fillStyle = "#1c1a16"; ctx.fillRect(hx - 300, 950, 600, 20);
  const arrive = ease(seg(t, 0.3, T * 0.55));
  drawFigure(ctx, ground(STAND({ x: hx - 140, U: 50, dir: 1, face: arrive > 0.9 ? "happy" : "smile", blink: blinkAt(t, 1.1) }), 950));
  if (p.friend !== false) {
    const fx = lerp(1400, hx + 120, arrive);
    let fr = ground({ ...(arrive < 1 ? walkPose(fx / 40) : POSES.stand), x: fx, U: 48, dir: -1, palette: "grey", face: "smile", blink: blinkAt(t, 2), talk: talkAmt(t, T * 0.55, p.text) }, 950);
    fr = reach(fr, "r", [fx - 60, 950 - 210]);
    drawFigure(ctx, fr, (c, j) => cup(c, j.rHand[0], j.rHand[1] + 6, 1));
    speech(ctx, hx + 140, 640, p.text, ease(seg(t, T * 0.55, T * 0.65)), "right");
  }
  if (p.label) label(ctx, p.label, hx, 380, { size: 52, weight: 800, color: "gold", glow: true, alpha: ease(seg(t, 0.5, 1.5)) });
}

export const WORLD_ACTIONS = {
  coffee_shop: { render: coffeeShop, duration: 6, fill: true, view: [-20, 280, 1300, 731], params: "text?, heroText?, price?, items?, face?",
    about: "Morning coffee shop: dawn window, menu board with prices, steaming espresso machine; a grey barista hands the white hero a coffee; optional barista line `text` and a big red `price` popping (e.g. -$5)." },
  bedroom_night: { render: bedroomNight, duration: 6, fill: true, view: [60, 330, 1260, 709], params: "text?, time?, face?",
    about: "Bedroom at night: the hero lies in bed lit by his phone, red alarm clock (time), moonlit window; optional thought cloud `text` (what he is thinking)." },
  party: { render: party, duration: 6, fill: true, view: [-40, 240, 1360, 765], params: "label?",
    about: "Nightclub/party: moving colored light beams, a DJ, grey friends dancing and having fun; optional big gold `label` (e.g. IBIZA). Use for friends spending money." },
  office: { render: office, duration: 6, fill: true, view: [-40, 290, 1360, 765], params: "label?, fast?, face?, day?",
    about: "Open-space office: rows of desks with glowing monitors, grey coworkers typing, the white hero working with a green chart on screen, wall clock spinning (time passes). Optional label." },
  news_crash: { render: newsCrash, duration: 6, fill: true, view: [-60, 200, 1422, 800], params: "headline?, ticker?, face?",
    about: "Living room lit red by a TV: a falling red market chart, 'BREAKING' headline and scrolling ticker (e.g. MARKET CRASH • S&P 500 -35%); the hero on the sofa becomes shocked." },
  balcony_rain: { render: balconyRain, duration: 6, fill: true, view: [60, 380, 1150, 647], params: "caller?, text?, face?, lightning?",
    about: "Rainy night balcony with lightning over the city; the hero holds his phone to his ear; optional incoming-call card `caller` (name) and the hero's speech `text`." },
  beach_house: { render: beachHouse, duration: 7, fill: true, view: [0, 300, 1340, 754], params: "text?, label?, friend?",
    about: "Night beach house by the sea with moonlight on the waves and warm windows; the hero on the porch; a grey friend walks up with coffee and says `text`; optional gold `label` (e.g. PAID IN FULL)." },
  street_night: { render: streetNight, duration: 6, fill: true, view: [-90, 380, 1260, 709], params: "sign?, from?, to?",
    about: "Night city street: buildings with lit windows, a shop with a red neon sign (sign: e.g. SALE -50%), a street lamp; grey people walk past with shopping bags; the white hero stands under the lamp looking at his phone while his balance drops from `from` to `to`." },
  apartment_night: { render: apartmentNight, duration: 6, fill: true, view: [-80, 330, 1420, 799], params: "text?",
    about: "Night apartment: window with the city skyline and moon, warm desk lamp; the white hero types at a laptop with a rising green chart and a coin jar; a grey friend on the couch says `text` in a speech bubble." },
};
