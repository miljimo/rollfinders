import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

test("mobile platform PRD keeps WebView release standards explicit", () => {
  const source = readSource("docs/platform/mobile.md");

  assert.match(source, /Phase 1: Mobile Web App/);
  assert.match(source, /Do not start the native shell until `\/mobile` passes/);
  assert.match(source, /https:\/\/rollfinders\.com\/login/);
  assert.match(source, /Payment Handoff/);
  assert.match(source, /system browser, SFSafariViewController, or Chrome Custom Tabs/);
  assert.match(source, /No CRM\/admin features appear in the mobile app/);
});

test("mobile web route renders a public-only app shell with bottom navigation", () => {
  const source = readSource("apps/portal/src/app/mobile/page.tsx");
  const navigationSource = readSource("apps/portal/src/components/MobileNavigation/MobileNavigation.tsx");

  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /MobileNavigation/);
  assert.match(navigationSource, /Mobile app navigation/);
  assert.match(navigationSource, /Home/);
  assert.match(navigationSource, /Search/);
  assert.match(navigationSource, /Map/);
  assert.match(navigationSource, /E-Bookings/);
  assert.match(navigationSource, /Profile/);
  assert.match(source, /Bookings/);
  assert.match(source, /Profile/);
  assert.match(source, /getOpenMatRadar/);
  assert.match(source, /searchAcademies/);
  assert.match(source, /getMapItems/);
  assert.match(source, /loginUrl/);
  assert.doesNotMatch(source, /PageShell/);
  assert.doesNotMatch(source, /href=\{currentUser \? "\/dashboard/);
});
