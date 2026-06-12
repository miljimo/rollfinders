import assert from "node:assert/strict";
import test from "node:test";
import { CourseType, RecurrenceType } from "@prisma/client";
import { courseSchema, eventSchema } from "../validators";

const validEvent = {
  academyId: "academy-1",
  title: "Friday Open Mat",
  description: "Open mat for visiting grapplers.",
  eventDate: "2026-06-12",
  startTime: "18:30",
  endTime: "20:00",
  giType: "BOTH",
  price: "0",
  audience: "EXTERNAL_ONLY",
  capacity: "",
  active: "on",
  recurrenceEndDate: "",
  recurrenceLimit: "",
};

test("event recurrence interval defaults to 1", () => {
  const parsed = eventSchema.parse({
    ...validEvent,
    recurrenceType: RecurrenceType.WEEKLY,
    recurrenceInterval: "",
  });

  assert.equal(parsed.recurrenceInterval, 1);
});

test("event recurrence interval accepts custom weekly intervals", () => {
  const parsed = eventSchema.parse({
    ...validEvent,
    recurrenceType: RecurrenceType.WEEKLY,
    recurrenceInterval: "3",
  });

  assert.equal(parsed.recurrenceInterval, 3);
});

test("event recurrence interval rejects monthly intervals above 24", () => {
  const parsed = eventSchema.safeParse({
    ...validEvent,
    recurrenceType: RecurrenceType.MONTHLY,
    recurrenceInterval: "25",
  });

  assert.equal(parsed.success, false);
  assert.deepEqual(parsed.error.flatten().fieldErrors.recurrenceInterval, [
    "Monthly recurrence interval must be 24 months or fewer.",
  ]);
});

test("event recurrence rejects yearly recurrence", () => {
  const parsed = eventSchema.safeParse({
    ...validEvent,
    recurrenceType: RecurrenceType.YEARLY,
    recurrenceInterval: "1",
  });

  assert.equal(parsed.success, false);
  assert.deepEqual(parsed.error.flatten().fieldErrors.recurrenceType, [
    "Yearly recurrence is not supported yet.",
  ]);
});

test("event description accepts safe URI schemes", () => {
  const parsed = eventSchema.safeParse({
    ...validEvent,
    description: "Open mat details at https://example.com/open-mat or mailto:coach@example.com",
    recurrenceType: RecurrenceType.NONE,
  });

  assert.equal(parsed.success, true);
});

test("event description rejects unsafe URI schemes", () => {
  const parsed = eventSchema.safeParse({
    ...validEvent,
    description: "Open mat details javascript:alert(1)",
    recurrenceType: RecurrenceType.NONE,
  });

  assert.equal(parsed.success, false);
  assert.deepEqual(parsed.error.flatten().fieldErrors.description, [
    "Description links may only use http, https, mailto, or tel.",
  ]);
});

test("open mat event validation defaults course type to OPEN_MAT", () => {
  const parsed = eventSchema.parse({
    ...validEvent,
    recurrenceType: RecurrenceType.NONE,
  });

  assert.equal(parsed.courseType, CourseType.OPEN_MAT);
});

test("course validation requires course type", () => {
  const parsed = courseSchema.safeParse({
    ...validEvent,
    recurrenceType: RecurrenceType.NONE,
  });

  assert.equal(parsed.success, false);
  assert.deepEqual(parsed.error.flatten().fieldErrors.courseType, ["Course type is required"]);
});

test("course validation accepts supported non-open-mat course types", () => {
  const parsed = courseSchema.parse({
    ...validEvent,
    title: "Leg Lock Seminar",
    courseType: CourseType.SEMINAR,
    recurrenceType: RecurrenceType.NONE,
  });

  assert.equal(parsed.courseType, CourseType.SEMINAR);
});

test("course validation accepts multiple serialized instructors", () => {
  const parsed = courseSchema.parse({
    ...validEvent,
    title: "Competition Class",
    courseType: CourseType.COMPETITION,
    recurrenceType: RecurrenceType.NONE,
    instructor: "Coach One, Coach Two, Coach Three",
  });

  assert.equal(parsed.instructor, "Coach One, Coach Two, Coach Three");
});

test("course validation rejects unsupported course type values", () => {
  const parsed = courseSchema.safeParse({
    ...validEvent,
    courseType: "DROP_IN_CLASS",
    recurrenceType: RecurrenceType.NONE,
  });

  assert.equal(parsed.success, false);
  assert.ok(parsed.error.flatten().fieldErrors.courseType?.length);
});
