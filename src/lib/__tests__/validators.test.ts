import assert from "node:assert/strict";
import test from "node:test";
import { RecurrenceType } from "@prisma/client";
import { eventSchema } from "../validators";

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
