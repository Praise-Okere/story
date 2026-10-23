import "dotenv/config";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { GEMINI_VOICES, PROVIDER, describeError, generateJSON, geminiSpeech, streamText } from "./ai.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");
const AUDIO_DIR = path.join(DATA_DIR, "audio");
await fs.mkdir(PROJECTS_DIR, { recursive: true });
await fs.mkdir(AUDIO_DIR, { recursive: true });

const PORT = process.env.PORT || 3001;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || "";

const WORDS_FOR_DURATION = {
  shorts: 170, // ~60-70s for TikTok / Reels / Shorts
  "long-form": 1800, // ~12 min
};

const SYSTEM = `You write narration scripts for faceless YouTube, TikTok and Reels storytelling channels.
Scripts are read aloud by a single narrator, so write for the ear: a hook in the first line,
clear sentences, vivid but simple imagery, steady tension, natural rhythm.
No headings, no markdown, no sound-effect cues, no stage directions.

"True Life Story" means documentary-style narration about a real, well-documented event that
matches the requested genre, location and period. Stay faithful to the historical record: real
names, places and dates only where documented; do not invent facts or quotes. Pick a
lesser-known but verifiable event when you can, so the story feels fresh.

"Creative Fiction" means an original story set in the requested location and period.

"POV Explainer" means a cinematic second-person explainer in the style of viral "What if you..." /
"POV: you..." videos. Put the viewer inside the scenario ("you"), escalate moment by moment, weave in
real psychology, numbers and mechanics that explain how things actually work, and end with a
takeaway that sticks. Keep claims accurate; do not invent statistics.`;

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use("/audio", express.static(AUDIO_DIR));

function sendError(res, err) {
  console.error(err);
  res.status(500).json({ error: describeError(err) });
}

// ---------- POV topic suggestions ----------

const TopicsSchema = z.object({
  topics: z.array(
    z.object({
      title: z.string().describe("Clickable video title, e.g. 'What If You Woke Up Rich Tomorrow'"),
      angle: z.string().describe("One sentence on what the video explores"),
    }),
  ),
});

