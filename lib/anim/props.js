// ============================================================================
//  Реквизит в том же стиле: монохром, мягкий объём, тёмные контуры.
// ============================================================================

const EDGE = "#060606";

export function background(ctx, W, H) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  // Едва заметный верхний прожектор, как в студии
  const g = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, H * 0.55);
  g.addColorStop(0, "rgba(255,255,255,0.05)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Световое пятно на полу
export function lightPool(ctx, x, y, rx, a = 0.18) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, 0.18);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function glow(ctx, x, y, r, a = 0.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(0.35, `rgba(255,255,255,${a * 0.25})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Линия пола, тающая к краям
export function floor(ctx, x1, x2, y, a = 0.22) {
  const g = ctx.createLinearGradient(x1, 0, x2, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, `rgba(255,255,255,${a})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x1, y, x2 - x1, 2);
}

// ── Монеты ─────────────────────────────────────────────────────────────────
export const COIN = { h: 0.2, ry: 0.3 }; // толщина и сплющенность относительно радиуса

// Монеты золотые: у конкурента золото — цвет успеха и денег
function coinBody(ctx, x, y, r) {
  const h = r * COIN.h, ry = r * COIN.ry;
  // боковина
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, "#7a5410"); g.addColorStop(0.35, "#d9a520"); g.addColorStop(1, "#5e400a");
  ctx.beginPath();
  ctx.ellipse(x, y, r, ry, 0, 0, Math.PI);
  ctx.lineTo(x - r, y - h);
  ctx.ellipse(x, y - h, r, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.04); ctx.strokeStyle = EDGE; ctx.stroke();
  // верх
  const gt = ctx.createRadialGradient(x - r * 0.3, y - h - ry * 0.4, r * 0.05, x, y - h, r);
  gt.addColorStop(0, "#fff4b8"); gt.addColorStop(1, "#d8a826");
  ctx.beginPath(); ctx.ellipse(x, y - h, r, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = gt; ctx.fill(); ctx.stroke();
  // ободок
  ctx.beginPath(); ctx.ellipse(x, y - h, r * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(120,80,0,0.35)"; ctx.lineWidth = r * 0.05; ctx.stroke();
}

// Стопка монет; yBottom — пол. Возвращает y верхней грани.
export function coinStack(ctx, x, yBottom, n, r, wobble = 0) {
  const h = r * COIN.h;
  const whole = Math.floor(n);
  for (let i = 0; i < whole; i++) {
    const dx = wobble ? Math.sin(i * 2.3) * r * 0.06 : 0;
    coinBody(ctx, x + dx, yBottom - i * h, r);
  }
  return yBottom - whole * h - h;
}

export function coin(ctx, x, y, r, tilt = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(tilt);
  coinBody(ctx, 0, r * COIN.h / 2, r);
  ctx.restore();
}

// ── Лестница ───────────────────────────────────────────────────────────────
export function ladder(ctx, x, yTop, yBottom, w, gap, litBelowY) {
  ctx.lineCap = "round";
  for (let y = yBottom - gap / 2; y > yTop; y -= gap) {
    const lit = y > litBelowY;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y);
    ctx.strokeStyle = EDGE; ctx.lineWidth = 16; ctx.stroke();
    ctx.strokeStyle = lit ? "#eaeaea" : "#4a4a4a"; ctx.lineWidth = 12; ctx.stroke();
  }
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + (sx * w) / 2, yBottom); ctx.lineTo(x + (sx * w) / 2, yTop);
    ctx.strokeStyle = EDGE; ctx.lineWidth = 20; ctx.stroke();
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
    g.addColorStop(0, "#3a3a3a"); g.addColorStop(1, "#bdbdbd");
    ctx.strokeStyle = g; ctx.lineWidth = 15; ctx.stroke();
  }
}

