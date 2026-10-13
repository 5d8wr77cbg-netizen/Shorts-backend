// ============================================================================
//  Действия v2 — метафоры из разбора канала конкурента, переложенные на деньги.
//  Каждое действие: { view, duration, about, params, render(ctx, t, T, p) }.
//    view — область сцены [x, y, w, h], которая вписывается в панель кадра
//           (число или функция от параметров);
//    p    — параметры: подписи, цвета, уровни. Одно и то же действие с разными
//           p в соседних панелях даёт сравнения «Сегодня / Через год».
//  Координаты: ширина сцены 1080, пол на y = 1000.
// ============================================================================

import { drawFigure, ground, joints, reach, walkPose, lerpPose, POSES, clamp, lerp, ease, easeOutBack } from "./figure.js";
import {
  lightPool, glow, floor, coinStack, coin, COIN, trophy, star, boulder, mountain, jar, moneyTree, pillar, ledge,
} from "./props.js";
import { label, color, fitSize } from "./text.js";

const G = 1000;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

// Детерминированный шум для графиков
function noise(i, seed = 1) {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ── 1. Лестница с подписями на ступенях и наградой наверху ────────────────
function stairsGoal(ctx, t, T, p) {
  const steps = (Array.isArray(p.steps) && p.steps.length ? p.steps : ["", "", "", "", ""]).slice(0, 7);
  const n = steps.length, w = 130, h = 92, x0 = 540 - (n * w) / 2;
  const k = ease(seg(t, T * 0.08, T * 0.82));
  const final = ease(seg(t, T * 0.84, T * 0.95));
  // ступени
  for (let i = 0; i < n; i++) {
    const x = x0 + i * w, y = G - (i + 1) * h;
    ctx.fillStyle = "#151515"; ctx.fillRect(x, y, w, G - y);
    ctx.fillStyle = "#e6e6e6"; ctx.fillRect(x, y - 2, w, 4);
    ctx.fillRect(x - 2, y, 4, h);
    if (steps[i]) {
      const s = fitSize(ctx, steps[i], w - 12, 30, 700);
      label(ctx, steps[i], x + w / 2, y + h / 2, { size: s, weight: 700, color: p.stepColor || "white", alpha: seg(t, (i / n) * T * 0.6, (i / n) * T * 0.6 + 0.4) });
    }
  }
  floor(ctx, x0 - 220, x0 + n * w + 120, G);
  // награда наверху
  const topX = x0 + n * w - w / 2, topY = G - n * h;
  if (p.reward !== "none") {
    const a = 0.4 + 0.6 * final;
    if (p.reward === "coins") coinStack(ctx, topX + 30, topY, 4 + Math.round(final * 4), 34);
    else if (p.reward === "star") star(ctx, topX + 20, topY - 60, 34, color("gold"), a);
    else trophy(ctx, topX + 30, topY, 0.9, a);
  }
  // фигура поднимается со ступени на ступень
  const pos = k * n; // 0..n
  const i = Math.min(Math.floor(pos), n - 1), f = pos - Math.floor(pos);
  const fromX = i === 0 && pos < 1 ? x0 - 90 : x0 + (i - 1) * w + w / 2, fromY = i === 0 && pos < 1 ? G : G - i * h;
  const toX = x0 + i * w + w / 2 - 25, toY = G - (i + 1) * h;
  const hop = ease(clamp((f - 0.5) / 0.5, 0, 1));
  const x = pos >= n ? toX : lerp(fromX, toX, hop), y = pos >= n ? toY : lerp(fromY, toY, hop) - Math.sin(hop * Math.PI) * 40;
  const pose = final > 0 ? lerpPose(POSES.stand, POSES.cheer, final) : f < 0.5 ? walkPose(f * Math.PI * 2, 0.7) : POSES.stand;
  if (final > 0) glow(ctx, x, y - 200, 380, 0.3 * final);
  drawFigure(ctx, ground({ ...pose, x, U: 30, dir: 1 }, y));
}

// ── 2. График: рынок, накопления, «плохой день ≠ плохая жизнь» ────────────
function lineChart(ctx, t, T, p) {
  const bx = 170, by = 470, bw = 760, bh = 470;
  const mode = p.trend || "volatile_up";
  const k = ease(seg(t, T * 0.06, T * 0.8));
  ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.stroke();
  const N = 60;
  let pts;
  if (mode === "zoom_out") {
    // 1Д → 1Н → 1М → 6М → 1Г: вблизи шум, издалека — рост
    const pills = ["1D", "1W", "1M", "6M", "1Y"];
    const sel = Math.min(pills.length - 1, Math.floor(seg(t, T * 0.05, T * 0.85) * pills.length));
    pills.forEach((pl, j) => {
      const px = bx + 140 + j * 120, py = by - 50;
      if (j === sel) { ctx.fillStyle = "#f2f2f2"; ctx.beginPath(); ctx.roundRect(px - 34, py - 22, 68, 44, 10); ctx.fill(); }
      label(ctx, pl, px, py, { size: 26, weight: 600, color: j === sel ? "#000" : "grey" });
    });
    const win = [0.02, 0.06, 0.2, 0.5, 1][sel];
    const total = 400;
    const series = (i) => Math.exp((i / total) * 2.2) + (noise(i, 3) - 0.5) * 0.35;
    const start = Math.floor(total * (1 - win));
    const vals = [];
    for (let i = 0; i <= N; i++) vals.push(series(start + Math.round((i / N) * (total - start))));
    const mn = Math.min(...vals), mx = Math.max(...vals);
    pts = vals.map((v, i) => [bx + (i / N) * bw, by + bh - 20 - ((v - mn) / (mx - mn || 1)) * (bh - 60)]);
  } else {
    const vals = [];
    let v = 0;
    for (let i = 0; i <= N; i++) {
      const r = noise(i, mode.length) - 0.5;
      if (mode === "crash") v += i < N * 0.55 ? 0.6 + r * 2 : -1.6 + r * 2;
      else if (mode === "steady_up") v += 0.5 + r * 0.4;
      else if (mode === "flat") v += r * 1.2;
      else v += i > N * 0.85 ? 2.2 : 0.5 + r * 4.5 + (noise(i, 9) > 0.86 ? -5 : 0); // volatile_up: рост с провалами, в конце — вверх
      vals.push(v);
    }
    const mn = Math.min(...vals), mx = Math.max(...vals);
    pts = vals.map((vv, i) => [bx + (i / N) * bw, by + bh - 20 - ((vv - mn) / (mx - mn || 1)) * (bh - 60)]);
  }
  const shown = mode === "zoom_out" ? N : Math.max(1, Math.floor(k * N));
  ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (let i = 1; i <= shown; i++) {
    const up = pts[i][1] <= pts[i - 1][1];
    ctx.strokeStyle = p.color ? color(p.color) : up ? color("gold") : color("red");
    ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke();
  }
  const tip = pts[shown];
  if (p.figure !== false) drawFigure(ctx, ground({ ...POSES.stand, x: tip[0], U: 14, dir: 1 }, tip[1] - 3));
  if (p.yLabel) label(ctx, p.yLabel, bx - 20, by + 10, { size: 24, align: "right", color: "grey" });
  if (p.xLabel) label(ctx, p.xLabel, bx + bw, by + bh + 34, { size: 24, align: "right", color: "grey" });
}

// ── 3. Растущие столбики (сложный процент, доходы по годам) ───────────────
function barsGrowth(ctx, t, T, p) {
  const bars = (Array.isArray(p.bars) && p.bars.length ? p.bars : [{ label: "1", value: 1 }, { label: "2", value: 2 }, { label: "3", value: 4 }, { label: "4", value: 8 }]).slice(0, 7);
  const n = bars.length, gap = 26, bw = Math.min(120, (800 - gap * (n - 1)) / n);
  const x0 = 540 - (n * bw + gap * (n - 1)) / 2;
  const mx = Math.max(...bars.map((b) => +b.value || 1));
  const H = 560;
  floor(ctx, x0 - 120, x0 + n * (bw + gap) + 80, G, 0.35);
  let lastTop = null;
  bars.forEach((b, i) => {
    const t0 = T * 0.05 + (i / n) * T * 0.7;
    const k = easeOutBack(seg(t, t0, t0 + T * 0.12));
    const h = Math.max(4, ((+b.value || 1) / mx) * H * k);
    const x = x0 + i * (bw + gap);
    const c = b.color ? color(b.color) : i === n - 1 ? color(p.lastColor || "gold") : "#d6d6d6";
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, c); g.addColorStop(1, "#5a5a5a");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, G - h, bw, h, [10, 10, 0, 0]); ctx.fill();
    if (b.label) label(ctx, b.label, x + bw / 2, G + 36, { size: fitSize(ctx, b.label, bw + gap, 26), color: "grey" });
    if (b.text && k > 0.6) label(ctx, b.text, x + bw / 2, G - h - 28, { size: 26, weight: 600, color: i === n - 1 ? "gold" : "white", alpha: seg(k, 0.6, 1) });
    if (k > 0.05) lastTop = [x + bw / 2, G - h];
  });
  if (p.climber !== false && lastTop) {
    const final = ease(seg(t, T * 0.82, T * 0.95));
    drawFigure(ctx, ground({ ...lerpPose(POSES.stand, POSES.cheer, final), x: lastTop[0], U: 22, dir: 1 }, lastTop[1]));
  }
}

