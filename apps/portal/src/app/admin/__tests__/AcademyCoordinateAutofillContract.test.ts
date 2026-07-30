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
  const source = readSource("apps/portal/src/app/admin/academies/AcademyForm.tsx");
  const endpointSource = readSource("apps/portal/src/app/api/admin/geocode/route.ts");
  const actionSource = readSource("apps/portal/src/app/admin/academies/actions.ts");

  it("keeps latitude and longitude available as manual inputs", () => {
    assertSourceIncludes(source, /<Field\s+name="latitude"\s+label="Latitude"\s+required/, "Latitude must remain available as a manual input.");
    assertSourceIncludes(source, /<Field\s+name="longitude"\s+label="Longitude"\s+required/, "Longitude must remain available as a manual input.");
  });

  it("offers an explicit coordinate auto-fill action on the location step", () => {
    assertSourceIncludes(source, /auto[-\s]?fill|find coordinates|resolve coordinates|lookup coordinates/i, "Location step must expose an explicit coordinate auto-fill action.");
    assertSourceIncludes(source, /postcode|address/i, "Coordinate auto-fill should be driven by postcode or address context.");
  });

  it("backs coordinate auto-fill with an admin geocode endpoint", () => {
    assertSourceIncludes(source, /geocodeEndpoint = "\/api\/admin\/geocode"/, "Coordinate auto-fill should default to the admin geocode endpoint.");
    assertSourceIncludes(source, /fetch\(`\$\{geocodeEndpoint\}\?\$\{params\.toString\(\)\}`\)/, "Coordinate auto-fill should call the configured geocode endpoint.");
    assert.equal(
      existsSync(resolve(root, "apps/portal/src/app/api/admin/geocode/route.ts")),
      true,
      "Coordinate auto-fill endpoint src/app/api/admin/geocode/route.ts must exist.",
    );
  });

  it("authorises existing academy lookups with academy.update in resource scope", () => {
    assertSourceIncludes(source, /params\.set\("academyId", academy\.id\)/, "Edit lookups must identify the target academy.");
    assertSourceIncludes(endpointSource, /authorizeThroughService\(actor, permission/, "The endpoint must use the Authorisation service decision.");
    assertSourceIncludes(endpointSource, /academyId \? "academy\.update" : "academy\.create"/, "Edit and create lookups must use their canonical capabilities.");
    assertSourceIncludes(endpointSource, /resourceId: academyId \|\| undefined/, "The target academy must be included in the authorisation scope.");
    assert.doesNotMatch(endpointSource, /requireAdminApi|users\.admin\.access|SUPER_ADMIN|PLATFORM_ADMIN|ACADEMY_ADMIN|ACADEMY_OWNER/);
  });

  it("returns separate authorisation and geocoding errors", () => {
    assertSourceIncludes(endpointSource, /not authorised to manage this academy location/i, "Denied access must have a specific message.");
    assertSourceIncludes(endpointSource, /No coordinate result found/, "A failed provider lookup must have a lookup-specific message.");
  });

  it("tracks manual coordinate overrides and does not replace them implicitly", () => {
    assertSourceIncludes(source, /name === "latitude" \|\| name === "longitude"/, "Manual coordinate edits must be detected from latitude and longitude fields.");
    assertSourceIncludes(source, /setCoordinateSource\("manual"\)/, "Manual coordinate edits must be tracked as an override.");
    assertSourceIncludes(source, /if \(!force && coordinateSource === "manual"\) return/, "Automatic coordinate lookup must not implicitly replace manual overrides.");
  });

  it("records changed academy location fields in the existing audit event", () => {
    assertSourceIncludes(actionSource, /changedLocationFields: changedLocationFields\(existingAcademy, data\)/, "Academy audit metadata must identify changed location fields.");
    for (const field of ["address", "city", "postcode", "borough", "country", "latitude", "longitude"]) {
      assertSourceIncludes(actionSource, new RegExp(`"${field}"`), `Audit field list must include ${field}.`);
    }
  });
});
