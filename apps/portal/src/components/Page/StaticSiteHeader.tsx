import { Menu } from "lucide-react";
import { BrandLink } from "@/components/BrandLink";
import { NavLink } from "@/components/NavLink";
import { getCurrentUser } from "@/lib/admin";

const navItems = [
  ["Find a Place", "/"],
  ["Academies", "/academies"],
];

function AuthNavLinks({ signedIn }: { signedIn: boolean }) {
  if (signedIn) return <NavLink href="/dashboard">Dashboard</NavLink>;

  return (
    <>
      <NavLink href="/login">Log in</NavLink>
    </>
  );
}

export async function StaticSiteHeader() {
  const currentUser = await getCurrentUser();
  const signedIn = Boolean(currentUser);

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f8faf7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <BrandLink />
        <nav
          className="hidden items-center gap-1 md:flex [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center"
          aria-label="Primary navigation"
        >
          {navItems.map(([label, href]) => (
            <NavLink key={`${label}-${href}`} href={href}>
              {label}
            </NavLink>
          ))}
          <AuthNavLinks signedIn={signedIn} />
        </nav>
        <details className="group relative md:hidden">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-sm font-bold text-teal-800 shadow-sm transition hover:border-teal-600 hover:bg-teal-50 [&::-webkit-details-marker]:hidden">
            <Menu size={18} aria-hidden />
            Menu
          </summary>
          <nav
            className="absolute right-0 z-30 mt-2 grid w-[min(16rem,calc(100vw-2rem))] gap-1 rounded-lg border border-stone-200 bg-white p-2 text-left shadow-xl [&_a]:flex [&_a]:min-h-11 [&_a]:items-center"
            aria-label="Mobile primary navigation"
          >
            {navItems.map(([label, href]) => (
              <NavLink key={`${label}-${href}`} href={href}>
                {label}
              </NavLink>
            ))}
            <AuthNavLinks signedIn={signedIn} />
          </nav>
        </details>
      </div>
    </header>
  );
}
