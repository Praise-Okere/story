// AI provider layer. Gemini (free tier) is used when GEMINI_API_KEY is set,
// otherwise Anthropic. server.js only talks to the functions exported here.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const PROVIDER = process.env.GEMINI_API_KEY ? "gemini" : "anthropic";

// Free-tier text models, tried in order when one is overloaded (503) or rate limited (429).
// gemini-3.8-flash hung indefinitely on the free tier when tested (Oct 2026), so it is left out.
const GEMINI_TEXT_MODELS = ["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-2.5-flash"];
const STREAM_TIMEOUT_MS = 240_000;
const JSON_TIMEOUT_MS = 180_000;
const GEMINI_TTS_MODEL = "gemini-3.8-flash-tts";
const ANTHROPIC_MODEL = "claude-opus-5-5";

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const anthropic = PROVIDER === "anthropic" ? new Anthropic() : null;

// Anthropic server-side fallback: if a request is declined (e.g. dark horror/crime
// themes tripping a classifier), the API retries on a suitable fallback model.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

const DECLINED = "The model declined this request. Try a different genre or topic.";

class DeclinedError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isBusy = (err) => err?.status === 503 || err?.status === 429;

/** Runs `call(model)` on each free Gemini model in turn until one isn't overloaded. */
async function withGeminiFallback(call) {
  let lastErr;
  for (const [i, model] of GEMINI_TEXT_MODELS.entries()) {
    try {
      return await call(model);
    } catch (err) {
      if (!isBusy(err)) throw err;
      lastErr = err;
      console.warn(`${model} busy (${err.status}); trying the next model`);
      if (i < GEMINI_TEXT_MODELS.length - 1) await sleep(1500);
    }
  }
  throw lastErr;
}

/** Yields text chunks of a long-form generation. */
export async function* streamText({ system, prompt }) {
  if (gemini) {
    // Overload errors arrive when the stream opens, before any text, so falling back here is safe.
    const stream = await withGeminiFallback((model) =>
      gemini.models.generateContentStream({
        model,
        contents: prompt,
        config: { systemInstruction: system, maxOutputTokens: 32000, abortSignal: AbortSignal.timeout(STREAM_TIMEOUT_MS) },
      }),
    );
    for await (const chunk of stream) {
      if (chunk.promptFeedback?.blockReason) throw new DeclinedError(DECLINED);
      if (chunk.text) yield chunk.text;
      if (chunk.candidates?.[0]?.finishReason === "SAFETY") throw new DeclinedError(DECLINED);
    }
    return;
  }

  const stream = anthropic.beta.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: 32000,
    ...FALLBACK,
    output_config: { effort: "medium" },
    system,
    messages: [{ role: "user", content: prompt }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  if ((await stream.finalMessage()).stop_reason === "refusal") throw new DeclinedError(DECLINED);
}

/** Returns an object matching the zod `schema`. */
export async function generateJSON({ system, prompt, schema, effort = "medium" }) {
  if (gemini) {
    const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(schema);
    const res = await withGeminiFallback((model) =>
      gemini.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system,
          maxOutputTokens: 32000,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          abortSignal: AbortSignal.timeout(JSON_TIMEOUT_MS),
        },
      }),
    );
    if (res.promptFeedback?.blockReason || res.candidates?.[0]?.finishReason === "SAFETY") throw new DeclinedError(DECLINED);
    return schema.parse(JSON.parse(res.text ?? ""));
  }

  const msg = await anthropic.beta.messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 32000,
    ...FALLBACK,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (msg.stop_reason === "refusal") throw new DeclinedError(DECLINED);
  return msg.parsed_output;
}

// ---------- Gemini text-to-speech (free tier) ----------

export const GEMINI_VOICES = [
  ["Charon", "Informative"], ["Kore", "Firm"], ["Puck", "Upbeat"], ["Zephyr", "Bright"], ["Fenrir", "Excitable"],
  ["Leda", "Youthful"], ["Orus", "Firm"], ["Aoede", "Breezy"], ["Callirrhoe", "Easy-going"], ["Autonoe", "Bright"],
  ["Enceladus", "Breathy"], ["Iapetus", "Clear"], ["Umbriel", "Easy-going"], ["Algieba", "Smooth"], ["Despina", "Smooth"],
  ["Erinome", "Clear"], ["Algenib", "Gravelly"], ["Rasalgethi", "Informative"], ["Laomedeia", "Upbeat"], ["Achernar", "Soft"],
  ["Alnilam", "Firm"], ["Schedar", "Even"], ["Gacrux", "Mature"], ["Pulcherrima", "Forward"], ["Achird", "Friendly"],
  ["Zubenelgenubi", "Casual"], ["Vindemiatrix", "Gentle"], ["Sadachbia", "Lively"], ["Sadaltager", "Knowledgeable"], ["Sulafat", "Warm"],
].map(([name, desc]) => ({ id: name, name, desc }));

