"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BRAND_STROKE } from "@/components/brand";
import { api } from "@/lib/api";
import { POV_TYPE, durationLabel } from "@/lib/constants";
import type { ProjectSummary } from "@/lib/types";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ProjectList({ kind }: { kind: "story" | "pov" }) {
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(null);
  const createHref = kind === "pov" ? "/pov/create" : "/create";
  const noun = kind === "pov" ? "POV explainer" : "story";

  const load = useCallback(async () => {
    setError(null);
    try {
      const all = await api.listProjects();
      setItems(all.filter((p) => (p.storyType === POV_TYPE) === (kind === "pov")));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [kind]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);

  async function remove(item: ProjectSummary) {
    try {
      await api.deleteProject(item.id);
      setItems((cur) => cur?.filter((p) => p.id !== item.id) ?? null);
      toast.success("Deleted");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-6">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-4 h-10" onClick={load}>
          <RotateCw aria-hidden /> Retry
        </Button>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-6 py-14 text-center">
        <BookOpen className="size-12" strokeWidth={1.25} color={BRAND_STROKE} aria-hidden />
        <div>
          <p className="text-lg font-bold text-card-title">No {noun}s yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Your creations are saved here automatically.</p>
        </div>
        <Button className="h-10 px-5 font-bold" nativeButton={false} render={<Link href={createHref} />}>
          <Plus aria-hidden /> Create your first {noun}
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="group relative rounded-2xl bg-card transition-colors hover:bg-muted">
            <Link
              href={`/stories/${item.id}`}
              className="flex h-full flex-col gap-3 rounded-2xl p-6 pr-14 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <h2 className="text-lg leading-snug font-bold text-card-title">{item.title}</h2>
              <p className="text-sm text-muted-foreground">
                {[item.genre, item.location, item.period].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-primary/15 px-2.5 py-1 font-semibold text-heading">
                  {durationLabel(item.duration)}
                </span>
                <span className="text-muted-foreground">{formatDate(item.updatedAt)}</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${item.title}`}
              onClick={() => setPendingDelete(item)}
              className="absolute top-3 right-3 size-10 text-muted-foreground hover:text-destructive"
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {noun}?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” and its narration settings and scene prompts will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) remove(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
