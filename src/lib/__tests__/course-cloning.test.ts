import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CourseActivityType, CourseType, EventAudience, EventPricingType, GiType, Prisma, RecurrenceType } from "@prisma/client";
import { cloneEventForCourseForm } from "@/lib/course-cloning";

describe("course cloning", () => {
  it("prepares an existing event for create form cloning without reusing activity ids", () => {
    const event = {
      id: "event-1",
      title: "Sunday Sparring",
      description: "Rounds",
      academyId: "academy-1",
      eventDate: new Date("2026-06-14T00:00:00.000Z"),
      startTime: "18:30",
      endTime: "20:00",
      giType: GiType.BOTH,
      price: new Prisma.Decimal(10),
      pricingType: EventPricingType.DONATION,
      donationLabel: "Support the mat ${donation}",
      audience: EventAudience.EXTERNAL_ONLY,
      capacity: 30,
      active: true,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      createdById: "user-1",
      recurrenceType: RecurrenceType.NONE,
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceLimit: null,
      recurringSourceId: null,
      courseType: CourseType.OPEN_MAT,
      instructor: null,
      contactEmail: null,
      contactPhone: null,
      locationName: null,
      addressOverride: null,
      activities: [{
        id: "activity-1",
        name: "Rolling",
        activityType: CourseActivityType.ROLLING,
        startTime: "18:30",
        endTime: "20:00",
        description: "Rounds",
      }],
    };

    const clone = cloneEventForCourseForm(event);

    assert.equal(clone.title, "Sunday Sparring (Copy)");
    assert.equal(clone.price, "10");
    assert.equal(clone.donationLabel, "Support the mat ${donation}");
    assert.deepEqual(clone.activities, [{
      name: "Rolling",
      activityType: CourseActivityType.ROLLING,
      startTime: "18:30",
      endTime: "20:00",
      description: "Rounds",
    }]);
  });
});
