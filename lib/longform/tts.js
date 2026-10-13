// ============================================================================
//  Озвучка диктором через OpenAI TTS. Формат PCM 24 кГц, 16 бит, моно —
//  длительность считается точно по размеру (байты / 48000).
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

// Тестовый режим без ключа: тишина длиной как речь (~2,5 слова в секунду)
const FAKE = process.env.TTS_FAKE === "1";

export async function speak(text, { voice } = {}) {
  if (FAKE) return silence(Math.max(1.5, String(text).split(/\s+/).length / 2.5));
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
