import { ClaimStatus, CourseActivityType, CourseType, EventAudience, EventPricingType, GiType, type Academy, type Event } from "@prisma/client";
import { courseActivityTypeLabels } from "./course-activities";
import { addDays, defaultOccurrenceWindowEnd, dedupeOccurrences, expandEventOccurrences, recurrenceLabel as occurrenceRecurrenceLabel, startOfDay } from "./open-mat-occurrences";
import { courseTypeLabels } from "./course-types";
import {
  getRollfindersCourseFromCourseService,
  listRollfindersCourseActivitiesFromCourseService,
  listRollfindersCoursesFromCourseService,
  type RollfindersCourseActivityRecord,
  type RollfindersCourseRecord,
} from "./courseService";
import { getAcademyFromAcademyService } from "./academyService";
import { distanceMiles } from "./utils";

export { courseTypeLabel, courseTypeLabels, courseTypeOptions, selectableCourseTypeOptions } from "./course-types";

export type CourseWithAcademy = RollfindersCourseRecord & { academy: Academy; distanceMiles?: number | null };
type AcademyWithTrust = Academy & { members: { id: string }[]; claims: { status: ClaimStatus }[] };
type ServiceCourseWithAcademy = RollfindersCourseRecord & { academy: AcademyWithTrust };

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
  gi?: string;
  when?: string;
  latitude?: number;
  longitude?: number;
  academyId?: string;
};

export const publicDefaultRecurringCourseOccurrenceLimit = 3;
const defaultSearchLocation = { latitude: 51.5072, longitude: -0.1276 };

function searchLocation(filters: CourseFilters) {
  return Number.isFinite(filters.latitude) && Number.isFinite(filters.longitude)
    ? { latitude: filters.latitude as number, longitude: filters.longitude as number }
    : defaultSearchLocation;
}

function getWeekendRange(now = new Date()) {
  const today = startOfDay(now);
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  const saturday = addDays(today, daysUntilSaturday);
  return { gte: saturday, lt: addDays(saturday, 2) };
}

function textMatches(value: unknown, q: string) {
  return typeof value === "string" && value.toLowerCase().includes(q);
}

function selectedCourseType(value?: string) {
  return value && value !== "ANY" && Object.values(CourseType).includes(value as CourseType) ? value as CourseType : undefined;
}

function selectedGi(q: string, gi?: string) {
  if (gi) return gi;
  const lower = q.toLowerCase();
  if (lower.includes("no-gi") || lower.includes("nogi")) return "NO_GI";
  if (lower.includes("gi")) return "GI";
  return "";
}

function hasDateIntent(filters: CourseFilters) {
  return filters.when === "today" || filters.when === "tomorrow" || filters.when === "weekend";
}

function courseMatchesSearch(course: ServiceCourseWithAcademy, activities: RollfindersCourseActivityRecord[], q: string) {
  if (!q) return true;
  const lower = q.toLowerCase();
  const matchingCourseType = Object.entries(courseTypeLabels).some(([type, label]) => type === course.courseType && label.toLowerCase().includes(lower));
  const matchingActivityType = Object.entries(courseActivityTypeLabels).some(([type, label]) => (
    activities.some((activity) => activity.activityType === type)
    && (type.toLowerCase().includes(lower) || label.toLowerCase().includes(lower))
  ));
  return (
    matchingCourseType
    || matchingActivityType
    || textMatches(course.title, lower)
    || textMatches(course.description, lower)
    || textMatches(course.instructor, lower)
    || textMatches(course.locationName, lower)
    || textMatches(course.addressOverride, lower)
    || textMatches(course.academy.name, lower)
    || textMatches(course.academy.city, lower)
    || textMatches(course.academy.borough, lower)
    || textMatches(course.academy.postcode, lower)
    || activities.some((activity) => textMatches(activity.name, lower) || textMatches(activity.description, lower))
  );
}

async function hydrateCoursesFromService(filters: CourseFilters = {}) {
  const serviceCourses = await listRollfindersCoursesFromCourseService(filters.academyId);
  const academyIds = [...new Set(serviceCourses.map((course) => course.academyId))];
  const academies = (await Promise.all(academyIds.map((academyId) => getAcademyFromAcademyService(academyId))))
    .filter((academy): academy is NonNullable<typeof academy> => Boolean(academy));
  const academyById = new Map(academies.map((academy) => [academy.id, academy as AcademyWithTrust]));
  const courses: ServiceCourseWithAcademy[] = serviceCourses
    .flatMap((course) => {
      const academy = academyById.get(course.academyId);
      return academy ? [{ ...course, academy }] : [];
    });
  const activityEntries = await Promise.all(courses.map(async (course) => [course.id, await listRollfindersCourseActivitiesFromCourseService(course)] as const));
  return {
    courses,
    activitiesByCourseId: new Map(activityEntries),
  };
}

export async function getCourseDiscovery(filters: CourseFilters = {}) {
  const q = filters.q?.trim() ?? "";
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);
  const weekend = getWeekendRange(today);
  const occurrenceRange =
    filters.when === "today"
      ? { gte: today, lt: tomorrow }
      : filters.when === "tomorrow"
        ? { gte: tomorrow, lt: dayAfterTomorrow }
        : filters.when === "weekend"
          ? weekend
          : { gte: today, lt: defaultOccurrenceWindowEnd(now) };
  const courseType = selectedCourseType(filters.courseType);
  const gi = selectedGi(q, filters.gi);
  const { courses, activitiesByCourseId } = await hydrateCoursesFromService(filters);
  const filtered = courses.filter((course) => (
    (!courseType || course.courseType === courseType)
    && (gi !== "GI" || course.giType === GiType.GI || course.giType === GiType.BOTH)
    && (gi !== "NO_GI" || course.giType === GiType.NO_GI || course.giType === GiType.BOTH)
    && courseMatchesSearch(course, activitiesByCourseId.get(course.id) ?? [], q)
  ));

  const origin = searchLocation(filters);
  const maxVisibleOccurrences = hasDateIntent(filters) ? undefined : publicDefaultRecurringCourseOccurrenceLimit;
  const occurrences = dedupeOccurrences(filtered.flatMap((event) => expandEventOccurrences(
    event as unknown as Event & { academy: Academy },
    { from: occurrenceRange.gte, to: occurrenceRange.lt, maxVisibleOccurrences, now },
  )));
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
  const course = await getRollfindersCourseFromCourseService(id);
  if (!course) return null;
  const [academy, activities] = await Promise.all([
    getAcademyFromAcademyService(course.academyId),
    listRollfindersCourseActivitiesFromCourseService(course),
  ]);
  if (!academy) return null;
  const event = { ...course, academy, activities } as unknown as Event & { academy: Academy; activities: RollfindersCourseActivityRecord[] };

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
