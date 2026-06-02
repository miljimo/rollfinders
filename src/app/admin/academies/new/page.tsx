import { PageShell } from "@/components/shell";
import { requireAdminPage } from "@/lib/admin";
import { AcademyForm } from "../form";

export default async function NewAcademyPage() {
  await requireAdminPage();

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">New Academy</h1>
        <AcademyForm action="/api/admin/academies" />
      </section>
    </PageShell>
  );
}
