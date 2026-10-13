// ============================================================================
//  Рыночные данные для бумажной торговли: часовые свечи Kraken (пары к евро,
//  без ключа; Binance для серверов в США закрыт) и индикаторы.
// ============================================================================

export const ASSETS = [
  { sym: "BTC", pair: "XBTEUR", name: "Bitcoin" },
  { sym: "ETH", pair: "ETHEUR", name: "Ethereum" },
  { sym: "SOL", pair: "SOLEUR", name: "Solana" },
  { sym: "XRP", pair: "XRPEUR", name: "XRP" },
];

// Часовые свечи: [{ t (мс), o, h, l, c, v }] — до 720 штук (30 дней)
export async function candles(pair, interval = 60) {
  const res = await fetch(`https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Kraken ${res.status}`);
  const j = await res.json();
  if (j.error?.length) throw new Error(`Kraken: ${j.error.join(", ")}`);
  const key = Object.keys(j.result).find((k) => k !== "last");
  return j.result[key].map((r) => ({ t: r[0] * 1000, o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[6] }));
}

export function ema(xs, n) {
  const k = 2 / (n + 1), out = new Array(xs.length);
  let e = xs[0];
  xs.forEach((x, i) => { e = i === 0 ? x : x * k + e * (1 - k); out[i] = e; });
  return out;
}

export function rsi(xs, n = 14) {
  const out = new Array(xs.length).fill(50);
  let g = 0, l = 0;
  for (let i = 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up / n; l += dn / n; } else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; }
    if (i >= n) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}

// Индикаторы по всей истории (для бэктеста и для текущего снимка)
export function indicators(cs) {
  const close = cs.map((c) => c.c);
  return { t: cs.map((c) => c.t), close, ema20: ema(close, 20), ema50: ema(close, 50), ema100: ema(close, 100), rsi: rsi(close, 14) };
}

const pct = (a, b) => (b ? (a / b - 1) * 100 : 0);

// Снимок рынка по одной монете в момент i
export function snapAt(ind, i) {
  const c = ind.close;
  return {
    price: c[i],
    ema20: ind.ema20[i],
    ema50: ind.ema50[i],
    ema100: ind.ema100[i],
    rsi: ind.rsi[i],
    ch1h: pct(c[i], c[i - 1]),
    ch24h: pct(c[i], c[Math.max(0, i - 24)]),
    ch7d: pct(c[i], c[Math.max(0, i - 168)]),
    t: ind.t[i],
  };
}

// Текущий рынок: { BTC: { price, ema20, …, ind } … }
export async function market() {
  const out = {};
  await Promise.all(ASSETS.map(async (a) => {
    const ind = indicators(await candles(a.pair));
    out[a.sym] = { ...snapAt(ind, ind.close.length - 1), ind };
  }));
  return out;
}

export const prices = (snap) => Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.price]));
