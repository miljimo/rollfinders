import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { requireOpenMatAccess } from "@/lib/academy-access";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { cloneEventForCourseForm } from "@/lib/course-cloning";
import { getInstructorUserOptions, instructorUserAcademyWhere } from "@/lib/instructor-users";
import { prisma } from "@/lib/prisma";
import { createCourse } from "../../courses/actions";
import { OpenMatForm } from "../OpenMatForm";

export const dynamic = "force-dynamic";

type SearchParams = { cloneFrom?: string };

export default async function NewOpenMatPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const params = await searchParams;

  const academyWhere = isAcademyAdminRole(user.role)
    ? { id: user.academyId ?? "__missing_academy__" }
    : isPlatformAdminRole(user.role) ? undefined : { members: { some: { userId: user.id } } };
  const [academies, cloneSource] = await Promise.all([
    prisma.academy.findMany({
      where: academyWhere,
      orderBy: { name: "asc" },
    }),
    params.cloneFrom
      ? prisma.event.findUnique({
          where: { id: params.cloneFrom },
          include: { activities: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } },
        })
      : Promise.resolve(null),
  ]);
  if (cloneSource) await requireOpenMatAccess(cloneSource, "edit");
  const instructorUsers = await getInstructorUserOptions(instructorUserAcademyWhere(academies.map((academy) => academy.id)));
  const clonedEvent = cloneSource && academies.some((academy) => academy.id === cloneSource.academyId) ? cloneEventForCourseForm(cloneSource) : undefined;
  const cloning = Boolean(clonedEvent);

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">{cloning ? "Clone Course" : "New Course"}</h1>
        <OpenMatForm action={createCourse} academies={academies} courseTypeMode="select" event={clonedEvent} instructorUsers={instructorUsers} submitLabel={cloning ? "Create Clone" : "New Course"} />
      </section>
    </PageShell>
  );
}
