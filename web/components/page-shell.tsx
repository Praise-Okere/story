import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Back link + magenta page title, with the content panel offset to the right on wide screens. */
export function PageShell({
  backHref,
  backLabel = "Back",
  title,
  description,
  children,
  wide = false,
}: {
  backHref: string;
  backLabel?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div>
      <Link
        href={backHref}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-card px-4 text-sm font-medium text-card-title shadow-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden /> {backLabel}
      </Link>
      <div className={wide ? "mx-auto mt-10 max-w-5xl" : "mx-auto mt-14 max-w-4xl"}>
        <h1 className="text-3xl font-bold text-balance text-heading">{title}</h1>
        {description && <div className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">{description}</div>}
        <div className={wide ? "mt-8" : "mt-10 lg:ml-40"}>{children}</div>
      </div>
    </div>
  );
}

/** The rounded panel used for wizard steps and editors. */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-card p-5 sm:p-6 ${className}`}>{children}</div>;
}

/** Large outlined choice button used throughout the wizard. */
export function OptionButton({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-13 items-center justify-center rounded-xl border px-4 py-3 text-center font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
        selected ? "border-primary bg-primary/10 text-heading" : "border-input bg-card hover:border-primary/70 hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
