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
    assert.match(source, /value\s*===\s*"profile"/);
    assert.match(source, /value\s*===\s*"settings"/);
    assert.match(source, /value\s*===\s*"password"/);
    assert.match(source, /return\s+null/);
    assert.match(source, /if\s*\(\s*!panel\s*\)\s*redirect\("\/dashboard"\)/);
  });

  it("standard dashboard uses the shared side-panel shell pattern with standard-user-only navigation", () => {
    const source = readSource("src/app/dashboard/page.tsx");
    const standardSource = source.split(/if\s*\(\s*platformAdminUser\s*\|\|\s*academyAdminUser\s*\)\s*return\s+<AdminDashboardWorkspace[^;]+;/)[1] ?? source;

    assert.match(source, /import\s+\{\s*SidePanelControl,\s*type\s+SidePanelItem\s*\}\s+from\s+"@\/components\/SidePanelControl"/);
    assert.match(source, /const\s+standardNavigationItems:\s*SidePanelItem\[\]\s*=\s*\[/);
    assert.match(standardSource, /<SidePanelControl[\s\S]*navigationItems=\{standardNavigationItems\}/);
    assert.match(standardSource, /supportHref="\/contact"/);

    assert.match(source, /label:\s*"Dashboard"[\s\S]*href:\s*"\/dashboard"/);
    assert.match(source, /label:\s*"Profile"[\s\S]*href:\s*"\/dashboard\?panel=profile"/);
    assert.match(source, /label:\s*"Settings"[\s\S]*href:\s*"\/dashboard\?panel=settings"/);
    assert.doesNotMatch(standardSource, /My Academy Rolls|Members|Password \/ Account Settings/);

    for (const adminLabel of ["Platform Administration", "Academy Administration", "User Administration", "Email Operations", "Academy Claims", "Map Settings", "System Settings"]) {
      assert.doesNotMatch(standardSource, new RegExp(adminLabel));
    }
  });

  it("standard-user dashboard rolls are read-only and scoped to the user's academy", () => {
    const dashboardPage = readSource("src/app/dashboard/page.tsx");
    const rollsRoute = readSource("src/app/api/dashboard/rolls/route.ts");

    assert.match(dashboardPage, /academyId,\s*\n\s*active:\s*true,\s*\n\s*eventDate:\s*\{\s*gte:\s*startOfToday\(\)\s*\}/);
    assert.match(dashboardPage, /title:\s*\{\s*contains:\s*search,\s*mode:\s*"insensitive"\s*\}/);
    assert.match(dashboardPage, /orderBy:\s*\[\s*\{\s*eventDate:\s*"asc"\s*\},\s*\{\s*startTime:\s*"asc"\s*\}/);
    assert.match(dashboardPage, /take:\s*standardRollsPageSize/);
    assert.match(dashboardPage, /<Link href=\{`\/open-mats\/\$\{row\.id\}`\}/);
    assert.doesNotMatch(dashboardPage, /dialog=new-open-mat|dialog=edit-user|deleteManagedUser|createOpenMat|updateOpenMat/);

    assert.match(rollsRoute, /isStandardUserRole\(user\.role\)/);
    assert.match(rollsRoute, /return\s+NextResponse\.json\(\{\s*rolls:\s*\[\]\s*\}\)/);
    assert.match(rollsRoute, /academyId,\s*\n\s*active:\s*true,\s*\n\s*eventDate:\s*\{\s*gte:\s*startOfToday\(\)\s*\}/);
    assert.match(rollsRoute, /title:\s*\{\s*contains:\s*search,\s*mode:\s*"insensitive"\s*\}/);
    assert.match(rollsRoute, /select:\s*\{/);
    assert.match(rollsRoute, /orderBy:\s*\[\s*\{\s*eventDate:\s*"asc"\s*\},\s*\{\s*startTime:\s*"asc"\s*\}/);
    assert.doesNotMatch(rollsRoute, /POST|PUT|PATCH|DELETE|create\(|update\(|delete\(/);
  });

  it("standard dashboard profile and settings expose only self-service fields", () => {
    const dashboardPage = readSource("src/app/dashboard/page.tsx");
    const dashboardActions = readSource("src/app/dashboard/DashboardActions.ts");

    assert.match(dashboardPage, /<ProfilePanel[\s\S]*academy=\{academy\}/);
    assert.match(dashboardPage, /Academy Information/);
    assert.match(dashboardPage, /<QuickActionPanel title="Account Actions"/);
    assert.match(dashboardPage, /title:\s*"Change Password"/);
    assert.match(dashboardPage, /title:\s*"Edit Profile"/);
    assert.match(dashboardPage, /href:\s*"\/dashboard\?panel=settings&settingsAction=change-password"/);
    assert.match(dashboardPage, /href:\s*"\/dashboard\?panel=settings&settingsAction=edit-profile"/);
    assert.match(dashboardPage, /activeAction\s*===\s*"change-password"\s*\?\s*\(\s*\n\s*<ChangePasswordForm[\s\S]*embedded/);
    assert.match(dashboardPage, /activeAction\s*===\s*"edit-profile"\s*\?\s*\(\s*\n\s*<EditProfileForm[\s\S]*email=\{user\.email\}[\s\S]*name=\{user\.name\}/);
    assert.match(dashboardPage, /Choose Change Password or Edit Profile to open the form here/);
    assert.match(dashboardPage, /rounded-lg border border-teal-300 bg-teal-50\/20/);

    const editProfileForm = readSource("src/app/dashboard/EditProfileForm.tsx");
    assert.match(editProfileForm, /<ReadOnlyField label="Email" value=\{email\} \/>/);
    assert.match(editProfileForm, /<ReadOnlyField label="Role" value=\{roleLabel\} \/>/);
    assert.match(editProfileForm, /<ReadOnlyField label="Status" value=\{statusLabel\} \/>/);
    assert.match(editProfileForm, /<ReadOnlyField label="Academy" value=\{academyName\} \/>/);
    assert.match(dashboardActions, /isStandardUserRole\(user\.role\)/);
    assert.match(dashboardActions, /data:\s*\{\s*name:\s*name\s*\|\|\s*null\s*\}/);
    assert.doesNotMatch(dashboardActions, /data:[\s\S]*\b(role|status|academyId|disabled|isProtected)\b/);
  });

  it("dashboard top account trigger keeps the popup menu while using compact initials and chevron", () => {
    const standardSource = readSource("src/app/dashboard/page.tsx");
    const adminSource = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");

    for (const source of [standardSource, adminSource]) {
      assert.match(source, /<ActionMenu[\s\S]*label="Open account profile menu"/);
      assert.match(source, /trigger=\{\(\s*<>\s*[\s\S]*rounded-full bg-teal-100[\s\S]*<ChevronDown/);
      assert.match(source, /<LogoutButton/);
    }

    const standardMenuSource = standardSource.match(/<ActionMenu[\s\S]*?<\/ActionMenu>/)?.[0] ?? "";
    const adminMenuSource = adminSource.match(/<ActionMenu[\s\S]*?<\/ActionMenu>/)?.[0] ?? "";
    assert.doesNotMatch(standardMenuSource, /href="\/dashboard\?panel=settings"|>Settings<\/Link>/);
    assert.doesNotMatch(adminMenuSource, /href="\/dashboard\?panel=settings"|>Settings<\/Link>/);
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
