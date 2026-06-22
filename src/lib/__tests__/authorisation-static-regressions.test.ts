import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

type MigratedRoleGuardAreas = {
  migratedFiles: string[];
};

const roleGuardPatterns = [
  /\bisSuperAdminRole\s*\(/,
  /\bisPlatformAdminRole\s*\(/,
  /\bisAcademyAdminRole\s*\(/,
  /\bRole\.(SUPER_ADMIN|ADMIN|PLATFORM_ADMIN|ACADEMY_ADMIN|ACADEMY_OWNER|STANDARD_USER|USER)\b/,
  /\brole\s*={2,3}\s*["'](?:SUPER_ADMIN|ADMIN|PLATFORM_ADMIN|ACADEMY_ADMIN|ACADEMY_OWNER|STANDARD_USER|USER)["']/,
  /\brole\s*!={1,2}\s*["'](?:SUPER_ADMIN|ADMIN|PLATFORM_ADMIN|ACADEMY_ADMIN|ACADEMY_OWNER|STANDARD_USER|USER)["']/,
];

describe("Authorisation Service static migration regressions", () => {
  it("keeps the migrated-area role guard manifest parseable", () => {
    const manifest = JSON.parse(
      readFileSync("services/authorisation/docs/testing/migrated-role-guard-areas.json", "utf8"),
    ) as MigratedRoleGuardAreas;

    assert.ok(Array.isArray(manifest.migratedFiles));
    assert.deepEqual([...manifest.migratedFiles].sort(), manifest.migratedFiles);
  });

  it("prevents hardcoded role guards from returning in migrated files", () => {
    const manifest = JSON.parse(
      readFileSync("services/authorisation/docs/testing/migrated-role-guard-areas.json", "utf8"),
    ) as MigratedRoleGuardAreas;

    const violations = manifest.migratedFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return roleGuardPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file} still matches ${pattern}`);
    });

    assert.deepEqual(violations, []);
  });
});
