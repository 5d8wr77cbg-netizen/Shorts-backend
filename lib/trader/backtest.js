// ============================================================================
//  Бэктест: прогон механической стратегии по последним 30 дням часовых свечей,
//  чтобы сразу увидеть, как она торговала бы с 1000 € (ИИ так не прогоняем —
//  это сотни платных запросов).
// ============================================================================

import { ASSETS, candles, indicators, snapAt } from "./market.js";
import { newState, mark, stats } from "./portfolio.js";
import { riskExits, rulesDecide, execute } from "./strategy.js";

export async function backtest(amount = 1000, decide = rulesDecide) {
  const inds = {};
  await Promise.all(ASSETS.map(async (a) => { inds[a.sym] = indicators(await candles(a.pair)); }));
  const n = Math.min(...Object.values(inds).map((x) => x.close.length));
  const at = (i) => Object.fromEntries(Object.entries(inds).map(([s, ind]) => [s, snapAt(ind, ind.close.length - n + i)]));
  const warm = 110; // первые свечи — разогрев индикаторов (EMA100)
  const first = at(warm);
  const st = newState(amount, Object.fromEntries(Object.entries(first).map(([k, v]) => [k, v.price])));
  st.startedAt = first.BTC.t;
  st.equity = [[first.BTC.t, amount]];
  for (let i = warm; i < n; i++) {
    const snap = at(i), t = snap.BTC.t;
    const px = Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.price]));
    mark(st, px, t);
    execute(st, riskExits(st, snap), snap, t);
    execute(st, decide(st, snap), snap, t);
  }
  const last = at(n - 1);
  const px = Object.fromEntries(Object.entries(last).map(([k, v]) => [k, v.price]));
  const s = stats(st, px);
  s.days = (last.BTC.t - st.startedAt) / 86400000;
  return { st, stats: s, px };
}
