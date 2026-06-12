import assert from "node:assert/strict";
import test from "node:test";
import { CourseActivityType } from "@prisma/client";
import { parseCourseActivities, validateActivitiesWithinCourse } from "../course-activities";

function activityForm(rows: { name: string; type: CourseActivityType; start: string; end: string; description?: string }[]) {
  const formData = new FormData();
  for (const row of rows) {
    formData.append("activityId", "");
    formData.append("activityName", row.name);
    formData.append("activityType", row.type);
    formData.append("activityStartTime", row.start);
    formData.append("activityEndTime", row.end);
    formData.append("activityDescription", row.description ?? "");
  }
  return formData;
}

test("course activities parse and sort chronologically", () => {
  const parsed = parseCourseActivities(activityForm([
    { name: "Sparring", type: CourseActivityType.SPARRING, start: "18:20", end: "19:00" },
    { name: "Warm Up", type: CourseActivityType.WARM_UP, start: "18:00", end: "18:20" },
  ]));

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.activities.map((activity) => activity.name), ["Warm Up", "Sparring"]);
  }
});

test("course activities reject overlaps", () => {
  const parsed = parseCourseActivities(activityForm([
    { name: "Warm Up", type: CourseActivityType.WARM_UP, start: "18:00", end: "18:30" },
    { name: "Sparring", type: CourseActivityType.SPARRING, start: "18:20", end: "19:00" },
  ]));

  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.errors.activities?.[0] ?? "", /overlaps/);
});

test("course activities reject rows outside the course time window", () => {
  const parsed = parseCourseActivities(activityForm([
    { name: "Dinner", type: CourseActivityType.DINNER, start: "19:30", end: "20:30" },
  ]));

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    const validated = validateActivitiesWithinCourse(parsed.activities, "18:00", "20:00");
    assert.equal(validated.ok, false);
    if (!validated.ok) assert.match(validated.errors.activities?.[0] ?? "", /fit within/);
  }
});

test("custom activity requires a custom name", () => {
  const parsed = parseCourseActivities(activityForm([
    { name: "", type: CourseActivityType.CUSTOM, start: "19:30", end: "20:00" },
  ]));

  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.errors.activities?.[0] ?? "", /custom Activity Name/);
});
