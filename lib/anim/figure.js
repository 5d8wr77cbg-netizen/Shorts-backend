// ============================================================================
//  Персонаж: белый глянцевый 3D-человечек (как у Simply Animated).
//  Скелет 2D: таз → торс → голова, плечо → локоть → кисть, таз → колено → стопа.
//  Углы в градусах, абсолютные: 0 — конечность смотрит вниз,
//  плюс — вперёд по направлению взгляда (dir = 1 вправо, -1 влево).
// ============================================================================

const RAD = Math.PI / 180;

// Пропорции в единицах U (U ≈ 1/7 роста)
export const BODY = {
  head: 0.9, neck: 0.36, torso: 1.85, shoulder: 0.9,
  upperArm: 1.25, foreArm: 1.2, thigh: 1.55, shin: 1.6,
  wTorso: 1.3, wArm: 0.46, wLeg: 0.54,
};

export const PALETTE = {
  hero: { base: "#cfcfcf", light: "#ffffff", far: "#8a8a8a", farLight: "#b4b4b4", head: ["#ffffff", "#c4c4c4"] },
  // массовка — бело-серая: светлая, но заметно тусклее белого героя
  grey: { base: "#a3a6ac", light: "#c4c6cb", far: "#7c7f85", farLight: "#919499", head: ["#d0d2d6", "#8c8f95"] },
  // второстепенные персонажи — приглушённые цвета, чтобы белый герой выделялся
  blue: { base: "#3d5fae", light: "#5b7fd0", far: "#2a447f", farLight: "#3a5796", head: ["#6d8fe0", "#2f4c8f"] },
  purple: { base: "#6a4bb0", light: "#8a6bd0", far: "#4a3380", farLight: "#5d4296", head: ["#9a7be0", "#523a8f"] },
  teal: { base: "#2b8a82", light: "#45aaa1", far: "#1d625c", farLight: "#287870", head: ["#5cc4ba", "#226e67"] },
  coral: { base: "#b5544a", light: "#d4766b", far: "#843a33", farLight: "#9c4840", head: ["#e08a7f", "#90433b"] },
  amber: { base: "#b5862e", light: "#d6a64a", far: "#83601f", farLight: "#9a7228", head: ["#e8bb5c", "#8f6a22"] },
};
const EDGE = "#060606";

export const POSES = {
  stand:  { torso: 2, head: 0, la1: -10, la2: -6, ra1: 10, ra2: 14, ll1: -4, ll2: -4, rl1: 4, rl2: 3 },
  kneel:  { torso: 28, head: 10, la1: 20, la2: 40, ra1: 30, ra2: 50, ll1: 15, ll2: -75, rl1: 85, rl2: 5 },
  sad:    { torso: 32, head: 30, la1: 18, la2: 12, ra1: 24, ra2: 18, ll1: -2, ll2: -2, rl1: 6, rl2: 4 },
  cheer:  { torso: -2, head: -10, la1: 160, la2: 172, ra1: 150, ra2: 165, ll1: -8, ll2: -6, rl1: 8, rl2: 6 },
  strain: { torso: 38, head: 5, la1: -35, la2: -20, ra1: -25, ra2: -10, ll1: -25, ll2: -30, rl1: 30, rl2: 10 },
};

export const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
export const easeOutBack = (k) => { k = clamp(k, 0, 1); const c = 1.7; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };

export function lerpPose(a, b, k) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = typeof a[key] === "number" && typeof b[key] === "number" ? lerp(a[key], b[key], k) : a[key];
  return out;
}

// Цикл ходьбы/бега: phase в радианах
export function walkPose(phase, amp = 1, run = false) {
  const A = (run ? 42 : 26) * amp;
  const s = Math.sin(phase);
  const leg = (sgn) => {
    const th = A * s * sgn;
    const swing = Math.max(0, Math.cos(phase) * sgn);
    const bend = (run ? 25 : 8) * amp + (run ? 70 : 38) * amp * swing;
    return [th, th - bend];
  };
  const [rl1, rl2] = leg(1);
  const [ll1, ll2] = leg(-1);
  const arm = (sgn) => {
    const a = -(run ? 45 : 22) * amp * s * sgn;
    return [a, a + (run ? 75 : 22) * amp];
  };
  const [ra1, ra2] = arm(1);
  const [la1, la2] = arm(-1);
  return { torso: (run ? 14 : 4) * amp, head: run ? -8 : 0, ra1, ra2, la1, la2, rl1, rl2, ll1, ll2 };
}

