import { CourseActivityType, CourseType, EventAudience, EventPricingType, GiType, RecurrenceType, type CourseActivity, type Event } from "@prisma/client";
import { courseActivityTypeLabels, minutesFromTime } from "./course-activities";
import { apiGatewayUrl } from "./apiGateway";
import { getEnvVariable } from "./environments";

if (typeof window !== "undefined") {
  throw new Error("Course service calls are server-only.");
}

type CourseServiceEvent = Pick<Event,
  | "id"
  | "academyId"
  | "title"
  | "description"
  | "courseType"
  | "pricingType"
  | "price"
  | "capacity"
  | "active"
  | "createdById"
  | "eventDate"
  | "startTime"
  | "endTime"
  | "giType"
  | "donationLabel"
  | "audience"
  | "instructor"
  | "contactEmail"
  | "contactPhone"
  | "locationName"
  | "addressOverride"
  | "recurrenceType"
  | "recurrenceInterval"
  | "recurrenceEndDate"
  | "recurrenceLimit"
> & {
  activities?: Pick<CourseActivity, "id" | "name" | "activityType" | "startTime" | "endTime" | "description" | "sortOrder">[];
};

export type RollfindersCourseRecord = Omit<Event, "price"> & {
  price: number;
};

export type RollfindersCourseActivityRecord = Omit<CourseActivity, "createdAt" | "updatedAt"> & {
  createdAt?: Date;
  updatedAt?: Date;
};

type CourseServiceCourseResponse = {
  id: string;
  organisation_id: string;
  course_type_id: string;
  title: string;
  description?: string;
  capacity?: number;
  price_amount?: number;
  status: string;
  created_by_user_id?: string;
  integration_metadata?: Record<string, unknown>;
  created_at: string;
};

type CourseServiceActivityResponse = {
  id: string;
  course_id: string;
  title: string;
  activity_type?: string;
  description?: string;
  start_offset_minutes: number;
  duration_minutes: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export class CourseServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CourseServiceError";
  }
}

const courseServiceUrl = apiGatewayUrl;
const courseServiceRequired = () => getEnvVariable("COURSE_SERVICE_REQUIRED", "false").toLowerCase() === "true";

function headers() {
  return {
    "Content-Type": "application/json",
  };
}

async function parseResponse(response: Response) {
  if (response.status === 204) return {};
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.message === "string"
      ? body.message
      : typeof body?.error === "string"
        ? body.error
        : `Course service request failed with status ${response.status}.`;
    throw new CourseServiceError(message, response.status);
  }
  return body;
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${courseServiceUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...headers(),
      ...init.headers,
    },
  });
  return parseResponse(response);
}

function stringValue(metadata: Record<string, unknown>, key: string, fallback = "") {
  const value = metadata[key];
  return typeof value === "string" ? value : fallback;
}

