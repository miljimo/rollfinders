import type { CourseActivity, Event } from "@prisma/client";

export type CloneSourceEvent = Event & {
  activities?: Pick<CourseActivity, "name" | "activityType" | "startTime" | "endTime" | "description">[];
};

export type ClonedCourseFormEvent = Omit<Event, "price"> & {
  price: string;
  activities?: (Pick<CourseActivity, "name" | "activityType" | "startTime" | "endTime" | "description"> & { id?: string })[];
};

export function courseCloneTitle(title: string) {
  return `${title} (Copy)`;
}

export function cloneEventForCourseForm(event: CloneSourceEvent): ClonedCourseFormEvent {
  return {
    ...event,
    title: courseCloneTitle(event.title),
    price: event.price.toString(),
    activities: event.activities?.map((activity) => ({
      name: activity.name,
      activityType: activity.activityType,
      startTime: activity.startTime,
      endTime: activity.endTime,
      description: activity.description,
    })),
  };
}
