import { Suspense } from "react";
import { StoryWorkspace, WorkspaceSkeleton } from "@/components/story-workspace";

export default function StoryPage() {
  // The story id is only known at request time, so the client workspace sits behind Suspense.
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <StoryWorkspace />
    </Suspense>
  );
}
