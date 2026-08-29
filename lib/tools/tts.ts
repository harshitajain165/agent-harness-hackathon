import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CACHE_DIR = join(process.cwd(), "artifacts", "tts-cache");

async function callOpenAiTts(text: string, apiKey: string, model: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, voice: "alloy", input: text, response_format: "mp3" }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI TTS (${model}) failed: ${res.status} ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * OpenAI TTS (POST /v1/audio/speech), per PROJECT_PLAN.md assumption A3: gpt-4o-mini-tts,
 * falling back to tts-1 if that model errors. Cached to disk by a hash of the narration
 * text — retries and re-recordings of the same line don't re-synthesize (and re-cost) it.
 * Returns a file path (not raw bytes) since both the duration probe and ffmpeg muxing need
 * a real file on disk anyway.
 */
export async function synthesizeSpeech(text: string): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  const hash = createHash("sha256").update(text).digest("hex");
  const cachePath = join(CACHE_DIR, `${hash}.mp3`);

  try {
    await readFile(cachePath);
    return cachePath;
  } catch {
    // not cached yet, fall through to synthesize
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  let audio: Buffer;
  try {
    audio = await callOpenAiTts(text, apiKey, "gpt-4o-mini-tts");
  } catch {
    audio = await callOpenAiTts(text, apiKey, "tts-1");
  }

  await writeFile(cachePath, audio);
  return cachePath;
}
