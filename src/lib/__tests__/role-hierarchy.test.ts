import assert from "node:assert/strict";
import test from "node:test";
import { Role } from "@prisma/client";
import { canSeeRole, roleLevel } from "../role-hierarchy";

test("role hierarchy hides roles above the actor level", () => {
  assert.equal(canSeeRole(Role.ACADEMY_ADMIN, Role.ACADEMY_OWNER), false);
  assert.equal(canSeeRole(Role.ACADEMY_ADMIN, Role.PLATFORM_ADMIN), false);
  assert.equal(canSeeRole(Role.ACADEMY_ADMIN, Role.ACADEMY_ADMIN), true);
  assert.equal(canSeeRole(Role.ACADEMY_ADMIN, Role.STANDARD_USER), true);
});

test("platform admins cannot see super admin level roles", () => {
  assert.equal(roleLevel(Role.PLATFORM_ADMIN) < roleLevel(Role.SUPER_ADMIN), true);
  assert.equal(canSeeRole(Role.PLATFORM_ADMIN, Role.SUPER_ADMIN), false);
  assert.equal(canSeeRole(Role.PLATFORM_ADMIN, Role.ADMIN), false);
  assert.equal(canSeeRole(Role.PLATFORM_ADMIN, Role.ACADEMY_OWNER), true);
});

test("authorisation role levels can be filtered directly", () => {
  assert.equal(canSeeRole(Role.ACADEMY_ADMIN, "PLATFORM_ADMIN", 900), false);
  assert.equal(canSeeRole(Role.ACADEMY_ADMIN, "COACH", 300), true);
});