// ── 4. Валун в гору (долг, цель) ──────────────────────────────────────────
function pushBoulder(ctx, t, T, p) {
  const a = [150, G], b = [960, G - 430];
  ctx.strokeStyle = "#cfcfcf"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  const slip = p.outcome === "slip";
  const up = ease(seg(t, T * 0.05, T * (slip ? 0.68 : 0.85)));
  const back = slip ? ease(seg(t, T * 0.7, T * 0.92)) : 0;
  const R = p.size || 115;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const n = [d[1], -d[0]]; // нормаль к склону, смотрит вверх
  const at = (pos, off = 0) => [lerp(a[0], b[0], pos) + n[0] * off, lerp(a[1], b[1], pos) + n[1] * off];
  const peak = 0.18 + up * 0.62;
  const pos = peak - back * (peak - 0.12);
  const centre = at(pos, R);
  // фигура позади камня; когда камень укатился — остаётся на месте
  const fpos = (slip && back > 0 ? peak : pos) - (R + 55) / len;
  const [fx, fy] = at(fpos);
  let f = ground({ ...POSES.strain, torso: 40, x: fx, U: 32, dir: 1 }, fy);
  if (back > 0) f = ground({ ...lerpPose(POSES.strain, POSES.sad, back), x: fx, U: 32, dir: 1 }, fy);
  else {
    f = reach(f, "r", [centre[0] - R * 0.8, centre[1] + 10]);
    f = reach(f, "l", [centre[0] - R * 0.85, centre[1] - 20]);
  }
  drawFigure(ctx, f);
  boulder(ctx, centre[0], centre[1], R, pos * 9, p.tint || "#8a8a8a");
  if (p.label) label(ctx, p.label, centre[0], centre[1], { size: fitSize(ctx, p.label, R * 1.6, 40, 800), weight: 800, color: p.labelColor || "red", stroke: "#111" });
  if (!slip && p.reward !== "none") coinStack(ctx, b[0] - 40, b[1] + 4, 3 + Math.round(ease(seg(t, T * 0.8, T * 0.95)) * 4), 30);
}