// ── Дверь ─────────────────────────────────────────────────────────────────
// open: 0 — закрыта, 1 — распахнута; свет за дверью
export function door(ctx, x, yGround, w, h, open) {
  const left = x - w / 2, top = yGround - h;
  if (open > 0) {
    // свет из проёма
    ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.85 * open})`;
    ctx.fillRect(left, top, w, h);
    glow(ctx, x, yGround - h * 0.5, h * (0.6 + 1.2 * open), 0.55 * open);
    // световой конус на полу
    ctx.save();
    const g = ctx.createLinearGradient(x, yGround, x - w * 3, yGround);
    g.addColorStop(0, `rgba(255,255,255,${0.45 * open})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left, yGround); ctx.lineTo(left + w, yGround);
    ctx.lineTo(left - w * 2.6, yGround + h * 0.16); ctx.lineTo(left - w * 3.2, yGround + h * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(left, top, w, h);
  }
  // створка поворачивается внутрь
  const pw = w * Math.cos(open * Math.PI * 0.46);
  const shade = Math.round(70 - 40 * open);
  ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
  ctx.strokeStyle = EDGE; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left + w, top); ctx.lineTo(left + w - pw, top + h * 0.04 * open);
  ctx.lineTo(left + w - pw, yGround - h * 0.04 * open); ctx.lineTo(left + w, yGround);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (open < 0.6) {
    ctx.fillStyle = "#cfcfcf";
    ctx.beginPath(); ctx.arc(left + w - pw * 0.85, yGround - h * 0.45, w * 0.045, 0, Math.PI * 2); ctx.fill();
  }
  // рама
  ctx.strokeStyle = "#e8e8e8"; ctx.lineWidth = 8;
  ctx.strokeRect(left - 4, top - 4, w + 8, h + 4);
  glow(ctx, x, top, w * 0.9, 0.08);
}

// ── Гиря долга на цепи ─────────────────────────────────────────────────────
export function ball(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r * 1.04, 0, Math.PI * 2); ctx.fillStyle = EDGE; ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.05, x, y, r);
  g.addColorStop(0, "#9a9a9a"); g.addColorStop(0.5, "#454545"); g.addColorStop(1, "#1c1c1c");
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

export function chainLinks(ctx, a, b, link = 16, sag = 30) {
  const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / link));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = a[0] + (b[0] - a[0]) * k;
    const y = a[1] + (b[1] - a[1]) * k + Math.sin(k * Math.PI) * sag;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(i % 2 ? Math.PI / 2 : 0);
    ctx.beginPath(); ctx.ellipse(0, 0, link * 0.62, link * 0.36, 0, 0, Math.PI * 2);
    ctx.strokeStyle = EDGE; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = "#9c9c9c"; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }
}

// ── Пакет из магазина ─────────────────────────────────────────────────────
export function bag(ctx, x, y, s, shade = "#7a7a7a") {
  // x,y — точка, где рука держит ручку
  ctx.strokeStyle = EDGE; ctx.lineWidth = s * 0.14;
  ctx.beginPath(); ctx.arc(x, y + s * 0.3, s * 0.25, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = shade; ctx.lineWidth = s * 0.08; ctx.stroke();
  ctx.fillStyle = shade; ctx.strokeStyle = EDGE; ctx.lineWidth = s * 0.06;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.42, y + s * 0.3); ctx.lineTo(x + s * 0.42, y + s * 0.3);
  ctx.lineTo(x + s * 0.5, y + s * 1.1); ctx.lineTo(x - s * 0.5, y + s * 1.1);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

// ── Беговая дорожка ───────────────────────────────────────────────────────
export function treadmill(ctx, x, y, w, offset) {
  const h = 26;
  ctx.fillStyle = "#1e1e1e"; ctx.strokeStyle = EDGE; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, h, h / 2); ctx.fill(); ctx.stroke();
  // полосы ленты двигаются
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, h, h / 2); ctx.clip();
  ctx.strokeStyle = "#4a4a4a"; ctx.lineWidth = 3;
  const gap = 34;
  for (let sx = x - w / 2 - gap + (((offset % gap) + gap) % gap); sx < x + w / 2 + gap; sx += gap) {
    ctx.beginPath(); ctx.moveTo(sx, y + 3); ctx.lineTo(sx - 8, y + h - 3); ctx.stroke();
  }
  ctx.restore();
  // ролики и стойка с поручнем
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.arc(x + (sx * (w / 2 - h / 2)), y + h / 2, h / 2 - 3, 0, Math.PI * 2);
    ctx.fillStyle = "#8a8a8a"; ctx.fill();
  }
  ctx.lineCap = "round";
  ctx.strokeStyle = EDGE; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 30, y); ctx.lineTo(x + w / 2 - 70, y - 330); ctx.lineTo(x + w / 2 - 170, y - 330); ctx.stroke();
  ctx.strokeStyle = "#8f8f8f"; ctx.lineWidth = 11; ctx.stroke();
}

