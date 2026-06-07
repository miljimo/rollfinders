import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { isAnyAdminRole, isStandardUserRole } from "../admin";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("unified dashboard route contracts", () => {
  it("login sends authenticated users to the canonical dashboard route", () => {
    const source = readSource("src/app/login/LoginForm.tsx");

    assert.match(source, /callbackUrl:\s*"\/dashboard"/);
    assert.match(source, /window\.location\.href\s*=\s*result\?\.url\s*\?\?\s*"\/dashboard"/);
    assert.doesNotMatch(source, /callbackUrl:\s*"\/admin"/);
  });

  it("legacy /admin redirects to /dashboard while preserving query parameters", () => {
    const source = readSource("src/app/admin/page.tsx");

    assert.match(source, /redirect\(query\s*\?\s*`\/dashboard\?\$\{query\}`\s*:\s*"\/dashboard"\)/);
    assert.match(source, /Array\.isArray\(value\)/);
    assert.match(source, /params\.append\(key,\s*item\)/);
  });

  it("/dashboard dispatches admin roles to the shared admin workspace instead of redirecting to /admin", () => {
    const source = readSource("src/app/dashboard/page.tsx");

    assert.match(source, /import\s+AdminDashboardWorkspace\s+from\s+"\.\/AdminDashboardWorkspace"/);
    assert.match(source, /if\s*\(\s*platformAdminUser\s*\|\|\s*academyAdminUser\s*\)\s*return\s+<AdminDashboardWorkspace/);
    assert.doesNotMatch(source, /redirect\("\/admin"\)/);
  });

  it("standard dashboard panel selection is allowlisted and invalid admin panels redirect to /dashboard", () => {
    const source = readSource("src/app/dashboard/page.tsx");

    assert.match(source, /function\s+standardPanel/);
    assert.match(source, /value\s*===\s*"dashboard"/);
    assert.match(source, /value\s*===\s*"rolls"/);
    assert.match(source, /value\s*===\s*"members"/);
    assert.match(source, /value\s*===\s*"password"/);
    assert.match(source, /value\s*===\s*"support"/);
    assert.match(source, /return\s+null/);
    assert.match(source, /if\s*\(\s*!panel\s*\)\s*redirect\("\/dashboard"\)/);
  });

  it("standard-user dashboard rolls are read-only and scoped to the user's academy", () => {
    const dashboardPage = readSource("src/app/dashboard/page.tsx");
    const rollsRoute = readSource("src/app/api/dashboard/rolls/route.ts");

    assert.match(dashboardPage, /where:\s*\{\s*academyId:\s*academy\.id,\s*active:\s*true\s*\}/);
    assert.match(dashboardPage, /orderBy:\s*\{\s*createdAt:\s*"desc"\s*\}/);
    assert.match(dashboardPage, /<Link href=\{`\/open-mats\/\$\{roll\.id\}`\}>/);
    assert.doesNotMatch(dashboardPage, /dialog=new-open-mat|dialog=edit-user|deleteManagedUser|createOpenMat|updateOpenMat/);

    assert.match(rollsRoute, /requireStandardDashboardUser\(\)/);
    assert.match(rollsRoute, /where:\s*\{\s*academyId:\s*academy\.id,\s*active:\s*true\s*\}/);
    assert.match(rollsRoute, /select:\s*\{/);
    assert.doesNotMatch(rollsRoute, /POST|PUT|PATCH|DELETE|create\(|update\(|delete\(/);
  });

  it("standard users are not treated as admin roles for admin APIs or admin page guards", () => {
    assert.equal(isStandardUserRole("STANDARD_USER"), true);
    assert.equal(isStandardUserRole("USER"), true);
    assert.equal(isAnyAdminRole("STANDARD_USER"), false);
    assert.equal(isAnyAdminRole("USER"), false);

    const admin = readSource("src/lib/admin.ts");
    const adminAcademiesApi = readSource("src/app/api/admin/academies/route.ts");

    assert.match(admin, /export\s+async\s+function\s+requireAdminApi/);
    assert.match(admin, /!isAnyAdminRole\(user\?\.role\)/);
    assert.match(adminAcademiesApi, /const\s+forbidden\s*=\s*await\s+requireAdminApi\(\)/);
    assert.match(adminAcademiesApi, /if\s*\(\s*forbidden\s*\)\s*return\s+forbidden/);
  });

  it("admin dashboard canonical links and pagination stay on /dashboard with complete query strings", () => {
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");

    assert.match(source, /href:\s*"\/dashboard"/);
    assert.match(source, /href:\s*"\/dashboard\?panel=settings"/);
    assert.match(source, /return\s+query\s*\?\s*`\/dashboard\?\$\{query\}`\s*:\s*"\/dashboard"/);
    assert.doesNotMatch(source, /return\s+query\s*\?\s*`\/dashboard\?`\s*:\s*"\/dashboard"/);
  });
});