// ── 5. Качели: доходы против расходов ─────────────────────────────────────
function seesaw(ctx, t, T, p) {
  const k = ease(seg(t, T * 0.1, T * 0.8));
  const L = (p.leftWeight ?? 1) * (p.leftGrow ? 0.6 + 0.8 * k : 1);
  const R = (p.rightWeight ?? 1) * (p.rightGrow ? 0.6 + 0.8 * k : 1);
  const tilt = clamp((R - L) * 0.35, -0.3, 0.3) * ease(seg(t, T * 0.05, T * 0.5));
  const cx = 540, cy = G - 120, half = 380;
  ctx.fillStyle = "#cfcfcf";
  ctx.beginPath(); ctx.moveTo(cx - 55, G); ctx.lineTo(cx + 55, G); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  floor(ctx, 80, 1000, G);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
  ctx.fillStyle = color("gold"); ctx.fillRect(-half, -8, half * 2, 16);
  const box = (x, w, lbl, c) => {
    const s = 80 + 70 * w;
    ctx.fillStyle = "#1c1c1c"; ctx.strokeStyle = color(c); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(x - s / 2, -8 - s, s, s, 10); ctx.fill(); ctx.stroke();
    label(ctx, lbl, x, -8 - s / 2, { size: fitSize(ctx, lbl, s - 14, 30, 700), weight: 700, color: c });
  };
  box(-half + 90, L, p.left || "", p.leftColor || "green");
  box(half - 90, R, p.right || "", p.rightColor || "red");
  ctx.restore();
}

