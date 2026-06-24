import { PageFooter } from "./PageFooter";
import { PageHeader } from "./PageHeader";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader />
      <main className="flex-1">{children}</main>
      <PageFooter />
    </div>
  );
}
