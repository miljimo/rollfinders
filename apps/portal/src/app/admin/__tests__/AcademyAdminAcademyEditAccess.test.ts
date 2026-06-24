import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("academy admin academy detail route renders the edit form with platform controls disabled", () => {
  const pageSource = readFileSync("apps/portal/src/app/admin/academies/[id]/page.tsx", "utf8");
  const formSource = readFileSync("apps/portal/src/app/admin/academies/AcademyForm.tsx", "utf8");

  assert.match(pageSource, /<AcademyForm[\s\S]*canManagePlatformFields=\{!academyAdmin\}/);
  assert.doesNotMatch(pageSource, /!\s*academyAdmin\s*\?\s*<AcademyForm/);
  assert.match(formSource, /canManagePlatformFields \? <Toggle name="featured"/);
  assert.match(formSource, /canManagePlatformFields \? \(\s*<>\s*<div className="rounded-md border border-teal-100 bg-teal-50 p-3">/);
});

test("academy admin academy update preserves platform-only academy fields server-side", () => {
  const actionSource = readFileSync("apps/portal/src/app/admin/academies/actions.ts", "utf8");
  const apiSource = readFileSync("apps/portal/src/app/api/admin/academies/[id]/route.ts", "utf8");

  assert.match(actionSource, /isAcademyAdminRole\(actor\?\.role\)[\s\S]*select: \{ verificationStatus: true, featured: true \}/);
  assert.match(actionSource, /verificationStatus: existingAcademy\?\.verificationStatus \?\? data\.verificationStatus/);
  assert.match(actionSource, /featured: existingAcademy\?\.featured \?\? data\.featured/);
  assert.doesNotMatch(apiSource, /isAcademyAdminRole\(actor\?\.role\)\) return NextResponse\.json\(\{ error: "Academy access denied" \}/);
  assert.match(apiSource, /verificationStatus: existingAcademy\?\.verificationStatus \?\? data\.verificationStatus/);
  assert.match(apiSource, /featured: existingAcademy\?\.featured \?\? data\.featured/);
});
