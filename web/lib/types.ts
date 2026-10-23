export type Scene = {
  narration: string;
  image_prompt: string;
  motion_prompt: string;
};

export type Storyboard = {
  style_guide: string;
  characters: { name: string; description: string }[];
  scenes: Scene[];
};

export type StoryType = "True Life Story" | "Creative Fiction" | "POV Explainer";
export type Duration = "shorts" | "long-form";

export type StorySettings = {
  storyType: StoryType;
  genre: string;
  /** Story wizard only; empty for POV explainers. */
  location: string;
  period: string;
  duration: Duration;
  /** POV explainers only. */
  topic?: string;
  extraInfo?: string;
};

export type PovTopic = { title: string; angle: string };

export type Project = StorySettings & {
  id: string;
  /** "pending" until the first generation finishes, so the story page knows to start it. */
  status: "pending" | "done";
  title: string;
  story: string;
  scenes: Storyboard | null;
  audioUrl: string | null;
  createdAt: number;
  updatedAt?: number;
};

export type ProjectSummary = StorySettings & {
  id: string;
  title: string;
  updatedAt: number;
};

export type Voice = { id: string; name: string; desc: string };

export type VoiceEngine = { id: string; label: string; format: "wav" | "mp3"; voices: Voice[] };
