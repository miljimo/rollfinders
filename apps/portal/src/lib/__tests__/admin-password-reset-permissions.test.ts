import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Role } from "@prisma/client";
import { canSendManagedUserPasswordReset } from "../admin";

function actor(role: Role, overrides: Partial<{ id: string; academyId: string | null }> = {}) {
  return {
    id: overrides.id ?? `${role.toLowerCase()}-actor`,
    role,
    academyId: overrides.academyId,
  };
}

function target(role: Role, overrides: Partial<{ id: string; email: string; academyId: string | null; isProtected: boolean }> = {}) {
  return {
    id: overrides.id ?? `${role.toLowerCase()}-target`,
    role,
    email: overrides.email ?? `${role.toLowerCase()}@rollfinders.com`,
    academyId: overrides.academyId,
    isProtected: overrides.isProtected,
  };
}

describe("admin password reset permissions", () => {
  it("allows super admins to reset lower user roles", () => {
    const superAdmin = actor(Role.SUPER_ADMIN);

    assert.equal(canSendManagedUserPasswordReset(superAdmin, target(Role.PLATFORM_ADMIN)), true);
    assert.equal(canSendManagedUserPasswordReset(superAdmin, target(Role.ACADEMY_ADMIN)), true);
    assert.equal(canSendManagedUserPasswordReset(superAdmin, target(Role.STANDARD_USER)), true);
  });

  it("blocks super admins from resetting protected or peer super admin accounts", () => {
    const superAdmin = actor(Role.SUPER_ADMIN);

    assert.equal(canSendManagedUserPasswordReset(superAdmin, target(Role.SUPER_ADMIN)), false);
    assert.equal(canSendManagedUserPasswordReset(superAdmin, target(Role.ADMIN)), false);
    assert.equal(canSendManagedUserPasswordReset(superAdmin, target(Role.STANDARD_USER, { isProtected: true })), false);
    assert.equal(canSendManagedUserPasswordReset(superAdmin, target(Role.STANDARD_USER, { email: "admin@rollfinder.local" })), false);
  });

  it("allows platform admins to reset lower manageable users", () => {
    const platformAdmin = actor(Role.PLATFORM_ADMIN);

    assert.equal(canSendManagedUserPasswordReset(platformAdmin, target(Role.ACADEMY_ADMIN)), true);
    assert.equal(canSendManagedUserPasswordReset(platformAdmin, target(Role.STANDARD_USER)), true);
    assert.equal(canSendManagedUserPasswordReset(platformAdmin, target(Role.USER)), true);
  });

  it("blocks platform admins from resetting elevated accounts", () => {
    const platformAdmin = actor(Role.PLATFORM_ADMIN);

    assert.equal(canSendManagedUserPasswordReset(platformAdmin, target(Role.PLATFORM_ADMIN)), false);
    assert.equal(canSendManagedUserPasswordReset(platformAdmin, target(Role.SUPER_ADMIN)), false);
    assert.equal(canSendManagedUserPasswordReset(platformAdmin, target(Role.ADMIN)), false);
    assert.equal(canSendManagedUserPasswordReset(platformAdmin, target(Role.STANDARD_USER, { isProtected: true })), false);
  });

  it("blocks self password reset from admin-triggered reset actions", () => {
    const platformAdmin = actor(Role.PLATFORM_ADMIN, { id: "same-user" });

    assert.equal(canSendManagedUserPasswordReset(platformAdmin, target(Role.STANDARD_USER, { id: "same-user" })), false);
  });
});
