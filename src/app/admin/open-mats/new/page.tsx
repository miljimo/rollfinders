import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createOpenMat } from "../actions";
import { OpenMatForm } from "../form";

export const dynamic = "force-dynamic";

export default async function NewOpenMatPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const academies = await prisma.academy.findMany({
    where: isAcademyAdminRole(user.role)
      ? { id: user.academyId ?? "__missing_academy__" }
      : isPlatformAdminRole(user.role) ? undefined : { members: { some: { userId: user.id } } },
    orderBy: { name: "asc" },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">New Open Mat</h1>
        <OpenMatForm action={createOpenMat} academies={academies} />
      </section>
    </PageShell>
  );
}
