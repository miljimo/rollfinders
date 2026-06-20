"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CourseType, EventPricingType, RecurrenceType, type Event } from "@prisma/client";
import type { z } from "zod";
import { requireAcademyOpenMatCreator, requireOpenMatAccess } from "@/lib/academy-access";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { parseCourseActivities, validateActivitiesWithinCourse } from "@/lib/course-activities";
import { recordCourseActivityAnalytics, replaceCourseActivities } from "@/lib/course-activities-server";
import { addDays, dateKey, defaultOccurrenceWindowEnd, expandEventOccurrences, startOfDay } from "@/lib/open-mat-occurrences";
import { prisma } from "@/lib/prisma";
import { courseSchema } from "@/lib/validators";

export type CourseFormState = {
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
  values: Record<string, string>;
};

function getFormValues(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key]) => !key.startsWith("$ACTION_"))
      .map(([key, value]) => [key, String(value)]),
  );
}

function formError(formData: FormData, fieldErrors: Record<string, string[] | undefined>, message = "Please fix the highlighted fields and try again."): CourseFormState {
  return { message, fieldErrors, values: getFormValues(formData) };
}

type CourseInput = z.infer<typeof courseSchema>;

function selectableCourseType(courseType: CourseType): CourseInput["courseType"] {
  return courseType === CourseType.SPARRING ? CourseType.TRAINING : courseType;
}

function courseData(data: CourseInput) {
  return {
    academyId: data.academyId,
    title: data.title,
    courseType: data.courseType,
    description: data.description,
    eventDate: data.eventDate,
    startTime: data.startTime,
    endTime: data.endTime,
    giType: data.giType,
    pricingType: data.pricingType,
    price: data.pricingType === EventPricingType.FREE ? 0 : data.price,
    donationLabel: data.pricingType === EventPricingType.DONATION ? data.donationLabel ?? null : null,
    audience: data.pricingType === EventPricingType.FIXED && data.price > 0 ? data.audience : "EXTERNAL_ONLY" as const,
    capacity: data.capacity === "" || data.capacity === undefined ? null : data.capacity,
    active: data.active,
    recurrenceType: data.recurrenceType,
    recurrenceInterval: data.recurrenceType === RecurrenceType.NONE ? 1 : data.recurrenceInterval,
    recurrenceEndDate: data.recurrenceType === RecurrenceType.NONE ? null : data.recurrenceEndDate ?? null,
    recurrenceLimit: data.recurrenceType === RecurrenceType.NONE ? null : data.recurrenceLimit ?? null,
    instructor: data.instructor ?? null,
    contactEmail: data.contactEmail ?? null,
    contactPhone: data.contactPhone ?? null,
    locationName: data.locationName ?? null,
    addressOverride: data.addressOverride ?? null,
  };
}

async function parseCourseData(formData: FormData) {
  const parsed = courseSchema.safeParse(getFormValues(formData));
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  const activities = parseCourseActivities(formData);
  if (!activities.ok) return { ok: false as const, errors: activities.errors };
  const activitiesWithinCourse = validateActivitiesWithinCourse(activities.activities, parsed.data.startTime, parsed.data.endTime);
  if (!activitiesWithinCourse.ok) return { ok: false as const, errors: activitiesWithinCourse.errors };
  return { ok: true as const, data: parsed.data, activities: activitiesWithinCourse.activities };
}

function occurrenceDatesFor(data: ReturnType<typeof courseData>, from = startOfDay(data.eventDate), to = defaultOccurrenceWindowEnd(from)) {
  const event = {
    id: "__candidate__",
    academyId: data.academyId,
    createdById: null,
    title: data.title,
    description: data.description,
    eventDate: data.eventDate,
    startTime: data.startTime,
    endTime: data.endTime,
    giType: data.giType,
    pricingType: data.pricingType,
    price: data.price,
    donationLabel: data.donationLabel,
    audience: data.audience,
    courseType: data.courseType,
    instructor: data.instructor,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    locationName: data.locationName,
    addressOverride: data.addressOverride,
    capacity: data.capacity,
    active: data.active,
    recurrenceType: data.recurrenceType,
    recurrenceInterval: data.recurrenceInterval,
    recurrenceEndDate: data.recurrenceEndDate,
    recurrenceLimit: data.recurrenceLimit,
    createdAt: new Date(),
  } as unknown as Event;

  return new Set(expandEventOccurrences(event, { from, to, publicOnly: false }).map((occurrence) => dateKey(occurrence.eventDate)));
}

