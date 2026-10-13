// ============================================================================
//  Кто решает, что покупать и продавать.
//  • ai — ИИ (тот же ключ, что для сценариев) раз в цикл смотрит на рынок и
//    портфель и принимает решения с объяснением одной фразой;
//  • rules — понятная механическая стратегия по тренду (EMA 50/100 + RSI).
//  Жёсткие правила риска работают всегда, что бы ни решил ИИ:
//  стоп-лосс −8% от цены входа, трейлинг-стоп −6% от пика после +4%,
//  не больше 35% капитала в одной монете, минимум 5% кэша, заявка от 20 €.
// ============================================================================

import { chat, LLM_PROVIDER } from "../llm.js";
import { buy, sell, equityOf } from "./portfolio.js";
import { ASSETS } from "./market.js";

export const LIMITS = { maxPos: 0.35, cashFloor: 0.05, minOrder: 20, stop: 0.08, trailFrom: 0.04, trail: 0.06, maxPositions: 3, size: 0.3 };

const px = (snap) => Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.price]));
const f2 = (x) => Math.round(x * 100) / 100;
const pc = (x) => (Math.round(x * 10) / 10).toLocaleString("ru-RU");

// Стопы — всегда, до любой стратегии
export function riskExits(st, snap) {
  const out = [];
  for (const [sym, p] of Object.entries(st.positions)) {
    const price = snap[sym]?.price;
    if (!price) continue;
    if (price <= p.avg * (1 - LIMITS.stop)) out.push({ action: "sell", symbol: sym, fraction: 1, reason: `стоп-лосс: цена упала на ${pc((1 - price / p.avg) * 100)}% от входа` });
    else if (p.peak >= p.avg * (1 + LIMITS.trailFrom) && price <= p.peak * (1 - LIMITS.trail)) out.push({ action: "sell", symbol: sym, fraction: 1, reason: `трейлинг-стоп: −${pc((1 - price / p.peak) * 100)}% от пика, фиксирую прибыль` });
  }
  return out;
}

// Механическая стратегия по тренду (медленный фильтр: меньше сделок и комиссий)
export function rulesDecide(st, snap) {
  const d = [];
  for (const sym of Object.keys(st.positions)) {
    const s = snap[sym];
    if (s && s.ema50 < s.ema100 && s.price < s.ema50) d.push({ action: "sell", symbol: sym, fraction: 1, reason: "тренд развернулся вниз: EMA50 ниже EMA100, цена под EMA50" });
  }
  const held = Object.keys(st.positions).length - d.length;
  const eq = equityOf(st, px(snap));
  const cands = ASSETS.map((a) => a.sym)
    .filter((sym) => !st.positions[sym] && snap[sym])
    .filter((sym) => { const s = snap[sym]; return s.ema50 > s.ema100 && s.price > s.ema50 && s.rsi < 70 && s.ch7d > 0; })
    .sort((a, b) => snap[b].ch7d - snap[a].ch7d);
  cands.slice(0, Math.max(0, LIMITS.maxPositions - held)).forEach((sym) => {
    d.push({ action: "buy", symbol: sym, eur: eq * LIMITS.size, reason: `устойчивый рост: EMA50 выше EMA100, за неделю +${pc(snap[sym].ch7d)}%, RSI ${Math.round(snap[sym].rsi)}` });
  });
  return d;
}

// Решение ИИ
export async function aiDecide(st, snap) {
  const eq = equityOf(st, px(snap));
  const market = Object.fromEntries(Object.entries(snap).map(([k, s]) => [k, {
    price: f2(s.price), ch1h: f2(s.ch1h), ch24h: f2(s.ch24h), ch7d: f2(s.ch7d), rsi14: Math.round(s.rsi),
    trend_short: s.ema20 > s.ema50 ? "up" : "down", trend_long: s.ema50 > s.ema100 ? "up" : "down", vsEma50_pct: f2((s.price / s.ema50 - 1) * 100),
  }]));
  const portfolio = {
    equity_eur: f2(eq), cash_eur: f2(st.cash), start_eur: st.start,
    positions: Object.fromEntries(Object.entries(st.positions).map(([k, p]) => [k, { value_eur: f2(p.qty * snap[k].price), entry: f2(p.avg), pnl_pct: f2((snap[k].price / p.avg - 1) * 100) }])),
    recent_trades: st.trades.slice(-6).map((t) => `${new Date(t.t).toISOString().slice(0, 16)} ${t.side} ${t.sym} ${f2(t.eur)}€ @${f2(t.price)}`),
  };
  const system = `You are a disciplined crypto swing trader managing a PAPER (virtual) portfolio in EUR on hourly data. Goal: grow equity steadily and beat simply holding BTC, with controlled risk.
Rules you must respect: only ${ASSETS.map((a) => a.sym).join(", ")}; max 35% of equity per coin; keep at least 5% cash; min order 20 EUR; every trade costs ~0.3% (so avoid overtrading — at most 2 trades per hour, and "no trades" is often the right answer); hard stop-loss −8% and trailing stop are applied automatically by the engine.
Answer JSON only: {"view":"1-2 sentences on the market in Russian","decisions":[{"action":"buy"|"sell","symbol":"BTC","eur":100,"fraction":1,"reason":"one short sentence in Russian"}]}. For buy give "eur", for sell give "fraction" (0-1). Empty decisions = hold.`;
  const raw = await chat({ system, user: JSON.stringify({ time: new Date().toISOString(), market, portfolio }), json: true, maxTokens: 700, temperature: 0.3 });
  const m = String(raw).replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
  const j = JSON.parse(m ? m[0] : raw);
  return { view: String(j.view || "").slice(0, 400), decisions: Array.isArray(j.decisions) ? j.decisions.slice(0, 3) : [] };
}

export const aiAvailable = () => Boolean(LLM_PROVIDER);

// Исполнение решений с проверкой лимитов. Возвращает список сделок.
export function execute(st, decisions, snap, t = Date.now()) {
  const done = [];
  const prices = px(snap);
  const sells = decisions.filter((x) => x?.action === "sell");
  const buys = decisions.filter((x) => x?.action === "buy");
  for (const d of sells) {
    const sym = String(d.symbol || "").toUpperCase();
    if (!st.positions[sym] || !snap[sym]) continue;
    const tr = sell(st, sym, Number.isFinite(+d.fraction) ? +d.fraction : 1, snap[sym].price, String(d.reason || "продажа").slice(0, 200), t);
    if (tr) done.push(tr);
  }
  for (const d of buys) {
    const sym = String(d.symbol || "").toUpperCase();
    if (!snap[sym]) continue;
    const eq = equityOf(st, prices);
    const holding = st.positions[sym] ? st.positions[sym].qty * snap[sym].price : 0;
    if (!st.positions[sym] && Object.keys(st.positions).length >= LIMITS.maxPositions) continue;
    const room = Math.min(eq * LIMITS.maxPos - holding, st.cash - eq * LIMITS.cashFloor);
    const eur = Math.min(+d.eur || 0, room);
    if (!(eur >= LIMITS.minOrder)) continue;
    const tr = buy(st, sym, eur, snap[sym].price, String(d.reason || "покупка").slice(0, 200), t);
    if (tr) done.push(tr);
  }
  return done;
}
