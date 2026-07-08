import Link from "next/link";
import { clsx } from "clsx";
import type { PanelItemSurfaceProps } from "./types";

export function PanelItemSurface({
  active = false,
  ariaLabel,
  children,
  className,
  disabled = false,
  href,
  icon,
  iconClassName = "bg-teal-50 text-teal-700",
  role,
  trailing,
}: PanelItemSurfaceProps) {
  const surfaceClassName = clsx(
    "flex min-h-24 w-full items-center gap-4 rounded-lg border bg-white p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
    active ? "border-teal-500 ring-1 ring-teal-500" : "border-stone-200",
    disabled ? "cursor-not-allowed opacity-60" : href ? "hover:border-teal-500" : "",
    className,
  );
  const content = (
    <>
      {icon ? <span className={clsx("flex size-11 shrink-0 items-center justify-center rounded-md sm:size-12", iconClassName)}>{icon}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </>
  );

  if (!disabled && href) {
    return (
      <Link href={href} className={surfaceClassName} aria-current={active ? "page" : undefined} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <span className={surfaceClassName} aria-disabled={disabled ? "true" : undefined} aria-label={ariaLabel} role={role ?? (href ? "link" : undefined)}>
      {content}
    </span>
  );
}
