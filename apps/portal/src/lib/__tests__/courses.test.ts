import assert from "node:assert/strict";
import test from "node:test";
import { CourseType } from "@prisma/client";
import {
  courseDisplayName,
  courseHref,
  courseTypeLabel,
  isOpenMatCourse,
  openMatHref,
  selectableCourseTypeOptions,
} from "../courses";

test("course helpers centralize display name and labels", () => {
  assert.equal(courseDisplayName({ title: "Friday Open Mat" }), "Friday Open Mat");
  assert.equal(courseTypeLabel(CourseType.OPEN_MAT), "Open Mat");
  assert.equal(courseTypeLabel(CourseType.PRIVATE_LESSON), "Private Lesson");
});

test("course hrefs preserve Open Mat URLs and route other courses to planned course URLs", () => {
  assert.equal(isOpenMatCourse({ courseType: CourseType.OPEN_MAT }), true);
  assert.equal(openMatHref({ id: "event-1", isRecurringOccurrence: true, occurrenceDateParam: "2026-06-12" }), "/open-mats/event-1?date=2026-06-12");
  assert.equal(courseHref({ id: "event-1", courseType: CourseType.OPEN_MAT }), "/open-mats/event-1");
  assert.equal(courseHref({ id: "event-2", courseType: CourseType.SEMINAR }), "/courses/event-2");
});

test("selectable course type options do not include activity types", () => {
  const values = selectableCourseTypeOptions.map((option) => String(option.value));
  assert.equal(values.includes(CourseType.SPARRING), false);
  assert.equal(values.includes(CourseType.OPEN_MAT), true);
});
