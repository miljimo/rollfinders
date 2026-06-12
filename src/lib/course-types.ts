import type { CourseType } from "@prisma/client";

export const courseTypeValues = [
  "OPEN_MAT",
  "TRAINING",
  "SPARRING",
  "SEMINAR",
  "WORKSHOP",
  "COMPETITION",
  "PRIVATE_LESSON",
] as const satisfies readonly CourseType[];

export const selectableCourseTypeValues = [
  "OPEN_MAT",
  "TRAINING",
  "SEMINAR",
  "WORKSHOP",
  "COMPETITION",
  "PRIVATE_LESSON",
] as const satisfies readonly CourseType[];

export const courseTypeLabels: Record<CourseType, string> = {
  OPEN_MAT: "Open Mat",
  TRAINING: "Training",
  SPARRING: "Sparring",
  SEMINAR: "Seminar",
  WORKSHOP: "Workshop",
  COMPETITION: "Competition",
  PRIVATE_LESSON: "Private Lesson",
};

export const courseTypeOptions = courseTypeValues.map((value) => ({
  value,
  label: courseTypeLabels[value],
}));

export const selectableCourseTypeOptions = selectableCourseTypeValues.map((value) => ({
  value,
  label: courseTypeLabels[value],
}));

export function courseTypeLabel(type: CourseType) {
  return courseTypeLabels[type] ?? type.replaceAll("_", " ");
}