function dirVec(angleDeg, dir) {
  return [Math.sin(angleDeg * RAD) * dir, Math.cos(angleDeg * RAD)];
}

// Положение суставов. f: { x, y (таз), U, dir, ...углы }
export function joints(f) {
  const { x, y, U } = f;
  const dir = f.dir ?? 1;
  const up = [Math.sin((f.torso || 0) * RAD) * dir, -Math.cos((f.torso || 0) * RAD)];
  const hip = [x, y];
  const neck = [x + up[0] * BODY.torso * U, y + up[1] * BODY.torso * U];
  const sh = [x + up[0] * BODY.torso * BODY.shoulder * U, y + up[1] * BODY.torso * BODY.shoulder * U];
  const ha = (f.torso || 0) + (f.head || 0);
  const hv = [Math.sin(ha * RAD) * dir, -Math.cos(ha * RAD)];
  const head = [neck[0] + hv[0] * (BODY.neck + BODY.head) * U, neck[1] + hv[1] * (BODY.neck + BODY.head) * U];
  const limb = (from, a1, a2, l1, l2) => {
    const v1 = dirVec(a1, dir);
    const mid = [from[0] + v1[0] * l1 * U, from[1] + v1[1] * l1 * U];
    const v2 = dirVec(a2, dir);
    return [mid, [mid[0] + v2[0] * l2 * U, mid[1] + v2[1] * l2 * U]];
  };
  const [lElbow, lHand] = limb(sh, f.la1, f.la2, BODY.upperArm, BODY.foreArm);
  const [rElbow, rHand] = limb(sh, f.ra1, f.ra2, BODY.upperArm, BODY.foreArm);
  const [lKnee, lFoot] = limb(hip, f.ll1, f.ll2, BODY.thigh, BODY.shin);
  const [rKnee, rFoot] = limb(hip, f.rl1, f.rl2, BODY.thigh, BODY.shin);
  return { hip, neck, sh, head, lElbow, lHand, rElbow, rHand, lKnee, lFoot, rKnee, rFoot };
}

// Ставит фигуру на землю: самая низкая точка ноги касается groundY
export function ground(f, groundY) {
  const j = joints({ ...f, y: 0 });
  const low = Math.max(j.lFoot[1], j.rFoot[1], j.lKnee[1], j.rKnee[1]);
  return { ...f, y: groundY - low - (BODY.wLeg * f.U) / 2 };
}

// Двухзвенная IK: углы плеча/бедра и предплечья/голени, чтобы конец попал в target.
// bend = 1 — локоть/колено уходит вперёд, -1 — назад.
export function ik(from, target, l1, l2, dir, bend = 1) {
  const dx = (target[0] - from[0]) * dir;
  const dy = target[1] - from[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const theta = Math.atan2(dx, dy);
  const alpha = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const a1 = theta + bend * alpha;
  const ex = Math.sin(a1) * l1, ey = Math.cos(a1) * l1;
  const a2 = Math.atan2(dx - ex, dy - ey);
  return [a1 / RAD, a2 / RAD];
}

// Рука тянется к точке
export function reach(f, side, target, bend = -1) {
  const j = joints(f);
  const [a1, a2] = ik(j.sh, target, BODY.upperArm * f.U, BODY.foreArm * f.U, f.dir ?? 1, bend);
  return side === "r" ? { ...f, ra1: a1, ra2: a2 } : { ...f, la1: a1, la2: a2 };
}

// Нога ставится в точку
export function step(f, side, target, bend = 1) {
  const j = joints(f);
  const [a1, a2] = ik(j.hip, target, BODY.thigh * f.U, BODY.shin * f.U, f.dir ?? 1, bend);
  return side === "r" ? { ...f, rl1: a1, rl2: a2 } : { ...f, ll1: a1, ll2: a2 };
}

// Конечность одной линией через суставы: без швов на локтях и коленях
function chain(ctx, pts, w, base, light, rim) {
  const path = (ox = 0, oy = 0) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
  };
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  path();
  if (rim) { ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = w * 0.9; ctx.strokeStyle = rim; ctx.lineWidth = w * 1.2; ctx.stroke(); ctx.restore(); }
  ctx.strokeStyle = EDGE; ctx.lineWidth = w * 1.14; ctx.stroke();
  ctx.strokeStyle = base; ctx.lineWidth = w; ctx.stroke();
  path(-w * 0.1, -w * 0.12); ctx.strokeStyle = light; ctx.lineWidth = w * 0.62; ctx.stroke();
}

