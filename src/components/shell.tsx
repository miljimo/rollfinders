import Link from "next/link";
import { getServerSession } from "next-auth";
import { MapPin, Search } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

const navItems = [
  ["Home", "/"],
  ["Academies", "/academies"],
  ["Open Mats", "/open-mats"],
  ["Map", "/map"],
];

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user);

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f8faf7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-base font-bold text-stone-950">
          <span className="flex size-9 items-center justify-center rounded-md bg-teal-700 text-white">
            <MapPin size={18} aria-hidden />
          </span>
          RollFinder
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white hover:text-stone-950">
              {label}
            </Link>
          ))}
          {isLoggedIn ? (
            <>
              <Link href="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white hover:text-stone-950">
                Admin
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white hover:text-stone-950">
              Login
            </Link>
          )}
        </nav>
        <Link href="/academies" className="inline-flex size-10 items-center justify-center rounded-md bg-stone-950 text-white md:hidden" aria-label="Search academies">
          <Search size={18} aria-hidden />
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-stone-600 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>RollFinder helps grapplers find their next round in London.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

export function StaticSiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f8faf7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-base font-bold text-stone-950">
          <span className="flex size-9 items-center justify-center rounded-md bg-teal-700 text-white">
            <MapPin size={18} aria-hidden />
          </span>
          RollFinder
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white hover:text-stone-950">
              {label}
            </Link>
          ))}
          <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white hover:text-stone-950">
            Login
          </Link>
        </nav>
        <Link href="/academies" className="inline-flex size-10 items-center justify-center rounded-md bg-stone-950 text-white md:hidden" aria-label="Search academies">
          <Search size={18} aria-hidden />
        </Link>
      </div>
    </header>
  );
}

export function StaticPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StaticSiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
