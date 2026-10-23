"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clapperboard, Copy, Download, FileText, Mic, RefreshCw, RotateCw, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageShell, Panel } from "@/components/page-shell";
import { BrowserVoiceCard, StudioVoiceCard } from "@/components/voice-cards";
import { ScenePrompts } from "@/components/scene-prompts";
import { api, downloadFile, slugify, splitTitle, streamStory } from "@/lib/api";
import { POV_TYPE, WORDS_PER_MINUTE, durationLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

type Tab = "script" | "narration" | "scenes";

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "script", label: "Script", icon: FileText },
  { id: "narration", label: "Narration", icon: Mic },
  { id: "scenes", label: "Scene Prompts", icon: Clapperboard },
];

export function StoryWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("script");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const isPov = project?.storyType === POV_TYPE;
  const listHref = isPov ? "/pov" : "/stories";
  const listLabel = isPov ? "POV Projects" : "My Stories";

  const update = useCallback((patch: Partial<Project>) => {
    dirtyRef.current = true;
    setProject((p) => (p ? { ...p, ...patch } : p));
  }, []);

  const generate = useCallback(
    async (base: Project) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreamError(null);
      setStreaming(true);
      update({ title: "", story: "", scenes: null, audioUrl: null });
      let raw = "";
      try {
        await streamStory(
          {
            storyType: base.storyType,
            genre: base.genre,
            location: base.location,
            period: base.period,
            duration: base.duration,
            topic: base.topic,
            extraInfo: base.extraInfo,
          },
          (chunk) => {
            raw += chunk;
            update(splitTitle(raw));
          },
          controller.signal,
        );
        if (!controller.signal.aborted) update({ status: "done" });
      } catch (err) {
        setStreamError((err as Error).message);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStreaming(false);
        }
      }
    },
    [update],
  );

  // Load the project; kick off generation if it was just created by the wizard.
  useEffect(() => {
    let cancelled = false;
    api.getProject(id).then(
      (p) => {
        if (cancelled) return;
        setProject(p);
        if (p.status === "pending" && !p.story && startedRef.current !== id) {
          startedRef.current = id;
          generate(p);
        }
      },
      (err) => !cancelled && setLoadError((err as Error).message),
    );
    return () => {
      cancelled = true;
    };
  }, [id, generate]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Debounced autosave of edits and generated content.
  useEffect(() => {
    if (!project || !dirtyRef.current) return;
    const t = setTimeout(() => {
      dirtyRef.current = false;
      api.saveProject(project).catch((err) => toast.error(`Couldn't save: ${err.message}`));
    }, streaming ? 1500 : 600);
    return () => clearTimeout(t);
  }, [project, streaming]);

  useEffect(() => {
    if (streaming && textRef.current) textRef.current.scrollTop = textRef.current.scrollHeight;
  }, [project?.story, streaming]);

  if (loadError) {
    return (
      <PageShell backHref={listHref} backLabel={listLabel} title="Story not found" wide>
        <Panel>
          <p className="text-destructive">{loadError}</p>
          <Button variant="outline" className="mt-4 h-10" nativeButton={false} render={<Link href={listHref} />}>
            Back to {listLabel}
          </Button>
        </Panel>
      </PageShell>
    );
  }

  if (!project) return <WorkspaceSkeleton />;

  const words = (project.story.match(/\S+/g) || []).length;
  const minutes = words / WORDS_PER_MINUTE;
  const hasStory = !!project.story.trim() && !streaming;
  const title = project.title || (streaming ? "Writing your story…" : "Untitled story");

  return (
    <PageShell
      backHref={listHref}
      backLabel={listLabel}
      wide
      title={title}
      description={
        <ul className="flex flex-wrap gap-2 text-sm" aria-label="Story settings">
          {[project.storyType, project.genre, project.location, project.period, durationLabel(project.duration)].filter(Boolean).map((v) => (
            <li key={v} className="rounded-full bg-card px-3 py-1">
              {v}
            </li>
          ))}
          {words > 0 && (
            <li className="rounded-full bg-card px-3 py-1 tabular-nums">
              {words} words · ~{minutes < 1 ? `${Math.round(minutes * 60)}s` : `${Math.round(minutes)} min`}
            </li>
          )}
        </ul>
      }
    >
      <div role="tablist" aria-label="Story tools" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const disabled = t.id !== "script" && !hasStory;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              disabled={disabled}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-card text-card-title enabled:hover:bg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden /> {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-5">
        {tab === "script" && (
          <Panel>
            {streamError && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{streamError}</p>
                <Button variant="outline" className="h-10" onClick={() => generate(project)}>
                  <RotateCw aria-hidden /> Try again
                </Button>
              </div>
            )}
            <div className="relative">
              <label htmlFor="story" className="sr-only">
                Story script
              </label>
              <Textarea
                id="story"
                ref={textRef}
                value={project.story}
                readOnly={streaming}
                onChange={(e) => update({ story: e.target.value })}
                placeholder={streaming ? "Writing…" : "Your script appears here."}
                className="min-h-[55vh] resize-y border-input bg-background/40 p-5 text-base leading-relaxed"
              />
              {streaming && (
                <div
                  role="status"
                  className="absolute right-3 bottom-3 flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                >
                  <span className="size-1.5 rounded-full bg-primary-foreground motion-safe:animate-pulse" aria-hidden />
                  Writing…
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {streaming ? (
                <Button variant="outline" className="h-10" onClick={() => abortRef.current?.abort()}>
                  <Square aria-hidden /> Stop
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => (project.story.trim() ? setConfirmOpen(true) : generate(project))}
                >
                  <RefreshCw aria-hidden /> {project.story.trim() ? "Regenerate" : "Generate"}
                </Button>
              )}
              <Button
                variant="outline"
                className="h-10"
                disabled={!hasStory}
                onClick={() =>
                  navigator.clipboard.writeText(`${project.title}\n\n${project.story}`).then(() => toast.success("Script copied"))
                }
              >
                <Copy aria-hidden /> Copy
              </Button>
              <Button
                variant="outline"
                className="h-10"
                disabled={!hasStory}
                onClick={() => downloadFile(`${slugify(project.title)}.txt`, `${project.title}\n\n${project.story}`, "text/plain")}
              >
                <Download aria-hidden /> Download .txt
              </Button>
              <Button className="h-10 font-bold sm:ml-auto" disabled={!hasStory} onClick={() => setTab("narration")}>
                <Mic aria-hidden /> Create narration
              </Button>
            </div>
          </Panel>
        )}

        {tab === "narration" && (
          <div className="flex flex-col gap-4">
            <StudioVoiceCard
              text={project.story}
              title={project.title}
              projectId={project.id}
              audioUrl={project.audioUrl}
              onAudio={(audioUrl) => update({ audioUrl })}
            />
            <BrowserVoiceCard text={project.story} />
          </div>
        )}

        {tab === "scenes" && (
          <Panel>
            <ScenePrompts project={project} update={update} />
          </Panel>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate this story?</AlertDialogTitle>
            <AlertDialogDescription>
              A new story is written with the same settings. Your edits, narration and scene prompts will be replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                generate(project);
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading story">
      <Skeleton className="h-10 w-36" />
      <div className="mx-auto mt-10 max-w-5xl">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="mt-4 h-7 w-1/2" />
        <Skeleton className="mt-8 h-10 w-80" />
        <Skeleton className="mt-5 h-[60vh] w-full rounded-2xl" />
      </div>
    </div>
  );
}
