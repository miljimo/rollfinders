import { clsx } from "clsx";
import type { ReactNode } from "react";

type WarningPanelTone = "amber" | "neutral";

export type WarningPanelProps = {
  children: ReactNode;
  className?: string;
  title: ReactNode;
  tone?: WarningPanelTone;
};

const toneClasses: Record<WarningPanelTone, { body: string; content: string; title: string }> = {
  amber: {
    body: "border-amber-200 bg-amber-50 text-amber-950",
    content: "text-amber-900",
    title: "text-amber-950",
  },
  neutral: {
    body: "border-stone-200 bg-stone-50 text-stone-800",
    content: "text-stone-700",
    title: "text-stone-950",
  },
};

export function WarningPanel({ children, className, title, tone = "amber" }: WarningPanelProps) {
  const classes = toneClasses[tone];

  return (
    <div className={clsx("rounded-md border p-3 text-sm leading-6", classes.body, className)}>
      <p className={clsx("font-bold", classes.title)}>{title}</p>
      <div className={clsx("mt-1 font-semibold", classes.content)}>{children}</div>
    </div>
  );
}