/** Extracts PCM samples and format from a WAV buffer (or treats it as raw 24 kHz mono 16-bit PCM). */
function readPcm(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF") return { pcm: buf, sampleRate: 24000, channels: 1, bits: 16 };
  let offset = 12;
  let fmt = { sampleRate: 24000, channels: 1, bits: 16 };
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") fmt = { channels: buf.readUInt16LE(body + 2), sampleRate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    // Streaming-style headers can carry a 0/0xFFFFFFFF data size; clamp to what's actually there.
    if (id === "data") return { pcm: buf.subarray(body, Math.min(body + size, buf.length)), ...fmt };
    offset = body + size + (size % 2);
  }
  throw new Error("Unexpected audio format from Gemini TTS");
}

function wavFile(pcm, { sampleRate, channels, bits }) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bits) / 8;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bits) / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Narrates each text chunk with Gemini TTS and returns one WAV file. Retries free-tier rate limits. */
export async function geminiSpeech({ chunks, voice, style }) {
  if (!gemini) throw new Error("Set GEMINI_API_KEY in .env to use the free Gemini voices.");
  const parts = [];
  for (const text of chunks) {
    for (let attempt = 0; ; attempt++) {
      try {
        const interaction = await gemini.interactions.create({
          model: GEMINI_TTS_MODEL,
          input: [
            {
              type: "user_input",
              content: [
                {
                  type: "text",
                  text,
                  ...(style ? { annotations: [{ type: "speech_metadata", style }] } : {}),
                },
              ],
            },
          ],
          response_format: { type: "audio" },
          generation_config: { speech_config: [{ voice }] },
        });
        const data = interaction.output_audio?.data;
        if (!data) throw new Error("Gemini TTS returned no audio");
        parts.push(readPcm(Buffer.from(data, "base64")));
        break;
      } catch (err) {
        // generateContent throws ApiError; the Interactions API throws its own APIError subclasses.
        if (err?.status === 429 && attempt < 3) {
          await sleep(20000 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
  }
  return wavFile(Buffer.concat(parts.map((p) => p.pcm)), parts[0]);
}

// ---------- Errors ----------

/** Pulls `error.message` out of a Google JSON error payload (object or one-element array). */
function googleErrorMessage(raw) {
  try {
    const parsed = JSON.parse(raw.slice(raw.search(/[[{]/)));
    return (Array.isArray(parsed) ? parsed[0] : parsed)?.error?.message ?? null;
  } catch {
    return null;
  }
}

/** Turns provider errors into one readable sentence for the UI. */
export function describeError(err) {
  if (err instanceof DeclinedError) return err.message;
  if (err?.name === "TimeoutError" || err?.name === "AbortError") return "The AI took too long to respond. Try again.";
  // Gemini: ApiError (generateContent) or the Interactions API's APIError, which keeps the payload in `body`.
  const isGemini = err instanceof ApiError || (gemini && typeof err?.status === "number" && "body" in err);
  if (isGemini) {
    if (err.status === 429) return "Gemini free-tier rate limit reached. Wait a minute and try again.";
    if (err.status === 503) return "Gemini's free models are overloaded right now. Wait a minute and try again.";
    const message =
      googleErrorMessage(typeof err.body === "string" ? err.body : "") ?? googleErrorMessage(err.message) ?? err.message;
    if (err.status === 400 && /api key/i.test(message)) return "Invalid GEMINI_API_KEY. Check the key in your .env file.";
    return message;
  }
  if (err instanceof Anthropic.AuthenticationError) return "Invalid ANTHROPIC_API_KEY. Check the key in your .env file.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the API. Wait a moment and try again.";
  if (err instanceof Anthropic.APIError) return err.error?.error?.message || err.message;
  if (PROVIDER === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    return "No AI key found. Add a free GEMINI_API_KEY (aistudio.google.com) to .env and restart.";
  }
  return err?.message || "Something went wrong";
}
