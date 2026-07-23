import { PageFooter } from "./PageFooter";
import { StaticSiteHeader } from "./StaticSiteHeader";

export function StaticPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StaticSiteHeader />
      <main className="flex-1">{children}</main>
      <PageFooter />
    </>
  );
}
