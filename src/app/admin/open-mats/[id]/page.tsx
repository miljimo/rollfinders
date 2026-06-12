import { notFound, redirect } from "next/navigation";
import { CourseType } from "@prisma/client";
import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import { PageShell } from "@/components/PageShell";
import { requireOpenMatAccess } from "@/lib/academy-access";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { getInstructorUserOptions, instructorUserAcademyWhere } from "@/lib/instructor-users";
import { prisma } from "@/lib/prisma";
import { deleteCourse, updateCourse } from "../../courses/actions";
import { OpenMatForm } from "../OpenMatForm";

export const dynamic = "force-dynamic";

export default async function EditOpenMatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const [event, academies] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { activities: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } } }),
    prisma.academy.findMany({
      where: isAcademyAdminRole(user.role)
        ? { id: user.academyId ?? "__missing_academy__" }
        : isPlatformAdminRole(user.role) ? undefined : { members: { some: { userId: user.id } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!event) notFound();
  if (event.courseType !== CourseType.OPEN_MAT) redirect(`/admin/courses/${event.id}`);
  await requireOpenMatAccess(event, "edit");
  const instructorUsers = await getInstructorUserOptions(instructorUserAcademyWhere(academies.map((academy) => academy.id)));
  const formEvent = { ...event, price: event.price.toString() };

  return (
    <PageShell>
      <DialogShell closeHref="/admin?panel=open-mats" description="Update this course without leaving Open Mats/Sessions management." title="Edit Course">
        <OpenMatForm action={updateCourse.bind(null, event.id)} academies={academies} cancelHref="/admin?panel=open-mats" courseTypeMode="select" event={formEvent} instructorUsers={instructorUsers} returnTo="/admin?panel=open-mats" submitLabel="Save Course" />
        <form action={deleteCourse.bind(null, event.id)} className="mt-4">
          <Button type="submit" variant="danger">Delete Course</Button>
        </form>
      </DialogShell>
    </PageShell>
  );
}
