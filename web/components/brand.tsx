import { AudioLines } from "lucide-react";

/** Shared SVG gradient so lucide icons can be stroked with `color="url(#brand-gradient)"`. */
export function BrandGradientDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        {/* userSpaceOnUse (lucide's 24×24 box): bounding-box gradients vanish on straight lines. */}
        <linearGradient id="brand-gradient" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
          <stop offset="0%" stopColor="var(--brand-from)" />
          <stop offset="100%" stopColor="var(--brand-to)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const BRAND_STROKE = "url(#brand-gradient)";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-linear-to-br from-brand-from to-brand-to">
        <AudioLines className="size-5 text-white" aria-hidden />
      </span>
      <span className="text-lg font-bold text-heading">StoryForge</span>
    </span>
  );
}
