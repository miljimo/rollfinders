import Link from "next/link";
import { clsx } from "clsx";

export function PaginationControl({
  children,
  disabled,
  href,
  onClick,
  ariaLabel,
}: {
  children: string;
  disabled: boolean;
  href?: string;
  onClick?: () => void;
  ariaLabel: string;
}) {
  const className = clsx(
    "inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2",
    disabled ? "pointer-events-none text-stone-400 opacity-60" : "text-stone-800 hover:border-teal-700 hover:text-teal-800",
  );

  if (href && !disabled) {
    return (
      <Link href={href} aria-label={ariaLabel} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={ariaLabel} className={className} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
