// ============================================================================
//  Текст внутри кадра: подписи у предметов и над панелями, крупные слова.
//  Цвета-акценты как у конкурента: золото — успех и деньги, красный — проблемы,
//  зелёный — рост. Всё остальное — белое и серое.
// ============================================================================

export const ACCENT = {
  white: "#F2F2F2",
  grey: "#8A8A8A",
  gold: "#E8C33A",
  red: "#E0383B",
  green: "#3DDC6F",
  blue: "#6E8BE0",
};

export const color = (c) => ACCENT[c] || c || ACCENT.white;

const FONT = process.env.CAPTION_FONT || "Inter";

// Подпись. alpha — для плавного появления; glow — свечение (для SUCCESS и т.п.)
export function label(ctx, text, x, y, o = {}) {
  if (!text) return;
  const size = o.size ?? 34;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.font = `${o.weight ?? 500} ${size}px ${FONT}`;
  ctx.textAlign = o.align ?? "center";
  ctx.textBaseline = o.baseline ?? "middle";
  ctx.fillStyle = color(o.color);
  if (o.glow) {
    ctx.shadowColor = color(o.color);
    ctx.shadowBlur = size * 0.8;
  }
  const lines = String(text).split("\n");
  lines.forEach((ln, i) => {
    const ly = y + (i - (lines.length - 1) / 2) * size * 1.2;
    if (o.stroke) { ctx.lineWidth = size * 0.16; ctx.strokeStyle = o.stroke; ctx.lineJoin = "round"; ctx.strokeText(ln, x, ly); }
    ctx.fillText(ln, x, ly);
  });
  ctx.restore();
}

// Ширина текста (для подгонки размера)
export function measure(ctx, text, size = 34, weight = 500) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  const w = ctx.measureText(String(text)).width;
  ctx.restore();
  return w;
}

// Подбирает размер шрифта, чтобы текст влез в ширину
export function fitSize(ctx, text, maxW, size = 34, weight = 500) {
  let s = size;
  while (s > 14 && measure(ctx, text, s, weight) > maxW) s -= 2;
  return s;
}
