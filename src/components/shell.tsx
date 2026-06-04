import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Search } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { isPlatformAdminRole, isStandardUserRole } from "@/lib/admin";
import { NavLink } from "./nav-link";
import { LogoutButton } from "./logout-button";

const navItems = [
  ["Home", "/"],
  ["Academies", "/academies"],
  ["Open Mats", "/open-mats"],
  ["Map", "/map"],
];

function BrandLink() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2 text-base font-bold text-stone-950">
      <Image
        src="/logo.png"
        alt=""
        width={1672}
        height={941}
        priority
        className="h-10 w-auto shrink-0"
        sizes="120px"
      />
      <span>RollFinders</span>
    </Link>
  );
}

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const showAdmin = isPlatformAdminRole(role);
  const showDashboard = isStandardUserRole(role);

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f8faf7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <BrandLink />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map(([label, href]) => (
            <NavLink key={href} href={href}>
              {label}
            </NavLink>
          ))}
          {isLoggedIn ? (
            <>
              {showDashboard ? <NavLink href="/dashboard">Dashboard</NavLink> : null}
              {showAdmin ? <NavLink href="/admin">Admin</NavLink> : null}
              <LogoutButton />
            </>
          ) : (
            <NavLink href="/login">
              Login
            </NavLink>
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
        <p>RollFinders helps grapplers find their next round in London.</p>
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
        <BrandLink />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map(([label, href]) => (
            <NavLink key={href} href={href}>
              {label}
            </NavLink>
          ))}
          <NavLink href="/login">
            Login
          </NavLink>
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
