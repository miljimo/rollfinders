import type { Prisma } from "@prisma/client";

import { Button } from "@/app/_components/Button";
import { DialogShell } from "@/app/_components/DialogShell";
import type { AcademyServiceRecord } from "@/lib/academyService";
import type { getInstructorUserOptions } from "@/lib/instructor-users";

import { deleteCourse, updateCourse } from "../../admin/courses/actions";
import { CourseForm } from "../../admin/courses/CourseForm";

type EditableCourse = Prisma.EventGetPayload<{
  include: { activities: true };
}>;

export function EditCourseDialog({
  academies,
  course,
  instructorUsers,
}: {
  academies: AcademyServiceRecord[];
  course: EditableCourse;
  instructorUsers: Awaited<ReturnType<typeof getInstructorUserOptions>>;
}) {
  const returnTo = "/dashboard/courses";
  const formCourse = { ...course, price: course.price.toString() };

  return (
    <DialogShell
      closeHref={returnTo}
      description="Update the course details without leaving course management."
      title="Edit Course"
    >
      <CourseForm
        action={updateCourse.bind(null, course.id)}
        academies={academies}
        cancelHref={returnTo}
        course={formCourse}
        instructorUsers={instructorUsers}
        returnTo={returnTo}
        submitLabel="Update Course"
      />
      <form action={deleteCourse.bind(null, course.id)} className="mt-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button type="submit" variant="danger">
          Delete Course
        </Button>
      </form>
    </DialogShell>
  );
}
