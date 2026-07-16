import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("rollfinder user profile academy enrichment contracts", () => {
  it("does not let academy service read authorisation failures crash user dashboard enrichment", () => {
    const source = readSource("apps/portal/src/lib/rollfinder-user-profiles.ts");

    assert.match(source, /AcademyServiceError/);
    assert.match(source, /function\s+isAcademyReadForbidden/);
    assert.match(source, /error\.status\s*===\s*401\s*\|\|\s*error\.status\s*===\s*403/);
    assert.match(source, /async\s+function\s+readableAcademyMembershipsForUser/);
    assert.match(source, /async\s+function\s+readableAcademy/);
    assert.match(source, /if\s*\(\s*isAcademyReadForbidden\(error\)\s*\)\s*return\s+\[\]/);
    assert.match(source, /if\s*\(\s*isAcademyReadForbidden\(error\)\s*\)\s*return\s+null/);
    assert.match(source, /readableAcademyMembershipsForUser\(id,\s*actor\)/);
    assert.match(source, /readableAcademy\(academyId,\s*actor\)/);
  });
});