// Обрыв: пол обрывается в x, дальше — темнота
export function cliff(ctx, x, y, a = 1) {
  const g = ctx.createLinearGradient(x - 1100, 0, x, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, `rgba(255,255,255,${0.45 * a})`);
  ctx.fillStyle = g;
  ctx.fillRect(x - 1100, y - 1, 1100, 3);
  const d = ctx.createLinearGradient(0, y, 0, y + 70);
  d.addColorStop(0, `rgba(255,255,255,${0.12 * a})`);
  d.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = d;
  ctx.beginPath(); ctx.moveTo(x - 60, y); ctx.lineTo(x, y); ctx.lineTo(x - 10, y + 70); ctx.lineTo(x - 60, y + 70); ctx.fill();
}

// ── Реквизит v2: метафоры конкурента в денежной теме ──────────────────────
// Все предметы монохромные; цвет — только у акцентов (золото, красный, зелёный).

export function trophy(ctx, x, y, s = 1, a = 1) {
  // x,y — низ подставки
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  glow(ctx, 0, -60, 120, 0.25);
  const g = ctx.createLinearGradient(-40, 0, 40, 0);
  g.addColorStop(0, "#a07810"); g.addColorStop(0.4, "#f5d35a"); g.addColorStop(1, "#8a640c");
  ctx.fillStyle = g; ctx.strokeStyle = EDGE; ctx.lineWidth = 3;
  ctx.fillRect(-30, -14, 60, 14); ctx.strokeRect(-30, -14, 60, 14);
  ctx.fillRect(-8, -40, 16, 26);
  ctx.beginPath(); ctx.moveTo(-38, -100); ctx.lineTo(38, -100); ctx.quadraticCurveTo(34, -40, 0, -38); ctx.quadraticCurveTo(-34, -40, -38, -100);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 7; ctx.strokeStyle = "#c9a227";
  ctx.beginPath(); ctx.arc(-38, -82, 14, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(38, -82, 14, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  ctx.restore();
}

export function star(ctx, x, y, r = 30, fill = "#E8C33A", a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
  }
  ctx.closePath();
  ctx.shadowColor = fill; ctx.shadowBlur = r * 0.8;
  ctx.fillStyle = fill; ctx.fill();
  ctx.restore();
}

// Валун (камень), который катят в гору
export function boulder(ctx, x, y, r, rot = 0, tint = "#9a9a9a") {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const rr = r * (0.9 + 0.1 * Math.sin(i * 2.7));
    ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, "#e6e6e6"); g.addColorStop(1, tint);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = EDGE; ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.1); ctx.lineTo(r * 0.1, r * 0.2); ctx.lineTo(r * 0.4, r * 0.05); ctx.stroke();
  ctx.restore();
}

// Гора с флагом
export function mountain(ctx, x, yBase, w, h, flagColor = "#E8C33A", snow = true) {
  const g = ctx.createLinearGradient(0, yBase - h, 0, yBase);
  g.addColorStop(0, "#9a9a9a"); g.addColorStop(1, "#2c2c2c");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - w / 2, yBase); ctx.lineTo(x, yBase - h); ctx.lineTo(x + w / 2, yBase); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.moveTo(x, yBase - h); ctx.lineTo(x + w / 2, yBase); ctx.lineTo(x + w * 0.08, yBase); ctx.closePath(); ctx.fill();
  if (snow) {
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath(); ctx.moveTo(x, yBase - h);
    ctx.lineTo(x - w * 0.11, yBase - h * 0.78); ctx.lineTo(x - w * 0.04, yBase - h * 0.82);
    ctx.lineTo(x + w * 0.02, yBase - h * 0.75); ctx.lineTo(x + w * 0.11, yBase - h * 0.78);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = "#cfcfcf"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, yBase - h); ctx.lineTo(x, yBase - h - 70); ctx.stroke();
  ctx.fillStyle = flagColor;
  ctx.beginPath(); ctx.moveTo(x, yBase - h - 70); ctx.lineTo(x + 52, yBase - h - 56); ctx.lineTo(x, yBase - h - 42); ctx.closePath(); ctx.fill();
}