function head(ctx, c, r, [hi, lo]) {
  ctx.beginPath(); ctx.arc(c[0], c[1], r * 1.07, 0, Math.PI * 2); ctx.fillStyle = EDGE; ctx.fill();
  const g = ctx.createRadialGradient(c[0] - r * 0.35, c[1] - r * 0.4, r * 0.1, c[0], c[1], r);
  g.addColorStop(0, hi); g.addColorStop(1, lo);
  ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

// ── Анимационное время: ставится рендером на каждом кадре ─────────────────
// Нужно для «живости»: дыхание в покое, развевающийся шарф героя.
let ANIM_T = 0;
export function setAnimTime(t) { ANIM_T = t; }

// Лицо в стиле Ifverse Tales: глаза-кольца с точкой-зрачком, косые брови,
// рот-линия или рот-кольцо. На белой голове черты тёмные, на тёмной — светлые.
// expr: neutral | smile | happy | surprised | worried | sad | determined | angry | smug
// blink 0..1, talk 0..1, look: смещение зрачков (-1..1)
export function face(ctx, c, r, dir = 1, expr = "neutral", blink = 0, talk = 0, ink = "#141414", look = 0) {
  const d = Math.max(-1, Math.min(1, dir)) || 1;
  const ex = [c[0] - d * r * 0.02, c[0] + d * r * 0.5];
  const ey = c[1] - r * 0.1;
  const big = expr === "surprised";
  const R = r * (big ? 0.27 : 0.22);      // радиус кольца
  const lw = r * 0.085;                    // толщина линий
  const open = 1 - Math.min(1, blink);
  ctx.save();
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = "round"; ctx.lineWidth = lw;
  ex.forEach((x, i) => {
    const px = x + d * R * 0.25 + look * R * 0.35;
    if (expr === "happy") { ctx.beginPath(); ctx.arc(x, ey + R * 0.3, R * 0.8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); return; }
    if (expr === "angry" || expr === "determined") {
      // злой взгляд: точка и косая бровь над ней
      ctx.beginPath(); ctx.arc(px, ey + R * 0.15, R * 0.42, 0, Math.PI * 2); ctx.fill();
      const inner = (i === 0 ? 1 : -1) * d;
      ctx.beginPath(); ctx.moveTo(x - inner * R * 1.1, ey - R * 1.15); ctx.lineTo(x + inner * R * 1.0, ey - R * (expr === "angry" ? 0.35 : 0.6)); ctx.stroke();
      return;
    }
    if (open < 0.15) { ctx.beginPath(); ctx.moveTo(x - R, ey); ctx.lineTo(x + R, ey); ctx.stroke(); return; }
    ctx.beginPath(); ctx.ellipse(x, ey, R, R * open, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, ey, R * (big ? 0.32 : 0.42) * Math.min(1, open * 1.4), 0, Math.PI * 2); ctx.fill();
    if (expr === "smug" || expr === "sad") {
      // веко: верхняя половина глаза закрыта
      ctx.beginPath(); ctx.moveTo(x - R * 1.15, ey - (expr === "sad" ? R * 0.15 : 0)); ctx.lineTo(x + R * 1.15, ey + (expr === "sad" ? R * 0.15 : 0) * (i ? -1 : 1) * d); ctx.stroke();
    }
    if (expr === "worried" || expr === "sad") {
      const inner = (i === 0 ? 1 : -1) * d;
      ctx.beginPath(); ctx.moveTo(x - inner * R * 1.1, ey - R * 1.45); ctx.lineTo(x + inner * R * 1.0, ey - R * 1.9); ctx.stroke();
    }
    if (big) { ctx.beginPath(); ctx.moveTo(x - R * 0.9, ey - R * 1.7); ctx.lineTo(x + R * 0.9, ey - R * 1.75); ctx.stroke(); }
  });
  // рот
  const mx = c[0] + d * r * 0.26, my = c[1] + r * 0.48;
  const talkOpen = talk > 0 ? 0.05 + 0.13 * talk : 0;
  if (big) { ctx.beginPath(); ctx.ellipse(mx, my + r * 0.04, r * 0.11, r * 0.15, 0, 0, Math.PI * 2); ctx.stroke(); }
  else if (talkOpen > 0) { ctx.beginPath(); ctx.ellipse(mx, my, r * 0.14, r * talkOpen, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (expr === "smile" || expr === "happy") { ctx.beginPath(); ctx.arc(mx, my - r * 0.14, r * 0.2, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke(); }
  else if (expr === "smug") { ctx.beginPath(); ctx.moveTo(mx - r * 0.14, my + r * 0.02); ctx.quadraticCurveTo(mx + r * 0.05, my + r * 0.04, mx + d * r * 0.17, my - r * 0.08); ctx.stroke(); }
  else if (expr === "sad" || expr === "worried") { ctx.beginPath(); ctx.arc(mx, my + r * 0.17, r * 0.15, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(mx - r * 0.12, my); ctx.lineTo(mx + r * 0.12, my); ctx.stroke(); }
  ctx.restore();
}

// Отличительная черта героя — тёмно-серое худи (как худи у героя Ifverse).
// Рисуется «как 3D»: объёмная светотень (свет сверху-слева), складки,
// резинка внизу и манжеты в рубчик, капюшон с тёмной изнанкой, шнурки с
// металлическими наконечниками, карман-кенгуру со строчкой.
const HOODIE = {
  shadow: "#24282e", base: "#3b4048", mid: "#4a5059", light: "#5f666f", spec: "#7d848e",
  far: { shadow: "#1b1e23", base: "#2c3036", mid: "#363a41", light: "#454a52", spec: "#575c64" },
  inside: "#0e0f11", string: "#d8d4cb", tip: "#a7aab0",
};

const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

// Капюшон за головой: собран складками на плечах и спине (рисуется до головы)
function hood(ctx, j, U, dir) {
  const d = Math.sign(dir || 1) || 1;
  const r = BODY.head * U;
  const c = [lerp(j.neck[0], j.head[0], 0.32) - d * r * 0.55, lerp(j.neck[1], j.head[1], 0.32)];
  const ang = Math.atan2(j.head[0] - j.neck[0], -(j.head[1] - j.neck[1]));
  ctx.save();
  ctx.translate(c[0], c[1]); ctx.rotate(ang);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.86, r * 0.98, 0, 0, Math.PI * 2);
  ctx.fillStyle = EDGE; ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.45, r * 0.1, 0, 0, r * 0.95);
  g.addColorStop(0, HOODIE.light); g.addColorStop(0.45, HOODIE.base); g.addColorStop(1, HOODIE.shadow);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.78, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  // шов по центру капюшона и мягкие складки
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.arc(d * r * 0.25, r * 0.1, r * 0.75, Math.PI * (d > 0 ? 1.05 : 1.45), Math.PI * (d > 0 ? 1.55 : 1.95)); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, r * 0.45, r * 0.5, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.arc(-d * r * 0.1, -r * 0.05, r * 0.6, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  ctx.restore();
}

// Туловище худи оверсайз: спущенные плечи, длина ниже бёдер, ткань
// напускается на резинку. Рисуется в системе координат торса (шея → таз).
function hoodieTorso(ctx, j, U, dir, rim) {
  const d = Math.sign(dir || 1) || 1;
  const L = Math.hypot(j.hip[0] - j.neck[0], j.hip[1] - j.neck[1]);
  const th = Math.atan2(j.hip[0] - j.neck[0], j.hip[1] - j.neck[1]);
  const hw = U * 0.74, hb = U * 0.66;          // полуширина в плечах и у резинки
  const band = L + U * 0.3, hem = L + U * 0.6;  // верх резинки и низ худи
  ctx.save();
  ctx.translate(j.neck[0], j.neck[1]); ctx.rotate(-th);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-U * 0.3, -U * 0.12);
    ctx.quadraticCurveTo(-hw * 0.98, -U * 0.08, -hw, U * 0.48);
    ctx.quadraticCurveTo(-hw * 1.08, L * 0.6, -hw * 1.03, band - U * 0.06);
    ctx.quadraticCurveTo(-hw * 1.0, band + U * 0.02, -hb, band + U * 0.04);
    ctx.lineTo(-hb * 0.98, hem);
    ctx.quadraticCurveTo(0, hem + U * 0.06, hb * 0.98, hem);
    ctx.lineTo(hb, band + U * 0.04);
    ctx.quadraticCurveTo(hw * 1.0, band + U * 0.02, hw * 1.03, band - U * 0.06);
    ctx.quadraticCurveTo(hw * 1.08, L * 0.6, hw, U * 0.48);
    ctx.quadraticCurveTo(hw * 0.98, -U * 0.08, U * 0.3, -U * 0.12);
    ctx.closePath();
  };
  // контур (+ контурный свет)
  shape();
  ctx.lineJoin = "round";
  if (rim) { ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = U * 0.9; ctx.strokeStyle = rim; ctx.lineWidth = U * 0.2; ctx.stroke(); ctx.restore(); }
  ctx.strokeStyle = EDGE; ctx.lineWidth = U * 0.14; ctx.stroke();
  // объём: цилиндрическая светотень поперёк торса (свет слева-сверху)
  const gx = ctx.createLinearGradient(-hw * 1.05, 0, hw * 1.05, 0);
  gx.addColorStop(0, HOODIE.shadow); gx.addColorStop(0.15, HOODIE.mid); gx.addColorStop(0.33, HOODIE.light);
  gx.addColorStop(0.55, HOODIE.base); gx.addColorStop(0.85, HOODIE.shadow); gx.addColorStop(1, "#181b1f");
  ctx.fillStyle = gx; ctx.fill();
  ctx.save(); ctx.clip();
  const all = () => ctx.fillRect(-hw * 1.3, -U, hw * 2.6, hem + U * 2);
  // затенение под воротом и над резинкой (напуск ткани)
  const gy = ctx.createLinearGradient(0, -U * 0.12, 0, hem);
  gy.addColorStop(0, "rgba(0,0,0,0.5)"); gy.addColorStop(0.12, "rgba(0,0,0,0)");
  gy.addColorStop(0.72, "rgba(0,0,0,0)"); gy.addColorStop(0.84, "rgba(0,0,0,0.3)"); gy.addColorStop(1, "rgba(0,0,0,0.15)");
  ctx.fillStyle = gy; all();
  // блик ткани на груди
  const sp = ctx.createRadialGradient(-hw * 0.3, U * 0.55, 0, -hw * 0.3, U * 0.55, hw * 0.95);
  sp.addColorStop(0, "rgba(255,255,255,0.12)"); sp.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sp; all();
  ctx.lineCap = "round";
  // спущенные плечевые швы
  ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = U * 0.04;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * hw * 0.78, U * 0.1); ctx.quadraticCurveTo(s * hw * 0.7, U * 0.5, s * hw * 0.8, U * 0.85); ctx.stroke(); }
  // резинка: темнее, в рубчик, со швом
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(-hw * 1.3, band, hw * 2.6, hem - band + U * 0.2);
  ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = Math.max(0.6, U * 0.03);
  for (let x = -hb; x <= hb; x += U * 0.1) { ctx.beginPath(); ctx.moveTo(x, band + U * 0.06); ctx.lineTo(x, hem - U * 0.02); ctx.stroke(); }
  ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = U * 0.05;
  ctx.beginPath(); ctx.moveTo(-hw, band); ctx.quadraticCurveTo(0, band + U * 0.05, hw, band); ctx.stroke();
  // складки: напуск над резинкой и натяжение от подмышек
  const fold = (pts, w) => {
    ctx.strokeStyle = "rgba(0,0,0,0.42)"; ctx.lineWidth = U * w;
    ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.quadraticCurveTo(...pts[1], ...pts[2]); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = U * w * 0.7;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] - U * 0.05); ctx.quadraticCurveTo(pts[1][0], pts[1][1] - U * 0.05, pts[2][0], pts[2][1] - U * 0.05); ctx.stroke();
  };
  fold([[-hw * 0.98, band - U * 0.22], [-hw * 0.6, band + U * 0.02], [-hw * 0.2, band - U * 0.06]], 0.05);
  fold([[hw * 0.98, band - U * 0.18], [hw * 0.6, band + U * 0.03], [hw * 0.18, band - U * 0.04]], 0.05);
  fold([[-hw * 0.2, band - U * 0.04], [hw * 0.05, band + U * 0.04], [hw * 0.25, band - U * 0.08]], 0.035);
  fold([[-hw * 0.88, U * 0.75], [-hw * 0.55, U * 1.0], [-hw * 0.45, U * 1.4]], 0.04);
  fold([[hw * 0.88, U * 0.8], [hw * 0.6, U * 1.05], [hw * 0.52, U * 1.35]], 0.04);
  // карман-кенгуру: чуть смещён к «лицу» фигуры
  const ox = d * hw * 0.08, pt = L * 0.62, pb = band - U * 0.02;
  ctx.beginPath();
  ctx.moveTo(ox - hw * 0.66, pb); ctx.lineTo(ox - hw * 0.44, pt + U * 0.05);
  ctx.quadraticCurveTo(ox, pt - U * 0.03, ox + hw * 0.44, pt + U * 0.05);
  ctx.lineTo(ox + hw * 0.66, pb);
  ctx.fillStyle = "rgba(255,255,255,0.035)"; ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = U * 0.045; ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.lineWidth = U * 0.07;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ox + s * hw * 0.46, pt + U * 0.1); ctx.lineTo(ox + s * hw * 0.63, pb - U * 0.08); ctx.stroke(); }
  if (U > 18) {
    ctx.setLineDash([U * 0.07, U * 0.06]);
    ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = U * 0.022;
    ctx.beginPath(); ctx.moveTo(ox - hw * 0.4, pt + U * 0.13); ctx.quadraticCurveTo(ox, pt + U * 0.05, ox + hw * 0.4, pt + U * 0.13); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore(); // clip
  // ворот: капюшон толстым валиком обнимает шею, внутри — тёмная изнанка
  const cx = d * U * 0.05, cy = -U * 0.16;
  ctx.beginPath(); ctx.ellipse(cx, cy, U * 0.4, U * 0.24, 0, 0, Math.PI * 2);
  ctx.fillStyle = HOODIE.inside; ctx.fill();
  const gc = ctx.createLinearGradient(-U * 0.6, cy - U * 0.3, U * 0.6, cy + U * 0.2);
  gc.addColorStop(0, HOODIE.spec); gc.addColorStop(0.45, HOODIE.mid); gc.addColorStop(1, HOODIE.shadow);
  ctx.beginPath(); ctx.ellipse(cx, cy, U * 0.5, U * 0.32, 0, Math.PI * 0.02, Math.PI * 0.98);
  ctx.strokeStyle = EDGE; ctx.lineWidth = U * 0.26; ctx.stroke();
  ctx.strokeStyle = gc; ctx.lineWidth = U * 0.18; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = U * 0.04;
  ctx.beginPath(); ctx.ellipse(cx, cy - U * 0.04, U * 0.5, U * 0.32, 0, Math.PI * 0.6, Math.PI * 0.95); ctx.stroke();
  ctx.restore();
  // шнурки: свисают от ворота, слегка качаются, с наконечниками
  ctx.save();
  ctx.translate(j.neck[0], j.neck[1]); ctx.rotate(-th);
  ctx.lineCap = "round";
  const sway = Math.sin(ANIM_T * 3.1) * U * 0.04;
  for (const [k, len] of [[-0.16, 0.95], [0.24, 0.82]]) {
    const x0 = cx + k * U, y0 = U * 0.12;
    const x1 = x0 + sway + d * U * 0.03, y1 = y0 + U * len;
    const tipStart = [lerp(x0, x1, 0.82), lerp(y0, y1, 0.82)];
    ctx.strokeStyle = EDGE; ctx.lineWidth = U * 0.11;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + sway * 0.4, (y0 + y1) / 2, x1, y1); ctx.stroke();
    ctx.strokeStyle = HOODIE.string; ctx.lineWidth = U * 0.065;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + sway * 0.4, (y0 + y1) / 2, tipStart[0], tipStart[1]); ctx.stroke();
    ctx.strokeStyle = HOODIE.tip; ctx.lineWidth = U * 0.08;
    ctx.beginPath(); ctx.moveTo(tipStart[0], tipStart[1]); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = U * 0.025;
    ctx.beginPath(); ctx.moveTo(tipStart[0] - U * 0.015, tipStart[1] + U * 0.02); ctx.lineTo(x1 - U * 0.015, y1 - U * 0.02); ctx.stroke();
  }
  ctx.restore();
}

