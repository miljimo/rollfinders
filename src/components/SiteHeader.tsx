import Link from "next/link";
import { getServerSession } from "next-auth";
import { Search } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { isAcademyAdminRole, isPlatformAdminRole, isStandardUserRole } from "@/lib/admin";
import { BrandLink } from "./BrandLink";
import { LogoutButton } from "./LogoutButton";
import { NavLink } from "./NavLink";

const navItems = [
  ["Home", "/"],
  ["Academies", "/academies"],
  ["Open Mats", "/open-mats"],
  ["Map", "/map"],
];

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const showAdmin = isPlatformAdminRole(role);
  const showDashboard = isStandardUserRole(role) || isAcademyAdminRole(role) || role === "PLATFORM_ADMIN";

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
              {showDashboard ? <NavLink href={isAcademyAdminRole(role) ? "/admin" : "/dashboard"}>Dashboard</NavLink> : null}
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
