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

export const WORLD_ACTIONS = {
  street_night: { render: streetNight, duration: 6, fill: true, view: [-90, 380, 1260, 709], params: "sign?, from?, to?",
    about: "Night city street: buildings with lit windows, a shop with a red neon sign (sign: e.g. SALE -50%), a street lamp; grey people walk past with shopping bags; the white hero stands under the lamp looking at his phone while his balance drops from `from` to `to`." },
  apartment_night: { render: apartmentNight, duration: 6, fill: true, view: [-80, 330, 1420, 799], params: "text?",
    about: "Night apartment: window with the city skyline and moon, warm desk lamp; the white hero types at a laptop with a rising green chart and a coin jar; a grey friend on the couch says `text` in a speech bubble." },
};