app.post("/api/pov-topics", async (req, res) => {
  const { genre } = req.body;
  try {
    const result = await generateJSON({
      system: SYSTEM,
      schema: TopicsSchema,
      effort: "low",
      prompt: `Suggest 6 trending, highly clickable POV explainer video topics in the "${genre}" genre.
Mix "What if you...", "POV: you..." and "How X actually works" framings. Make them distinct from each other.`,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

// ---------- Story (streamed) ----------

function storyBrief({ storyType, genre, location, period, topic, extraInfo }) {
  if (storyType === "POV Explainer") {
    return `Story type: POV Explainer
Genre: ${genre}
Topic: ${topic}
${extraInfo ? `Extra direction from the creator: ${extraInfo}` : ""}
Use the topic as the title unless a sharper version is obvious.`;
  }
  return `Story type: ${storyType}
Genre: ${genre}
Location: ${location}
Time period: ${period}`;
}

app.post("/api/story", async (req, res) => {
  const { duration } = req.body;
  const words = WORDS_FOR_DURATION[duration] || WORDS_FOR_DURATION["long-form"];

  res.setHeader("Content-Type", "application/x-ndjson");
  const send = (obj) => res.write(JSON.stringify(obj) + "\n");

  try {
    const prompt = `Write a narration script.
${storyBrief(req.body)}
Format: ${duration === "shorts" ? "Short vertical video (TikTok / Reels / Shorts)" : "Long-form YouTube video"}
Target length: about ${words} words.

Output format: the first line is the title only (no quotes, no "Title:" prefix), then a blank
line, then the script in plain paragraphs.`;

    for await (const text of streamText({ system: SYSTEM, prompt })) send({ t: "text", d: text });
    send({ t: "done" });
  } catch (err) {
    console.error(err);
    send({ t: "error", m: describeError(err) });
  }
  res.end();
});

// ---------- Step 3: scene prompts ----------

const ScenesSchema = z.object({
  style_guide: z
    .string()
    .describe("One paragraph describing the shared visual style, palette, lighting and camera feel"),
  characters: z.array(
    z.object({
      name: z.string(),
      description: z
        .string()
        .describe("Fixed visual description reused in every prompt for consistency: age, face, hair, build, clothing"),
    }),
  ),
  scenes: z.array(
    z.object({
      narration: z.string().describe("The exact story text covered by this scene, copied verbatim"),
      image_prompt: z
        .string()
        .describe("Self-contained text-to-image prompt including the style and full character descriptions"),
      motion_prompt: z.string().describe("Short image-to-video animation instruction: camera move and subject motion"),
    }),
  ),
});

app.post("/api/scenes", async (req, res) => {
  const { story, artStyle, aspect } = req.body;
  try {
    const result = await generateJSON({
      system:
        "You are a storyboard artist who turns narration scripts into prompts for AI image and video generators such as Midjourney, Flux, Leonardo, Runway, Kling and Pika.",
      schema: ScenesSchema,
      prompt: `Split this narration into scenes and write prompts for each.

Rules:
- Every sentence of the story must belong to exactly one scene, in order, copied verbatim.
- Aim for one scene per 8-15 seconds of narration (roughly 25-40 words).
- Art style: ${artStyle}. Aspect ratio: ${aspect}.
- Every image_prompt must stand alone: restate the art style and the full visual description
  of any character who appears, so characters look the same across images.
- Describe composition, setting, lighting, emotion and camera angle. No text or captions in images.

STORY:
${story}`,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

// ---------- Narration: Gemini TTS (free) and/or ElevenLabs ----------

async function elevenVoices() {
  const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": ELEVEN_KEY } });
  if (!r.ok) throw new Error(`ElevenLabs voices failed: ${r.status}`);
  const data = await r.json();
  return data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    desc: [v.labels?.gender, v.labels?.accent, v.labels?.description].filter(Boolean).join(", "),
  }));
}

app.get("/api/voices", async (_req, res) => {
  const engines = [];
  if (process.env.GEMINI_API_KEY) engines.push({ id: "gemini", label: "Gemini (free)", format: "wav", voices: GEMINI_VOICES });
  if (ELEVEN_KEY) {
    try {
      engines.push({ id: "elevenlabs", label: "ElevenLabs", format: "mp3", voices: await elevenVoices() });
    } catch (err) {
      console.error(err);
    }
  }
  res.json({ engines });
});

// TTS services cap characters per request, so split on paragraph/sentence
// boundaries; the audio segments are joined afterwards.
function chunkText(text, max = 4000) {
  const sentences = text.replace(/\s+\n/g, "\n").match(/[^.!?\n]+[.!?]*["')\]]*\s*|\n+/g) || [text];
  const chunks = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      chunks.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

app.post("/api/voice", async (req, res) => {
  const { engine = "gemini", projectId, text, voiceId, style, stability = 0.45, speed = 1 } = req.body;
  const baseName = `${safeId(projectId) || crypto.randomUUID()}-${Date.now()}`;

  if (engine === "gemini") {
    try {
      const wav = await geminiSpeech({ chunks: chunkText(text, 2500), voice: voiceId, style });
      await fs.writeFile(path.join(AUDIO_DIR, `${baseName}.wav`), wav);
      return res.json({ url: `/audio/${baseName}.wav` });
    } catch (err) {
      return sendError(res, err);
    }
  }

  if (!ELEVEN_KEY) return res.status(400).json({ error: "Set ELEVENLABS_API_KEY in .env to use ElevenLabs." });
  try {
    const parts = [];
    for (const chunk of chunkText(text)) {
      const r = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chunk,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability, similarity_boost: 0.75, speed },
          }),
        },
      );
      if (!r.ok) throw new Error(`ElevenLabs TTS failed (${r.status}): ${await r.text()}`);
      parts.push(Buffer.from(await r.arrayBuffer()));
    }
    await fs.writeFile(path.join(AUDIO_DIR, `${baseName}.mp3`), Buffer.concat(parts));
    res.json({ url: `/audio/${baseName}.mp3` });
  } catch (err) {
    sendError(res, err);
  }
});

// ---------- Library ----------

const safeId = (id) => (typeof id === "string" && /^[a-zA-Z0-9-]+$/.test(id) ? id : null);

app.get("/api/projects", async (_req, res) => {
  const files = (await fs.readdir(PROJECTS_DIR)).filter((f) => f.endsWith(".json"));
  const items = await Promise.all(
    files.map(async (f) => {
      const p = JSON.parse(await fs.readFile(path.join(PROJECTS_DIR, f), "utf8"));
      return {
        id: p.id,
        title: p.title || "Untitled story",
        storyType: p.storyType,
        genre: p.genre,
        location: p.location,
        period: p.period,
        duration: p.duration,
        updatedAt: p.updatedAt,
      };
    }),
  );
  items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  res.json(items);
});

app.get("/api/projects/:id", async (req, res) => {
  const id = safeId(req.params.id);
  if (!id) return res.status(400).end();
  try {
    res.json(JSON.parse(await fs.readFile(path.join(PROJECTS_DIR, `${id}.json`), "utf8")));
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

app.put("/api/projects/:id", async (req, res) => {
  const id = safeId(req.params.id);
  if (!id) return res.status(400).end();
  const project = { ...req.body, id, updatedAt: Date.now() };
  await fs.writeFile(path.join(PROJECTS_DIR, `${id}.json`), JSON.stringify(project, null, 2));
  res.json({ ok: true });
});

app.delete("/api/projects/:id", async (req, res) => {
  const id = safeId(req.params.id);
  if (!id) return res.status(400).end();
  await fs.rm(path.join(PROJECTS_DIR, `${id}.json`), { force: true });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`StoryForge API running at http://localhost:${PORT}`);
  console.log(`AI provider: ${PROVIDER === "gemini" ? "Gemini (free tier)" : "Anthropic"}`);
});
