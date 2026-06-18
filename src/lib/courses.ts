import { ClaimStatus, CourseActivityType, CourseType, EventAudience, EventPricingType, RecurrenceType, type Academy, type Event, type Prisma } from "@prisma/client";
import { courseActivityTypeLabels } from "./course-activities";
import { addDays, defaultOccurrenceWindowEnd, dedupeOccurrences, expandEventOccurrences, recurrenceLabel as occurrenceRecurrenceLabel, startOfDay } from "./open-mat-occurrences";
import { courseTypeLabels } from "./course-types";
import { prisma } from "./prisma";
import { distanceMiles } from "./utils";

export { courseTypeLabel, courseTypeLabels, courseTypeOptions, selectableCourseTypeOptions } from "./course-types";

export type CourseWithAcademy = Event & { academy: Academy; distanceMiles?: number | null };

export function courseDisplayName(course: Pick<Event, "title">) {
  return course.title;
}

export function isOpenMatCourse(course: Pick<Event, "courseType">) {
  return course.courseType === CourseType.OPEN_MAT;
}

export function courseHref(course: Pick<Event, "id" | "courseType"> & { isRecurringOccurrence?: boolean; occurrenceDateParam?: string }) {
  const base = isOpenMatCourse(course) ? `/open-mats/${course.id}` : `/courses/${course.id}`;
  return course.isRecurringOccurrence && course.occurrenceDateParam ? `${base}?date=${course.occurrenceDateParam}` : base;
}

export function openMatHref(course: Pick<Event, "id"> & { isRecurringOccurrence?: boolean; occurrenceDateParam?: string }) {
  return courseHref({ ...course, courseType: CourseType.OPEN_MAT });
}

export function courseAddress(course: Pick<Event, "addressOverride"> & { academy: Pick<Academy, "address" | "city" | "postcode"> }) {
  return course.addressOverride?.trim() || `${course.academy.address}, ${course.academy.city} ${course.academy.postcode}`;
}

export function courseLocationLabel(course: Pick<Event, "locationName" | "addressOverride"> & { academy: Pick<Academy, "name" | "address" | "city" | "postcode"> }) {
  return course.locationName?.trim() || course.addressOverride?.trim() || `${course.academy.name}, ${course.academy.city}`;
}

export function coursePriceLabel(course: { price: unknown; audience: EventAudience; pricingType?: EventPricingType; donationLabel?: string | null }) {
  if (course.pricingType === EventPricingType.FREE) return "Free";
  if (course.pricingType === EventPricingType.DONATION) {
    const value = Number(course.price);
    const donation = value > 0 ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value) : "";
    const customLabel = course.donationLabel?.trim();
    if (customLabel) return customLabel.replaceAll("${donation}", donation).replaceAll("$donation", donation).replace(/\s+/g, " ").trim();
    return donation ? `Optional donation - suggested from ${donation}` : "Optional donation";
  }
  const value = Number(course.price);
  if (value === 0) return "Free";
  const price = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
  return course.audience === EventAudience.EXTERNAL_AND_MEMBERS ? `${price} for visitors and members` : `${price} for visitors`;
}

export function recurrenceLabel(course: Pick<Event, "recurrenceType" | "recurrenceInterval">) {
  return occurrenceRecurrenceLabel(course.recurrenceType, course.recurrenceInterval);
}

export type CourseFilters = {
  q?: string;
  courseType?: string;
  latitude?: number;
  longitude?: number;
  academyId?: string;
};

const defaultSearchLocation = { latitude: 51.5072, longitude: -0.1276 };

const academyTrustInclude = {
  members: { select: { id: true } },
  claims: { where: { status: ClaimStatus.APPROVED }, select: { status: true } },
} satisfies Prisma.AcademyInclude;

function searchLocation(filters: CourseFilters) {
  return Number.isFinite(filters.latitude) && Number.isFinite(filters.longitude)
    ? { latitude: filters.latitude as number, longitude: filters.longitude as number }
    : defaultSearchLocation;
}

