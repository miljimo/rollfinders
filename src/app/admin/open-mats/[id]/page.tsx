import { notFound, redirect } from "next/navigation";
import { CourseType } from "@prisma/client";
import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import { PageShell } from "@/components/PageShell";
import { requireOpenMatAccess } from "@/lib/academy-access";
import { listAcademiesForActorFromAcademyService } from "@/lib/academyService";
import { getCurrentUser } from "@/lib/admin";
import { getInstructorUserOptions, instructorUserAcademyWhere } from "@/lib/instructor-users";
import { prisma } from "@/lib/prisma";
import { deleteCourse, updateCourse } from "../../courses/actions";
import { OpenMatForm } from "../OpenMatForm";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function openMatAdminReturnTo(value: string | undefined) {
  const returnTo = value?.trim() ?? "";
  return returnTo.startsWith("/dashboard?panel=open-mats") || returnTo.startsWith("/admin?panel=open-mats") ? returnTo : "/admin?panel=open-mats";
}

export default async function EditOpenMatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const returnTo = openMatAdminReturnTo(firstParam(query.returnTo));
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const [event, academies] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { activities: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } } }),
    listAcademiesForActorFromAcademyService(user),
  ]);

  if (!event) notFound();
  if (event.courseType !== CourseType.OPEN_MAT) redirect(`/admin/courses/${event.id}?returnTo=${encodeURIComponent(returnTo)}`);
  await requireOpenMatAccess(event, "edit");
  const instructorUsers = await getInstructorUserOptions(instructorUserAcademyWhere(academies.map((academy) => academy.id)));
  const formEvent = { ...event, price: event.price.toString() };

  return (
    <PageShell>
      <DialogShell closeHref={returnTo} description="Update this course without leaving courses/events management." title="Edit Course">
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button href={`/admin/open-mats/new?cloneFrom=${event.id}`} variant="secondary">Clone Course</Button>
        </div>
        <OpenMatForm action={updateCourse.bind(null, event.id)} academies={academies} cancelHref={returnTo} courseTypeMode="select" event={formEvent} instructorUsers={instructorUsers} returnTo={returnTo} submitLabel="Save Course" />
        <form action={deleteCourse.bind(null, event.id)} className="mt-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" variant="danger">Delete Course</Button>
        </form>
      </DialogShell>
    </PageShell>
  );
}
