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
    <nav className="fixed inset-x-0 bottom-0 z-50 w-screen max-w-[100vw] overflow-x-hidden border-t border-stone-200 bg-white shadow-[0_-4px_14px_rgba(15,23,42,0.08)]" aria-label="Mobile app navigation">
      <div className="grid min-h-16 w-full min-w-0 grid-cols-2 gap-1 px-2 py-2">
        {mobileNavigationItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 min-w-0 max-w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md px-1 text-xs font-black leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${active ? "bg-teal-50 text-teal-800" : "text-slate-800 hover:bg-stone-100 hover:text-slate-950"}`}
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
