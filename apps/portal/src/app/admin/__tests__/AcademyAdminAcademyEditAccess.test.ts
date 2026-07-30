import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("academy admin academy detail route renders the edit form with platform controls disabled", () => {
  const pageSource = readFileSync("apps/portal/src/app/admin/academies/[id]/page.tsx", "utf8");
  const formSource = readFileSync("apps/portal/src/app/admin/academies/AcademyForm.tsx", "utf8");

  assert.match(pageSource, /<AcademyForm[\s\S]*canManagePlatformFields=\{!academyAdmin\}/);
  assert.doesNotMatch(pageSource, /!\s*academyAdmin\s*\?\s*<AcademyForm/);
  assert.match(formSource, /canManagePlatformFields[\s\S]*<Toggle[\s\S]*name="featured"/);
  assert.match(formSource, /canManagePlatformFields \? \(\s*<>\s*<div className="rounded-md border border-teal-100 bg-teal-50 p-3">/);
});

test("academy updates preserve platform-only fields unless academy.verify is authorised", () => {
  const actionSource = readFileSync("apps/portal/src/app/admin/academies/actions.ts", "utf8");
  const apiSource = readFileSync("apps/portal/src/app/api/admin/academies/[id]/route.ts", "utf8");

  assert.match(actionSource, /authorizeThroughService\(\s*actor,\s*"academy\.verify"/);
  assert.match(actionSource, /canManagePlatformFields[\s\S]*existingAcademy\?\.verificationStatus/);
  assert.match(actionSource, /canManagePlatformFields \? data\.featured : existingAcademy\?\.featured/);
  assert.match(apiSource, /authorizeThroughService\(actor, "academy\.update", academyScope\(actor, academyId\)\)/);
  assert.match(apiSource, /authorizeThroughService\(actor, "academy\.verify", academyScope\(actor, id\)\)/);
  assert.doesNotMatch(apiSource, /users\.admin\.access/);
});
