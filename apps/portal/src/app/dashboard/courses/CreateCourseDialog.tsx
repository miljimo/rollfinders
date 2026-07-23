import type { Prisma } from "@prisma/client";

import { DialogShell } from "@/app/_components/DialogShell";
import { cloneEventForCourseForm } from "@/lib/course-cloning";
import type { getInstructorUserOptions } from "@/lib/instructor-users";
import type { AcademyServiceRecord } from "@/lib/academyService";

import { createCourse } from "../../admin/courses/actions";
import { OpenMatForm } from "../../admin/open-mats/OpenMatForm";

export type DashboardCloneSourceEvent = Prisma.EventGetPayload<{
  include: { activities: true };
}>;

export function CreateCourseDialog({
  academies,
  cloneSource,
  instructorUsers,
}: {
  academies: AcademyServiceRecord[];
  cloneSource?: DashboardCloneSourceEvent | null;
  instructorUsers: Awaited<ReturnType<typeof getInstructorUserOptions>>;
}) {
  const clonedEvent = cloneSource && academies.some((academy) => academy.id === cloneSource.academyId) ? cloneEventForCourseForm(cloneSource) : undefined;
  const cloning = Boolean(clonedEvent);

  return (
    <DialogShell closeHref="/dashboard/courses" description={cloning ? "Create a new course from the selected course details." : "Create an Open Mat by default, or choose another course type."} title={cloning ? "Clone Course" : "New Course"}>
      <OpenMatForm academies={academies} action={createCourse} cancelHref="/dashboard/courses" courseTypeMode="select" event={clonedEvent} instructorUsers={instructorUsers} returnTo="/dashboard/courses" submitLabel={cloning ? "Create Clone" : "New Course"} />
    </DialogShell>
  );
}
