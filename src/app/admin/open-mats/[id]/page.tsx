import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { requireOpenMatAccess } from "@/lib/academy-access";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteOpenMat, updateOpenMat } from "../actions";
import { OpenMatForm } from "../OpenMatForm";

export const dynamic = "force-dynamic";

export default async function EditOpenMatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const [event, academies] = await Promise.all([
    prisma.event.findUnique({ where: { id } }),
    prisma.academy.findMany({
      where: isPlatformAdminRole(user.role) ? undefined : { members: { some: { userId: user.id } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!event) notFound();
  await requireOpenMatAccess(event, "edit");

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Edit Open Mat</h1>
        <OpenMatForm action={updateOpenMat.bind(null, event.id)} academies={academies} event={event} />
        <form action={deleteOpenMat.bind(null, event.id)} className="mt-4">
          <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700">Delete Open Mat</button>
        </form>
      </section>
    </PageShell>
  );
}
