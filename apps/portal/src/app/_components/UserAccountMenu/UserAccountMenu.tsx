"use client";

import Link from "next/link";
import { ChevronDown, LogOut, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type UserAccountMenuItem = {
  href?: string;
  icon?: LucideIcon;
  label: string;
  onSelect?: () => void;
};

export type UserAccountMenuVariant = "compact" | "account-dropdown";

export type UserAccountMenuProps = {
  accountEmail?: string | null;
  accountName: string;
  accountRole?: string | null;
  avatarLabel?: string;
  className?: string;
  defaultOpen?: boolean;
  items?: UserAccountMenuItem[];
  onSignOut?: () => void;
  showRolePill?: boolean;
  signOutLabel?: string;
  signOutIcon?: LucideIcon;
  triggerLabelClassName?: string;
  variant?: UserAccountMenuVariant;
};

export function UserAccountMenu({
  accountEmail,
  accountName,
  accountRole,
  avatarLabel,
  className,
  defaultOpen = false,
  items = [],
  onSignOut,
  showRolePill = false,
  signOutIcon: SignOutIcon = LogOut,
  signOutLabel = "Logout",
  triggerLabelClassName,
  variant = "compact",
}: UserAccountMenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = useMemo(() => avatarLabel ?? initialsFromName(accountName), [accountName, avatarLabel]);
  const imageVariant = variant === "account-dropdown";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);
  const triggerClasses = imageVariant
    ? "inline-flex max-w-full items-center gap-5 rounded-md bg-white px-0 py-0 text-left text-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
    : "inline-flex max-w-full items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2";
  const avatarClasses = imageVariant
    ? "inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-2xl font-black text-teal-900 shadow-[0_18px_40px_rgba(15,118,110,0.18)]"
    : "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-black text-white";
  const menuClasses = imageVariant
    ? "absolute right-0 z-40 mt-8 w-[min(38rem,calc(100vw-2rem))] overflow-visible rounded-2xl border border-slate-200 bg-white px-7 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.16)]"
    : "absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-md border border-stone-200 bg-white shadow-xl";

  return (
    <div ref={menuRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        className={triggerClasses}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={avatarClasses} aria-hidden>
          {initials || <UserRound size={18} aria-hidden />}
        </span>
        <span className={cn("min-w-0", imageVariant && "sr-only", triggerLabelClassName)}>
          <span className="block truncate font-black text-slate-950">{accountName}</span>
          {accountRole ? <span className="block truncate text-xs font-bold uppercase text-slate-500">{accountRole}</span> : null}
        </span>
        <ChevronDown className={cn(imageVariant ? "size-8" : "size-4", "shrink-0 text-slate-600 transition", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={menuClasses}
        >
          {imageVariant ? <span className="absolute -top-[1.05rem] right-[6.1rem] size-8 rotate-45 border-l border-t border-slate-200 bg-white" aria-hidden /> : null}
          <div className={cn(imageVariant ? "grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-7 border-b border-slate-200 pb-8" : "border-b border-stone-100 px-4 py-3")}>
            {imageVariant ? (
              <span className="inline-flex size-24 items-center justify-center rounded-full bg-teal-100 text-4xl font-black text-teal-900" aria-hidden>
                {initials || <UserRound size={34} aria-hidden />}
              </span>
            ) : null}
            <div className="min-w-0">
              <p className={cn("truncate font-black text-slate-950", imageVariant ? "text-2xl" : "text-sm")}>{accountName}</p>
              {accountEmail ? <p className={cn("mt-1 truncate text-slate-500", imageVariant ? "text-xl" : "text-sm")}>{accountEmail}</p> : null}
              {accountRole ? (
                <p className={cn("mt-2 inline-flex max-w-full truncate font-bold", showRolePill ? "rounded-md bg-teal-100 px-3 py-1 text-base text-teal-900" : "text-xs uppercase text-slate-500")}>
                  {accountRole}
                </p>
              ) : null}
            </div>
          </div>

          {items.length ? (
            <div className={cn(imageVariant ? "divide-y divide-slate-200" : "py-2")}>
              {items.map((item) => {
                const content = <MenuItemContent icon={item.icon} imageVariant={imageVariant}>{item.label}</MenuItemContent>;
                if (item.href) {
                  return (
                    <Link
                      key={`${item.label}-${item.href}`}
                      href={item.href}
                      role="menuitem"
                      className={cn(
                        "block font-medium text-slate-800 transition hover:bg-slate-50 hover:text-slate-950 focus:bg-slate-50 focus:outline-none",
                        imageVariant ? "px-8 py-8 text-2xl" : "px-4 py-2 text-sm",
                      )}
                      onClick={() => {
                        item.onSelect?.();
                        closeMenu();
                      }}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className={cn(
                      "block w-full text-left font-medium text-slate-800 transition hover:bg-slate-50 hover:text-slate-950 focus:bg-slate-50 focus:outline-none",
                      imageVariant ? "px-8 py-8 text-2xl" : "px-4 py-2 text-sm",
                    )}
                    onClick={() => {
                      item.onSelect?.();
                      closeMenu();
                    }}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ) : null}

          {onSignOut ? (
            <div className={cn(imageVariant ? "border-t border-slate-200" : "border-t border-stone-100 py-2")}>
              <button
                type="button"
                role="menuitem"
                className={cn(
                  "flex w-full items-center text-left font-medium transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none",
                  imageVariant ? "gap-9 px-8 py-8 text-2xl text-slate-800" : "gap-2 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 focus:bg-red-50",
                )}
                onClick={() => {
                  closeMenu();
                  onSignOut();
                }}
              >
                <SignOutIcon className={cn("shrink-0", imageVariant ? "size-8 text-slate-600" : "size-4")} aria-hidden />
                {signOutLabel}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItemContent({ children, icon: Icon, imageVariant }: { children: ReactNode; icon?: LucideIcon; imageVariant: boolean }) {
  if (!Icon) return children;

  return (
    <span className={cn("flex items-center", imageVariant ? "gap-9" : "gap-2")}>
      <Icon className={cn("shrink-0", imageVariant ? "size-8 text-slate-600" : "size-4 text-slate-500")} aria-hidden />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function initialsFromName(accountName: string) {
  return accountName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
