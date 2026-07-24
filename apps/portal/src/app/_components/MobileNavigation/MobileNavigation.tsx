import Link from "next/link";
import { House, UserRound, type LucideIcon } from "lucide-react";

export type MobileNavigationTab = "home" | "search" | "map" | "bookings" | "profile";

type MobileNavigationItem = {
  href: string;
  icon: LucideIcon;
  id: MobileNavigationTab;
  label: string;
};

export const mobileNavigationItems: readonly MobileNavigationItem[] = [
  { href: "/mobile", icon: House, id: "home", label: "Home" },
  { href: "/mobile?tab=profile", icon: UserRound, id: "profile", label: "Profile" },
] as const;

export function isMobileNavigationTab(value?: string): value is MobileNavigationTab {
  return mobileNavigationItems.some((item) => item.id === value);
}

export function MobileNavigation({ activeTab }: { activeTab: MobileNavigationTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]" aria-label="Mobile app navigation">
      <div className="mx-auto grid h-18 w-full max-w-sm grid-cols-2 gap-2 rounded-2xl bg-white/95 p-2 shadow-[0_-8px_34px_rgba(15,23,42,0.12)] backdrop-blur">
        {mobileNavigationItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-14 min-w-0 max-w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl px-1 text-xs font-black leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${active ? "bg-teal-50 text-teal-800" : "text-slate-800 hover:bg-stone-100 hover:text-slate-950"}`}
            >
              <Icon size={22} className="shrink-0" aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