// Рукав: объёмная светотень несколькими слоями, складки на сгибе локтя,
// манжета в рубчик. Кисть рисуется заранее — манжета её перекрывает.
function sleeve(ctx, sh, el, wrist, w, far, rim) {
  const C = far ? HOODIE.far : HOODIE;
  const path = (ox = 0, oy = 0, pts = [sh, el, wrist]) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
  };
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  path();
  if (rim) { ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = w * 0.9; ctx.strokeStyle = rim; ctx.lineWidth = w * 1.2; ctx.stroke(); ctx.restore(); }
  ctx.strokeStyle = EDGE; ctx.lineWidth = w * 1.16; ctx.stroke();
  ctx.strokeStyle = C.shadow; ctx.lineWidth = w; ctx.stroke();
  // матовая ткань: мягкие переходы без пластикового блика
  path(-w * 0.06, -w * 0.08); ctx.strokeStyle = C.base; ctx.lineWidth = w * 0.8; ctx.stroke();
  path(-w * 0.12, -w * 0.15); ctx.strokeStyle = C.mid; ctx.lineWidth = w * 0.52; ctx.stroke();
  ctx.save(); ctx.globalAlpha *= 0.45;
  path(-w * 0.17, -w * 0.21); ctx.strokeStyle = C.light; ctx.lineWidth = w * 0.26; ctx.stroke();
  ctx.restore();
  // складки на сгибе локтя: тем заметнее, чем сильнее согнута рука
  const v1 = norm([el[0] - sh[0], el[1] - sh[1]]), v2 = norm([wrist[0] - el[0], wrist[1] - el[1]]);
  const inn = [v2[0] - v1[0], v2[1] - v1[1]];
  const bendAmt = Math.min(1, Math.hypot(inn[0], inn[1]));
  if (bendAmt > 0.15) {
    const n = norm(inn);
    ctx.globalAlpha *= 0.4 + 0.6 * bendAmt;
    ctx.strokeStyle = "rgba(0,0,0,0.65)"; ctx.lineWidth = w * 0.09;
    const p0 = [el[0] + n[0] * w * 0.42, el[1] + n[1] * w * 0.42];
    for (const s of [-1, 1]) {
      const v = s < 0 ? v1 : v2;
      const q = [el[0] + s * v[0] * w * 0.55 + n[0] * w * 0.05, el[1] + s * v[1] * w * 0.55 + n[1] * w * 0.05];
      ctx.beginPath(); ctx.moveTo(...p0); ctx.quadraticCurveTo(el[0], el[1], q[0], q[1]); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = w * 0.06;
    ctx.beginPath(); ctx.moveTo(el[0] - n[0] * w * 0.3, el[1] - n[1] * w * 0.3); ctx.lineTo(el[0] - n[0] * w * 0.05 + v2[0] * w * 0.3, el[1] - n[1] * w * 0.05 + v2[1] * w * 0.3); ctx.stroke();
    ctx.globalAlpha /= 0.4 + 0.6 * bendAmt;
  }
  // манжета: последние ~0.3U рукава, чуть уже, в рубчик, со швом
  const cl = Math.min(w * 0.55, Math.hypot(wrist[0] - el[0], wrist[1] - el[1]) * 0.4);
  const c0 = [wrist[0] - v2[0] * cl, wrist[1] - v2[1] * cl];
  const pn = [-v2[1], v2[0]];
  ctx.strokeStyle = EDGE; ctx.lineWidth = w * 1.02; ctx.lineCap = "butt";
  ctx.beginPath(); ctx.moveTo(...c0); ctx.lineTo(...wrist); ctx.stroke();
  ctx.strokeStyle = C.shadow; ctx.lineWidth = w * 0.88; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(c0[0] - w * 0.06, c0[1] - w * 0.08); ctx.lineTo(wrist[0] - w * 0.06, wrist[1] - w * 0.08);
  ctx.strokeStyle = C.base; ctx.lineWidth = w * 0.55; ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = Math.max(0.6, w * 0.05);
  for (let k = 0.15; k < 1; k += 0.22) {
    const m = [lerp(c0[0], wrist[0], k), lerp(c0[1], wrist[1], k)];
    ctx.beginPath(); ctx.moveTo(m[0] + pn[0] * w * 0.4, m[1] + pn[1] * w * 0.4); ctx.lineTo(m[0] - pn[0] * w * 0.4, m[1] - pn[1] * w * 0.4); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = w * 0.08;
  ctx.beginPath(); ctx.moveTo(c0[0] + pn[0] * w * 0.46, c0[1] + pn[1] * w * 0.46); ctx.lineTo(c0[0] - pn[0] * w * 0.46, c0[1] - pn[1] * w * 0.46); ctx.stroke();
  ctx.restore();
}

// (старый вариант) золотой шарф: петля на шее и два хвоста по ветру
function scarf(ctx, j, U, dir) {
  const d = Math.sign(dir || 1) || 1;
  const n = j.neck, w = BODY.wTorso * U;
  const wave = (k) => Math.sin(ANIM_T * 6 + k) * U * 0.18;
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // хвосты (за спиной)
  for (const [len, ph, spread] of [[1.6, 0, 0.75], [1.25, 1.3, 0.45]]) {
    ctx.beginPath();
    ctx.moveTo(n[0] - d * w * 0.35, n[1] + U * 0.12);
    ctx.quadraticCurveTo(
      n[0] - d * U * (0.55 + spread * 0.3) + wave(ph) * 0.5, n[1] + U * len * 0.5,
      n[0] - d * U * spread + wave(ph + 1.2), n[1] + U * len,
    );
    ctx.strokeStyle = "#060606"; ctx.lineWidth = U * 0.46; ctx.stroke();
    ctx.strokeStyle = "#c99a1e"; ctx.lineWidth = U * 0.36; ctx.stroke();
  }
  // петля
  ctx.beginPath(); ctx.ellipse(n[0], n[1] - U * 0.05, w * 0.5, U * 0.27, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#060606"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(n[0], n[1] - U * 0.05, w * 0.44, U * 0.21, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(n[0] - w, 0, n[0] + w, 0);
  g.addColorStop(0, "#a87d12"); g.addColorStop(0.45, "#f2c94c"); g.addColorStop(1, "#9a720f");
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}

// Рисует фигуру. f: { x, y, U, dir, ...углы, alpha?, rot?, palette?, face?, blink?, talk? }
// hold: (ctx, joints) => void — рисует предмет в руке поверх фигуры
export function drawFigure(ctx, f0, hold) {
  // «живость»: лёгкое дыхание и покачивание головы (отключается idle: false)
  const ph = (f0.x || 0) * 0.013;
  const f = f0.idle === false ? f0 : {
    ...f0,
    torso: (f0.torso || 0) + Math.sin(ANIM_T * 2.1 + ph) * 1.3,
    head: (f0.head || 0) + Math.sin(ANIM_T * 1.6 + ph + 1) * 2.5,
  };
  const P = PALETTE[f.palette] || PALETTE.hero;
  const hero = !f.palette || f.palette === "hero";
  const U = f.U;
  ctx.save();
  ctx.globalAlpha *= f.alpha ?? 1;
  if (f.rot) {
    ctx.translate(f.x, f.y); ctx.rotate(f.rot * RAD); ctx.translate(-f.x, -f.y);
  }
  const j = joints(f);
  const wA = BODY.wArm * U, wL = BODY.wLeg * U;
  const rim = f.rim; // контурный свет, как у Ifverse (например "rgba(120,170,255,0.8)")
  const hoodie = hero && f.outfit !== "none";
  // рукав до запястья, кисть — белая (рисуется первой, манжета её перекрывает)
  const arm = (sh, el, hand, far) => {
    if (!hoodie) { chain(ctx, [sh, el, hand], wA, far ? P.far : P.base, far ? P.farLight : P.light, rim); return; }
    const wrist = [lerp(el[0], hand[0], 0.8), lerp(el[1], hand[1], 0.8)];
    chain(ctx, [[lerp(el[0], hand[0], 0.6), lerp(el[1], hand[1], 0.6)], hand], wA * 1.15, far ? P.far : P.base, far ? P.farLight : P.light, rim);
    sleeve(ctx, sh, el, wrist, U * 0.6, far, rim);
  };
  chain(ctx, [j.hip, j.lKnee, j.lFoot], wL, P.far, P.farLight, rim);
  arm(j.sh, j.lElbow, j.lHand, true);
  if (hoodie) {
    hood(ctx, j, U, f.dir ?? 1);
    // ближняя нога до худи: подол ложится поверх бедра
    chain(ctx, [j.hip, j.rKnee, j.rFoot], wL, P.base, P.light, rim);
    hoodieTorso(ctx, j, U, f.dir ?? 1, rim);
  } else {
    chain(ctx, [j.hip, j.neck], BODY.wTorso * U, P.base, P.light, rim);
    chain(ctx, [j.hip, j.rKnee, j.rFoot], wL, P.base, P.light, rim);
  }
  // шея
  const k = BODY.neck / (BODY.neck + BODY.head);
  const chin = [lerp(j.neck[0], j.head[0], k + 0.15), lerp(j.neck[1], j.head[1], k + 0.15)];
  chain(ctx, [j.neck, chin], U * 0.32, P.base, P.light, rim);
  if (hero && f.outfit === "scarf") scarf(ctx, j, U, f.dir ?? 1);
  if (rim) { ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = U * 0.6; }
  head(ctx, j.head, BODY.head * U, P.head);
  if (rim) ctx.restore();
  if (f.face) face(ctx, j.head, BODY.head * U, f.dir ?? 1, f.face, f.blink || 0, f.talk || 0, hero || f.palette === "grey" ? "#141414" : "#ece6d8", f.look || 0);
  arm(j.sh, j.rElbow, j.rHand, false);
  if (hold) hold(ctx, j);
  ctx.restore();
  return j;
}
