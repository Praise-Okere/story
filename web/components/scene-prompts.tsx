"use client";

import { useState } from "react";
import { Check, Clapperboard, Copy, Download, Loader2, RotateCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldSelect } from "@/components/field-select";
import { api, downloadFile, slugify } from "@/lib/api";
import { ART_STYLES, ASPECTS } from "@/lib/constants";
import type { Project } from "@/lib/types";

function PromptBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg bg-muted/60 p-3 pr-14">
      <div className="relative">
        <div className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">{label}</div>
        <p className="text-sm">{text}</p>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Copy ${label.toLowerCase()}`}
          className="absolute -top-1.5 -right-12 size-10"
          onClick={() =>
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? <Check className="text-primary" aria-hidden /> : <Copy aria-hidden />}
        </Button>
      </div>
    </div>
  );
}

export function ScenePrompts({ project, update }: { project: Project; update: (patch: Partial<Project>) => void }) {
  const [artStyle, setArtStyle] = useState(ART_STYLES[0].value);
  const [aspect, setAspect] = useState(project.duration === "shorts" ? "9:16" : "16:9");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const board = project.scenes;
  const title = project.title || "story";

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      update({ scenes: await api.scenes({ story: project.story, artStyle, aspect }) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!board) return;
    const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = [
      ["scene", "narration", "image_prompt", "motion_prompt"],
      ...board.scenes.map((s, i) => [i + 1, s.narration, s.image_prompt, s.motion_prompt]),
    ];
    downloadFile(`${slugify(title)}-scenes.csv`, rows.map((r) => r.map(q).join(",")).join("\n"), "text/csv");
  }

  return (
    <section>
      <p className="text-muted-foreground">
        Paste into Midjourney, Flux or Leonardo for images, then Kling, Runway or Pika to animate.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[2fr_1fr]">
        <FieldSelect id="art-style" label="Art style" value={artStyle} options={ART_STYLES} onChange={setArtStyle} />
        <FieldSelect id="aspect" label="Aspect ratio" value={aspect} options={ASPECTS} onChange={setAspect} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button className="h-10" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="motion-safe:animate-spin" aria-hidden /> : <Wand2 aria-hidden />}
          {loading ? "Storyboarding… (about a minute)" : board ? "Regenerate scenes" : "Generate scene prompts"}
        </Button>
        {board && !loading && (
          <>
            <Button
              variant="outline"
              className="h-10"
              onClick={() =>
                navigator.clipboard
                  .writeText(board.scenes.map((s, i) => `${i + 1}. ${s.image_prompt}`).join("\n\n"))
                  .then(() => toast.success(`${board.scenes.length} image prompts copied`))
              }
            >
              <Copy aria-hidden /> Copy all image prompts
            </Button>
            <Button variant="outline" className="h-10" onClick={downloadCsv}>
              <Download aria-hidden /> Download CSV
            </Button>
          </>
        )}
      </div>

      <div className="mt-6" aria-live="polite">
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-3 h-10" onClick={generate}>
              <RotateCw aria-hidden /> Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 rounded-xl" />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : board ? (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Style guide</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <p>{board.style_guide}</p>
                {board.characters.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {board.characters.map((c) => (
                      <li key={c.name}>
                        <span className="font-semibold">{c.name}:</span>{" "}
                        <span className="text-muted-foreground">{c.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <ol className="flex flex-col gap-3">
              {board.scenes.map((scene, i) => (
                <li key={i}>
                  <Card>
                    <CardContent className="grid gap-4 sm:grid-cols-[2.5rem_1fr]">
                      <div className="grid size-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary tabular-nums">
                        {i + 1}
                      </div>
                      <div className="flex min-w-0 flex-col gap-2">
                        <p className="border-l-2 border-border pl-3 text-sm text-muted-foreground">{scene.narration}</p>
                        <PromptBlock label="Image prompt" text={scene.image_prompt} />
                        <PromptBlock label="Motion prompt" text={scene.motion_prompt} />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            <Clapperboard className="size-5 shrink-0" aria-hidden />
            Your story will be split into ~10 second scenes with consistent characters.
          </div>
        )}
      </div>
    </section>
  );
}
