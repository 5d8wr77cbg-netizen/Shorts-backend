// График капитала для Telegram: портфель бота (золото) против «купить BTC и держать» (серый)
import { createCanvas } from "@napi-rs/canvas";

export function equityChart(st, { title = "Бумажный портфель", btcNow } = {}) {
  const W = 1000, H = 560, L = 80, R = 30, T = 70, B = 60;
  const c = createCanvas(W, H), x = c.getContext("2d");
  x.fillStyle = "#0b0d12"; x.fillRect(0, 0, W, H);
  const pts = st.equity.length > 1 ? st.equity : [[st.startedAt, st.start], [Date.now(), st.equity.at(-1)?.[1] ?? st.start]];
  const t0 = pts[0][0], t1 = Math.max(pts.at(-1)[0], t0 + 1);
  // «держать BTC»: линейно между стартом и сейчас нельзя — нужна история цен; берём
  // точки из st.btcCurve, если есть (заполняется циклами), иначе только конечную
  const btc = (st.btcCurve || []).filter((p) => p[0] >= t0);
  const vals = [...pts.map((p) => p[1]), ...btc.map((p) => p[1]), st.start];
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.12, st.start * 0.01);
  lo -= pad; hi += pad;
  const X = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  // сетка
  x.strokeStyle = "rgba(255,255,255,0.07)"; x.lineWidth = 1; x.font = "18px sans-serif"; x.fillStyle = "#8b93a1"; x.textAlign = "right";
  for (let k = 0; k <= 4; k++) {
    const v = lo + ((hi - lo) * k) / 4, y = Y(v);
    x.beginPath(); x.moveTo(L, y); x.lineTo(W - R, y); x.stroke();
    x.fillText(`${Math.round(v).toLocaleString("ru-RU")} €`, L - 10, y + 6);
  }
  // линия старта
  x.setLineDash([6, 6]); x.strokeStyle = "rgba(255,255,255,0.25)";
  x.beginPath(); x.moveTo(L, Y(st.start)); x.lineTo(W - R, Y(st.start)); x.stroke(); x.setLineDash([]);
  const line = (arr, color, w) => {
    if (arr.length < 2) return;
    x.strokeStyle = color; x.lineWidth = w; x.lineJoin = "round";
    x.beginPath(); arr.forEach(([t, v], i) => (i ? x.lineTo(X(t), Y(v)) : x.moveTo(X(t), Y(v)))); x.stroke();
  };
  line(btc, "#7d8590", 2.5);
  line(pts, "#E8C33A", 4);
  // подписи
  const last = pts.at(-1)[1], pnl = (last / st.start - 1) * 100;
  x.textAlign = "left"; x.font = "bold 26px sans-serif"; x.fillStyle = "#fff";
  x.fillText(title, L, 42);
  x.font = "bold 26px sans-serif"; x.fillStyle = pnl >= 0 ? "#3ecf6e" : "#ff5a5a"; x.textAlign = "right";
  const ru = (v) => v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  x.fillText(`${ru(last)} €  (${pnl >= 0 ? "+" : "−"}${ru(Math.abs(pnl))}%)`, W - R, 42);
  x.font = "18px sans-serif"; x.textAlign = "left";
  x.fillStyle = "#E8C33A"; x.fillText("— бот", L, H - 22);
  if (btc.length > 1) { x.fillStyle = "#7d8590"; x.fillText("— просто держать BTC", L + 90, H - 22); }
  const fmt = (t) => new Date(t).toISOString().slice(5, 10).split("-").reverse().join(".");
  x.textAlign = "right"; x.fillStyle = "#8b93a1"; x.fillText(`${fmt(t0)} — ${fmt(t1)}`, W - R, H - 22);
  return c.toBuffer("image/png");
}
