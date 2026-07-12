import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type RoleConfig = {
  key: string;
  permissions: string[] | "*";
};

type PermissionsConfig = {
  roles: RoleConfig[];
};

const config = JSON.parse(readFileSync("apps/backend_api/internal/services/authorisation/config/permissions.json", "utf8")) as PermissionsConfig;

function role(key: string) {
  const match = config.roles.find((item) => item.key === key);
  assert.ok(match, `${key} role must exist`);
  return match;
}

function permissionsFor(key: string) {
  const permissions = role(key).permissions;
  assert.notEqual(permissions, "*", `${key} must use explicit permissions in this test`);
  return permissions as string[];
}

function resolvesPermission(roleKey: string, permission: string) {
  const permissions = role(roleKey).permissions;
  if (permissions === "*") return true;
  return permissions.some((item) => item === permission || (item.endsWith(".*") && permission.startsWith(item.slice(0, -1))));
}

test("authorisation permissions config keeps member as the non-admin baseline", () => {
  const memberPermissions = permissionsFor("MEMBER");

  assert.ok(memberPermissions.includes("account.read"));
  assert.ok(memberPermissions.includes("auth.session.read"));
  assert.ok(memberPermissions.includes("course.read"));
  assert.ok(memberPermissions.includes("booking.read"));
  assert.equal(resolvesPermission("MEMBER", "wallet.read"), false);
  assert.equal(resolvesPermission("MEMBER", "wallet.transfer"), false);
  assert.equal(config.roles.some((item) => item.key === "STANDARD_USER"), false);
});

test("authorisation permissions config gives academy roles wallet wildcard access", () => {
  for (const roleKey of ["ACADEMY_ADMIN", "ACADEMY_OWNER"]) {
    assert.ok(permissionsFor(roleKey).includes("wallet.*"));
    assert.equal(resolvesPermission(roleKey, "wallet.read"), true);
    assert.equal(resolvesPermission(roleKey, "wallet.transfer"), true);
  }
});
