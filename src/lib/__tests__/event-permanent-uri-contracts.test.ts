import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";

const root = process.cwd();

function readSource(filePath: string) {
  return readFileSync(path.join(root, filePath), "utf8");
}

test("events expose integration URI and QR code routes", () => {
  const helperSource = readSource("src/lib/event-share-links.ts");
  const permanentRouteSource = readSource("src/app/e/[id]/page.tsx");
  const qrRouteSource = readSource("src/app/api/events/[id]/qrcode/route.ts");
  const dashboardSource = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
  const courseDetailSource = readSource("src/app/courses/[id]/page.tsx");
  const openMatDetailSource = readSource("src/app/open-mats/[id]/page.tsx");
  const coursesSource = readSource("src/lib/courses.ts");

  assert.match(helperSource, /eventPermanentPath/);
  assert.match(helperSource, /`\/e\/\$\{eventId\}`/);
  assert.match(helperSource, /eventPermanentUrl/);
  assert.match(helperSource, /NEXTAUTH_URL/);
  assert.match(permanentRouteSource, /eventPublicPath/);
  assert.match(permanentRouteSource, /redirect\(eventPublicPath\(event\)\)/);
  assert.match(qrRouteSource, /QRCode\.toString/);
  assert.match(qrRouteSource, /eventPermanentUrl\(id\)/);
  assert.match(qrRouteSource, /image\/svg\+xml/);
  assert.match(dashboardSource, /Integration URI/);
  assert.match(dashboardSource, /QR Code/);
  assert.match(dashboardSource, /eventQrCodePath\(event\.id\)/);
  assert.match(courseDetailSource, /Integration Event URI/);
  assert.match(courseDetailSource, /eventPermanentUrl\(event\.id\)/);
  assert.match(courseDetailSource, /eventQrCodePath\(event\.id\)/);
  assert.doesNotMatch(courseDetailSource, />Open URI</);
  assert.match(openMatDetailSource, /Integration Event URI/);
  assert.match(openMatDetailSource, /eventPermanentUrl\(event\.id\)/);
  assert.match(openMatDetailSource, /eventQrCodePath\(event\.id\)/);
  assert.doesNotMatch(openMatDetailSource, />Open URI</);
  assert.match(coursesSource, /occurrenceDateParam \? startOfDay/);
  assert.match(coursesSource, /: startOfDay\(now\)/);
});
