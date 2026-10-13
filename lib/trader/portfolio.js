// ============================================================================
//  Бумажный портфель: виртуальные евро, сделки по рыночной цене с комиссией
//  Kraken (0,26%) и небольшим проскальзыванием. Никаких настоящих денег.
// ============================================================================

export const FEE = 0.0026 + 0.0005; // комиссия тейкера + проскальзывание

export function newState(amount = 1000, prices = {}) {
  return {
    version: 1,
    startedAt: Date.now(),
    start: amount,
    cash: amount,
    positions: {},          // sym → { qty, avg, peak, openedAt }
    trades: [],             // { t, side, sym, qty, price, eur, fee, pnl?, reason }
    equity: [[Date.now(), amount]],
    bench: { ...prices },   // цены на старте — для сравнения «просто купить и держать»
    mode: null,             // "ai" | "rules" (null — по умолчанию)
    paused: false,
    lastCycle: 0,
    lastDaily: "",
    view: "",
  };
}

export function equityOf(st, px) {
  let v = st.cash;
  for (const [s, p] of Object.entries(st.positions)) v += p.qty * (px[s] ?? p.avg);
  return v;
}

export function buy(st, sym, eur, price, reason, t = Date.now()) {
  eur = Math.min(eur, st.cash);
  if (!(eur >= 1) || !(price > 0)) return null;
  const fee = eur * FEE, qty = (eur - fee) / price;
  const p = st.positions[sym] || { qty: 0, avg: 0, peak: price, openedAt: t };
  p.avg = (p.avg * p.qty + price * qty) / (p.qty + qty);
  p.qty += qty;
  p.peak = Math.max(p.peak, price);
  st.positions[sym] = p;
  st.cash -= eur;
  const tr = { t, side: "buy", sym, qty, price, eur, fee, reason };
  st.trades.push(tr);
  return tr;
}

export function sell(st, sym, fraction, price, reason, t = Date.now()) {
  const p = st.positions[sym];
  if (!p || !(price > 0)) return null;
  fraction = Math.min(Math.max(fraction, 0), 1);
  const qty = fraction > 0.98 ? p.qty : p.qty * fraction;
  if (!(qty > 0)) return null;
  const gross = qty * price, fee = gross * FEE, eur = gross - fee;
  const pnl = eur - qty * p.avg;
  p.qty -= qty;
  if (p.qty * price < 0.5) delete st.positions[sym];
  st.cash += eur;
  const tr = { t, side: "sell", sym, qty, price, eur, fee, pnl, reason };
  st.trades.push(tr);
  return tr;
}

// Обновить пики (для трейлинг-стопа) и записать точку кривой капитала
export function mark(st, px, t = Date.now()) {
  for (const [s, p] of Object.entries(st.positions)) if (px[s]) p.peak = Math.max(p.peak, px[s]);
  st.equity.push([t, equityOf(st, px)]);
  // кривая «купить BTC на старте и держать» — для сравнения на графике
  if (st.bench?.BTC && px.BTC) (st.btcCurve ||= []).push([t, st.start * (px.BTC / st.bench.BTC)]);
  const thin = (a) => (a.length > 3000 ? a.filter((_, i) => i % 2 === 0 || i > a.length - 500) : a);
  st.equity = thin(st.equity);
  if (st.btcCurve) st.btcCurve = thin(st.btcCurve);
  if (st.trades.length > 1000) st.trades = st.trades.slice(-1000);
}

export function stats(st, px) {
  const eq = equityOf(st, px);
  const sells = st.trades.filter((t) => t.side === "sell");
  const wins = sells.filter((t) => t.pnl > 0).length;
  const realized = sells.reduce((a, t) => a + t.pnl, 0);
  const fees = st.trades.reduce((a, t) => a + t.fee, 0);
  const bench = st.bench?.BTC && px.BTC ? (px.BTC / st.bench.BTC - 1) * 100 : null;
  // максимальная просадка по кривой капитала
  let peak = -Infinity, dd = 0;
  for (const [, v] of st.equity) { peak = Math.max(peak, v); dd = Math.min(dd, v / peak - 1); }
  return {
    equity: eq,
    pnl: eq - st.start,
    pnlPct: (eq / st.start - 1) * 100,
    cash: st.cash,
    positions: Object.entries(st.positions).map(([sym, p]) => ({ sym, qty: p.qty, avg: p.avg, price: px[sym], value: p.qty * (px[sym] ?? p.avg), pnlPct: px[sym] ? (px[sym] / p.avg - 1) * 100 : 0 })),
    trades: st.trades.length,
    closed: sells.length,
    wins,
    winRate: sells.length ? (wins / sells.length) * 100 : null,
    realized,
    fees,
    benchBtcPct: bench,
    maxDD: dd * 100,
    days: (Date.now() - st.startedAt) / 86400000,
  };
}
