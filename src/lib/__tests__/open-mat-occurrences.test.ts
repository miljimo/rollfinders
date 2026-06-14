import assert from "node:assert/strict";
import test from "node:test";
import { CourseType, EventPricingType, GiType, RecurrenceType, type Event } from "@prisma/client";
import { dateKey, expandEventOccurrences, recurrenceLabel } from "../open-mat-occurrences";

function eventFixture(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    academyId: "academy-1",
    createdById: null,
    title: "Friday Open Mat",
    description: "Open mat for visiting grapplers.",
    eventDate: new Date("2026-06-12T00:00:00.000Z"),
    startTime: "18:30",
    endTime: "20:00",
    giType: GiType.BOTH,
    pricingType: EventPricingType.FREE,
    price: 0 as unknown as Event["price"],
    audience: "EXTERNAL_ONLY" as Event["audience"],
    courseType: CourseType.OPEN_MAT,
    instructor: null,
    contactEmail: null,
    contactPhone: null,
    locationName: null,
    addressOverride: null,
    capacity: null,
    active: true,
    recurrenceType: RecurrenceType.WEEKLY,
    recurrenceInterval: 1,
    recurrenceEndDate: null,
    recurrenceLimit: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("expands fortnightly open mats every 2 weeks", () => {
  const occurrences = expandEventOccurrences(eventFixture({ recurrenceInterval: 2 }), {
    from: new Date("2026-06-12T00:00:00.000Z"),
    to: new Date("2026-07-31T00:00:00.000Z"),
    publicOnly: false,
  });

  assert.deepEqual(occurrences.map((occurrence) => dateKey(occurrence.eventDate)), [
    "2026-06-12",
    "2026-06-26",
    "2026-07-10",
    "2026-07-24",
  ]);
});

test("expands weekly open mats every 3 weeks", () => {
  const occurrences = expandEventOccurrences(eventFixture({ recurrenceInterval: 3 }), {
    from: new Date("2026-06-12T00:00:00.000Z"),
    to: new Date("2026-08-01T00:00:00.000Z"),
    publicOnly: false,
  });

  assert.deepEqual(occurrences.map((occurrence) => dateKey(occurrence.eventDate)), [
    "2026-06-12",
    "2026-07-03",
    "2026-07-24",
  ]);
});

test("expands monthly intervals from the source date without drifting after month-end fallback", () => {
  const occurrences = expandEventOccurrences(eventFixture({
    eventDate: new Date("2026-01-31T00:00:00.000Z"),
    recurrenceType: RecurrenceType.MONTHLY,
    recurrenceInterval: 2,
  }), {
    from: new Date("2026-01-31T00:00:00.000Z"),
    to: new Date("2026-08-01T00:00:00.000Z"),
    publicOnly: false,
  });

  assert.deepEqual(occurrences.map((occurrence) => dateKey(occurrence.eventDate)), [
    "2026-01-31",
    "2026-03-31",
    "2026-05-31",
    "2026-07-31",
  ]);
});

test("labels custom recurrence intervals", () => {
  assert.equal(recurrenceLabel(RecurrenceType.WEEKLY, 1), "Weekly");
  assert.equal(recurrenceLabel(RecurrenceType.WEEKLY, 2), "Fortnightly");
  assert.equal(recurrenceLabel(RecurrenceType.WEEKLY, 3), "Every 3 weeks");
  assert.equal(recurrenceLabel(RecurrenceType.MONTHLY, 2), "Every 2 months");
});
