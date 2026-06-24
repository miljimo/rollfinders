import assert from "node:assert/strict";
import test from "node:test";
import { publicDetailDashboardDialogPath, publicDetailReturnPath } from "../public-detail-return-path";

test("public detail return path allows dashboard and listing contexts", () => {
  assert.equal(publicDetailReturnPath("/dashboard/courses", "/open-mats"), "/dashboard/courses");
  assert.equal(publicDetailReturnPath("/courses?q=seminar", "/open-mats"), "/courses?q=seminar");
  assert.equal(publicDetailReturnPath("/academies/brixton-jiu-jitsu", "/open-mats"), "/academies/brixton-jiu-jitsu");
});

test("public detail return path rejects external or unsafe targets", () => {
  assert.equal(publicDetailReturnPath("https://example.com/dashboard/courses", "/open-mats"), "/open-mats");
  assert.equal(publicDetailReturnPath("//example.com/dashboard/courses", "/open-mats"), "/open-mats");
  assert.equal(publicDetailReturnPath("/admin?panel=open-mats", "/open-mats"), "/open-mats");
  assert.equal(publicDetailReturnPath("/dashboardevil?panel=open-mats", "/open-mats"), "/open-mats");
});

test("public detail dashboard dialog path canonicalizes dashboard course returns", () => {
  assert.equal(
    publicDetailDashboardDialogPath("/dashboard/courses", "event-1"),
    "/dashboard/courses?dialog=view-event&eventId=event-1",
  );
  assert.equal(
    publicDetailDashboardDialogPath("/dashboard/courses?page=2", "event-1"),
    "/dashboard/courses?page=2&dialog=view-event&eventId=event-1",
  );
  assert.equal(publicDetailDashboardDialogPath("/courses", "event-1"), null);
  assert.equal(publicDetailDashboardDialogPath("/dashboard/users", "event-1"), null);
  assert.equal(publicDetailDashboardDialogPath("https://example.com/dashboard/courses", "event-1"), null);
});
