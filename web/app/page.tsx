import Link from "next/link";
import { AudioLines, BookOpenText, ClipboardPlus } from "lucide-react";
import { BRAND_STROKE } from "@/components/brand";
import { StoryCount } from "@/components/story-count";

const bookIcon = <BookOpenText className="size-16" strokeWidth={1.2} color={BRAND_STROKE} aria-hidden />;
const clipboardIcon = <ClipboardPlus className="size-16" strokeWidth={1.5} color={BRAND_STROKE} aria-hidden />;
const voiceIcon = (
  <span className="relative grid size-14 place-items-center rounded-xl bg-linear-to-br from-brand-to to-primary">
    <AudioLines className="size-8 text-white" aria-hidden />
    {/* speech-bubble tail */}
    <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-[#d43fe6]" aria-hidden />
  </span>
);

const CARDS = [
  {
    href: "/create",
    title: "Generate New Story",
    description: "Create Documentary Videos Based on True-Life or Fiction Events",
    icon: bookIcon,
  },
  { href: "/stories", title: "View Past Stories", description: "Check Your Previous Creations", icon: clipboardIcon },
  {
    href: "/voice",
    title: "Voice Generation",
    description: "Bring Your Scripts to Life with Realistic Voiceovers",
    icon: voiceIcon,
  },
  {
    href: "/pov/create",
    title: "Generate POV Explainer Video",
    description: "Create Engaging Viral POV Style Explainer Videos",
    icon: bookIcon,
  },
  {
    href: "/pov",
    title: "View Past POV Explainer Projects",
    description: "Check Your Previous Explainer Creations",
    icon: clipboardIcon,
  },
];

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-heading">Welcome Back 👋</h1>
      <StoryCount />

      <div className="mx-auto mt-16 grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col gap-4 rounded-2xl bg-card px-7 pt-9 pb-7 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex h-16 items-center">{card.icon}</span>
            <span>
              <span className="block text-xl font-bold text-card-title">{card.title}</span>
              <span className="mt-1 block text-sm text-card-title/85">{card.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
