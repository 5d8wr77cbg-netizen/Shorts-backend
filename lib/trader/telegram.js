// Минимальный клиент Telegram Bot API (без сторонних библиотек)
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API = `https://api.telegram.org/bot${TOKEN}`;

export const tgEnabled = () => Boolean(TOKEN);

export async function tg(method, params = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(method === "getUpdates" ? 70000 : 20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description || res.status}`);
  return j.result;
}

async function upload(method, field, chatId, buf, filename, extra = {}) {
  const fd = new FormData();
  fd.append("chat_id", String(chatId));
  for (const [k, v] of Object.entries(extra)) fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  fd.append(field, new Blob([buf]), filename);
  const res = await fetch(`${API}/${method}`, { method: "POST", body: fd, signal: AbortSignal.timeout(30000) });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description || res.status}`);
  return j.result;
}

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const send = (chatId, text, extra = {}) => tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
export const sendPhoto = (chatId, png, caption = "") => upload("sendPhoto", "photo", chatId, png, "chart.png", caption ? { caption, parse_mode: "HTML" } : {});
export const sendDocument = (chatId, buf, filename, extra = {}) => upload("sendDocument", "document", chatId, buf, filename, extra);

export async function downloadFile(fileId) {
  const f = await tg("getFile", { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${f.file_path}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Telegram file ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
