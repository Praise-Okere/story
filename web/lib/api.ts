import type { PovTopic, Project, ProjectSummary, StorySettings, Storyboard, VoiceEngine } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new Error("Can't reach the StoryForge API. Is the backend running (npm run dev)?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

const post = <T>(url: string, body: unknown) => request<T>(url, { method: "POST", body: JSON.stringify(body) });

export const api = {
  povTopics: (genre: string) => post<{ topics: PovTopic[] }>("/api/pov-topics", { genre }).then((r) => r.topics),

  scenes: (body: { story: string; artStyle: string; aspect: string }) => post<Storyboard>("/api/scenes", body),

  voices: () => request<{ engines: VoiceEngine[] }>("/api/voices"),

  voice: (body: {
    engine: string;
    projectId?: string;
    text: string;
    voiceId: string;
    style: string;
    speed: number;
    stability: number;
  }) =>
    post<{ url: string }>("/api/voice", body).then((r) => r.url),

  listProjects: () => request<ProjectSummary[]>("/api/projects"),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  saveProject: (p: Project) => request(`/api/projects/${p.id}`, { method: "PUT", body: JSON.stringify(p) }),
  deleteProject: (id: string) => request(`/api/projects/${id}`, { method: "DELETE" }),
};

/** Streams the generated script (title line, blank line, body) as NDJSON events from the backend. */
export async function streamStory(
  body: StorySettings,
  onText: (chunk: string) => void,
  signal: AbortSignal,
) {
  let res: Response;
  try {
    res = await fetch("/api/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal.aborted) return;
    throw new Error("Can't reach the StoryForge API. Is the backend running (npm run dev)?", { cause: err });
  }
  if (!res.body) throw new Error("No response from the story endpoint");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line) continue;
        const event = JSON.parse(line) as { t: "text"; d: string } | { t: "error"; m: string } | { t: "done" };
        if (event.t === "text") onText(event.d);
        else if (event.t === "error") throw new Error(event.m);
      }
    }
  } catch (err) {
    if (signal.aborted) return;
    throw err;
  }
}

export function downloadFile(name: string, content: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "story";
}

/** The model writes the title on the first line; split it from the script body. */
export function splitTitle(raw: string): { title: string; story: string } {
  const nl = raw.indexOf("\n");
  if (nl === -1) return { title: raw.trim(), story: "" };
  return { title: raw.slice(0, nl).replace(/^(title:\s*)/i, "").replace(/^["*#\s]+|["*\s]+$/g, ""), story: raw.slice(nl).trimStart() };
}
