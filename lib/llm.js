// ============================================================================
//  Текстовый ИИ: Gemini (бесплатный тариф), Groq (бесплатный план) или OpenAI.
//  Провайдер выбирается по LLM_PROVIDER, иначе — первый, для которого есть ключ:
//    GEMINI_API_KEY → GROQ_API_KEY → OPENAI_API_KEY.
//  Без ключей ИИ выключен: ролики собираются из встроенной библиотеки фраз.
// ============================================================================

import OpenAI from "openai";

const KEYS = {
  gemini: process.env.GEMINI_API_KEY,
  groq: process.env.GROQ_API_KEY,
  openai: process.env.OPENAI_API_KEY,
};

const MODELS = {
  gemini: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  groq: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  openai: process.env.OPENAI_MODEL || "gpt-4o-mini",
};

function pickProvider() {
  const wanted = (process.env.LLM_PROVIDER || "").toLowerCase();
  if (wanted) return KEYS[wanted] ? wanted : null;
  return ["gemini", "groq", "openai"].find((p) => KEYS[p]) || null;
}

export const LLM_PROVIDER = pickProvider();
export const LLM_MODEL = LLM_PROVIDER ? MODELS[LLM_PROVIDER] : null;

export const openai = KEYS.openai ? new OpenAI({ apiKey: KEYS.openai }) : null;
const groq = KEYS.groq ? new OpenAI({ apiKey: KEYS.groq, baseURL: "https://api.groq.com/openai/v1" }) : null;

export class NoKeyError extends Error {
  constructor(what) {
    super(`${what} Добавь ключ в .env (см. README).`);
    this.status = 503;
  }
}

async function gemini({ system, user, json, maxTokens, temperature }) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEYS.gemini },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }
  );
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Gemini: ${data?.error?.message || resp.status}`);
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) throw new Error("Gemini вернул пустой ответ");
  return text;
}

async function openaiCompatible(client, model, { system, user, json, maxTokens, temperature }) {
  const completion = await client.chat.completions.create({
    model,
    ...(json ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: maxTokens,
    temperature,
  });
  return completion.choices[0].message.content || "";
}

// Текстовый ответ от выбранного провайдера
export async function chat({ system, user, json = false, maxTokens = 1500, temperature = 0.9 }) {
  const opts = { system, user, json, maxTokens, temperature };
  switch (LLM_PROVIDER) {
    case "gemini": return gemini(opts);
    case "groq": return openaiCompatible(groq, MODELS.groq, opts);
    case "openai": return openaiCompatible(openai, MODELS.openai, opts);
    default: throw new NoKeyError("Нет ключа ИИ (GEMINI_API_KEY, GROQ_API_KEY или OPENAI_API_KEY).");
  }
}

// JSON-ответ: модели иногда оборачивают его в ```json … ``` или текст
export async function chatJson(system, user, maxTokens = 1500) {
  const raw = await chat({ system, user, json: true, maxTokens });
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (m) return JSON.parse(m[0]);
    throw new Error("ИИ вернул не JSON");
  }
}

export function requireOpenAI(what) {
  if (!openai) throw new NoKeyError(`${what} работает только с OPENAI_API_KEY.`);
  return openai;
}