// ── 6. Банка, которая наполняется монетами ────────────────────────────────
function jarFill(ctx, t, T, p) {
  const from = clamp(+(p.from ?? 0) || 0, 0, 1), to = clamp(+(p.level ?? 0.8) || 0, 0, 1);
  const k = ease(seg(t, T * 0.08, T * 0.85));
  const lv = lerp(from, to, k);
  floor(ctx, 160, 920, G);
  jar(ctx, 600, G, 230, 330, lv);
  // фигура бросает монеты сверху
  let f = ground({ ...POSES.stand, x: 360, U: 34, dir: 1 }, G);
  const drop = (t * 1.4) % 1;
  f = reach(f, "r", [520, G - 380 + Math.sin(drop * Math.PI) * 10]);
  drawFigure(ctx, f);
  if (k < 1 && p.dropping !== false) coin(ctx, 600, G - 400 + drop * (330 - lv * 300), 22, drop * 3);
  if (p.label) label(ctx, p.label, 600, G + 50, { size: 30, weight: 600, color: p.labelColor || "white" });
}

// ── 7. Айсберг: что видят и чего не видят ─────────────────────────────────
function iceberg(ctx, t, T, p) {
  const wl = 640; // линия воды
  const below = (Array.isArray(p.below) && p.below.length ? p.below : ["Saving", "Budgeting", "Patience", "Sacrifice", "Discipline"]).slice(0, 8);
  // вода
  const g = ctx.createLinearGradient(0, wl, 0, 1400);
  g.addColorStop(0, "rgba(110,139,224,0.25)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(80, wl, 920, 760);
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(80, wl - 2, 920, 4);
  // верхушка
  ctx.fillStyle = "#f2f2f2";
  ctx.beginPath(); ctx.moveTo(400, wl); ctx.lineTo(520, wl - 260); ctx.lineTo(560, wl - 230); ctx.lineTo(680, wl); ctx.closePath(); ctx.fill();
  label(ctx, p.top || "WEALTH", 540, wl - 330, { size: fitSize(ctx, p.top || "WEALTH", 700, 52, 800), weight: 800, color: "gold", glow: true });
  // подводная часть
  const k = seg(t, T * 0.2, T * 0.9);
  ctx.fillStyle = "rgba(220,220,220,0.18)";
  ctx.beginPath(); ctx.moveTo(400, wl); ctx.lineTo(240, wl + 300); ctx.lineTo(330, wl + 640); ctx.lineTo(560, wl + 740); ctx.lineTo(800, wl + 560); ctx.lineTo(850, wl + 260); ctx.lineTo(680, wl); ctx.closePath(); ctx.fill();
  below.forEach((w, i) => {
    const a = seg(k * below.length, i, i + 0.6);
    label(ctx, w, 545, wl + 90 + i * (600 / below.length), { size: 32, weight: 500, alpha: a });
  });
  if (p.seeLabel) label(ctx, p.seeLabel, 860, wl - 200, { size: 26, color: "grey" });
  if (p.hiddenLabel) label(ctx, p.hiddenLabel, 900, wl + 120, { size: 26, color: "grey" });
}

// ── 8. Столбик слов: SPEND SPEND … SAVE ───────────────────────────────────
function wordStack(ctx, t, T, p) {
  const words = (Array.isArray(p.words) && p.words.length ? p.words : Array(8).fill("SPEND")).slice(0, 12);
  const n = words.length, sz = 52, step = 60;
  const k = seg(t, T * 0.05, T * 0.7);
  const finalA = ease(seg(t, T * 0.72, T * 0.85));
  const yTop = G - 400 - n * step;
  words.forEach((w, i) => {
    const a = seg(k * n, i, i + 0.5);
    label(ctx, w, 540, yTop + i * step, { size: sz, weight: 800, color: p.color || "red", alpha: a });
  });
  if (p.final) {
    const fy = G - 340;
    label(ctx, p.final, 540, fy, { size: 72, weight: 900, color: p.finalColor || "green", alpha: finalA, glow: finalA > 0.5 });
    const f = ground({ ...POSES.cheer, x: 540, U: 30, dir: 1 }, G);
    drawFigure(ctx, { ...f, alpha: finalA });
  }
  floor(ctx, 300, 780, G);
}

// ── 9. Прыжок через пропасть: «А что, если получится?» ────────────────────
function gapJump(ctx, t, T, p) {
  ledge(ctx, 100, 430, G);
  ledge(ctx, 660, 990, G);
  const fail = p.outcome === "fall";
  const reward = ease(seg(t, T * 0.75, T * 0.9));
  if (p.reward !== "none") {
    if (p.reward === "trophy") trophy(ctx, 880, G, 0.8);
    else coinStack(ctx, 880, G, 6, 34);
  }
  const tRun = T * 0.35, tJump = T * 0.6;
  let x, y, pose, rot = 0;
  if (t < tRun) { x = lerp(140, 400, t / tRun); y = G; pose = walkPose((x / 90) * Math.PI, 1, true); }
  else if (t < tJump) {
    const k = (t - tRun) / (tJump - tRun);
    x = lerp(400, fail ? 560 : 720, k); y = G - Math.sin(k * Math.PI) * 170 + (fail && k > 0.5 ? (k - 0.5) * 300 : 0);
    pose = lerpPose(walkPose(1, 1, true), POSES.cheer, 0.4);
  } else if (fail) {
    const k = (t - tJump) / (T - tJump);
    x = 560; y = G + 150 + k * k * 900; pose = POSES.strain; rot = k * 200;
  } else { x = 720; y = G; pose = lerpPose(POSES.stand, POSES.cheer, reward); }
  drawFigure(ctx, { ...ground({ ...pose, x, U: 34, dir: 1 }, y), rot });
  if (p.left) label(ctx, p.left, 265, G + 70, { size: fitSize(ctx, p.left, 300, 34, 700), weight: 700, color: "#1a1a1a" });
  if (p.right) label(ctx, p.right, 825, G + 70, { size: fitSize(ctx, p.right, 300, 34, 700), weight: 700, color: "#3a2a00" });
}

// ── 10. Денежное дерево ───────────────────────────────────────────────────
function treeGrow(ctx, t, T, p) {
  const from = clamp(+(p.from ?? 0.05) || 0, 0, 1), to = clamp(+(p.grow ?? 1) || 0, 0, 1);
  const k = ease(seg(t, T * 0.05, T * 0.85));
  floor(ctx, 140, 940, G, 0.3);
  ctx.fillStyle = "#3a2a1a"; ctx.fillRect(140, G, 800, 30);
  moneyTree(ctx, 600, G, 1, lerp(from, to, k));
  let f = ground({ ...POSES.kneel, x: 380, U: 32, dir: 1 }, G);
  if (p.harvest && k > 0.9) f = ground({ ...POSES.cheer, x: 380, U: 32, dir: 1 }, G);
  drawFigure(ctx, f);
  if (p.label) label(ctx, p.label, 540, G + 70, { size: 30, weight: 600, color: p.labelColor || "white" });
}

// ── 11. Молот и камень: удар за ударом, внутри — золото ───────────────────
function hammerRock(ctx, t, T, p) {
  const hits = p.hits || 100;
  const breaks = p.break !== false;
  const tBreak = T * 0.78;
  const count = Math.min(hits, Math.max(1, Math.round(ease(seg(t, T * 0.05, tBreak)) * hits)));
  floor(ctx, 140, 940, G);
  const rx = 660, R = 170;
  if (breaks && t > tBreak) {
    const k = ease(seg(t, tBreak, tBreak + 0.6));
    coinStack(ctx, rx, G, 7, 40);
    glow(ctx, rx, G - 80, 260, 0.45 * k);
    boulder(ctx, rx - 60 - k * 90, G - R * 0.8, R * 0.75, -k * 0.6);
    boulder(ctx, rx + 70 + k * 90, G - R * 0.75, R * 0.7, k * 0.6);
  } else {
    boulder(ctx, rx, G - R * 0.9, R, 0.2);
  }
  // замах
  const phase = (t * 2.2) % 1;
  const swing = t > tBreak ? 0.2 : phase < 0.7 ? phase / 0.7 : 1 - (phase - 0.7) / 0.3;
  let f = ground({ ...POSES.stand, torso: 12, x: 380, U: 34, dir: 1 }, G);
  const ang = lerp(-2.4, 0.1, swing);
  const sh = joints(f).sh;
  const hand = [sh[0] + Math.cos(ang) * 95, sh[1] + Math.sin(ang) * 95];
  f = reach(f, "r", hand); f = reach(f, "l", [hand[0] - 10, hand[1] + 10]);
  drawFigure(ctx, f, (c, j) => {
    const hx = j.rHand[0], hy = j.rHand[1];
    const hx2 = hx + Math.cos(ang) * 90, hy2 = hy + Math.sin(ang) * 90;
    c.strokeStyle = "#8a6a40"; c.lineWidth = 9; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx2, hy2); c.stroke();
    c.save(); c.translate(hx2, hy2); c.rotate(ang + Math.PI / 2);
    c.fillStyle = "#5a5a5a"; c.fillRect(-32, -16, 64, 32); c.restore();
  });
  label(ctx, String(count), rx, G - R * 2.1, { size: 54, weight: 800, color: count >= hits && breaks ? "gold" : "white" });
}

