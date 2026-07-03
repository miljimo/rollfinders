import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

type Effect = "ALLOW" | "DENY";
type Scope = {
  organisationId?: string;
  applicationId?: string;
  resourceType?: string;
  resourceId?: string;
};
type Permission = { code: string };
type Role = { key: string; permissions: string[] };
type UserRole = { userId: string; roleKey: string; scope?: Scope };
type UserPermission = { userId: string; permission: string; effect: Effect; scope?: Scope };
type LegacyUsersServiceData = {
  privileges: { key: string; name: string }[];
  roles: { key: string; name: string }[];
  rolePrivileges: { roleKey: string; privilegeKey: string }[];
  userRoles: { userId: string; roleKey: string; organisationId?: string }[];
  userPermissions: { userId: string; privilegeKey: string; effect: Effect; organisationId?: string }[];
};
type AuthorisationModel = {
  permissions: Permission[];
  roles: Role[];
  userRoles: UserRole[];
  userPermissions: UserPermission[];
};

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

const academyScope = {
  organisationId: "org-1",
  applicationId: "app-rollfinders",
  resourceType: "academy",
  resourceId: "academy-1",
};

function scopeMatches(assignmentScope: Scope | undefined, requestedScope: Scope): boolean {
  if (!assignmentScope) return true;

  return (Object.entries(assignmentScope) as [keyof Scope, string][])
    .every(([key, value]) => requestedScope[key] === value);
}

function authorize(
  model: AuthorisationModel,
  subjectId: string,
  permission: string,
  requestedScope: Scope,
): { authorized: boolean; decision: "allow" | "deny"; reason?: string } {
  if (!model.permissions.some((candidate) => candidate.code === permission)) {
    return { authorized: false, decision: "deny", reason: "unknown_permission" };
  }

  const directDeny = model.userPermissions.some((assignment) =>
    assignment.userId === subjectId
    && assignment.permission === permission
    && assignment.effect === "DENY"
    && scopeMatches(assignment.scope, requestedScope)
  );
  if (directDeny) return { authorized: false, decision: "deny", reason: "direct_deny" };

  const directAllow = model.userPermissions.some((assignment) =>
    assignment.userId === subjectId
    && assignment.permission === permission
    && assignment.effect === "ALLOW"
    && scopeMatches(assignment.scope, requestedScope)
  );
  const roleAllow = model.userRoles.some((assignment) => {
    if (assignment.userId !== subjectId || !scopeMatches(assignment.scope, requestedScope)) return false;
    return model.roles
      .find((role) => role.key === assignment.roleKey)
      ?.permissions.includes(permission) ?? false;
  });

  return directAllow || roleAllow
    ? { authorized: true, decision: "allow" }
    : { authorized: false, decision: "deny", reason: "missing_permission" };
}

function translateLegacyUsersServiceData(legacy: LegacyUsersServiceData): AuthorisationModel {
  const rolePermissions = new Map<string, string[]>();

  for (const mapping of legacy.rolePrivileges) {
    rolePermissions.set(mapping.roleKey, [
      ...new Set([...(rolePermissions.get(mapping.roleKey) ?? []), mapping.privilegeKey]),
    ]);
  }

  return {
    permissions: legacy.privileges.map((privilege) => ({ code: privilege.key })),
    roles: legacy.roles.map((role) => ({
      key: role.key,
      permissions: rolePermissions.get(role.key) ?? [],
    })),
    userRoles: legacy.userRoles.map((assignment) => ({
      userId: assignment.userId,
      roleKey: assignment.roleKey,
      scope: assignment.organisationId ? { organisationId: assignment.organisationId } : undefined,
    })),
    userPermissions: legacy.userPermissions.map((assignment) => ({
      userId: assignment.userId,
      permission: assignment.privilegeKey,
      effect: assignment.effect,
      scope: assignment.organisationId ? { organisationId: assignment.organisationId } : undefined,
    })),
  };
}

