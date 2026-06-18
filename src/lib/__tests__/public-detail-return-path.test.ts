import assert from "node:assert/strict";
import test from "node:test";
import { publicDetailDashboardDialogPath, publicDetailReturnPath } from "../public-detail-return-path";

test("public detail return path allows dashboard and listing contexts", () => {
  assert.equal(publicDetailReturnPath("/dashboard?panel=open-mats", "/open-mats"), "/dashboard?panel=open-mats");
  assert.equal(publicDetailReturnPath("/courses?q=seminar", "/open-mats"), "/courses?q=seminar");
  assert.equal(publicDetailReturnPath("/academies/brixton-jiu-jitsu", "/open-mats"), "/academies/brixton-jiu-jitsu");
});

test("public detail return path rejects external or unsafe targets", () => {
  assert.equal(publicDetailReturnPath("https://example.com/dashboard?panel=open-mats", "/open-mats"), "/open-mats");
  assert.equal(publicDetailReturnPath("//example.com/dashboard?panel=open-mats", "/open-mats"), "/open-mats");
  assert.equal(publicDetailReturnPath("/admin?panel=open-mats", "/open-mats"), "/open-mats");
  assert.equal(publicDetailReturnPath("/dashboardevil?panel=open-mats", "/open-mats"), "/open-mats");
});

test("public detail dashboard dialog path canonicalizes dashboard course returns", () => {
  assert.equal(
    publicDetailDashboardDialogPath("/dashboard?panel=open-mats", "event-1"),
    "/dashboard?panel=open-mats&dialog=view-event&eventId=event-1",
  );
  assert.equal(
    publicDetailDashboardDialogPath("/dashboard?panel=open-mats&page=2", "event-1"),
    "/dashboard?panel=open-mats&page=2&dialog=view-event&eventId=event-1",
  );
  assert.equal(publicDetailDashboardDialogPath("/courses", "event-1"), null);
  assert.equal(publicDetailDashboardDialogPath("/dashboard?panel=users", "event-1"), null);
  assert.equal(publicDetailDashboardDialogPath("https://example.com/dashboard?panel=open-mats", "event-1"), null);
});
