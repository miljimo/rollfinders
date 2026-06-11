import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { requireOpenMatAccess } from "@/lib/academy-access";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
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
      where: isAcademyAdminRole(user.role)
        ? { id: user.academyId ?? "__missing_academy__" }
        : isPlatformAdminRole(user.role) ? undefined : { members: { some: { userId: user.id } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!event) notFound();
  await requireOpenMatAccess(event, "edit");
  const formEvent = { ...event, price: event.price.toString() };

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Edit Open Mat</h1>
        <OpenMatForm action={updateOpenMat.bind(null, event.id)} academies={academies} cancelHref="/admin?panel=open-mats" event={formEvent} returnTo="/admin?panel=open-mats" />
        <form action={deleteOpenMat.bind(null, event.id)} className="mt-4">
          <Button type="submit" variant="danger">Delete Open Mat</Button>
        </form>
      </section>
    </PageShell>
  );
}