// ── 12. Гора с флагом ─────────────────────────────────────────────────────
function mountainClimb(ctx, t, T, p) {
  const k = ease(seg(t, T * 0.05, T * 0.82));
  const final = ease(seg(t, T * 0.84, T * 0.95));
  mountain(ctx, 540, G, 780, 600, color(p.flagColor || "gold"));
  // тропа по левому склону
  const x = lerp(170, 540, k), y = lerp(G, G - 600, k);
  if (final > 0) glow(ctx, 540, G - 700, 300, 0.35 * final);
  const pose = final > 0 ? lerpPose(POSES.stand, POSES.cheer, final) : lerpPose(walkPose(k * 40), POSES.strain, 0.25);
  drawFigure(ctx, ground({ ...pose, x: x - 10, U: 22, dir: 1 }, y));
  if (p.top) label(ctx, p.top, 540, G - 860, { size: 34, weight: 700, color: "gold", alpha: 0.4 + 0.6 * final, glow: final > 0.5 });
}

// ── 13. Колонны: сотрудник / менеджер / владелец ──────────────────────────
function pillars(ctx, t, T, p) {
  const list = (Array.isArray(p.pillars) && p.pillars.length ? p.pillars : [{ label: "Employee", h: 0.3 }, { label: "Manager", h: 0.55 }, { label: "Owner", h: 1, color: "gold" }]).slice(0, 4);
  const n = list.length, w = 150, gap = 70;
  const x0 = 540 - (n * w + (n - 1) * gap) / 2 + w / 2;
  floor(ctx, 100, 980, G, 0.35);
  list.forEach((pl, i) => {
    const k = easeOutBack(seg(t, T * 0.05 + i * T * 0.15, T * 0.25 + i * T * 0.15));
    const h = 80 + 520 * (pl.h ?? 0.5) * k;
    const x = x0 + i * (w + gap);
    pillar(ctx, x, G, w, h, pl.color ? color(pl.color) : "#d0d0d0");
    if (pl.text) label(ctx, pl.text, x, G - h / 2, { size: 44, weight: 800, color: "#1a1a1a" });
    const top = i === n - 1 ? POSES.cheer : POSES.stand;
    drawFigure(ctx, ground({ ...lerpPose(POSES.stand, top, ease(seg(t, T * 0.7, T * 0.9))), x, U: 26, dir: 1 }, G - h));
    if (pl.label) label(ctx, pl.label, x, G + 40, { size: fitSize(ctx, pl.label, w + gap - 10, 28), color: "grey" });
  });
}

