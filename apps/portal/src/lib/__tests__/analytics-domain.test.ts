import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyticsAggregationDate } from "../analytics/aggregation";
import { parseAnalyticsPayload, sanitizeAnalyticsMetadata } from "../analytics/domain";
import { createAnalyticsId, validAnalyticsId } from "../analytics/identity";

describe("analytics domain", () => {
  it("accepts known event names and required academy metadata", () => {
    const payload = parseAnalyticsPayload({
      eventName: "academy_profile_viewed",
      academyId: "academy-1",
      countryCode: "gb",
      source: "public_academy_profile",
      metadata: {
        slug: "foundry-bjj",
        city: "London",
        hasUpcomingOpenMats: true,
      },
    });

    assert.equal(payload?.eventName, "academy_profile_viewed");
    assert.equal(payload?.academyId, "academy-1");
    assert.equal(payload?.countryCode, "GB");
    assert.equal(payload?.countryName, "United Kingdom");
    assert.equal(payload?.metadata?.slug, "foundry-bjj");
  });

  it("accepts open mat and claim event metadata", () => {
    assert.equal(parseAnalyticsPayload({
      eventName: "open_mat_viewed",
      academyId: "academy-1",
      openMatId: "event-1",
      source: "public_open_mat_detail",
      metadata: { giType: "NO_GI", active: true },
    })?.openMatId, "event-1");

    assert.equal(parseAnalyticsPayload({
      eventName: "claim_profile_submitted",
      academyId: "academy-1",
      source: "public_academy_claim",
      metadata: { claimId: "claim-1" },
    })?.metadata?.claimId, "claim-1");
  });

  it("accepts course analytics identifiers and type metadata", () => {
    const payload = parseAnalyticsPayload({
      eventName: "course_viewed",
      academyId: "academy-1",
      courseId: "event-2",
      courseType: "SEMINAR",
      source: "public_course_detail",
      metadata: { recurrenceState: "one_off" },
    });

    assert.equal(payload?.courseId, "event-2");
    assert.equal(payload?.courseType, "SEMINAR");
    assert.equal(payload?.metadata?.recurrenceState, "one_off");
  });

  it("rejects unknown event names before persistence", () => {
    assert.equal(parseAnalyticsPayload({ eventName: "unknown_event" }), null);
  });

  it("keeps metadata primitive and bounded", () => {
    const metadata = sanitizeAnalyticsMetadata({
      ok: "x".repeat(600),
      count: 3,
      nested: { private: "ignored" },
      "bad key": "ignored",
    });

    assert.equal(String(metadata.ok).length, 500);
    assert.equal(metadata.count, 3);
    assert.equal("nested" in metadata, false);
    assert.equal("bad key" in metadata, false);
  });

  it("generates anonymous opaque identifiers", () => {
    const id = createAnalyticsId();
    assert.equal(validAnalyticsId(id), true);
    assert.equal(validAnalyticsId("person@example.com"), false);
  });

  it("parses aggregation dates", () => {
    assert.equal(analyticsAggregationDate("2026-06-08"), "2026-06-08");
    assert.equal(analyticsAggregationDate("not-a-date"), null);
  });
});
