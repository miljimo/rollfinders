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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function courseAdminReturnTo(value: string | undefined) {
  const returnTo = value?.trim() ?? "";
  return returnTo.startsWith("/dashboard?panel=open-mats") || returnTo.startsWith("/admin/courses") ? returnTo : "/admin/courses";
}

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const returnTo = courseAdminReturnTo(firstParam(query.returnTo));
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
      <DialogShell closeHref={returnTo} description="Update the course details without leaving course management." title="Edit Course">
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button href={`/admin/courses/new?cloneFrom=${course.id}`} variant="secondary">Clone Course</Button>
        </div>
        <CourseForm action={updateCourse.bind(null, course.id)} academies={academies} cancelHref={returnTo} course={formCourse} instructorUsers={instructorUsers} returnTo={returnTo} />
        <form action={deleteCourse.bind(null, course.id)} className="mt-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" variant="danger">Delete Course</Button>
        </form>
      </DialogShell>
    </PageShell>
  );
}
