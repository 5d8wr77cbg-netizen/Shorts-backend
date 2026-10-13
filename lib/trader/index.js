// ============================================================================
//  Бумажный трейдер в Telegram: виртуальные 1000 €, настоящие цены Kraken,
//  решения ИИ (или правил) раз в час, каждая сделка и итог дня — в чат.
//  Команды: /status /trades /chart /now /backtest /mode /pause /resume /reset
//  Любой другой текст — вопрос боту («почему купил BTC?»).
//  Состояние: data/trader.json + копия закреплённым файлом в чате (после
//  перезапуска сервера бот восстанавливается из неё, если задан TELEGRAM_CHAT_ID).
// ============================================================================

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { tg, send, sendPhoto, sendDocument, downloadFile, esc, tgEnabled } from "./telegram.js";
import { market, prices } from "./market.js";
import { newState, mark, stats } from "./portfolio.js";
import { riskExits, rulesDecide, aiDecide, execute, aiAvailable, LIMITS } from "./strategy.js";
import { backtest } from "./backtest.js";
import { equityChart } from "./chart.js";
import { chat } from "../llm.js";

const DATA = process.env.TRADER_DATA || path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA, "trader.json");
const CHAT_PATH = path.join(DATA, "trader_chat.json");
const INTERVAL = Math.max(5, +process.env.TRADER_INTERVAL_MIN || 60) * 60000;
const START = +process.env.TRADER_START_EUR || 1000;
const TZ = process.env.TRADER_TZ || "Europe/Berlin";
const DAILY_HOUR = process.env.TRADER_DAILY_HOUR ? +process.env.TRADER_DAILY_HOUR : 21;
const ACCESS = process.env.ACCESS_CODE || "";

let st = null;
let chatId = process.env.TELEGRAM_CHAT_ID || null;
let busy = false;

