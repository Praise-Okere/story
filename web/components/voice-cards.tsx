"use client";

import { useEffect, useState } from "react";
import { Download, KeyRound, Loader2, Pause, Play, RotateCw, Square, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { FieldSelect } from "@/components/field-select";
import { api, slugify } from "@/lib/api";
import type { VoiceEngine } from "@/lib/types";

function RangeField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => v.toFixed(2),
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between">
        <Label id={id}>{label}</Label>
        <span className="text-sm text-muted-foreground tabular-nums">{format(value)}</span>
      </div>
      <Slider
        aria-labelledby={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="py-2"
      />
    </div>
  );
}

export function StudioVoiceCard({
  text,
  title,
  projectId,
  audioUrl,
  onAudio,
}: {
  text: string;
  title: string;
  projectId?: string;
  audioUrl: string | null;
  onAudio: (url: string) => void;
}) {
  const [engines, setEngines] = useState<VoiceEngine[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [engineId, setEngineId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [style, setStyle] = useState("Gripping, cinematic documentary narrator");
  const [speed, setSpeed] = useState(1);
  const [stability, setStability] = useState(0.45);
  const [generating, setGenerating] = useState(false);
  const engine = engines?.find((e) => e.id === engineId);
  const ext = audioUrl?.split(".").pop() ?? engine?.format ?? "wav";

  async function load() {
    setLoadError(null);
    try {
      const { engines: list } = await api.voices();
      setEngines(list);
      if (list[0]) {
        setEngineId((cur) => cur || list[0].id);
        setVoiceId((cur) => cur || list[0].voices[0]?.id || "");
      }
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  function switchEngine(id: string) {
    setEngineId(id);
    setVoiceId(engines?.find((e) => e.id === id)?.voices[0]?.id ?? "");
  }

  async function generate() {
    setGenerating(true);
    try {
      const url = await api.voice({ engine: engineId, projectId, text, voiceId, style, speed, stability });
      onAudio(url);
      toast.success("Narration ready");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Studio voice</CardTitle>
        <CardDescription>Natural AI narration you can download. Long scripts take a minute or two.</CardDescription>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-destructive">{loadError}</span>
            <Button variant="outline" className="h-10" onClick={load}>
              <RotateCw aria-hidden /> Retry
            </Button>
          </div>
        ) : !engines ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !engine ? (
          <div className="flex gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Add a free <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">GEMINI_API_KEY</code> to{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">.env</code> and restart to unlock
              downloadable narration. Until then, use the free browser voice below.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-3">
              {engines.length > 1 && (
                <FieldSelect
                  id="engine"
                  label="Engine"
                  value={engineId}
                  onChange={switchEngine}
                  options={engines.map((e) => ({ value: e.id, label: e.label }))}
                />
              )}
              <FieldSelect
                id="studio-voice"
                label="Voice"
                value={voiceId}
                onChange={setVoiceId}
                options={engine.voices.map((v) => ({ value: v.id, label: v.desc ? `${v.name} · ${v.desc}` : v.name }))}
              />
              {engine.id === "gemini" ? (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor="voice-style">Delivery style</Label>
                  <input
                    id="voice-style"
                    type="text"
                    autoComplete="off"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="e.g. spooky whisper, upbeat storyteller"
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
                  />
                </div>
              ) : (
                <>
                  <RangeField id="el-speed" label="Speed" value={speed} min={0.7} max={1.2} step={0.05} onChange={setSpeed} format={(v) => `${v.toFixed(2)}×`} />
                  <RangeField id="el-stab" label="Stability" value={stability} min={0} max={1} step={0.05} onChange={setStability} />
                </>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="h-10" onClick={generate} disabled={generating || !voiceId || !text.trim()}>
                {generating ? <Loader2 className="motion-safe:animate-spin" aria-hidden /> : <Wand2 aria-hidden />}
                {generating ? "Generating audio…" : audioUrl ? "Regenerate audio" : "Generate audio"}
              </Button>
              {audioUrl && (
                <a
                  href={audioUrl}
                  download={`${slugify(title)}.${ext}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Download className="size-4" aria-hidden /> Download {ext.toUpperCase()}
                </a>
              )}
            </div>
            {audioUrl && <audio controls src={audioUrl} className="mt-4 w-full" />}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function BrowserVoiceCard({ text }: { text: string }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [rate, setRate] = useState(1);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");

  useEffect(() => {
    const fill = () => {
      const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
      setVoices(vs);
      setVoiceName((cur) => cur || vs.find((v) => v.default)?.name || vs[0]?.name || "");
    };
    fill();
    speechSynthesis.addEventListener("voiceschanged", fill);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", fill);
      speechSynthesis.cancel();
    };
  }, []);

  function play() {
    if (state === "paused") {
      speechSynthesis.resume();
      setState("playing");
      return;
    }
    speechSynthesis.cancel();
    const voice = voices.find((v) => v.name === voiceName);
    // Browsers cut off very long utterances, so queue one per paragraph.
    const paragraphs = text.split(/\n+/).filter((p) => p.trim());
    paragraphs.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      if (voice) u.voice = voice;
      if (i === paragraphs.length - 1) u.onend = () => setState("idle");
      speechSynthesis.speak(u);
    });
    setState("playing");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Browser voice preview</CardTitle>
        <CardDescription>Free and instant. Good for checking pacing before you export.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 sm:grid-cols-2">
          {voices.length ? (
            <FieldSelect
              id="b-voice"
              label="Voice"
              value={voiceName}
              onChange={setVoiceName}
              options={voices.map((v) => ({ value: v.name, label: `${v.name} (${v.lang})` }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No English voices found in this browser.</p>
          )}
          <RangeField id="b-rate" label="Rate" value={rate} min={0.6} max={1.5} step={0.05} onChange={setRate} format={(v) => `${v.toFixed(2)}×`} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {state === "playing" ? (
            <Button
              variant="outline"
              className="h-10"
              onClick={() => {
                speechSynthesis.pause();
                setState("paused");
              }}
            >
              <Pause aria-hidden /> Pause
            </Button>
          ) : (
            <Button variant="outline" className="h-10" onClick={play} disabled={!text.trim()}>
              <Play aria-hidden /> {state === "paused" ? "Resume" : "Play"}
            </Button>
          )}
          <Button
            variant="outline"
            className="h-10"
            disabled={state === "idle"}
            onClick={() => {
              speechSynthesis.cancel();
              setState("idle");
            }}
          >
            <Square aria-hidden /> Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
