"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/page-shell";
import { BrowserVoiceCard, StudioVoiceCard } from "@/components/voice-cards";

export function VoiceGenerator() {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="script">Script</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{text.length.toLocaleString()} characters</span>
        </div>
        <Textarea
          id="script"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type the script you want narrated…"
          className="mt-2 min-h-60 resize-y border-input bg-background/40 p-4 text-base leading-relaxed"
        />
      </Panel>
      <StudioVoiceCard text={text} title="voiceover" audioUrl={audioUrl} onAudio={setAudioUrl} />
      <BrowserVoiceCard text={text} />
    </div>
  );
}