// ── Форматирование ─────────────────────────────────────────────────────────
const eur = (v) => `${(+v).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const price = (v) => `${(+v).toLocaleString("ru-RU", { maximumFractionDigits: v < 10 ? 4 : 2 })} €`;
const sgn = (v, d = 2) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const mode = () => st?.mode || (aiAvailable() ? "ai" : "rules");
const MODE_NAME = { ai: "ИИ решает сам", rules: "правила (тренд EMA50/100)" };
function local(t = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, hm: `${p.hour}:${p.minute}`, dm: `${p.day}.${p.month}` };
}

// ── Состояние ──────────────────────────────────────────────────────────────
function saveLocal() {
  try { fs.mkdirSync(DATA, { recursive: true }); if (st) fs.writeFileSync(STATE_PATH, JSON.stringify(st)); if (chatId) fs.writeFileSync(CHAT_PATH, JSON.stringify({ chatId })); }
  catch (e) { console.warn("trader save:", e.message); }
}

async function load() {
  try { st = JSON.parse(fs.readFileSync(STATE_PATH, "utf8")); } catch { st = null; }
  try { chatId ||= JSON.parse(fs.readFileSync(CHAT_PATH, "utf8")).chatId; } catch { /* нет */ }
  if (!st && chatId) {
    // после перезапуска сервера: восстанавливаемся из закреплённого файла в чате
    try {
      const c = await tg("getChat", { chat_id: chatId });
      const doc = c.pinned_message?.document;
      if (doc?.file_name === "portfolio.json") { st = JSON.parse((await downloadFile(doc.file_id)).toString("utf8")); st.backupMsg = c.pinned_message.message_id; console.log("trader: состояние восстановлено из Telegram"); }
    } catch (e) { console.warn("trader restore:", e.message); }
  }
}

async function backup() {
  if (!chatId || !st) return;
  const prev = st.backupMsg;
  const m = await sendDocument(chatId, Buffer.from(JSON.stringify(st)), "portfolio.json", {
    caption: "💾 Сохранение портфеля — не удаляй: из него бот восстановится после перезапуска сервера", disable_notification: true,
  });
  st.backupMsg = m.message_id;
  await tg("pinChatMessage", { chat_id: chatId, message_id: m.message_id, disable_notification: true }).catch(() => {});
  if (prev) await tg("deleteMessage", { chat_id: chatId, message_id: prev }).catch(() => {});
  saveLocal();
}

// ── Сообщения ──────────────────────────────────────────────────────────────
function tradesText(trades, view) {
  const lines = trades.map((t) => t.side === "buy"
    ? `🟢 <b>Купил ${t.sym}</b> на ${eur(t.eur)} по ${price(t.price)}\n<i>${esc(t.reason)}</i>`
    : `🔴 <b>Продал ${t.sym}</b> на ${eur(t.eur)} по ${price(t.price)} · ${t.pnl >= 0 ? "прибыль" : "убыток"} ${sgn(t.pnl)} €\n<i>${esc(t.reason)}</i>`);
  return [...lines, ...(view ? [`\n🧠 ${esc(view)}`] : [])].join("\n\n");
}

function statusText(px) {
  const s = stats(st, px);
  const pos = s.positions.length
    ? s.positions.map((p) => `• ${p.sym}: ${eur(p.value)} (${sgn(p.pnlPct)}%) — вход ${price(p.avg)}, сейчас ${price(p.price)}`).join("\n")
    : "• позиций нет, всё в кэше";
  return [
    `💼 <b>Бумажный портфель</b> · ${MODE_NAME[mode()]}${st.paused ? " · ⏸ пауза" : ""}`,
    ``,
    `Капитал: <b>${eur(s.equity)}</b> (${sgn(s.pnlPct)}%, ${sgn(s.pnl)} €)`,
    s.benchBtcPct !== null ? `Если бы просто купил BTC: ${sgn(s.benchBtcPct)}%` : "",
    `Кэш: ${eur(s.cash)}`,
    ``,
    pos,
    ``,
    `Сделок: ${s.trades} · закрыто: ${s.closed}${s.winRate !== null ? ` · в плюс: ${Math.round(s.winRate)}%` : ""}`,
    `Комиссии: ${eur(s.fees)} · макс. просадка: ${s.maxDD.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`,
    `Работает: ${s.days < 1 ? `${Math.round(s.days * 24)} ч` : `${s.days.toFixed(1)} дн.`} · старт ${eur(st.start)}`,
    st.view ? `\n🧠 ${esc(st.view)}` : "",
  ].filter((x) => x !== "").join("\n").replace(/\n{3,}/g, "\n\n");
}

const HELP = `🤖 <b>Бумажный трейдер</b> — торгует виртуальными ${eur(START)} по настоящим ценам Kraken (BTC, ETH, SOL, XRP). Настоящих денег нет.

Раз в ${Math.round(INTERVAL / 60000)} мин он смотрит на рынок и решает, что делать. Каждую сделку присылает сюда с объяснением, а в ${DAILY_HOUR}:00 — итог дня с графиком.

/status — портфель и результат
/trades — последние сделки
/chart — график: бот против «просто держать BTC»
/now — проверить рынок прямо сейчас
/backtest — как правила торговали бы последние 30 дней
/mode ai | rules — кто решает: ИИ или правила
/pause · /resume — пауза
/reset — начать заново с ${eur(START)} (/reset 500 — с другой суммой)

Можно просто спросить: «почему купил BTC?» или «что думаешь о рынке?»`;

// ── Цикл торговли ──────────────────────────────────────────────────────────
async function cycle({ manual = false } = {}) {
  if (busy) return { busy: true };
  busy = true;
  try {
    const snap = await market();
    const px = prices(snap);
    if (!st) st = newState(START, px);
    if (!st.bench?.BTC) st.bench = { ...px };
    mark(st, px);
    if (st.paused) { st.lastCycle = Date.now(); saveLocal(); if (manual && chatId) await send(chatId, "⏸ Бот на паузе. /resume — продолжить."); return { paused: true }; }
    let trades = execute(st, riskExits(st, snap), snap);
    let view = "";
    if (mode() === "ai") {
      try { const r = await aiDecide(st, snap); view = r.view; trades = trades.concat(execute(st, r.decisions, snap)); }
      catch (e) { console.warn("trader ai:", e.message); trades = trades.concat(execute(st, rulesDecide(st, snap), snap)); view = "ИИ сейчас недоступен — в этот час решали правила."; }
    } else trades = trades.concat(execute(st, rulesDecide(st, snap), snap));
    if (view) st.view = view;
    st.lastCycle = Date.now();
    saveLocal();
    if (chatId) {
      if (trades.length) {
        const s = stats(st, px);
        await send(chatId, `${tradesText(trades, view)}\n\nКапитал: <b>${eur(s.equity)}</b> (${sgn(s.pnlPct)}%)`);
        await backup().catch((e) => console.warn("trader backup:", e.message));
      } else if (manual) await send(chatId, `👀 Проверил рынок — сделок нет, держу как есть.${view ? `\n\n🧠 ${esc(view)}` : ""}\n\n${statusText(px)}`);
      await daily(px);
    }
    return { trades: trades.length };
  } finally { busy = false; }
}

async function daily(px) {
  const now = local();
  if (now.hour < DAILY_HOUR || st.lastDaily === now.date) return;
  st.lastDaily = now.date;
  const s = stats(st, px);
  const dayAgo = st.equity.find(([t]) => t >= Date.now() - 86400000)?.[1] ?? st.start;
  const today = st.trades.filter((t) => t.t >= Date.now() - 86400000).length;
  await sendPhoto(chatId, equityChart(st, { title: `Итог дня · ${now.dm}` }),
    `📊 <b>Итог дня</b>\nКапитал: <b>${eur(s.equity)}</b> · за день ${sgn((s.equity / dayAgo - 1) * 100)}% · всего ${sgn(s.pnlPct)}%` +
    (s.benchBtcPct !== null ? `\nПросто держать BTC: ${sgn(s.benchBtcPct)}%` : "") + `\nСделок за день: ${today}`);
  await backup().catch(() => {});
}

// ── Команды ────────────────────────────────────────────────────────────────
async function handle(update) {
  const msg = update.message;
  if (!msg?.text) return;
  const from = msg.chat.id, text = msg.text.trim();
  const [raw, ...args] = text.split(/\s+/);
  const cmd = raw.toLowerCase().replace(/@\w+$/, "");

  if (cmd === "/start") {
    const codeOk = !ACCESS || args[0] === ACCESS;
    if (chatId && String(chatId) === String(from)) return send(from, HELP);
    if (!codeOk) return send(from, "🔒 Это личный бот. Отправь: <code>/start КОД</code> — код доступа со страницы «Сделать ролик».");
    chatId = from;
    saveLocal();
    await send(from, `${HELP}\n\n✅ Чат привязан. Твой chat id: <code>${from}</code>\nДобавь его в Render → Environment как <code>TELEGRAM_CHAT_ID</code> — тогда портфель не потеряется после перезапуска сервера.`);
    if (!st) await cycle({ manual: true }).catch((e) => send(from, `Не смог получить цены: ${esc(e.message)}`));
    return;
  }
  if (!chatId || String(from) !== String(chatId)) return send(from, "🔒 Сначала отправь <code>/start КОД</code>.");

  const needState = async () => { if (!st) await cycle(); return st; };
  const curPx = async () => prices(await market());

  switch (cmd) {
    case "/help": return send(from, HELP);
    case "/status": case "/s": case "статус": { await needState(); return send(from, statusText(await curPx())); }
    case "/trades": {
      await needState();
      const last = st.trades.slice(-10).reverse();
      if (!last.length) return send(from, "Сделок пока не было — бот ждёт хорошего момента.");
      return send(from, "🧾 <b>Последние сделки</b>\n\n" + last.map((t) => `${local(t.t).dm} ${local(t.t).hm} ${t.side === "buy" ? "🟢 купил" : "🔴 продал"} <b>${t.sym}</b> ${eur(t.eur)} по ${price(t.price)}${t.side === "sell" ? ` · ${sgn(t.pnl)} €` : ""}\n<i>${esc(t.reason)}</i>`).join("\n\n"));
    }
    case "/chart": { await needState(); mark(st, await curPx()); saveLocal(); return sendPhoto(from, equityChart(st)); }
    case "/now": { await send(from, "⏳ Смотрю на рынок…"); return cycle({ manual: true }); }
    case "/backtest": {
      await send(from, "⏳ Прогоняю правила по последним 30 дням…");
      const r = await backtest(START);
      const s = r.stats;
      return sendPhoto(from, equityChart(r.st, { title: "Бэктест: правила, последние 30 дней" }),
        `🧪 <b>Бэктест за ${s.days.toFixed(0)} дн.</b> (правила, не ИИ)\nИтог: <b>${eur(s.equity)}</b> (${sgn(s.pnlPct)}%)\nПросто держать BTC: ${sgn(s.benchBtcPct)}%\nСделок: ${s.trades} · в плюс: ${s.winRate !== null ? Math.round(s.winRate) : 0}% · комиссии ${eur(s.fees)} · макс. просадка ${s.maxDD.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%\n\n<i>Прошлое не гарантирует будущего.</i>`);
    }
    case "/mode": {
      await needState();
      const m = (args[0] || "").toLowerCase();
      if (m !== "ai" && m !== "rules") return send(from, `Сейчас: ${MODE_NAME[mode()]}.\n/mode ai — решает ИИ\n/mode rules — решают правила`);
      if (m === "ai" && !aiAvailable()) return send(from, "ИИ недоступен: на сервере нет ключа OpenAI/Gemini.");
      st.mode = m; saveLocal();
      return send(from, `Готово: ${MODE_NAME[m]}.`);
    }
    case "/pause": { await needState(); st.paused = true; saveLocal(); return send(from, "⏸ Пауза. Сделок не будет до /resume."); }
    case "/resume": { await needState(); st.paused = false; saveLocal(); return send(from, "▶️ Продолжаю торговать."); }
    case "/reset": {
      const amount = +args[0] > 0 ? Math.min(+args[0], 1e7) : START;
      st = newState(amount, await curPx());
      st.mode = null;
      saveLocal();
      await backup().catch(() => {});
      return send(from, `🔄 Начинаю заново с ${eur(amount)}.`);
    }
    default: {
      if (cmd.startsWith("/")) return send(from, HELP);
      await needState();
      if (!aiAvailable()) return send(from, `Отвечать на вопросы я умею только с ключом ИИ.\n\n${HELP}`);
      const px = await curPx();
      const s = stats(st, px);
      const answer = await chat({
        system: "Ты — бот, который ведёт БУМАЖНЫЙ (виртуальный) крипто-портфель в евро и отчитывается владельцу в Telegram. Отвечай по-русски, коротко (до 6 предложений), честно и по делу, опираясь на данные портфеля и сделок. Не обещай доходность и не давай персональных финансовых советов по реальным деньгам.",
        user: JSON.stringify({ question: text, status: s, positions: s.positions, recent_trades: st.trades.slice(-8), market_view: st.view, mode: mode(), limits: LIMITS }),
        maxTokens: 400, temperature: 0.5,
      });
      return send(from, esc(String(answer).trim()));
    }
  }
}

// ── Подключение к серверу ──────────────────────────────────────────────────
export function mountTrader(app) {
  if (!tgEnabled()) return false;
  const secret = crypto.createHash("sha256").update(process.env.TELEGRAM_BOT_TOKEN).digest("hex").slice(0, 32);
  const run = (u) => handle(u).catch((e) => { console.error("trader:", e.message); if (u?.message?.chat?.id) send(u.message.chat.id, `⚠️ Ошибка: ${esc(e.message)}`).catch(() => {}); });

  app.post(`/telegram/${secret}`, (req, res) => {
    if (req.get("X-Telegram-Bot-Api-Secret-Token") !== secret) return res.sendStatus(403);
    res.sendStatus(200);
    run(req.body);
  });
  // «будильник»: внешний cron (cron-job.org) дёргает раз в 10–15 мин,
  // чтобы бесплатный Render не засыпал и цикл шёл по расписанию
  app.get("/api/trader/tick", (req, res) => {
    if (ACCESS && req.query.key !== ACCESS) return res.status(403).json({ error: "Нужен ?key=КОД" });
    const due = Date.now() - (st?.lastCycle || 0) >= INTERVAL * 0.95;
    if (due) cycle().catch((e) => console.error("trader cycle:", e.message));
    res.json({ ok: true, ran: due, lastCycle: st?.lastCycle || null });
  });

  (async () => {
    await load();
    const base = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
    await tg("setMyCommands", { commands: [
      ["status", "портфель и результат"], ["trades", "последние сделки"], ["chart", "график"], ["now", "проверить рынок сейчас"],
      ["backtest", "бэктест за 30 дней"], ["mode", "ИИ или правила"], ["pause", "пауза"], ["resume", "продолжить"], ["reset", "начать заново"], ["help", "помощь"],
    ].map(([command, description]) => ({ command, description })) }).catch((e) => console.warn("trader commands:", e.message));
    if (base) {
      await tg("setWebhook", { url: `${base}/telegram/${secret}`, secret_token: secret, allowed_updates: ["message"] });
      console.log("   → Telegram-трейдер: webhook включён");
    } else {
      // локально: long polling
      await tg("deleteWebhook").catch(() => {});
      console.log("   → Telegram-трейдер: long polling");
      let offset = 0;
      (async function poll() {
        for (;;) {
          try {
            const ups = await tg("getUpdates", { offset, timeout: 50, allowed_updates: ["message"] });
            for (const u of ups) { offset = u.update_id + 1; run(u); }
          } catch (e) { console.warn("trader poll:", e.message); await new Promise((r) => setTimeout(r, 5000)); }
        }
      })();
    }
    // расписание: проверяем раз в минуту, пора ли следующий цикл
    setInterval(() => {
      if (chatId && Date.now() - (st?.lastCycle || 0) >= INTERVAL) cycle().catch((e) => console.error("trader cycle:", e.message));
    }, 60000);
  })().catch((e) => console.error("trader start:", e.message));
  return true;
}

// для тестов
export const _test = { handle, cycle, load, get state() { return st; }, set chat(v) { chatId = v; } };
