import { Menu, UserRound } from "lucide-react";
import { BrandLink } from "@/app/_components/BrandLink";
import { NavLink } from "@/app/_components/NavLink";
import { getCurrentUser } from "@/lib/admin";

const navItems = [
  ["Find a Place", "/"],
  ["Academies", "/academies"],
];

function AuthNavLinks({ signedIn }: { signedIn: boolean }) {
  if (signedIn) return <NavLink href="/dashboard">Dashboard</NavLink>;

  return (
    <a
      href="/login"
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 transition hover:border-teal-500 hover:text-teal-700"
    >
      <UserRound size={16} aria-hidden />
      Log in
    </a>
  );
}

export const PageHeader = async () => {
  const currentUser = await getCurrentUser();
  const signedIn = Boolean(currentUser);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <BrandLink />
        <nav
          className="hidden items-center gap-8 md:flex [&_a]:inline-flex [&_a]:items-center"
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
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-teal-800 transition hover:border-teal-600 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
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
};
