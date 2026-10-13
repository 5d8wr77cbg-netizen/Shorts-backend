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

function coinBody(ctx, x, y, r, top = "#f2f2f2", side = "#a8a8a8") {
  const h = r * COIN.h, ry = r * COIN.ry;
  // боковина
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, "#7a7a7a"); g.addColorStop(0.35, side); g.addColorStop(1, "#5a5a5a");
  ctx.beginPath();
  ctx.ellipse(x, y, r, ry, 0, 0, Math.PI);
  ctx.lineTo(x - r, y - h);
  ctx.ellipse(x, y - h, r, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.04); ctx.strokeStyle = EDGE; ctx.stroke();
  // верх
  const gt = ctx.createRadialGradient(x - r * 0.3, y - h - ry * 0.4, r * 0.05, x, y - h, r);
  gt.addColorStop(0, "#ffffff"); gt.addColorStop(1, top === "#f2f2f2" ? "#cfcfcf" : top);
  ctx.beginPath(); ctx.ellipse(x, y - h, r, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = gt; ctx.fill(); ctx.stroke();
  // ободок
  ctx.beginPath(); ctx.ellipse(x, y - h, r * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = r * 0.05; ctx.stroke();
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
