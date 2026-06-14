import type { Academy, CourseActivity, Event } from "@prisma/client";
import type { InstructorUserOption } from "@/lib/instructor-users";
import { OpenMatForm } from "../open-mats/OpenMatForm";
import type { CourseFormState } from "./actions";

type CourseAction = (state: CourseFormState, formData: FormData) => Promise<CourseFormState>;
export type CourseFormEvent = Omit<Event, "price"> & { price: string };
type CourseFormActivity = Pick<CourseActivity, "name" | "activityType" | "startTime" | "endTime" | "description"> & { id?: string };
type CourseFormEventWithActivities = CourseFormEvent & { activities?: CourseFormActivity[] };

export function CourseForm({ action, academies, cancelHref, course, instructorUsers = [], submitLabel }: { action: CourseAction; academies: Academy[]; cancelHref?: string; course?: CourseFormEventWithActivities; instructorUsers?: InstructorUserOption[]; submitLabel?: string }) {
  return (
    <OpenMatForm
      action={action}
      academies={academies}
      cancelHref={cancelHref}
      courseTypeMode="select"
      event={course}
      instructorUsers={instructorUsers}
      submitLabel={submitLabel}
    />
  );
}
