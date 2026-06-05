import { SiteFooter } from "./SiteFooter";
import { StaticSiteHeader } from "./StaticSiteHeader";

export function StaticPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StaticSiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
