import type { Metadata } from "next";
import { PovWizard } from "@/components/pov-wizard";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Create a POV Explainer · StoryForge" };

export default function CreatePovPage() {
  return (
    <PageShell
      backHref="/"
      title="Create a POV Explainer"
      description="Generate a cinematic explainer video script. Use your own idea or let AI recommend a topic for you."
    >
      <PovWizard />
    </PageShell>
  );
}
