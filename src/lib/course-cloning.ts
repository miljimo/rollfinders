import type { CourseActivity, Event } from "@prisma/client";

export type CloneSourceEvent = Event & {
  activities?: Pick<CourseActivity, "name" | "activityType" | "startTime" | "endTime" | "description">[];
};

export type ClonedCourseFormEvent = Pick<Event,
  | "academyId"
  | "title"
  | "description"
  | "eventDate"
  | "startTime"
  | "endTime"
  | "giType"
  | "pricingType"
  | "donationLabel"
  | "audience"
  | "courseType"
  | "instructor"
  | "contactEmail"
  | "contactPhone"
  | "locationName"
  | "addressOverride"
  | "capacity"
  | "active"
  | "recurrenceType"
  | "recurrenceInterval"
  | "recurrenceEndDate"
> & {
  price: string;
  activities?: (Pick<CourseActivity, "name" | "activityType" | "startTime" | "endTime" | "description"> & { id?: string })[];
};

export function courseCloneTitle(title: string) {
  return `${title} (Copy)`;
}

export function cloneEventForCourseForm(event: CloneSourceEvent): ClonedCourseFormEvent {
  return {
    academyId: event.academyId,
    title: courseCloneTitle(event.title),
    description: event.description,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    giType: event.giType,
    price: event.price.toString(),
    pricingType: event.pricingType,
    donationLabel: event.donationLabel,
    audience: event.audience,
    courseType: event.courseType,
    instructor: event.instructor,
    contactEmail: event.contactEmail,
    contactPhone: event.contactPhone,
    locationName: event.locationName,
    addressOverride: event.addressOverride,
    capacity: event.capacity,
    active: event.active,
    recurrenceType: event.recurrenceType,
    recurrenceInterval: event.recurrenceInterval,
    recurrenceEndDate: event.recurrenceEndDate,
    activities: event.activities?.map((activity) => ({
      name: activity.name,
      activityType: activity.activityType,
      startTime: activity.startTime,
      endTime: activity.endTime,
      description: activity.description,
    })),
  };
}
