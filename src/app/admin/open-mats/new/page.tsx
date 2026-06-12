import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { getInstructorUserOptions, instructorUserAcademyWhere } from "@/lib/instructor-users";
import { prisma } from "@/lib/prisma";
import { createCourse } from "../../courses/actions";
import { OpenMatForm } from "../OpenMatForm";

export const dynamic = "force-dynamic";

export default async function NewOpenMatPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const academyWhere = isAcademyAdminRole(user.role)
    ? { id: user.academyId ?? "__missing_academy__" }
    : isPlatformAdminRole(user.role) ? undefined : { members: { some: { userId: user.id } } };
  const academies = await prisma.academy.findMany({
    where: academyWhere,
    orderBy: { name: "asc" },
  });
  const instructorUsers = await getInstructorUserOptions(instructorUserAcademyWhere(academies.map((academy) => academy.id)));

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">New Course</h1>
        <OpenMatForm action={createCourse} academies={academies} courseTypeMode="select" instructorUsers={instructorUsers} submitLabel="New Course" />
      </section>
    </PageShell>
  );
}
