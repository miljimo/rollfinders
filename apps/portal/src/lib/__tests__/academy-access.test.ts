import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canDeleteAcademyRecord, type AcademyAccess } from "../academy-access";
import { isPlatformAdminRole } from "../admin";

function access(overrides: Partial<AcademyAccess>): AcademyAccess {
  return {
    userId: "user-1",
    platformAdmin: false,
    superAdmin: false,
    academyAdmin: false,
    academyOwner: false,
    ...overrides,
  };
}

describe("academy access", () => {
  it("treats platform admins as platform-level academy creators", () => {
    assert.equal(isPlatformAdminRole("PLATFORM_ADMIN"), true);
    assert.equal(isPlatformAdminRole("SUPER_ADMIN"), true);
    assert.equal(isPlatformAdminRole("ACADEMY_ADMIN"), false);
  });

  it("allows super admins to delete any academy", () => {
    assert.equal(canDeleteAcademyRecord(access({ superAdmin: true, platformAdmin: true }), { createdById: "someone-else" }), true);
  });

  it("allows platform admins to delete only academies they created", () => {
    assert.equal(canDeleteAcademyRecord(access({ platformAdmin: true }), { createdById: "user-1" }), true);
    assert.equal(canDeleteAcademyRecord(access({ platformAdmin: true }), { createdById: "someone-else" }), false);
    assert.equal(canDeleteAcademyRecord(access({ platformAdmin: true }), { createdById: null }), false);
  });

  it("does not allow academy members to delete academy records", () => {
    assert.equal(canDeleteAcademyRecord(access({ academyOwner: true }), { createdById: "user-1" }), false);
  });
});