function numberValue(metadata: Record<string, unknown>, key: string, fallback: number) {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableDateValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function enumValue<T extends string>(values: Record<string, T>, value: string, fallback: T) {
  return Object.values(values).includes(value as T) ? value as T : fallback;
}

function minutesToTime(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function courseFromService(item: CourseServiceCourseResponse): RollfindersCourseRecord {
  const metadata = item.integration_metadata ?? {};
  return {
    id: item.id,
    academyId: stringValue(metadata, "academy_id", item.organisation_id),
    createdById: item.created_by_user_id || null,
    title: item.title,
    description: item.description ?? "",
    eventDate: nullableDateValue(metadata, "event_date") ?? new Date(item.created_at),
    startTime: stringValue(metadata, "start_time", "00:00"),
    endTime: stringValue(metadata, "end_time", "00:01"),
    giType: enumValue(GiType, stringValue(metadata, "gi_type"), GiType.BOTH),
    price: Number(item.price_amount ?? 0),
    pricingType: enumValue(EventPricingType, stringValue(metadata, "pricing_type"), Number(item.price_amount ?? 0) === 0 ? EventPricingType.FREE : EventPricingType.FIXED),
    donationLabel: stringValue(metadata, "donation_label") || null,
    audience: enumValue(EventAudience, stringValue(metadata, "audience"), EventAudience.EXTERNAL_ONLY),
    courseType: enumValue(CourseType, stringValue(metadata, "course_type"), CourseType.OPEN_MAT),
    instructor: stringValue(metadata, "instructor") || null,
    contactEmail: stringValue(metadata, "contact_email") || null,
    contactPhone: stringValue(metadata, "contact_phone") || null,
    locationName: stringValue(metadata, "location_name") || null,
    addressOverride: stringValue(metadata, "address_override") || null,
    capacity: item.capacity ?? null,
    active: item.status === "ACTIVE",
    recurrenceType: enumValue(RecurrenceType, stringValue(metadata, "recurrence_type"), RecurrenceType.NONE),
    recurrenceInterval: numberValue(metadata, "recurrence_interval", 1),
    recurrenceEndDate: nullableDateValue(metadata, "recurrence_end_date"),
    recurrenceLimit: numberValue(metadata, "recurrence_limit", 0) || null,
    createdAt: new Date(item.created_at),
  };
}

function activityFromService(item: CourseServiceActivityResponse, courseStartTime: string): RollfindersCourseActivityRecord {
  const courseStart = minutesFromTime(courseStartTime) ?? 0;
  const start = courseStart + item.start_offset_minutes;
  const end = start + item.duration_minutes;
  const activityType = enumValue(CourseActivityType, item.activity_type ?? "", CourseActivityType.CUSTOM);
  return {
    id: item.id,
    courseId: item.course_id,
    name: item.title,
    activityType,
    startTime: minutesToTime(start),
    endTime: minutesToTime(end),
    description: item.description ?? null,
    sortOrder: item.sort_order,
    createdAt: item.created_at ? new Date(item.created_at) : undefined,
    updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
  };
}

function courseTypeId(courseType: CourseType) {
  return `platform_${courseType.toLowerCase()}`.replace(/[^a-z0-9_-]/g, "_");
}

function priceAmount(event: CourseServiceEvent) {
  if (event.pricingType === EventPricingType.FREE) return 0;
  const value = Number(event.price);
  return Number.isFinite(value) ? value : 0;
}

function activityDurationMinutes(activity: Pick<CourseActivity, "startTime" | "endTime">) {
  const start = minutesFromTime(activity.startTime);
  const end = minutesFromTime(activity.endTime);
  if (start === null || end === null || end <= start) return 0;
  return end - start;
}

function activityStartOffsetMinutes(eventStartTime: string, activityStartTime: string) {
  const eventStart = minutesFromTime(eventStartTime);
  const activityStart = minutesFromTime(activityStartTime);
  if (eventStart === null || activityStart === null) return 0;
  return Math.max(0, activityStart - eventStart);
}

async function syncCourseType(event: CourseServiceEvent) {
  return courseTypeId(event.courseType);
}

async function syncCourse(event: CourseServiceEvent, courseTypeID: string) {
  await request("/v1/courses", {
    method: "POST",
    body: JSON.stringify({
      id: event.id,
      organisation_id: event.academyId,
      course_type_id: courseTypeID,
      title: event.title,
      description: event.description ?? "",
      capacity: event.capacity ?? 0,
      price_amount: priceAmount(event),
      currency: "GBP",
      status: event.active ? "ACTIVE" : "INACTIVE",
      created_by_user_id: event.createdById ?? "",
      integration_metadata: {
        source: "rollfinders",
        academy_id: event.academyId,
        course_type: event.courseType,
        event_date: event.eventDate.toISOString(),
        start_time: event.startTime,
        end_time: event.endTime,
        gi_type: event.giType,
        pricing_type: event.pricingType,
        donation_label: event.donationLabel,
        audience: event.audience,
        instructor: event.instructor,
        contact_email: event.contactEmail,
        contact_phone: event.contactPhone,
        location_name: event.locationName,
        address_override: event.addressOverride,
        recurrence_type: event.recurrenceType,
        recurrence_interval: event.recurrenceInterval,
        recurrence_end_date: event.recurrenceEndDate?.toISOString() ?? null,
        recurrence_limit: event.recurrenceLimit,
      },
    }),
  });
}

async function syncActivities(event: CourseServiceEvent) {
  await Promise.all((event.activities ?? []).map((activity, index) => request(`/v1/courses/${encodeURIComponent(event.id)}/activities`, {
    method: "POST",
    body: JSON.stringify({
      id: activity.id,
      title: activity.name || courseActivityTypeLabels[activity.activityType],
      activity_type: activity.activityType,
      description: activity.description ?? "",
      start_offset_minutes: activityStartOffsetMinutes(event.startTime, activity.startTime),
      duration_minutes: activityDurationMinutes(activity),
      sort_order: activity.sortOrder ?? index,
    }),
  })));
}

export async function syncRollfindersCourseToCourseService(event: CourseServiceEvent) {
  try {
    const courseTypeID = await syncCourseType(event);
    await syncCourse(event, courseTypeID);
    await syncActivities(event);
  } catch (error) {
    if (courseServiceRequired()) throw error;
    console.error("Course service sync failed", error);
  }
}

export async function deleteRollfindersCourseFromCourseService(id: string) {
  try {
    await request(`/v1/courses/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    if (courseServiceRequired()) throw error;
    console.error("Course service delete failed", error);
  }
}

export async function listRollfindersCoursesFromCourseService(organisationId?: string) {
  const params = new URLSearchParams();
  if (organisationId) params.set("organisation_id", organisationId);
  const body = await request(`/v1/courses${params.size ? `?${params.toString()}` : ""}`) as { items?: CourseServiceCourseResponse[] };
  return (body.items ?? [])
    .map(courseFromService)
    .filter((course) => course.active);
}

export async function getRollfindersCourseFromCourseService(id: string) {
  try {
    const item = await request(`/v1/courses/${encodeURIComponent(id)}`) as CourseServiceCourseResponse;
    const course = courseFromService(item);
    return course.active ? course : null;
  } catch (error) {
    if (error instanceof CourseServiceError && error.status === 404) return null;
    throw error;
  }
}

export async function listRollfindersCourseActivitiesFromCourseService(course: Pick<RollfindersCourseRecord, "id" | "startTime">) {
  const body = await request(`/v1/courses/${encodeURIComponent(course.id)}/activities`) as { items?: CourseServiceActivityResponse[] };
  return (body.items ?? []).map((item) => activityFromService(item, course.startTime));
}
