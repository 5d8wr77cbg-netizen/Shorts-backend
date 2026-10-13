// ============================================================================
//  Обложка длинного ролика в стиле Ifverse Tales: герой крупным планом
//  справа (голова ~40% высоты кадра) с эмоцией и контурным светом, ночной
//  город с боке, один ключевой предмет и 2 слова слева сверху (белое +
//  жёлтое, жирные, с обводкой и тенью). Несколько вариантов — для A/B-теста
//  обложек в YouTube Studio.
// ============================================================================

import fs from "fs";
import { createCanvas } from "@napi-rs/canvas";
import { drawFigure, reach, POSES, setAnimTime } from "../anim/figure.js";
import { skyline } from "../anim/world.js";
import { coin } from "../anim/props.js";

const W = 1280, H = 720;
const YELLOW = "#FFD234";

function rnd(i, s = 1) { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); }

function backdrop(ctx, tint = "#0b1026") {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#03040a"); g.addColorStop(1, tint);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // звёзды
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.15 + rnd(i, 4) * 0.4})`; ctx.fillRect(rnd(i, 2) * W, rnd(i, 3) * H * 0.5, 2, 2); }
  // город в два плана (дальний темнее)
  ctx.save(); ctx.globalAlpha = 0.55; skyline(ctx, -40, W + 40, H * 0.86, { seed: 7, minH: 140, maxH: 360, color: "#0c1020", lit: 0.25, scale: 0.8 }); ctx.restore();
  skyline(ctx, -40, W + 40, H + 10, { seed: 3, minH: 120, maxH: 300, color: "#080a12", lit: 0.3, scale: 1.1 });
  // боке — размытые огни, как у Ifverse
  for (let i = 0; i < 18; i++) {
    const x = rnd(i, 9) * W, y = H * (0.35 + rnd(i, 8) * 0.5), r = 14 + rnd(i, 7) * 34;
    const c = rnd(i, 6) > 0.5 ? "255,196,110" : "140,170,255";
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, `rgba(${c},0.35)`); b.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = b; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // виньетка
  const v = ctx.createRadialGradient(W * 0.6, H * 0.5, H * 0.3, W * 0.6, H * 0.5, W * 0.8);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

function words(ctx, a, b) {
  const draw = (text, y, fill, maxW) => {
    let size = 168;
    ctx.font = `900 ${size}px Inter`;
    while (size > 70 && ctx.measureText(text).width > maxW) { size -= 6; ctx.font = `900 ${size}px Inter`; }
    ctx.textBaseline = "alphabetic"; ctx.lineJoin = "round";
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
    ctx.lineWidth = size * 0.16; ctx.strokeStyle = "#000"; ctx.strokeText(text, 46, y);
    ctx.restore();
    ctx.fillStyle = fill; ctx.fillText(text, 46, y);
  };
  draw(String(a).toUpperCase(), 190, "#ffffff", W * 0.56);
  draw(String(b).toUpperCase(), 360, YELLOW, W * 0.6);
}

// Герой крупным планом: таз за нижним краем кадра
function hero(ctx, { x = 980, face = "determined", look = 0, rim = "rgba(140,180,255,0.6)", hand, hold, dir = -1, bend = 1 } = {}) {
  setAnimTime(0.3);
  const U = 168;
  let f = { ...POSES.stand, x, y: 300 + (0.08 + 0.9) * U + 1.85 * U, U, dir, face, look, rim, idle: false, torso: 4 };
  if (hand) f = reach(f, "r", hand, bend);
  drawFigure(ctx, f, hold);
}

function cupBig(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.12);
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(-58, -150); ctx.lineTo(58, -150); ctx.lineTo(44, 6); ctx.lineTo(-44, 6); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(-52, 0, 52, 0); g.addColorStop(0, "#d9d2c3"); g.addColorStop(0.4, "#fbf6ec"); g.addColorStop(1, "#bfb6a4");
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-52, -144); ctx.lineTo(52, -144); ctx.lineTo(40, 0); ctx.lineTo(-40, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6b4a2b"; ctx.fillRect(-49, -100, 98, 40);
  ctx.fillStyle = "#cfc6b4"; ctx.beginPath(); ctx.roundRect(-64, -170, 128, 28, 8); ctx.fill();
  ctx.font = "900 34px Inter"; ctx.textAlign = "center"; ctx.fillStyle = "#f3ead6"; ctx.fillText("$5", 0, -68);
  ctx.restore();
}

function phoneBig(ctx, x, y, text) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.08);
  const glowG = ctx.createRadialGradient(0, -120, 10, 0, -120, 330);
  glowG.addColorStop(0, "rgba(90,230,140,0.45)"); glowG.addColorStop(1, "rgba(90,230,140,0)");
  ctx.fillStyle = glowG; ctx.beginPath(); ctx.arc(0, -120, 330, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#050505"; ctx.strokeStyle = "#cfcfcf"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(-95, -290, 190, 330, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#0d1a12"; ctx.beginPath(); ctx.roundRect(-80, -272, 160, 292, 16); ctx.fill();
  ctx.textAlign = "center"; ctx.fillStyle = "#9aa"; ctx.font = "600 22px Inter"; ctx.fillText("Balance", 0, -200);
  ctx.fillStyle = "#3BE07A"; ctx.font = "900 34px Inter"; ctx.fillText(text, 0, -150);
  for (let i = 0; i < 6; i++) { const h = 20 + i * 18; ctx.fillRect(-62 + i * 22, -20 - h, 14, h); }
  ctx.restore();
}

const VARIANTS = {
  // A: решимость и монеты
  coins: (ctx, lines) => {
    backdrop(ctx, "#1a1305");
    for (let i = 0; i < 14; i++) coin(ctx, 640 + rnd(i, 11) * 640, 40 + rnd(i, 12) * 560, 26 + rnd(i, 13) * 22, rnd(i, 14) * 2 - 1);
    hero(ctx, { x: 990, face: "determined", rim: "rgba(255,200,90,0.6)", hand: [800, 600], dir: -1, bend: -1, hold: (c, j) => coin(c, j.rHand[0] - 6, j.rHand[1] - 40, 56, -0.25) });
    words(ctx, ...(lines || ["$10", "A DAY."]));
  },
  // B: шок от суммы на телефоне
  million: (ctx, lines, o = {}) => {
    backdrop(ctx, "#06180f");
    hero(ctx, { x: 1010, face: "surprised", rim: "rgba(90,230,140,0.6)", hand: [770, 560], dir: -1, hold: (c, j) => phoneBig(c, j.rHand[0] - 10, j.rHand[1] + 40, o.phone || "$1,000,000") });
    words(ctx, ...(lines || ["$1.2", "MILLION."]));
  },
  // C: «без кофе» — самодовольный герой и стакан за $5
  coffee: (ctx, lines) => {
    backdrop(ctx, "#1a0b06");
    hero(ctx, { x: 1010, face: "smug", rim: "rgba(255,160,110,0.6)", hand: [800, 600], dir: -1, hold: (c, j) => cupBig(c, j.rHand[0], j.rHand[1] + 60, 1.1) });
    words(ctx, ...(lines || ["NO", "COFFEE."]));
  },
};
export const THUMB_VARIANTS = Object.keys(VARIANTS);

export function renderThumbVariant(variant, outPath, lines, opts = {}) {
  const c = createCanvas(W, H), ctx = c.getContext("2d");
  (VARIANTS[variant] || VARIANTS.coins)(ctx, lines, opts);
  fs.writeFileSync(outPath, c.toBuffer("image/jpeg", 92));
  return outPath;
}
