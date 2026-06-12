import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { getInstructorUserOptions, instructorUserAcademyWhere } from "@/lib/instructor-users";
import { prisma } from "@/lib/prisma";
import { createCourse } from "../actions";
import { CourseForm } from "../CourseForm";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const academyWhere = isAcademyAdminRole(user.role)
      ? { id: user.academyId ?? "__missing_academy__" }
      : isPlatformAdminRole(user.role) ? undefined : { members: { some: { userId: user.id } } };
  const academies = await prisma.academy.findMany({
    where: academyWhere,
    orderBy: { name: "asc" },
  });
  const academyIds = academies.map((academy) => academy.id);
  const instructorUsers = await getInstructorUserOptions(instructorUserAcademyWhere(academyIds));
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Button href="/admin/courses" variant="secondary" size="sm">Back to Courses</Button>
        <h1 className="mt-4 text-3xl font-black text-stone-950">New Course</h1>
        <CourseForm action={createCourse} academies={academies} cancelHref="/admin/courses" instructorUsers={instructorUsers} />
      </section>
    </PageShell>
  );
}
