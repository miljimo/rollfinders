import type { ReactNode } from "react";

export type TabControlItem = {
  disabled?: boolean;
  href?: string;
  label: ReactNode;
  value: string;
};

export type TabControlProps = {
  activeValue: string;
  ariaLabel: string;
  className?: string;
  items: TabControlItem[];
};

export const TabControl = ({
  activeValue,
  ariaLabel,
  className = "",
  items,
}: TabControlProps) => {
  const tabClassName = (active: boolean, disabled?: boolean) => [
    "inline-flex min-h-10 flex-1 items-center justify-center rounded-md px-4 text-sm font-black transition",
    active ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-slate-950",
    disabled ? "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-slate-600" : "",
  ].filter(Boolean).join(" ");

  return (
    <nav className={className} aria-label={ariaLabel}>
      <div className="grid gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1 sm:grid-cols-3" role="tablist" aria-label={ariaLabel}>
        {items.map((item) => {
          const active = item.value === activeValue;
          if (item.disabled || !item.href) {
            return (
              <span
                key={item.value}
                aria-disabled={item.disabled ? "true" : undefined}
                aria-selected={active}
                className={tabClassName(active, item.disabled)}
                role="tab"
                tabIndex={item.disabled ? -1 : 0}
              >
                {item.label}
              </span>
            );
          }

          return (
            <a
              key={item.value}
              aria-selected={active}
              className={tabClassName(active)}
              href={item.href}
              role="tab"
              tabIndex={active ? 0 : -1}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
};
