# StoryForge

A personal AI story studio for faceless YouTube videos: pick a genre, get story ideas,
generate a full narration script, voice it, and get per-scene image + motion prompts.

## Setup

1. `cp .env.example .env` and add a free `GEMINI_API_KEY` from https://aistudio.google.com/apikey
   (or a paid `ANTHROPIC_API_KEY`; optionally `ELEVENLABS_API_KEY`).
2. `npm install` (also installs the Next.js app in `web/`)
3. `npm run dev` and open http://localhost:3000

`npm run dev` starts two processes:
- **api** – Express backend (`server.js`, port 3001) that calls Claude and ElevenLabs
- **web** – Next.js frontend (`web/`, port 3000) that proxies `/api` and `/audio` to the backend

## Pages

- **Home** – dashboard with shortcuts to everything below.
- **Generate New Story** (`/create`) – step-by-step wizard: story type (True Life / Creative
  Fiction) → genre → location → time period → duration (Shorts or Long Form) → review →
  Generate Story. The script streams in live, with its title.
- **Generate POV Explainer** (`/pov/create`) – same wizard for viral "POV: You're…" explainers.
- **Story page** (`/stories/[id]`) – edit the script, create narration, and get per-scene
  image + motion prompts (copy or export as CSV).
- **My Stories / POV Projects** – everything you've made.
- **Voice Generator** (`/voice`) – paste any script and turn it into a voiceover.

Projects are saved locally in `data/` and appear in the sidebar library.
