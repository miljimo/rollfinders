import { type CourseActivity, type Prisma } from "@prisma/client";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { prisma } from "@/lib/prisma";
import type { CourseActivityInput } from "./course-activities";

export function courseActivityData(activity: CourseActivityInput, sortOrder: number): Prisma.CourseActivityCreateManyCourseInput {
  return {
    name: activity.name,
    activityType: activity.activityType,
    startTime: activity.startTime,
    endTime: activity.endTime,
    description: activity.description ?? null,
    sortOrder,
  };
}

export async function replaceCourseActivities(courseId: string, activities: CourseActivityInput[], existingActivities: CourseActivity[] = []) {
  const existingIds = new Set(existingActivities.map((activity) => activity.id));
  const submittedIds = new Set(activities.map((activity) => activity.id).filter((id): id is string => Boolean(id)));
  const deletedActivities = existingActivities.filter((activity) => !submittedIds.has(activity.id));

  await prisma.$transaction([
    prisma.courseActivity.deleteMany({
      where: {
        courseId,
        id: { notIn: Array.from(submittedIds) },
      },
    }),
    ...activities.map((activity, index) => {
      const data = courseActivityData(activity, index);
      if (activity.id && existingIds.has(activity.id)) {
        return prisma.courseActivity.update({
          where: { id: activity.id },
          data,
        });
      }
      return prisma.courseActivity.create({
        data: {
          ...data,
          courseId,
        },
      });
    }),
  ]);

  return {
    created: activities.filter((activity) => !activity.id || !existingIds.has(activity.id)),
    updated: activities.filter((activity) => activity.id && existingIds.has(activity.id)),
    deleted: deletedActivities,
  };
}

export async function recordCourseActivityAnalytics(params: {
  academyId: string;
  courseId: string;
  created?: CourseActivityInput[];
  updated?: CourseActivityInput[];
  deleted?: Pick<CourseActivity, "activityType">[];
}) {
  const events: { eventName: "course_activity_created" | "course_activity_updated" | "course_activity_deleted"; activityType: CourseActivity["activityType"] }[] = [
    ...(params.created ?? []).map((activity) => ({ eventName: "course_activity_created" as const, activityType: activity.activityType })),
    ...(params.updated ?? []).map((activity) => ({ eventName: "course_activity_updated" as const, activityType: activity.activityType })),
    ...(params.deleted ?? []).map((activity) => ({ eventName: "course_activity_deleted" as const, activityType: activity.activityType })),
  ];

  await Promise.all(events.map((event) => recordAnalyticsEventBestEffort({
    eventName: event.eventName,
    academyId: params.academyId,
    openMatId: params.courseId,
    courseId: params.courseId,
    source: "admin_courses",
    metadata: { activityType: event.activityType },
  })));
}
