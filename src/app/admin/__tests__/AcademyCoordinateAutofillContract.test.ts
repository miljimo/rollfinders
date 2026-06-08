import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function assertSourceIncludes(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), true, message);
}

describe("Academy coordinate auto-fill contract", () => {
  const source = readSource("src/app/admin/academies/AcademyForm.tsx");

  it("keeps latitude and longitude available as manual inputs", () => {
    assertSourceIncludes(source, /<Field\s+name="latitude"\s+label="Latitude"\s+required/, "Latitude must remain available as a manual input.");
    assertSourceIncludes(source, /<Field\s+name="longitude"\s+label="Longitude"\s+required/, "Longitude must remain available as a manual input.");
  });

  it("offers an explicit coordinate auto-fill action on the location step", () => {
    assertSourceIncludes(source, /auto[-\s]?fill|find coordinates|resolve coordinates|lookup coordinates/i, "Location step must expose an explicit coordinate auto-fill action.");
    assertSourceIncludes(source, /postcode|address/i, "Coordinate auto-fill should be driven by postcode or address context.");
  });

  it("backs coordinate auto-fill with an admin geocode endpoint", () => {
    assertSourceIncludes(source, /\/api\/admin\/geocode\?/, "Coordinate auto-fill should call the admin geocode endpoint.");
    assert.equal(
      existsSync(resolve(root, "src/app/api/admin/geocode/route.ts")),
      true,
      "Coordinate auto-fill endpoint src/app/api/admin/geocode/route.ts must exist.",
    );
  });

  it("tracks manual coordinate overrides and does not replace them implicitly", () => {
    assertSourceIncludes(source, /name === "latitude" \|\| name === "longitude"/, "Manual coordinate edits must be detected from latitude and longitude fields.");
    assertSourceIncludes(source, /setCoordinateSource\("manual"\)/, "Manual coordinate edits must be tracked as an override.");
    assertSourceIncludes(source, /if \(!force && coordinateSource === "manual"\) return/, "Automatic coordinate lookup must not implicitly replace manual overrides.");
  });
});
