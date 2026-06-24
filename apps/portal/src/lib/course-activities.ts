import { CourseActivityType } from "@prisma/client";

export const courseActivityTypeLabels: Record<CourseActivityType, string> = {
  WARM_UP: "Warm Up",
  DRILLING: "Drilling",
  TECHNICAL: "Technical",
  ROLLING: "Rolling",
  SPARRING: "Sparring",
  COMPETITION: "Competition",
  Q_AND_A: "Q&A",
  BREAK: "Break",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SOCIAL: "Social",
  CUSTOM: "Custom",
};

export const courseActivityTypeOptions = Object.values(CourseActivityType).map((value) => ({
  value,
  label: courseActivityTypeLabels[value],
}));

export type CourseActivityInput = {
  id?: string;
  name: string;
  activityType: CourseActivityType;
  startTime: string;
  endTime: string;
  description?: string;
};

export type CourseActivityValidationResult =
  | { ok: true; activities: CourseActivityInput[] }
  | { ok: false; errors: Record<string, string[] | undefined> };

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function minutesFromTime(value: string) {
  const match = timePattern.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function stringValues(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value).trim());
}

function compactActivityName(activityType: CourseActivityType, name: string) {
  return name || courseActivityTypeLabels[activityType];
}

export function parseCourseActivities(formData: FormData): CourseActivityValidationResult {
  const ids = stringValues(formData, "activityId");
  const names = stringValues(formData, "activityName");
  const types = stringValues(formData, "activityType");
  const starts = stringValues(formData, "activityStartTime");
  const ends = stringValues(formData, "activityEndTime");
  const descriptions = stringValues(formData, "activityDescription");
  const rowCount = Math.max(ids.length, names.length, types.length, starts.length, ends.length, descriptions.length);
  const activities: CourseActivityInput[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const id = ids[index] || undefined;
    const activityType = types[index];
    const name = names[index] ?? "";
    const startTime = starts[index] ?? "";
    const endTime = ends[index] ?? "";
    const description = descriptions[index] || undefined;
    const rowIsBlank = !id && !activityType && !name && !startTime && !endTime && !description;
    if (rowIsBlank) continue;

    if (!Object.values(CourseActivityType).includes(activityType as CourseActivityType)) {
      return { ok: false, errors: { activities: [`Activity ${index + 1} needs a valid Activity Type.`] } };
    }

    const typedActivityType = activityType as CourseActivityType;
    const activityName = compactActivityName(typedActivityType, name);
    if (typedActivityType === CourseActivityType.CUSTOM && !name) {
      return { ok: false, errors: { activities: [`Activity ${index + 1} needs a custom Activity Name.`] } };
    }
    if (!activityName) return { ok: false, errors: { activities: [`Activity ${index + 1} needs an Activity Name.`] } };
    if (minutesFromTime(startTime) === null || minutesFromTime(endTime) === null) {
      return { ok: false, errors: { activities: [`Activity ${index + 1} needs valid start and end times.`] } };
    }

    activities.push({
      id,
      name: activityName,
      activityType: typedActivityType,
      startTime,
      endTime,
      description,
    });
  }

  const sortedActivities = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
  for (let index = 0; index < sortedActivities.length; index += 1) {
    const activity = sortedActivities[index];
    const start = minutesFromTime(activity.startTime);
    const end = minutesFromTime(activity.endTime);
    if (start === null || end === null || end <= start) {
      return { ok: false, errors: { activities: [`${activity.name} must end after it starts.`] } };
    }
    const previous = sortedActivities[index - 1];
    if (previous && start < (minutesFromTime(previous.endTime) ?? 0)) {
      return { ok: false, errors: { activities: [`${activity.name} overlaps with ${previous.name}.`] } };
    }
  }

  return { ok: true, activities: sortedActivities };
}

export function validateActivitiesWithinCourse(
  activities: CourseActivityInput[],
  courseStartTime: string,
  courseEndTime: string,
): CourseActivityValidationResult {
  const courseStart = minutesFromTime(courseStartTime);
  const courseEnd = minutesFromTime(courseEndTime);
  if (courseStart === null || courseEnd === null) return { ok: true, activities };

  for (const activity of activities) {
    const activityStart = minutesFromTime(activity.startTime);
    const activityEnd = minutesFromTime(activity.endTime);
    if (activityStart === null || activityEnd === null) continue;
    if (activityStart < courseStart || activityEnd > courseEnd) {
      return { ok: false, errors: { activities: [`${activity.name} must fit within the course start and end time.`] } };
    }
  }

  return { ok: true, activities };
}