// ── 14. Шкалы: стресс, сбережения, долги ──────────────────────────────────
function meters(ctx, t, T, p) {
  const list = (Array.isArray(p.bars) && p.bars.length ? p.bars : [{ label: "Savings", level: 0.8, color: "green" }, { label: "Stress", level: 0.2, color: "red" }]).slice(0, 4);
  const n = list.length, w = 90, gap = 160;
  const x0 = 540 - (n * w + (n - 1) * gap) / 2;
  const k = ease(seg(t, T * 0.1, T * 0.8));
  list.forEach((b, i) => {
    const x = x0 + i * (w + gap), H = 520, y = G - H;
    ctx.strokeStyle = "#e6e6e6"; ctx.lineWidth = 5; ctx.strokeRect(x, y, w, H);
    const lv = clamp(lerp(+(b.from ?? 0) || 0, +(b.level ?? 0.5) || 0, k), 0, 1);
    ctx.fillStyle = color(b.color || "gold");
    ctx.fillRect(x + 8, y + H - (H - 16) * lv - 8, w - 16, (H - 16) * lv);
    label(ctx, b.label || "", x + w / 2, y - 40, { size: fitSize(ctx, b.label || "", w + gap - 20, 30), weight: 600, color: b.color || "white" });
    if (b.showPercent !== false) label(ctx, `${Math.round(lv * 100)}%`, x + w / 2, G + 40, { size: 28, color: "grey" });
  });
}

