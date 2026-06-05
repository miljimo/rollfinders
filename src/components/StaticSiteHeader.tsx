import { Search } from "lucide-react";
import { Button } from "./Button";
import { BrandLink } from "./BrandLink";
import { NavLink } from "./NavLink";

const navItems = [
  ["Home", "/"],
  ["Academies", "/academies"],
  ["Open Mats", "/open-mats"],
  ["Map", "/map"],
];

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
        <Button href="/academies" size="icon" variant="neutral" className="md:hidden" aria-label="Search academies">
          <Search size={18} aria-hidden />
        </Button>
      </div>
    </header>
  );
}
