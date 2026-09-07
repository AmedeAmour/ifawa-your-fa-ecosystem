import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Logo({ className, mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark && (
        <span className="grid size-8 shrink-0 place-items-center bg-umber font-display text-[17px] leading-none text-ivory">
          I
        </span>
      )}
      <span className="font-display text-[24px] leading-none tracking-tight">IFAWA</span>
    </span>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("label-mono text-clay", className)}>{children}</p>
  );
}

export function PageTitle({
  children,
  kicker,
  action,
}: {
  children: ReactNode;
  kicker?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 animate-rise">
      <div>
        {kicker && <Kicker className="mb-2">{kicker}</Kicker>}
        <h1 className="font-display text-[32px] uppercase leading-[0.95] tracking-tight sm:text-[40px]">
          {children}
        </h1>
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[22px] uppercase leading-none tracking-tight">{children}</h2>
      {aside && <span className="label-mono text-umber-soft">{aside}</span>}
    </div>
  );
}

export function Panel({
  children,
  className,
  tone = "paper",
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "deep" | "ink" | "forest";
}) {
  const tones = {
    paper: "bg-card text-foreground carved",
    deep: "bg-ivory-deep/60 text-foreground carved",
    ink: "bg-umber text-ivory",
    forest: "bg-forest text-ivory",
  } as const;
  return <div className={cn("p-4 sm:p-5", tones[tone], className)}>{children}</div>;
}

export function Monogram({
  name,
  size = 40,
  tone,
}: {
  name: string;
  size?: number;
  tone?: "clay" | "forest" | "brass" | "umber";
}) {
  const letters = name.replace(/[@·]/g, "").trim().slice(0, 2).toUpperCase();
  const palette = ["bg-clay", "bg-forest", "bg-brass", "bg-umber"] as const;
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const bg = tone ? `bg-${tone}` : palette[idx];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-display leading-none text-ivory",
        bg,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {letters}
    </span>
  );
}

export function Btn({
  children,
  variant = "primary",
  className,
  to,
  onClick,
  type = "button",
  disabled,
  full,
  params,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline" | "ink" | "quiet";
  className?: string;
  to?: string;
  params?: Record<string, string>;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
}) {
  const variants = {
    primary: "bg-clay text-ivory hover:bg-clay/90",
    ink: "bg-umber text-ivory hover:bg-umber-soft",
    outline: "border border-umber/20 text-umber hover:bg-ivory-deep",
    ghost: "text-umber-soft hover:text-clay",
    quiet: "bg-ivory-deep text-umber hover:bg-ivory-deep/70",
  } as const;
  const cls = cn(
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors disabled:opacity-40",
    full && "w-full",
    variants[variant],
    className,
  );
  if (to) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link to={to as any} params={params as any} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
        active ? "bg-umber text-ivory" : "bg-ivory-deep text-umber-soft hover:bg-ivory-deep/70",
      )}
    >
      {children}
    </button>
  );
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span className={cn("label-mono bg-brass/15 px-2 py-1 text-brass", className)}>
      Contenu de démonstration
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label-mono mb-2 block text-umber-soft">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-umber-soft/80">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full border border-umber/15 bg-card px-3 py-2.5 text-[14px] outline-none transition-colors placeholder:text-umber-soft/50 focus:border-clay";

export function Empty({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="carved bg-ivory-deep/40 p-10 text-center">
      <p className="font-display text-[20px] uppercase tracking-tight">{titre}</p>
      <p className="mx-auto mt-2 max-w-[36ch] text-[13px] leading-relaxed text-umber-soft">{texte}</p>
    </div>
  );
}
