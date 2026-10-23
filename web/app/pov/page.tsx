import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { ProjectList } from "@/components/project-list";

export const metadata: Metadata = { title: "POV Explainer Projects · StoryForge" };

export default function PovProjectsPage() {
  return (
    <PageShell backHref="/" title="POV Explainer Projects" description="Your previous explainer creations." wide>
      <ProjectList kind="pov" />
    </PageShell>
  );
}
