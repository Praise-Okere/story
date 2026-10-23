"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Project, StorySettings } from "@/lib/types";

/** Go Back / Reset row with a progress bar underneath. */
export function WizardHeader({
  progress,
  onBack,
  onReset,
  canReset,
  disabled,
}: {
  progress: number;
  onBack: () => void;
  onReset: () => void;
  canReset: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" className="h-10 px-4 font-semibold" onClick={onBack} disabled={disabled}>
          <ArrowLeft aria-hidden /> Go Back
        </Button>
        <Button variant="secondary" className="h-10 px-4 font-semibold" onClick={onReset} disabled={disabled || !canReset}>
          <RotateCw aria-hidden /> Reset
        </Button>
      </div>
      <div
        role="progressbar"
        aria-label="Wizard progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="mt-6 h-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-brand-to motion-safe:transition-[width] motion-safe:duration-300"
          style={{ width: `${Math.max(progress, 0.02) * 100}%` }}
        />
      </div>
    </>
  );
}

export function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mt-7">
      <h2 className="text-2xl font-bold">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** "Review your selections" rows plus the Generate button, which creates the project and opens it. */
export function ReviewAndGenerate({
  rows,
  settings,
  label = "Generate Story",
  onBusyChange,
}: {
  rows: { label: string; value: string }[];
  settings: StorySettings;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function generate() {
    setCreating(true);
    onBusyChange?.(true);
    const project: Project = {
      ...settings,
      id: crypto.randomUUID(),
      status: "pending",
      title: "",
      story: "",
      scenes: null,
      audioUrl: null,
      createdAt: Date.now(),
    };
    try {
      await api.saveProject(project);
      router.push(`/stories/${project.id}`);
    } catch (err) {
      toast.error((err as Error).message);
      setCreating(false);
      onBusyChange?.(false);
    }
  }

  return (
    <>
      <StepHeading title="Review your selections" />
      <dl className="mt-5 flex flex-col gap-3 rounded-xl border border-input p-4 sm:p-5">
        {rows.map(({ label: rowLabel, value }) => (
          <div
            key={rowLabel}
            className="flex items-center justify-between gap-4 rounded-lg border-l-4 border-primary bg-muted px-5 py-3"
          >
            <dt className="shrink-0 text-sm text-muted-foreground">{rowLabel}</dt>
            <dd className="min-w-0 text-right font-bold break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <Button className="mt-6 h-12 w-full text-base font-bold" onClick={generate} disabled={creating}>
        {creating && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
        {creating ? "Starting…" : label}
      </Button>
    </>
  );
}
