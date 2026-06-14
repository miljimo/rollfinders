import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import { PageShell } from "@/components/PageShell";
import { requireOpenMatAccess } from "@/lib/academy-access";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { getInstructorUserOptions, instructorUserAcademyWhere } from "@/lib/instructor-users";
import { prisma } from "@/lib/prisma";
import { deleteCourse, updateCourse } from "../actions";
import { CourseForm } from "../CourseForm";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const academyWhere = isAcademyAdminRole(user.role)
    ? { id: user.academyId ?? "__missing_academy__" }
    : isPlatformAdminRole(user.role) ? undefined : { members: { some: { userId: user.id } } };
  const [course, academies] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { activities: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } } }),
    prisma.academy.findMany({
      where: academyWhere,
      orderBy: { name: "asc" },
    }),
  ]);
  if (!course) notFound();
  await requireOpenMatAccess(course, "edit");
  const instructorUsers = await getInstructorUserOptions(instructorUserAcademyWhere(academies.map((academy) => academy.id)));
  const formCourse = { ...course, price: course.price.toString() };
  return (
    <PageShell>
      <DialogShell closeHref="/admin/courses" description="Update the course details without leaving course management." title="Edit Course">
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button href={`/admin/courses/new?cloneFrom=${course.id}`} variant="secondary">Clone Course</Button>
        </div>
        <CourseForm action={updateCourse.bind(null, course.id)} academies={academies} cancelHref="/admin/courses" course={formCourse} instructorUsers={instructorUsers} />
        <form action={deleteCourse.bind(null, course.id)} className="mt-4">
          <Button type="submit" variant="danger">Delete Course</Button>
        </form>
      </DialogShell>
    </PageShell>
  );
}