// Банка, наполненная монетами до level (0..1)
export function jar(ctx, x, yBase, w, h, level) {
  const lv = Math.max(0, Math.min(1, level));
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x - w / 2, yBase - h, w, h, 18); ctx.clip();
  // монеты внутри: ряды кружков
  const r = w / 9;
  const rows = Math.floor(((h - 20) * lv) / (r * 1.4));
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < 4; c++) {
      const cx = x - w / 2 + r * 1.3 + c * r * 2.1 + (row % 2) * r;
      const cy = yBase - 12 - row * r * 1.4;
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
      g.addColorStop(0, "#fff0a0"); g.addColorStop(1, "#b8860b");
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  ctx.restore();
  // стекло
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(x - w / 2, yBase - h, w, h, 18); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x - w / 2 + 12, yBase - h + 20, 10, h - 40);
  ctx.fillStyle = "#bdbdbd"; ctx.fillRect(x - w / 2 - 8, yBase - h - 18, w + 16, 20);
}

// Денежное дерево: grow 0..1 (росток → дерево с золотыми монетами)
export function moneyTree(ctx, x, yBase, scale, grow) {
  const k = Math.max(0, Math.min(1, grow));
  const h = (60 + 360 * k) * scale;
  ctx.strokeStyle = "#6b4a2b"; ctx.lineCap = "round";
  ctx.lineWidth = (6 + 26 * k) * scale;
  ctx.beginPath(); ctx.moveTo(x, yBase); ctx.lineTo(x, yBase - h); ctx.stroke();
  if (k > 0.25) {
    ctx.lineWidth = (4 + 12 * k) * scale;
    for (const [dx, dy] of [[-1, 0.55], [1, 0.45], [-0.8, 0.75], [0.9, 0.7]]) {
      ctx.beginPath(); ctx.moveTo(x, yBase - h * dy); ctx.lineTo(x + dx * 110 * k * scale, yBase - h * (dy + 0.18)); ctx.stroke();
    }
  }
  const crown = (30 + 190 * k) * scale;
  const g = ctx.createRadialGradient(x - crown * 0.3, yBase - h - crown * 0.3, crown * 0.1, x, yBase - h, crown);
  g.addColorStop(0, "#d9d9d9"); g.addColorStop(1, "#6f6f6f");
  ctx.fillStyle = g;
  ctx.beginPath();
  for (const [dx, dy, rr] of [[0, 0, 1], [-0.6, 0.25, 0.7], [0.6, 0.25, 0.7], [-0.3, -0.35, 0.65], [0.35, -0.3, 0.65]]) {
    ctx.moveTo(x + dx * crown + rr * crown * 0.75, yBase - h + dy * crown);
    ctx.arc(x + dx * crown, yBase - h + dy * crown, rr * crown * 0.75, 0, Math.PI * 2);
  }
  ctx.fill();
  // монеты-плоды
  const fruit = Math.floor(18 * Math.max(0, (k - 0.45) / 0.55));
  for (let i = 0; i < fruit; i++) {
    const ang = i * 2.4, rr = crown * (0.25 + 0.55 * ((i * 37) % 10) / 10);
    const fx = x + Math.cos(ang) * rr, fy = yBase - h + Math.sin(ang) * rr * 0.7;
    const gg = ctx.createRadialGradient(fx - 4, fy - 4, 1, fx, fy, 14 * scale);
    gg.addColorStop(0, "#fff3b0"); gg.addColorStop(1, "#c9961a");
    ctx.beginPath(); ctx.arc(fx, fy, 13 * scale, 0, Math.PI * 2); ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = EDGE; ctx.lineWidth = 2; ctx.stroke();
  }
}

// Столб/колонна с подписью
export function pillar(ctx, x, yBase, w, h, fill = "#d0d0d0") {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, "#5a5a5a"); g.addColorStop(0.4, fill); g.addColorStop(1, "#4a4a4a");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x - w / 2, yBase - h, w, h, [w * 0.5, w * 0.5, 0, 0]); ctx.fill();
}

// Скала (обрыв) — платформа с вертикальной стеной
export function ledge(ctx, x1, x2, y, depth = 700) {
  const g = ctx.createLinearGradient(0, y, 0, y + depth);
  g.addColorStop(0, "#8a8a8a"); g.addColorStop(1, "rgba(40,40,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x1, y, x2 - x1, depth);
  ctx.fillStyle = "#d8d8d8"; ctx.fillRect(x1, y - 2, x2 - x1, 4);
}