export async function getCourseDiscovery(filters: CourseFilters = {}) {
  const q = filters.q?.trim() ?? "";
  const lower = q.toLowerCase();
  const now = new Date();
  const today = startOfDay(now);
  const rangeEnd = defaultOccurrenceWindowEnd(now);
  const selectedCourseType = Object.values(CourseType).includes(filters.courseType as CourseType) ? filters.courseType as CourseType : undefined;
  const matchingActivityTypes = Object.entries(courseActivityTypeLabels)
    .filter(([type, label]) => type.toLowerCase().includes(lower) || label.toLowerCase().includes(lower))
    .map(([type]) => type as CourseActivityType);

  const recurrenceWhere = {
    OR: [
      { recurrenceType: RecurrenceType.NONE, eventDate: { gte: today, lt: rangeEnd } },
      {
        recurrenceType: { not: RecurrenceType.NONE },
        eventDate: { lt: rangeEnd },
        OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: today } }],
      },
    ],
  };

  const events = await prisma.event.findMany({
    where: {
      active: true,
      ...(selectedCourseType ? { courseType: selectedCourseType } : {}),
      ...(filters.academyId ? { academyId: filters.academyId } : {}),
      AND: [
        recurrenceWhere,
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { instructor: { contains: q, mode: "insensitive" } },
                { locationName: { contains: q, mode: "insensitive" } },
                { addressOverride: { contains: q, mode: "insensitive" } },
                { academy: { name: { contains: q, mode: "insensitive" } } },
                { academy: { city: { contains: q, mode: "insensitive" } } },
                { academy: { borough: { contains: q, mode: "insensitive" } } },
                { academy: { postcode: { contains: q, mode: "insensitive" } } },
                { activities: { some: { name: { contains: q, mode: "insensitive" } } } },
                { activities: { some: { description: { contains: q, mode: "insensitive" } } } },
                ...(matchingActivityTypes.length ? [{ activities: { some: { activityType: { in: matchingActivityTypes } } } }] : []),
                ...(Object.entries(courseTypeLabels).filter(([, label]) => label.toLowerCase().includes(lower)).map(([type]) => ({ courseType: type as CourseType }))),
              ],
            }
          : {},
      ],
    },
    include: { academy: true },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });

  const origin = searchLocation(filters);
  const occurrences = dedupeOccurrences(events.flatMap((event) => expandEventOccurrences(event, { from: today, to: rangeEnd, now })));
  return occurrences
    .map((event) => ({
      ...event,
      distanceMiles: distanceMiles(origin, { latitude: event.academy.latitude, longitude: event.academy.longitude }),
    }))
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime() || a.startTime.localeCompare(b.startTime) || a.distanceMiles - b.distanceMiles);
}

export const searchCourses = getCourseDiscovery;
export const getCourses = getCourseDiscovery;

export async function getCourseOccurrence(id: string, occurrenceDateParam?: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      academy: { include: academyTrustInclude },
      activities: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!event || !event.active) return null;

  const now = new Date();
  const from = occurrenceDateParam ? startOfDay(new Date(`${occurrenceDateParam}T00:00:00.000Z`)) : startOfDay(now);
  const to = occurrenceDateParam ? addDays(from, 1) : defaultOccurrenceWindowEnd(now);
  const occurrences = expandEventOccurrences(event, { from, to, now });

  if (occurrenceDateParam) {
    const exactOccurrence = occurrences.find((occurrence) => occurrence.occurrenceDateParam === occurrenceDateParam);
    if (exactOccurrence) return exactOccurrence;

    const upcomingOccurrences = expandEventOccurrences(event, {
      from: startOfDay(now),
      to: defaultOccurrenceWindowEnd(now),
      now,
    });
    return upcomingOccurrences[0] ?? event;
  }

  return occurrences[0] ?? event;
}
