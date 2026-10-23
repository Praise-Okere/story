import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { VoiceGenerator } from "@/components/voice-generator";

export const metadata: Metadata = { title: "Voice Generator · StoryForge" };

export default function VoicePage() {
  return (
    <PageShell backHref="/" title="Voice Generator" description="Paste any script and turn it into a realistic voiceover." wide>
      <VoiceGenerator />
    </PageShell>
  );
}
