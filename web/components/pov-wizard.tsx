"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PenTool, RefreshCw, RotateCw, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { OptionButton, Panel } from "@/components/page-shell";
import { ReviewAndGenerate, StepHeading, WizardHeader } from "@/components/wizard-parts";
import { api } from "@/lib/api";
import { DURATIONS, GENRES, POV_TYPE, durationLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Duration, PovTopic } from "@/lib/types";

type Mode = "ai" | "own";
type Step = "mode" | "genre" | "topics" | "idea" | "duration" | "review";

const PATHS: Record<Mode, Step[]> = {
  ai: ["mode", "genre", "topics", "duration", "review"],
  own: ["mode", "idea", "duration", "review"],
};

const fieldClass =
  "w-full rounded-lg border border-input bg-muted/60 px-4 text-base placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

function ModeCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-3 rounded-xl border border-input bg-muted/40 px-6 py-8 text-center transition-colors hover:border-primary/70 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-xl font-bold">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  );
}

export function PovWizard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("ai");
  const [step, setStep] = useState<Step>("mode");
  const [genre, setGenre] = useState("");
  const [topic, setTopic] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [duration, setDuration] = useState<Duration | null>(null);
  const [topics, setTopics] = useState<PovTopic[] | null>(null);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const path = PATHS[mode];
  const index = path.indexOf(step);

  const go = (s: Step) => setStep(s);

  function reset() {
    setMode("ai");
    setStep("mode");
    setGenre("");
    setTopic("");
    setExtraInfo("");
    setDuration(null);
    setTopics(null);
    setTopicsError(null);
  }

  async function loadTopics(g: string) {
    setTopics(null);
    setTopicsError(null);
    try {
      setTopics(await api.povTopics(g));
    } catch (err) {
      setTopicsError((err as Error).message);
    }
  }

  function chooseGenre(g: string) {
    setGenre(g);
    go("topics");
    // Re-picking the same genre keeps the suggestions already on screen.
    if (g !== genre || !topics) loadTopics(g);
  }

  const settings = {
    storyType: POV_TYPE,
    genre: mode === "own" ? "My Own Idea" : genre,
    location: "",
    period: "",
    duration: duration ?? "long-form",
    topic: topic.trim(),
    extraInfo: extraInfo.trim() || undefined,
  };

  return (
    <Panel>
      <WizardHeader
        progress={index / (path.length - 1)}
        onBack={() => (index === 0 ? router.push("/") : go(path[index - 1]))}
        onReset={reset}
        canReset={index > 0}
        disabled={busy}
      />

      {step === "mode" && (
        <>
          <StepHeading title="How do you want to start?" subtitle="Choose how you'd like to create your POV explainer script." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ModeCard
              icon={<WandSparkles className="size-9" aria-hidden />}
              title="AI Recommendation"
              description="Pick a genre and let AI suggest trending topics for you to choose from."
              onClick={() => {
                setMode("ai");
                go("genre");
              }}
            />
            <ModeCard
              icon={<PenTool className="size-9" aria-hidden />}
              title="My Own Idea"
              description="You provide the topic and key details. We turn it into a full cinematic script."
              onClick={() => {
                setMode("own");
                go("idea");
              }}
            />
          </div>
        </>
      )}

      {step === "genre" && (
        <>
          <StepHeading title="Choose a Genre" subtitle="Pick the category that fits the type of explainer you want." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {GENRES[POV_TYPE].map((g) => (
              <OptionButton key={g} selected={genre === g} onClick={() => chooseGenre(g)}>
                {g}
              </OptionButton>
            ))}
          </div>
        </>
      )}

      {step === "topics" && (
        <>
          <StepHeading title="Pick a Topic" subtitle={`Trending ${genre} ideas. Choose one to turn into a script.`} />
          <div className="mt-5" aria-live="polite">
            {topicsError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{topicsError}</p>
                <Button variant="outline" className="mt-3 h-10" onClick={() => loadTopics(genre)}>
                  <RotateCw aria-hidden /> Try again
                </Button>
              </div>
            ) : !topics ? (
              <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Finding topics">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {topics.map((t) => (
                    <button
                      key={t.title}
                      type="button"
                      aria-pressed={topic === t.title}
                      onClick={() => {
                        setTopic(t.title);
                        setExtraInfo(t.angle);
                        go("duration");
                      }}
                      className={cn(
                        "flex flex-col gap-1 rounded-xl border px-5 py-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        topic === t.title ? "border-primary bg-primary/10" : "border-input hover:border-primary/70 hover:bg-muted",
                      )}
                    >
                      <span className="font-bold">{t.title}</span>
                      <span className="text-sm text-muted-foreground">{t.angle}</span>
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="mt-5 h-10" onClick={() => loadTopics(genre)}>
                  <RefreshCw aria-hidden /> Suggest different topics
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {step === "idea" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim()) go("duration");
          }}
        >
          <StepHeading title="Tell us about your idea" subtitle="Give us enough detail and we'll craft the full script from it." />
          <div className="mt-5 flex flex-col gap-2">
            <Label htmlFor="pov-topic" className="font-bold">
              Video Title / Topic
            </Label>
            <input
              id="pov-topic"
              type="text"
              required
              autoComplete="off"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. What If You Woke Up Rich Tomorrow…"
              className={cn(fieldClass, "h-12")}
            />
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Label htmlFor="pov-extra" className="font-bold">
              Extra Info <span className="font-normal text-muted-foreground">(optional: key points, angle, context)</span>
            </Label>
            <Textarea
              id="pov-extra"
              rows={4}
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder="e.g. Focus on the psychological shift someone experiences when their financial situation changes overnight. Include the feeling of impostor syndrome…"
              className={cn(fieldClass, "min-h-28 py-3")}
            />
          </div>
          <Button type="submit" className="mt-6 h-12 px-6 text-base font-bold" disabled={!topic.trim()}>
            Continue <ArrowRight aria-hidden />
          </Button>
        </form>
      )}

      {step === "duration" && (
        <>
          <StepHeading title="Choose the Duration" subtitle="Shorts run about a minute; long form is a full YouTube video." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {DURATIONS.map((d) => (
              <OptionButton
                key={d.value}
                selected={duration === d.value}
                onClick={() => {
                  setDuration(d.value);
                  go("review");
                }}
              >
                {d.label}
              </OptionButton>
            ))}
          </div>
        </>
      )}

      {step === "review" && duration && (
        <ReviewAndGenerate
          label="Generate Script"
          settings={settings}
          onBusyChange={setBusy}
          rows={[
            { label: "Start", value: mode === "ai" ? "AI Recommendation" : "My Own Idea" },
            ...(mode === "ai" ? [{ label: "Genre", value: genre }] : []),
            { label: "Topic", value: settings.topic },
            ...(settings.extraInfo ? [{ label: "Details", value: settings.extraInfo }] : []),
            { label: "Duration", value: durationLabel(duration) },
          ]}
        />
      )}
    </Panel>
  );
}
