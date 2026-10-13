// ============================================================================
//  Персонаж: белый глянцевый 3D-человечек (как у Simply Animated).
//  Скелет 2D: таз → торс → голова, плечо → локоть → кисть, таз → колено → стопа.
//  Углы в градусах, абсолютные: 0 — конечность смотрит вниз,
//  плюс — вперёд по направлению взгляда (dir = 1 вправо, -1 влево).
// ============================================================================

const RAD = Math.PI / 180;

// Пропорции в единицах U (U ≈ 1/7 роста)
export const BODY = {
  head: 0.82, neck: 0.7, torso: 1.85, shoulder: 0.9,
  upperArm: 1.25, foreArm: 1.2, thigh: 1.55, shin: 1.6,
  wTorso: 1.3, wArm: 0.6, wLeg: 0.72,
};

export const PALETTE = {
  hero: { base: "#cfcfcf", light: "#ffffff", far: "#8a8a8a", farLight: "#b4b4b4", head: ["#ffffff", "#c4c4c4"] },
  grey: { base: "#383a3f", light: "#50535a", far: "#26282c", farLight: "#33363b", head: ["#5a5d64", "#2c2e33"] },
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

// Отличительная черта героя — золотой шарф: петля на шее и два хвоста по ветру
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
  chain(ctx, [j.hip, j.lKnee, j.lFoot], wL, P.far, P.farLight, rim);
  chain(ctx, [j.sh, j.lElbow, j.lHand], wA, P.far, P.farLight, rim);
  chain(ctx, [j.hip, j.neck], BODY.wTorso * U, P.base, P.light, rim);
  chain(ctx, [j.hip, j.rKnee, j.rFoot], wL, P.base, P.light, rim);
  // шея
  const k = BODY.neck / (BODY.neck + BODY.head);
  const chin = [lerp(j.neck[0], j.head[0], k + 0.15), lerp(j.neck[1], j.head[1], k + 0.15)];
  chain(ctx, [j.neck, chin], U * 0.4, P.base, P.light, rim);
  if (hero && f.scarf !== false) scarf(ctx, j, U, f.dir ?? 1);
  if (rim) { ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = U * 0.6; }
  head(ctx, j.head, BODY.head * U, P.head);
  if (rim) ctx.restore();
  if (f.face) face(ctx, j.head, BODY.head * U, f.dir ?? 1, f.face, f.blink || 0, f.talk || 0, hero ? "#141414" : "#ece6d8", f.look || 0);
  chain(ctx, [j.sh, j.rElbow, j.rHand], wA, P.base, P.light, rim);
  if (hold) hold(ctx, j);
  ctx.restore();
  return j;
}
