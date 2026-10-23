"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/stories", label: "My Stories" },
  { href: "/pov", label: "POV Projects" },
  { href: "/voice", label: "Voice Generator" },
];

export function SiteHeader() {
  return <SiteHeaderView pathname={usePathname()} />;
}

/** Pure header markup; rendered with `pathname={null}` as the Suspense fallback on dynamic routes. */
export function SiteHeaderView({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-header/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="StoryForge home" className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Logo />
        </Link>
        <nav aria-label="Main" className="-mx-2 flex overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex h-10 items-center rounded-lg px-3 text-sm font-bold whitespace-nowrap text-heading transition-colors",
                "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                isActive(item.href) && "bg-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