export const ACTIONS = {
  stairs_goal: {
    render: stairsGoal, duration: 8,
    view: (p) => { const n = Math.min(7, (Array.isArray(p.steps) && p.steps.length) || 5); return [100, G - n * 92 - 300, 880, n * 92 + 380]; },
    about: "A figure climbs a staircase; each step can carry a label (steps: up to 7 short words, e.g. Save, Invest, Wait, Repeat); a gold trophy/star/coins waits at the top (reward: trophy|star|coins|none). stepColor: white|red|gold (red for FAIL-style steps).",
    params: "steps[], reward, stepColor",
  },
  line_chart: {
    render: lineChart, duration: 8, view: [100, 380, 880, 680],
    about: "A chart line draws itself, up segments gold and down segments red, a tiny figure rides the tip. trend: volatile_up (ups and downs but higher overall), steady_up, crash, flat, zoom_out (1D/1W/1M/6M/1Y pills: noise up close, clear growth from afar). Optional yLabel, xLabel.",
    params: "trend, color?, yLabel?, xLabel?",
  },
  bars_growth: {
    render: barsGrowth, duration: 8, view: [80, 380, 920, 720],
    about: "Bars grow one after another (bars: [{label, value, text?, color?}], up to 7); the last bar is gold; a figure stands on the newest bar and cheers at the end. Good for compound interest by year, income streams, savings by month.",
    params: "bars[], lastColor?, climber?",
  },
  push_boulder: {
    render: pushBoulder, duration: 8, view: [100, 440, 900, 640],
    about: "A figure pushes a big boulder up a slope; the boulder carries a label (label: e.g. DEBT, BILLS, GOAL; labelColor red|gold|white). outcome: top (reaches the top, coins wait there) or slip (boulder rolls back, figure sad).",
    params: "label, labelColor?, outcome",
  },
  seesaw: {
    render: seesaw, duration: 7, view: [100, 560, 880, 520],
    about: "A seesaw with two labelled boxes (left, right; e.g. Income vs Expenses) that tilts toward the heavier side; leftWeight/rightWeight 0.5..2, leftGrow/rightGrow true makes a box grow over time. leftColor/rightColor green|red|gold|white.",
    params: "left, right, leftWeight, rightWeight, leftGrow?, rightGrow?, leftColor?, rightColor?",
  },
  jar_fill: {
    render: jarFill, duration: 7, view: [200, 520, 700, 560],
    about: "A figure drops coins into a glass jar that fills from level `from` to `level` (0..1); optional label under the jar. Use three panels with growing levels for Today / In a month / In a year.",
    params: "from, level, label?",
  },
  iceberg: {
    render: iceberg, duration: 9, view: [80, 260, 920, 1160],
    about: "An iceberg: the tip above water is labelled in gold (top: e.g. WEALTH, FREEDOM); words appear one by one in the hidden part under water (below: up to 8 words like Saving, Patience, Sacrifice, Budgeting). Optional seeLabel/hiddenLabel.",
    params: "top, below[], seeLabel?, hiddenLabel?",
  },
  word_stack: {
    render: wordStack, duration: 7, view: (p) => { const n = Math.min(12, (Array.isArray(p.words) && p.words.length) || 8); return [140, G - 460 - n * 60, 800, n * 60 + 520]; },
    about: "Big bold words appear one under another (words: e.g. 8x SPEND in red), then a final word glows at the bottom (final: e.g. SAVE in green/gold) while a figure raises its arms. Typographic punchline.",
    params: "words[], color?, final?, finalColor?",
  },
  gap_jump: {
    render: gapJump, duration: 7, view: [80, 640, 940, 540],
    about: "A figure runs and jumps over a gap between two cliffs to reach coins/trophy on the other side (outcome: land|fall; reward: coins|trophy|none; left/right labels under the cliffs, e.g. 9-5 job / Own business).",
    params: "outcome, reward?, left?, right?",
  },
  tree_grow: {
    render: treeGrow, duration: 8, view: [140, 440, 800, 680],
    about: "A kneeling figure next to a money tree that grows from `from` to `grow` (0..1) and gets gold coins as fruit once big; harvest:true makes the figure cheer at the end; optional label. Panels with different grow levels show time.",
    params: "from, grow, harvest?, label?",
  },
  hammer_rock: {
    render: hammerRock, duration: 8, view: [200, 520, 760, 580],
    about: "A figure hits a big rock with a hammer again and again, a counter counts the hits up to `hits` (e.g. 100); with break:true the rock splits at the end and reveals a pile of gold coins. Persistence, small consistent deposits.",
    params: "hits, break",
  },
  mountain_climb: {
    render: mountainClimb, duration: 8, view: [120, 100, 840, 980],
    about: "A small figure climbs a big mountain with a gold flag on the peak and cheers at the top; optional top label above the peak (e.g. FINANCIAL FREEDOM).",
    params: "top?, flagColor?",
  },
  pillars: {
    render: pillars, duration: 7, view: [100, 300, 880, 800],
    about: "Pillars of different heights rise with a figure on top of each (pillars: up to 4 of {label, h 0..1, color?, text?}; e.g. Employee 0.3 / Manager 0.55 / Owner 1 gold with text $). The tallest figure cheers.",
    params: "pillars[]",
  },
  meters: {
    render: meters, duration: 7, view: [120, 380, 840, 700],
    about: "Vertical gauges fill from `from` to `level` (bars: up to 4 of {label, level 0..1, from?, color green|red|gold|blue}), with percentages. E.g. Savings vs Stress, Income vs Debt.",
    params: "bars[]",
  },
};
