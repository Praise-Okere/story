"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OptionButton, Panel } from "@/components/page-shell";
import { ReviewAndGenerate, StepHeading, WizardHeader } from "@/components/wizard-parts";
import { DURATIONS, GENRES, LOCATIONS, PERIODS_BY_TYPE, SETTING_LABELS, STORY_TYPES, durationLabel } from "@/lib/constants";
import type { Duration, StorySettings, StoryType } from "@/lib/types";

type Draft = Partial<StorySettings>;
type WizardType = Exclude<StoryType, "POV Explainer">;

type WizardStep = {
  key: keyof StorySettings;
  question: string;
  options: (d: Draft) => { value: string; label: string }[];
};

const plain = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

const STEPS: WizardStep[] = [
  { key: "storyType", question: "What type of story do you want to generate?", options: () => plain(STORY_TYPES) },
  { key: "genre", question: "Choose the genre of your story", options: (d) => plain(GENRES[d.storyType!]) },
  { key: "location", question: "Select the location of the story", options: (d) => plain(LOCATIONS[d.storyType as WizardType]) },
  { key: "period", question: "Select the time period", options: (d) => plain(PERIODS_BY_TYPE[d.storyType as WizardType]) },
  { key: "duration", question: "Choose the duration of your story", options: () => DURATIONS },
];

export function CreateWizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const reviewing = index === STEPS.length;
  const step = STEPS[index];

  function choose(value: string) {
    // Changing the story type changes the later option lists, so clear what came after.
    const next: Draft =
      step.key === "storyType" && value !== draft.storyType ? { storyType: value as StoryType } : { ...draft, [step.key]: value };
    setDraft(next);
    setIndex(index + 1);
  }

  return (
    <Panel>
      <WizardHeader
        progress={index / STEPS.length}
        onBack={() => (index === 0 ? router.push("/") : setIndex(index - 1))}
        onReset={() => {
          setDraft({});
          setIndex(0);
        }}
        canReset={index > 0}
        disabled={busy}
      />

      {reviewing ? (
        <ReviewAndGenerate
          settings={draft as StorySettings}
          onBusyChange={setBusy}
          rows={SETTING_LABELS.map(({ key, label }) => ({
            label,
            value: key === "duration" ? durationLabel(draft.duration as Duration) : (draft[key] as string),
          }))}
        />
      ) : (
        <>
          <StepHeading title={step.question} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {step.options(draft).map((o) => (
              <OptionButton key={o.value} selected={draft[step.key] === o.value} onClick={() => choose(o.value)}>
                {o.label}
              </OptionButton>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
