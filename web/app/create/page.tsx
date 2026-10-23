import type { Metadata } from "next";
import { CreateWizard } from "@/components/create-wizard";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Create a New Story · StoryForge" };

export default function CreatePage() {
  return (
    <PageShell
      backHref="/"
      title="Create a New Story"
      description="Select your preferences below so we can generate a story tailored just for you. Choose the type, genre, and format to get started!"
    >
      <CreateWizard />
    </PageShell>
  );
}
