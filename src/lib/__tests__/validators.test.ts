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

test("event description accepts prose labels with colons", () => {
  const parsed = eventSchema.safeParse({
    ...validEvent,
    description: "Schedule: warm up, rounds, and feedback. Bring: water and a gumshield.",
    recurrenceType: RecurrenceType.NONE,
  });

  assert.equal(parsed.success, true);
});

test("course description accepts prose labels with colons", () => {
  const parsed = courseSchema.safeParse({
    ...validEvent,
    title: "Competition Class",
    courseType: CourseType.COMPETITION,
    description: "Format: drills, rounds, and coaching. Note: suitable for visitors.",
    recurrenceType: RecurrenceType.NONE,
  });

  assert.equal(parsed.success, true);
});

test("course description accepts formatted event copy with times, labels, emojis, hashtags, and safe links", () => {
  const parsed = courseSchema.safeParse({
    ...validEvent,
    title: "Forge Friday",
    courseType: CourseType.TRAINING,
    description: `1) Discussion on current applied roles.
2) Work colleagues and support requirements.

Talk 2 A Brother: Forge Friday: Men's Only Night.

Every other Friday (Fortnightly)

PT.1 7pm to 8.30pm: Jiu-Jitsu Open Mat: NoGi & Gi : All levels
From 7pm to 8:30pm, participants can engage in our all levels NoGi & Gi Jiu-Jitsu open mat forging strength and camaraderie through shared effort.

PT.2 8.30pm to 10pm: ManCave: +21 Meaningful Conversations & Refreshments
As the clock strikes 8:30pm, the atmosphere shifts to our ManCave, a safe haven to unwind, connect and engage in meaningful conversations over light refreshments.

Online via our ManCave Whatsapp group Zoom Link

#FridayNights #MartialArts #MensTalk #SafeSpace #GreatVibes #Oss

Wear Comfortable Clothing;

1. Dri-fit or comfortable t-shirt, shorts, leggings.
2. Barefoot on training mats.
3. Bring along a towel.

Checkout our previous events!!
@ https://www.instagram.com/holisticwellbeinghub?igsh=MXB4bHJzNnU4MDMzbA==`,
    recurrenceType: RecurrenceType.NONE,
  });

  assert.equal(parsed.success, true);
});

test("event description rejects unsupported scheme links", () => {
  const parsed = eventSchema.safeParse({
    ...validEvent,
    description: "Open mat details at ftp://example.com/open-mat",
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
