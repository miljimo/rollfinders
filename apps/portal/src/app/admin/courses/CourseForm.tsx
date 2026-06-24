import type { Academy, CourseActivity } from "@prisma/client";
import type { InstructorUserOption } from "@/lib/instructor-users";
import { OpenMatForm, type OpenMatFormEvent } from "../open-mats/OpenMatForm";
import type { CourseFormState } from "./actions";

type CourseAction = (state: CourseFormState, formData: FormData) => Promise<CourseFormState>;
export type CourseFormEvent = OpenMatFormEvent;
type CourseFormActivity = Pick<CourseActivity, "name" | "activityType" | "startTime" | "endTime" | "description"> & { id?: string };
type CourseFormEventWithActivities = CourseFormEvent & { activities?: CourseFormActivity[] };

export function CourseForm({ action, academies, cancelHref, course, instructorUsers = [], returnTo, submitLabel }: { action: CourseAction; academies: Academy[]; cancelHref?: string; course?: CourseFormEventWithActivities; instructorUsers?: InstructorUserOption[]; returnTo?: string; submitLabel?: string }) {
  return (
    <OpenMatForm
      action={action}
      academies={academies}
      cancelHref={cancelHref}
      courseTypeMode="select"
      event={course}
      instructorUsers={instructorUsers}
      returnTo={returnTo}
      submitLabel={submitLabel}
    />
  );
}
