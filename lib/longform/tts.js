// ============================================================================
//  Озвучка диктором: ElevenLabs (если задан ELEVENLABS_API_KEY) или OpenAI TTS.
//  Формат у обоих — PCM 24 кГц, 16 бит, моно: длительность считается точно
//  по размеру (байты / 48000).
//  Голос по умолчанию: глубокий спокойный мужской (как у Ifverse Tales).
// ============================================================================

import { requireOpenAI } from "../llm.js";

export const SAMPLE_RATE = 24000;
const BYTES_PER_SEC = SAMPLE_RATE * 2;

const MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";
const VOICE = process.env.TTS_VOICE || "onyx";
const INSTRUCTIONS = process.env.TTS_INSTRUCTIONS ||
  "Calm, deep, cinematic documentary narrator. Measured pace with short dramatic pauses between sentences. Warm, confident, slightly mysterious. Never rushed.";

export const pcmSeconds = (buf) => buf.length / BYTES_PER_SEC;
export const silence = (sec) => Buffer.alloc(Math.max(0, Math.round(sec * SAMPLE_RATE)) * 2);

// ── ElevenLabs ─────────────────────────────────────────────────────────────
// Любой голос из ElevenLabs (свой, из Voice Library или клон с правами):
// ELEVENLABS_VOICE_ID — ID голоса (по умолчанию Brian — глубокий диктор).
const EL_KEY = process.env.ELEVENLABS_API_KEY;
const EL_VOICE = process.env.ELEVENLABS_VOICE_ID || "nPczCjzI2devNBz1zQrb";
const EL_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
export const TTS_PROVIDER = EL_KEY ? "elevenlabs" : "openai";

async function speakEleven(text, voice) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice || EL_VOICE)}?output_format=pcm_24000`;
  const body = JSON.stringify({
    text: String(text).slice(0, 4000),
    model_id: EL_MODEL,
    voice_settings: { stability: +(process.env.ELEVENLABS_STABILITY || 0.5), similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
  });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json", Accept: "audio/pcm" }, body });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const msg = (await res.text().catch(() => "")).slice(0, 300);
    // 429 — слишком много запросов одновременно: ждём и повторяем
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt)); continue; }
    const e = new Error(`ElevenLabs ${res.status}: ${msg}`);
    e.status = res.status === 401 ? 400 : 502;
    throw e;
  }
}

// Тестовый режим без ключа: тишина длиной как речь (~2,5 слова в секунду)
const FAKE = process.env.TTS_FAKE === "1";

export async function speak(text, { voice } = {}) {
  if (FAKE) return silence(Math.max(1.5, String(text).split(/\s+/).length / 2.5));
  if (EL_KEY) return speakEleven(text, voice);
  const openai = requireOpenAI("Озвучка длинных роликов");
  const req = { model: MODEL, voice: voice || VOICE, input: String(text).slice(0, 4000), response_format: "pcm" };
  if (MODEL.includes("gpt-4o")) req.instructions = INSTRUCTIONS;
  let res;
  try {
    res = await openai.audio.speech.create(req);
  } catch (e) {
    // модель с инструкциями недоступна — пробуем классическую tts-1
    if (MODEL === "tts-1") throw e;
    res = await openai.audio.speech.create({ model: "tts-1", voice: voice || VOICE, input: req.input, response_format: "pcm", speed: 0.95 });
  }
  return Buffer.from(await res.arrayBuffer());
}

// WAV-обёртка для склеенного PCM
export function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SAMPLE_RATE, 24); h.writeUInt32LE(BYTES_PER_SEC, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
