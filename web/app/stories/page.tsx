import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { ProjectList } from "@/components/project-list";

export const metadata: Metadata = { title: "My Stories · StoryForge" };

export default function StoriesPage() {
  return (
    <PageShell backHref="/" title="My Stories" description="Your previous creations." wide>
      <ProjectList kind="story" />
    </PageShell>
  );
}
