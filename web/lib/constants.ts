import type { Duration, StorySettings, StoryType } from "./types";

/** Story types offered in the "Generate New Story" wizard; POV explainers have their own entry point. */
export const STORY_TYPES: StoryType[] = ["True Life Story", "Creative Fiction"];

export const POV_TYPE: StoryType = "POV Explainer";

export const GENRES: Record<StoryType, string[]> = {
  "True Life Story": [
    "Conspiracy Events",
    "Comedy Story",
    "Love/Romance",
    "Horror Events",
    "Crime Events",
    "Adventure Events",
    "Discovery Story",
    "Moments in History",
  ],
  "Creative Fiction": [
    "Sci-Fi",
    "Fantasy",
    "Horror",
    "Mystery/Thriller",
    "Love/Romance",
    "Comedy",
    "Dystopian",
    "Supernatural",
  ],
  "POV Explainer": [
    "Wealth & Power",
    "Business & Growth",
    "Crime & Escape",
    "Social Drama",
    "Survival & High Stakes",
    "Mindset & Psychology",
  ],
};

type WizardStoryType = Exclude<StoryType, "POV Explainer">;

const CONTINENTS = ["Africa", "Europe", "Asia", "North America", "South America", "Australia/Oceania"];

export const LOCATIONS: Record<WizardStoryType, string[]> = {
  "True Life Story": CONTINENTS,
  "Creative Fiction": [...CONTINENTS, "Outer Space", "Fictional World"],
};

const PERIODS = [
  "1500 To 1700",
  "1700 To 1750",
  "1750 To 1800",
  "1800 To 1850",
  "1850 To 1900",
  "1900 To 1950",
  "1950 To 2000",
  "2000 To 2026",
];

export const PERIODS_BY_TYPE: Record<WizardStoryType, string[]> = {
  "True Life Story": PERIODS,
  "Creative Fiction": [...PERIODS, "Near Future", "Distant Future"],
};

export const DURATIONS: { value: Duration; label: string }[] = [
  { value: "shorts", label: "Shorts (TikTok / Reels)" },
  { value: "long-form", label: "Long Form" },
];

export const durationLabel = (d: Duration) => DURATIONS.find((x) => x.value === d)?.label ?? d;

export const ART_STYLES = [
  "Cinematic photorealistic, film still, dramatic lighting",
  "Pixar-style 3D animation, soft lighting, expressive characters",
  "Anime, detailed backgrounds, Studio Ghibli inspired",
  "Dark oil painting, moody, high contrast",
  "Comic book, bold ink lines, halftone shading",
  "Watercolor storybook illustration",
  "2D flat cartoon, clean vector shapes",
  "Simple stick-figure drawing on white background",
].map((s) => ({ value: s, label: s }));

export const ASPECTS = [
  { value: "16:9", label: "16:9 (YouTube)" },
  { value: "9:16", label: "9:16 (Shorts / TikTok)" },
  { value: "1:1", label: "1:1 (Square)" },
];

export const WORDS_PER_MINUTE = 150;

export const SETTING_LABELS: { key: keyof StorySettings; label: string }[] = [
  { key: "storyType", label: "Story Type" },
  { key: "genre", label: "Genre" },
  { key: "location", label: "Location" },
  { key: "period", label: "Period" },
  { key: "duration", label: "Duration" },
];
