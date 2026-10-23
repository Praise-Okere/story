"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export function StoryCount() {
  const [count, setCount] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    api.listProjects().then(
      (items) => setCount(items.length),
      () => setOffline(true),
    );
  }, []);

  return (
    <div className="mt-5">
      <div className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-3 text-sm">
        <span aria-hidden>📚</span>
        {offline ? (
          <span className="text-destructive">Backend offline. Run npm run dev.</span>
        ) : (
          <span>
            You have <span className="font-bold text-heading tabular-nums">{count ?? "…"}</span>{" "}
            {count === 1 ? "story" : "stories"}
          </span>
        )}
      </div>
      <div className="mt-2">
        <Link href="/create" className="text-sm text-heading underline underline-offset-4 hover:no-underline">
          Start a new story
        </Link>
      </div>
    </div>
  );
}