describe("Authorisation Service decision contract", () => {
  const model: AuthorisationModel = {
    permissions: [
      { code: "academy.update" },
      { code: "booking.cancel" },
      { code: "payment.refund" },
    ],
    roles: [
      { key: "ACADEMY_ADMIN", permissions: ["academy.update"] },
    ],
    userRoles: [
      { userId: "role-user", roleKey: "ACADEMY_ADMIN", scope: academyScope },
    ],
    userPermissions: [
      { userId: "direct-allow-user", permission: "booking.cancel", effect: "ALLOW", scope: academyScope },
      { userId: "denied-user", permission: "academy.update", effect: "DENY", scope: academyScope },
      { userId: "denied-user", permission: "academy.update", effect: "ALLOW", scope: academyScope },
      { userId: "scoped-user", permission: "payment.refund", effect: "ALLOW", scope: { ...academyScope, resourceId: "academy-2" } },
    ],
  };

  it("allows a role permission in matching scope", () => {
    assert.deepEqual(authorize(model, "role-user", "academy.update", academyScope), {
      authorized: true,
      decision: "allow",
    });
  });

  it("allows a direct user permission assignment", () => {
    assert.deepEqual(authorize(model, "direct-allow-user", "booking.cancel", academyScope), {
      authorized: true,
      decision: "allow",
    });
  });

  it("denies when a direct user deny conflicts with role or direct allow", () => {
    assert.deepEqual(authorize(model, "denied-user", "academy.update", academyScope), {
      authorized: false,
      decision: "deny",
      reason: "direct_deny",
    });
  });

  it("denies when the requested scope does not match the assignment scope", () => {
    assert.deepEqual(authorize(model, "scoped-user", "payment.refund", academyScope), {
      authorized: false,
      decision: "deny",
      reason: "missing_permission",
    });
  });

  it("fails closed for unknown permissions", () => {
    assert.deepEqual(authorize(model, "role-user", "academy.delete", academyScope), {
      authorized: false,
      decision: "deny",
      reason: "unknown_permission",
    });
  });
});

describe("RollFinders authorisation client super admin contract", () => {
  it("keeps super admins as all-privilege users before service decisions", () => {
    const source = readSource("apps/portal/src/lib/authorisation-service.ts");
    const authorizeFunction = source.match(/export async function authorize[\s\S]*?\n}\n/)?.[0] ?? "";

    assert.match(authorizeFunction, /actor\.role === "SUPER_ADMIN" \|\| actor\.role === "ADMIN"/);
    assert.ok(
      authorizeFunction.indexOf("actor.role === \"SUPER_ADMIN\"") < authorizeFunction.indexOf("fetch(`${authorisationServiceUrl()}/authorize`"),
      "SUPER_ADMIN must be allowed before calling the authorisation service",
    );
  });
});

describe("Users Service migration verification contract", () => {
  const legacy: LegacyUsersServiceData = {
    privileges: [
      { key: "academy.update", name: "Update academies" },
      { key: "users.admin.access", name: "Use admin users area" },
    ],
    roles: [
      { key: "PLATFORM_ADMIN", name: "Platform admin" },
      { key: "STANDARD_USER", name: "Standard user" },
    ],
    rolePrivileges: [
      { roleKey: "PLATFORM_ADMIN", privilegeKey: "academy.update" },
      { roleKey: "PLATFORM_ADMIN", privilegeKey: "users.admin.access" },
    ],
    userRoles: [
      { userId: "platform-admin", roleKey: "PLATFORM_ADMIN", organisationId: "org-1" },
      { userId: "standard-user", roleKey: "STANDARD_USER", organisationId: "org-1" },
    ],
    userPermissions: [
      { userId: "standard-user", privilegeKey: "academy.update", effect: "ALLOW", organisationId: "org-1" },
      { userId: "blocked-admin", privilegeKey: "academy.update", effect: "DENY", organisationId: "org-1" },
    ],
  };

  it("translates privileges into permissions and preserves row-count equivalence", () => {
    const translated = translateLegacyUsersServiceData(legacy);

    assert.equal(translated.permissions.length, legacy.privileges.length);
    assert.equal(translated.roles.length, legacy.roles.length);
    assert.equal(translated.roles.flatMap((role) => role.permissions).length, legacy.rolePrivileges.length);
    assert.equal(translated.userRoles.length, legacy.userRoles.length);
    assert.equal(translated.userPermissions.length, legacy.userPermissions.length);
  });

  it("preserves representative legacy access outcomes after translation", () => {
    const translated = translateLegacyUsersServiceData(legacy);

    assert.equal(authorize(translated, "platform-admin", "academy.update", academyScope).authorized, true);
    assert.equal(authorize(translated, "standard-user", "academy.update", academyScope).authorized, true);
    assert.equal(authorize(translated, "standard-user", "users.admin.access", academyScope).authorized, false);
    assert.equal(authorize(translated, "blocked-admin", "academy.update", academyScope).authorized, false);
  });
});