async function findDuplicateCourse(id: string | undefined, data: ReturnType<typeof courseData>) {
  const from = startOfDay(data.eventDate);
  const to = data.recurrenceEndDate ? addDays(data.recurrenceEndDate, 1) : defaultOccurrenceWindowEnd(from);
  const candidateDates = occurrenceDatesFor(data, from, to);
  const existingEvents = await prisma.event.findMany({
    where: {
      ...(id ? { id: { not: id } } : {}),
      academyId: data.academyId,
      courseType: data.courseType,
      title: { equals: data.title.trim(), mode: "insensitive" },
      startTime: data.startTime,
      OR: [
        { eventDate: { gte: from, lt: to } },
        {
          recurrenceType: { not: RecurrenceType.NONE },
          eventDate: { lt: to },
          OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: from } }],
        },
      ],
    },
  });

  for (const existing of existingEvents) {
    const existingDates = occurrenceDatesFor(courseData({
      academyId: existing.academyId,
      title: existing.title,
      courseType: selectableCourseType(existing.courseType),
      description: existing.description,
      eventDate: existing.eventDate,
      startTime: existing.startTime,
      endTime: existing.endTime,
      giType: existing.giType,
      pricingType: existing.pricingType,
      price: Number(existing.price),
      donationLabel: existing.donationLabel ?? undefined,
      audience: existing.audience,
      capacity: existing.capacity ?? undefined,
      active: existing.active,
      recurrenceType: existing.recurrenceType,
      recurrenceInterval: existing.recurrenceInterval,
      recurrenceEndDate: existing.recurrenceEndDate ?? undefined,
      recurrenceLimit: existing.recurrenceLimit ?? undefined,
      instructor: existing.instructor ?? undefined,
      contactEmail: existing.contactEmail ?? undefined,
      contactPhone: existing.contactPhone ?? undefined,
      locationName: existing.locationName ?? undefined,
      addressOverride: existing.addressOverride ?? undefined,
    }), from, to);
    for (const existingDate of existingDates) if (candidateDates.has(existingDate)) return existing;
  }
  return null;
}

function duplicateError(formData: FormData): CourseFormState {
  return formError(formData, {
    title: ["Use the existing course or choose a different name/time."],
    eventDate: ["This date already has a matching course."],
    startTime: ["This start time already has a matching course."],
    courseType: ["This course type already has a matching course."],
  }, "A course with this academy, name, course type, date, and start time already exists.");
}

function courseManagementReturnPath(value: string) {
  const returnTo = value.trim();
  if (
    returnTo.startsWith("/dashboard?panel=open-mats")
    || returnTo.startsWith("/admin?panel=open-mats")
    || returnTo.startsWith("/admin/courses")
  ) {
    return returnTo;
  }
  return "/dashboard?panel=open-mats";
}

export async function createCourse(_state: CourseFormState, formData: FormData): Promise<CourseFormState> {
  const parsed = await parseCourseData(formData);
  if (!parsed.ok) return formError(formData, parsed.errors);
  const access = await requireAcademyOpenMatCreator(parsed.data.academyId);
  const data = courseData(parsed.data);
  if (await findDuplicateCourse(undefined, data)) return duplicateError(formData);
  const event = await prisma.event.create({ data: { ...data, createdById: access.userId } });
  const activityChanges = await replaceCourseActivities(event.id, parsed.activities);
  await recordCourseActivityAnalytics({
    academyId: event.academyId,
    courseId: event.id,
    created: activityChanges.created,
  });
  await recordAnalyticsEventBestEffort({
    eventName: data.recurrenceType === RecurrenceType.NONE ? "course_created" : "recurring_course_created",
    academyId: event.academyId,
    openMatId: event.id,
    courseId: event.id,
    source: "admin_courses",
    metadata: {
      actorUserId: access.userId,
      courseType: event.courseType,
      recurrenceType: event.recurrenceType,
      recurrenceInterval: event.recurrenceInterval,
    },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  redirect(returnTo.startsWith("/admin") || returnTo.startsWith("/dashboard") ? returnTo : "/admin/courses");
}

export async function updateCourse(id: string, _state: CourseFormState, formData: FormData): Promise<CourseFormState> {
  const parsed = await parseCourseData(formData);
  if (!parsed.ok) return formError(formData, parsed.errors);
  const existing = await prisma.event.findUnique({ where: { id }, select: { academyId: true, createdById: true, activities: true } });
  if (!existing) redirect("/admin/courses");
  await requireOpenMatAccess(existing, "edit");
  if (parsed.data.academyId !== existing.academyId) await requireAcademyOpenMatCreator(parsed.data.academyId);
  const data = courseData(parsed.data);
  if (await findDuplicateCourse(id, data)) return duplicateError(formData);
  const event = await prisma.event.update({ where: { id }, data });
  const activityChanges = await replaceCourseActivities(id, parsed.activities, existing.activities);
  await recordCourseActivityAnalytics({
    academyId: data.academyId,
    courseId: id,
    created: activityChanges.created,
    updated: activityChanges.updated,
    deleted: activityChanges.deleted,
  });
  revalidatePath("/admin/courses");
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath(`/courses/${id}`);
  revalidatePath(`/open-mats/${id}`);
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  redirect(returnTo.startsWith("/admin") || returnTo.startsWith("/dashboard") ? returnTo : "/admin/courses");
}

export async function deleteCourse(id: string, formData?: FormData) {
  const event = await prisma.event.findUnique({ where: { id }, select: { academyId: true, createdById: true } });
  const returnTo = courseManagementReturnPath(String(formData?.get("returnTo") ?? ""));
  if (!event) redirect(returnTo);
  await requireOpenMatAccess(event, "delete");
  await prisma.event.delete({ where: { id } });
  revalidatePath("/admin/courses");
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath("/open-mats");
  redirect(returnTo);
}
