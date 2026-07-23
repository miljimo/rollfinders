import { redirect } from "next/navigation";
import { Button } from "@/app/_components/Button";
import { PageShell } from "@/app/_components/Page";
import { requireOpenMatAccess } from "@/lib/academy-access";
import { listAcademiesForActorFromAcademyService } from "@/lib/academyService";
import { getCurrentUser } from "@/lib/admin";
import { cloneEventForCourseForm } from "@/lib/course-cloning";
import { getInstructorUserOptions, instructorUserAcademyWhere } from "@/lib/instructor-users";
import { prisma } from "@/lib/prisma";
import { createCourse } from "../actions";
import { CourseForm } from "../CourseForm";

export const dynamic = "force-dynamic";

type SearchParams = { cloneFrom?: string };

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const [academies, cloneSource] = await Promise.all([
    listAcademiesForActorFromAcademyService(user),
    params.cloneFrom
      ? prisma.event.findUnique({
          where: { id: params.cloneFrom },
          include: { activities: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } },
        })
      : Promise.resolve(null),
  ]);
  if (cloneSource) await requireOpenMatAccess(cloneSource, "edit");
  const academyIds = academies.map((academy) => academy.id);
  const instructorUsers = await getInstructorUserOptions(instructorUserAcademyWhere(academyIds));
  const clonedCourse = cloneSource && academyIds.includes(cloneSource.academyId) ? cloneEventForCourseForm(cloneSource) : undefined;
  const cloning = Boolean(clonedCourse);
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Button href="/admin/courses" variant="secondary" size="sm">Back to Courses</Button>
        <h1 className="mt-4 text-3xl font-black text-stone-950">{cloning ? "Clone Course" : "New Course"}</h1>
        <CourseForm action={createCourse} academies={academies} cancelHref="/admin/courses" course={clonedCourse} instructorUsers={instructorUsers} submitLabel={cloning ? "Create Clone" : undefined} />
      </section>
    </PageShell>
  );
}
