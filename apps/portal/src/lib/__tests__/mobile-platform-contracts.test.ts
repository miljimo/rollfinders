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
  const dashboardSource = readSource("apps/portal/src/app/dashboard/page.tsx");
  const mobileDashboardSource = readSource("apps/portal/src/app/dashboard/MobileDashboardHeader.tsx");
  const mobileDashboardSearchSource = readSource("apps/portal/src/app/dashboard/MobileDashboardSearch.tsx");
  const mobileBookingsSource = readSource("apps/portal/src/app/dashboard/MobilePractitionerBookings.tsx");
  const navigationSource = readSource("apps/portal/src/app/_components/MobileNavigation/MobileNavigation.tsx");
  const proxySource = readSource("apps/portal/src/proxy.ts");
  const signInFormSource = readSource("apps/portal/src/app/mobile/MobileSignInForm.tsx");

  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /export const viewport: Viewport/);
  assert.match(source, /width:\s*"device-width"/);
  assert.match(source, /mobileDataOrEmpty/);
  assert.match(source, /catch\s*\{/);
  assert.match(source, /return\s+\[\]/);
  assert.match(source, /MobileNavigation/);
  assert.match(navigationSource, /Mobile app navigation/);
  assert.match(navigationSource, /min-h-16/);
  assert.match(navigationSource, /truncate/);
  assert.match(navigationSource, /Home/);
  assert.match(navigationSource, /Profile/);
  assert.doesNotMatch(navigationSource, /label:\s*"Search"|label:\s*"Map"|label:\s*"E-Bookings"/);
  assert.match(source, /Bookings/);
  assert.match(source, /Profile/);
  assert.match(source, /getOpenMatRadar/);
  assert.match(source, /searchAcademies/);
  assert.doesNotMatch(source, /getMapItems/);
  assert.match(source, /MobileSignInForm/);
  assert.match(source, /RegisterAcademySelector/);
  assert.match(source, /registerPractitioner/);
  assert.match(source, /auth === "register"/);
  assert.match(source, /auth === "sign-in"/);
  assert.match(signInFormSource, /callbackUrl="\/dashboard\?surface=mobile"/);
  assert.match(signInFormSource, /variant="mobile"/);
  assert.match(source, /name="mobileAuth" value="1"/);
  assert.doesNotMatch(source, /PageShell/);
  assert.match(source, /redirect\("\/dashboard\?surface=mobile"\)/);
  assert.match(dashboardSource, /firstParam\(params\.surface\) === "mobile"/);
  assert.match(dashboardSource, /!mobileSurface && \(platformAdminUser \|\| academyAdminUser\)/);
  assert.match(dashboardSource, /mobileSurface && routePanelRedirect/);
  assert.match(dashboardSource, /mobileSurface && panel === "members"/);
  assert.match(proxySource, /RollFindersMobile/);
  assert.match(proxySource, /path\.startsWith\("\/admin"\)/);
  assert.match(proxySource, /path\.startsWith\("\/dashboard\/"\)/);
  assert.match(proxySource, /mobileDashboardPanels/);
  assert.match(dashboardSource, /<TabControl/);
  assert.match(dashboardSource, /activeValue=\{mobileView\}/);
  assert.match(dashboardSource, /label: "Courses\/Events"/);
  assert.match(dashboardSource, /label: `My Bookings \(\$\{practitionerBookings\.bookings\.length\}\)`/);
  assert.match(dashboardSource, /mobileView === "bookings"/);
  assert.match(dashboardSource, /activeView=\{mobileView\}/);
  assert.match(dashboardSource, /mobileView === "bookings" \? bookingSearchOptions : courseSearchOptions/);
  assert.match(mobileDashboardSearchSource, /AutoCompleteTextField/);
  assert.match(mobileDashboardSearchSource, /params\.set\("search", value\)/);
  assert.match(mobileDashboardSearchSource, /activeView === "bookings"/);
  assert.match(dashboardSource, /<MobileNavigation activeTab="profile"/);
  assert.match(mobileBookingsSource, /My Bookings/);
  assert.match(mobileBookingsSource, /mobileCourseHref/);
  assert.match(mobileDashboardSource, /\/mobile\?tab=profile&auth=sign-in/);
  assert.doesNotMatch(source, /Payment Methods/);
  assert.doesNotMatch(source, /Claimed Academy/);
});

test("native mobile shell can produce Android and iOS build artifacts from Capacitor", () => {
  const rootPackage = readSource("package.json");
  const mobilePackage = readSource("apps/mobile/package.json");
  const capacitorConfig = readSource("apps/mobile/capacitor.config.ts");
  const mobileReadme = readSource("apps/mobile/README.md");

  assert.match(rootPackage, /mobile:android:apk/);
  assert.match(rootPackage, /mobile:android:aab/);
  assert.match(rootPackage, /mobile:ios:sync/);
  assert.match(mobilePackage, /@capacitor\/android/);
  assert.match(mobilePackage, /@capacitor\/ios/);
  assert.match(mobilePackage, /assembleDebug/);
  assert.match(mobilePackage, /bundleRelease/);
  assert.match(capacitorConfig, /appId:\s*"oepe\.rollfinders"/);
  assert.match(capacitorConfig, /appendUserAgent:\s*"RollFindersMobile"/);
  assert.match(capacitorConfig, /url:\s*"https:\/\/rollfinders\.com\/mobile"/);
  assert.match(mobileReadme, /app-debug\.apk/);
  assert.match(mobileReadme, /app-release\.aab/);
  assert.match(mobileReadme, /Xcode/);
});
