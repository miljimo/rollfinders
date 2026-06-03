import { notFound } from "next/navigation";
import { PageShell } from "@/components/shell";
import { canDeleteAcademy, requireAcademyEditor } from "@/lib/academy-access";
import { prisma } from "@/lib/prisma";
import { updateAcademy } from "../actions";
import { AcademyForm } from "../form";

export const dynamic = "force-dynamic";

export default async function EditAcademyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAcademyEditor(id);
  const academy = await prisma.academy.findUnique({ where: { id } });
  if (!academy) notFound();

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Edit Academy</h1>
        <AcademyForm action={updateAcademy.bind(null, academy.id)} academy={academy} />
        {canDeleteAcademy(access) ? (
          <form action={`/api/admin/academies/${academy.id}`} method="post" className="mt-4">
            <input type="hidden" name="_method" value="DELETE" />
            <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700">Delete Academy</button>
          </form>
        ) : null}
      </section>
    </PageShell>
  );
}
