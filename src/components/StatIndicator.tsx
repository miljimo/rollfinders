import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { clsx } from "clsx";

export type StatIndicatorTone = "neutral" | "positive" | "negative" | "warning";

export type StatIndicatorDirection = "up" | "down" | "flat" | "none";

export type StatIndicatorProps = {
  value?: string | number;
  label: string;
  tone?: StatIndicatorTone;
  direction?: StatIndicatorDirection;
  ariaLabel?: string;
  className?: string;
};

const toneClass: Record<StatIndicatorTone, string> = {
  neutral: "text-slate-600",
  positive: "text-teal-700",
  negative: "text-red-700",
  warning: "text-amber-700",
};

const directionIcon = {
  down: ArrowDown,
  flat: Minus,
  none: null,
  up: ArrowUp,
} satisfies Record<StatIndicatorDirection, typeof ArrowUp | null>;

export function StatIndicator({
  ariaLabel,
  className,
  direction = "none",
  label,
  tone = "neutral",
  value,
}: StatIndicatorProps) {
  const Icon = directionIcon[direction];
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;
  const text = formattedValue === undefined || formattedValue === "" ? label : `${formattedValue} ${label}`;

  return (
    <span
      aria-label={ariaLabel ?? text}
      className={clsx("inline-flex min-w-0 items-center gap-1 text-xs font-bold leading-5", toneClass[tone], className)}
    >
      {Icon ? <Icon aria-hidden size={14} strokeWidth={2.5} /> : null}
      <span className="min-w-0 break-words">{text}</span>
    </span>
  );
}
