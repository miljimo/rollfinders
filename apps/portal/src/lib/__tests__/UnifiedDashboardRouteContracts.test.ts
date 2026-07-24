import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { isAnyAdminRole, isStandardUserRole } from "../admin";
import { managedUsersReturnPath } from "../managed-user-return-path";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("unified dashboard route contracts", () => {
  it("login sends authenticated users to the canonical dashboard route", () => {
    const source = readSource("apps/portal/src/app/login/LoginForm.tsx");

    assert.match(source, /callbackUrl\s*=\s*"\/dashboard"/);
    assert.match(source, /window\.location\.href\s*=\s*result\?\.url\s*\?\?\s*callbackUrl/);
    assert.doesNotMatch(source, /callbackUrl:\s*"\/admin"/);
  });

  it("login session creation does not prefetch personal user details", () => {
    const authSource = readSource("apps/portal/src/lib/auth.ts");
    const adminSource = readSource("apps/portal/src/lib/admin.ts");

    assert.match(authSource, /id:\s*result\.user_id/);
    assert.doesNotMatch(authSource, /getUserAccount/);
    assert.doesNotMatch(authSource, /role:\s*user\.role/);
    assert.match(adminSource, /getUserAccount\(user\.id,\s*accessToken\)/);
    assert.doesNotMatch(adminSource, /!user\?\.id\s*\|\|\s*!user\.email/);
  });

  it("legacy /admin redirects to /dashboard while preserving query parameters", () => {
    const source = readSource("apps/portal/src/app/admin/page.tsx");

    assert.match(source, /redirect\(query\s*\?\s*`\/dashboard\?\$\{query\}`\s*:\s*"\/dashboard"\)/);
    assert.match(source, /Array\.isArray\(value\)/);
    assert.match(source, /params\.append\(key,\s*item\)/);
  });

  it("/dashboard dispatches admin roles to the shared admin workspace instead of redirecting to /admin", () => {
    const source = readSource("apps/portal/src/app/dashboard/page.tsx");

    assert.match(source, /import\s+AdminDashboardWorkspace\s+from\s+"\.\/AdminDashboardWorkspace"/);
    assert.match(source, /if\s*\(\s*platformAdminUser\s*\|\|\s*academyAdminUser\s*\)\s*return\s+<AdminDashboardWorkspace/);
    assert.doesNotMatch(source, /redirect\("\/admin"\)/);
  });

  it("standard dashboard panel selection is allowlisted and invalid admin panels redirect to /dashboard", () => {
    const source = readSource("apps/portal/src/app/dashboard/page.tsx");

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
    const source = readSource("apps/portal/src/app/dashboard/page.tsx");
    const standardSource = source.split(/if\s*\(\s*platformAdminUser\s*\|\|\s*academyAdminUser\s*\)\s*return\s+<AdminDashboardWorkspace[^;]+;/)[1] ?? source;

    assert.match(source, /import\s+\{\s*SidePanelControl,\s*type\s+SidePanelItem\s*\}\s+from\s+"@\/app\/_components\/SidePanelControl"/);
    assert.match(source, /const\s+standardNavigationItems:\s*SidePanelItem\[\]\s*=\s*\[/);
    assert.match(standardSource, /<SidePanelControl[\s\S]*navigationItems=\{standardNavigationItems\}/);
    assert.match(standardSource, /supportHref="\/contact"/);

    assert.match(source, /label:\s*"Dashboard"[\s\S]*href:\s*"\/dashboard"/);
    assert.match(source, /label:\s*"Profile"[\s\S]*href:\s*"\/dashboard\?panel=profile"/);
    assert.match(source, /label:\s*"Settings"[\s\S]*href:\s*"\/dashboard\?panel=settings"/);
    assert.doesNotMatch(standardSource, /My Academy Rolls|Password \/ Account Settings/);

    for (const adminLabel of ["Platform Administration", "Academy Administration", "User Administration", "Email Operations", "Academy Claims", "Map Settings", "System Settings"]) {
      assert.doesNotMatch(standardSource, new RegExp(adminLabel));
    }
  });

  it("standard-user dashboard rolls are read-only and scoped to the user's academy", () => {
    const dashboardPage = readSource("apps/portal/src/app/dashboard/page.tsx");
    const rollsRoute = readSource("apps/portal/src/app/api/dashboard/rolls/route.ts");

    assert.match(dashboardPage, /academyId,\s*\n\s*active:\s*true,\s*\n\s*eventDate:\s*\{\s*gte:\s*startOfToday\(\)\s*\}/);
    assert.match(dashboardPage, /title:\s*\{\s*contains:\s*search,\s*mode:\s*"insensitive"\s*\}/);
    assert.match(dashboardPage, /orderBy:\s*\[\s*\{\s*eventDate:\s*"asc"\s*\},\s*\{\s*startTime:\s*"asc"\s*\}/);
    assert.match(dashboardPage, /take:\s*standardRollsPageSize/);
    assert.match(dashboardPage, /getRowHref=\{\(row\) => dashboardCourseHref\(row,\s*returnTo\)\}/);
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
    const dashboardPage = readSource("apps/portal/src/app/dashboard/page.tsx");
    const dashboardActions = readSource("apps/portal/src/app/dashboard/DashboardActions.ts");

    assert.match(dashboardPage, /<ProfilePanel[\s\S]*academy=\{academy\}/);
    assert.match(dashboardPage, /Academy Information/);
    assert.match(dashboardPage, /<QuickActionPanel title="Account Actions"/);
    assert.match(dashboardPage, /title:\s*"Change Password"/);
    assert.match(dashboardPage, /title:\s*"Edit Profile"/);
    assert.match(dashboardPage, /href:\s*"\/dashboard\?panel=settings&settingsAction=change-password"/);
    assert.match(dashboardPage, /href:\s*"\/dashboard\?panel=settings&settingsAction=edit-profile"/);
    assert.match(dashboardPage, /activeAction\s*===\s*"change-password"[\s\S]*<ChangePasswordForm[\s\S]*embedded/);
    assert.match(dashboardPage, /activeAction\s*===\s*"edit-profile"[\s\S]*<EditProfileForm[\s\S]*email=\{user\.email\}[\s\S]*name=\{user\.name\}/);
    assert.match(dashboardPage, /Choose Change Password or Edit Profile to open the form here/);
    assert.match(dashboardPage, /rounded-lg border border-teal-300 bg-teal-50\/20/);

    const editProfileForm = readSource("apps/portal/src/app/dashboard/settings/EditProfileForm.tsx");
    assert.match(editProfileForm, /<ReadOnlyField label="Email" value=\{email\} \/>/);
    assert.match(editProfileForm, /<ReadOnlyField label="Role" value=\{roleLabel\} \/>/);
    assert.match(editProfileForm, /<ReadOnlyField label="Status" value=\{statusLabel\} \/>/);
    assert.match(editProfileForm, /<ReadOnlyField label="Academy" value=\{academyName\} \/>/);
    assert.match(dashboardActions, /isStandardUserRole\(user\.role\)/);
    assert.match(dashboardActions, /isAnyAdminRole\(user\.role\)/);
    assert.match(dashboardActions, /Profile display name update for \$\{user\.id\} is managed by the users service/);
    assert.match(dashboardActions, /Profile updates are managed by the users service/);
    const standardProfileAction = dashboardActions.match(/export async function updateStandardUserProfile[\s\S]*?\n}\n/)?.[0] ?? "";
    assert.notEqual(standardProfileAction, "", "Expected standard profile action source to be present");
    assert.doesNotMatch(standardProfileAction, /data:[\s\S]*\b(role|status|academyId|disabled|isProtected)\b/);
  });

  it("dashboard top account trigger uses the shared account dropdown menu", () => {
    const standardSource = readSource("apps/portal/src/app/dashboard/page.tsx");
    const adminSource = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");
    const accountMenuSource = readSource("apps/portal/src/app/dashboard/DashboardAccountDropDownMenu.tsx");

    for (const source of [standardSource, adminSource]) {
      assert.match(source, /<DashboardAccountDropDownMenu/);
      assert.doesNotMatch(source, /label="Open account profile menu"/);
      assert.doesNotMatch(source, /<LogoutButton/);
    }

    assert.match(standardSource, /profileHref="\/dashboard\?panel=profile"/);
    assert.match(standardSource, /settingsHref="\/dashboard\?panel=settings"/);
    assert.match(adminSource, /profileHref="\/dashboard\?panel=settings&settingsAction=edit-profile"/);
    assert.match(adminSource, /settingsHref="\/dashboard\?panel=settings"/);
    assert.match(accountMenuSource, /<UserAccountDropDownMenu/);
    assert.match(accountMenuSource, /signOut\(\{ callbackUrl: logoutCallbackUrl\(\) \}\)/);
  });

  it("standard users are not treated as admin roles for admin APIs or admin page guards", () => {
    assert.equal(isStandardUserRole("STANDARD_USER"), true);
    assert.equal(isStandardUserRole("USER"), true);
    assert.equal(isAnyAdminRole("STANDARD_USER"), false);
    assert.equal(isAnyAdminRole("USER"), false);

    const admin = readSource("apps/portal/src/lib/admin.ts");
    const adminAcademiesApi = readSource("apps/portal/src/app/api/admin/academies/route.ts");

    assert.match(admin, /export\s+async\s+function\s+requireAdminApi/);
    assert.match(admin, /hasPermission\(user,\s*"users\.admin\.access"\)/);
    assert.match(adminAcademiesApi, /const\s+forbidden\s*=\s*await\s+requireAdminApi\(\)/);
    assert.match(adminAcademiesApi, /if\s*\(\s*forbidden\s*\)\s*return\s+forbidden/);
  });

  it("public navigation exposes Dashboard instead of Login", () => {
    const pageHeader = readSource("apps/portal/src/app/_components/Page/PageHeader.tsx");
    const staticHeader = readSource("apps/portal/src/app/_components/Page/StaticSiteHeader.tsx");

    for (const source of [pageHeader, staticHeader]) {
      assert.match(source, /<NavLink href="\/dashboard">Dashboard<\/NavLink>/);
      assert.doesNotMatch(source, /<NavLink href="\/login">[\s\S]*Login[\s\S]*<\/NavLink>/);
    }
  });

  it("dashboard auth redirects use the auth URL helper with redirect targets", () => {
    const helper = readSource("apps/portal/src/lib/auth-urls.ts");
    const dashboard = readSource("apps/portal/src/lib/standard-dashboard.ts");
    const proxy = readSource("apps/portal/src/proxy.ts");
    const logoutButton = readSource("apps/portal/src/app/_components/LogoutButton/LogoutButton.tsx");
    const prd = readSource("apps/portal/docs/features/Users/Standard/Pages/DashboardPage.md");

    assert.match(helper, /AUTH_PORTAL_ORIGIN/);
    assert.match(helper, /url\.searchParams\.set\("redirect",\s*redirectTarget\)/);
    assert.match(helper, /return authPortalBaseUrl\(\) \? url\.toString\(\) : `\$\{url\.pathname\}\$\{url\.search\}`/);
    assert.match(dashboard, /redirect\(loginUrl\("\/dashboard"\)\)/);
    assert.doesNotMatch(dashboard, /redirect\("\/login\?callbackUrl=\/dashboard"\)/);
    assert.match(proxy, /publicSiteBaseUrl\(\)/);
    assert.match(proxy, /new URL\(`\$\{request\.nextUrl\.pathname\}\$\{request\.nextUrl\.search\}`,\s*`\$\{publicBaseUrl\}\/`\)\.toString\(\)/);
    assert.match(proxy, /new URL\(`\$\{request\.nextUrl\.pathname\}\$\{request\.nextUrl\.search\}`,\s*request\.url\)\.toString\(\)/);
    assert.match(proxy, /new URL\(loginUrl\(redirectTarget\),\s*request\.url\)/);
    assert.match(logoutButton, /logoutCallbackUrl\(\)/);
    assert.match(prd, /auth\.rollfinders\.com/);
    assert.match(prd, /dashboard\.<service>\.rollfinders\.com/);
    assert.match(prd, /\/login\?redirect=\/dashboard/);
  });

  it("admin dashboard canonical links and pagination stay on direct dashboard routes with complete query strings", () => {
    const source = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");
    const userActionsSource = readSource("apps/portal/src/app/admin/users/actions.ts");
    const malformedRouteSource = readSource("apps/portal/src/app/dashboard/[malformed]/page.tsx");

    assert.match(source, /href:\s*"\/dashboard"/);
    assert.match(source, /href:\s*"\/dashboard\?panel=settings"/);
    assert.match(source, /return\s+query\s*\?\s*`\$\{dashboardPanelPath\(panel\)\}\?\$\{query\}`\s*:\s*dashboardPanelPath\(panel\)/);
    assert.match(source, /returnTo="\/dashboard\/users"/);
    assert.match(source, /cancelHref="\/dashboard\/users"/);
    assert.match(userActionsSource, /managedUsersReturnPath\(returnTo\)/);
    assert.match(userActionsSource, /revalidatePath\("\/dashboard"\)/);
    assert.match(malformedRouteSource, /users:\s*"\/dashboard\/users"/);
    assert.match(malformedRouteSource, /decodeURIComponent\(segment\)/);
    assert.match(malformedRouteSource, /decodedSegment\.split\("&"\)/);
    assert.match(malformedRouteSource, /redirect\(malformedRouteRedirect\(malformed,\s*query\) \?\? "\/dashboard"\)/);
    assert.doesNotMatch(source, /return\s+query\s*\?\s*`\/dashboard\?`\s*:\s*"\/dashboard"/);
  });

  it("academy profile analytics summary is reachable for admin roles but not standard users", () => {
    const adminSource = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");
    const academiesTableSource = readSource("apps/portal/src/app/dashboard/academies/AcademiesTable.tsx");
    const academyActionMenuSource = readSource("apps/portal/src/app/dashboard/academies/AcademyActionMenu.tsx");
    const standardSource = readSource("apps/portal/src/app/dashboard/page.tsx");
    const academyDetailSource = readSource("apps/portal/src/app/admin/academies/[id]/page.tsx");

    assert.match(adminSource, /title:\s*academyAdmin\s*\?\s*"Academy Profile Summary"\s*:\s*"Manage Academies"/);
    assert.match(adminSource, /href:\s*"\/dashboard\/academies"/);
    assert.match(adminSource, /function AcademyProfilePanel/);
    assert.match(adminSource, /returnTo="\/dashboard\/academies"/);
    assert.match(adminSource, /updateAcademy\.bind\(null,\s*academy\.id\)/);
    assert.match(academyActionMenuSource, /Edit Academy/);
    assert.match(academyDetailSource, /requireAcademyEditor\(id\)/);
    assert.match(academyDetailSource, /isPlatformAdminRole\(currentUser\?\.role\)/);
    assert.match(academyDetailSource, /getAcademyProfileViewCount\(id\)/);
    assert.match(academyDetailSource, /<h2 className="text-lg font-black text-stone-950">Summary<\/h2>/);
    assert.match(academyDetailSource, /<h2 className="text-lg font-black text-stone-950">Statistics<\/h2>/);
    assert.match(academyDetailSource, /showAcademyStats\s*\?\s*\(/);
    assert.match(academyDetailSource, /<Info label="Profile views" value=\{profileViewCount\.toString\(\)\} \/>/);
    assert.match(academyDetailSource, /getAcademyFromAcademyService\(id\)/);
    assert.match(academyDetailSource, /<Info label="Open mats" value=\{eventCount\.toString\(\)\} \/>/);
    assert.match(academyDetailSource, /<Info label="Admins" value=\{\(academy\.members\?\.length \?\? 0\)\.toString\(\)\} \/>/);
    assert.doesNotMatch(standardSource, /Academy Profile Summary|Profile Summary|\/admin\/academies\/\$\{currentUser\.academyId\}/);
  });

  it("dashboard academy table opens academy details in a dialog instead of leaving the dashboard", () => {
    const source = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");
    const academiesTableSource = readSource("apps/portal/src/app/dashboard/academies/AcademiesTable.tsx");
    const academyActionMenuSource = readSource("apps/portal/src/app/dashboard/academies/AcademyActionMenu.tsx");

    assert.match(source, /dialog\s*===\s*"view-academy"/);
    assert.match(source, /dialog\s*===\s*"edit-academy"/);
    assert.match(source, /<ViewAcademyDialog/);
    assert.match(source, /<EditAcademyDialog/);
    assert.match(source, /function\s+ViewAcademyDialog/);
    assert.match(source, /function\s+EditAcademyDialog/);
    assert.match(source, /<AcademyForm[\s\S]*action=\{updateAcademy\.bind\(null,\s*academy\.id\)\}/);
    assert.match(academiesTableSource, /adminAcademiesHref\(params,\s*\{\s*dialog:\s*"view-academy",\s*academyId:\s*academy\.id\s*\}\)/);
    assert.match(academyActionMenuSource, /adminAcademiesHref\(params,\s*\{\s*dialog:\s*"edit-academy",\s*academyId:\s*academy\.id\s*\}\)/);
    assert.match(academyActionMenuSource, /Edit Academy/);
    assert.doesNotMatch(academiesTableSource, /const\s+academyHref\s*=\s*`\/admin\/academies\/\$\{academy\.id\}`/);
    assert.doesNotMatch(academiesTableSource, /href=\{`\/admin\/academies\/\$\{academy\.id\}`\}/);
    assert.doesNotMatch(academiesTableSource, /Profile Summary/);
  });

  it("managed user actions only return to canonical admin or dashboard paths", () => {
    assert.equal(managedUsersReturnPath("/dashboard/users?usersView=roles"), "/dashboard/users?usersView=roles");
    assert.equal(managedUsersReturnPath("/dashboard/users"), "/dashboard/users");
    assert.equal(managedUsersReturnPath("/admin?panel=users"), "/admin?panel=users");
    assert.equal(managedUsersReturnPath("/admin/users"), "/admin/users");

    assert.equal(managedUsersReturnPath("https://example.com/dashboard/users"), "/admin/users");
    assert.equal(managedUsersReturnPath("//example.com/dashboard/users"), "/admin/users");
    assert.equal(managedUsersReturnPath("/dashboardevil?panel=users"), "/admin/users");
    assert.equal(managedUsersReturnPath("/administration/users"), "/admin/users");
    assert.equal(managedUsersReturnPath("/admin.evil/users"), "/admin/users");
  });

  it("managed user create and edit keep academy assignment out of public users", () => {
    const actionsSource = readSource("apps/portal/src/app/admin/users/actions.ts");
    const userServiceSource = readSource("apps/portal/src/lib/users-service.ts");
    const profileSource = readSource("apps/portal/src/lib/rollfinder-user-profiles.ts");
    const schemaSource = readSource("prisma/schema.prisma");

    assert.match(actionsSource, /const\s+academyId\s*=\s*String\(formData\.get\("academyId"\)/);
    assert.match(actionsSource, /createUserInService\(actor,\s*\{[\s\S]*academyId[\s\S]*\}\)/);
    assert.match(actionsSource, /updateUserInService\(actor,\s*userId,\s*\{[\s\S]*academyId[\s\S]*\}\)/);
    assert.match(userServiceSource, /const serviceInput = \{ \.\.\.\(input as Record<string, unknown>\) \}/);
    assert.doesNotMatch(userServiceSource, /const\s+\{\s*academyId,\s*\.\.\.serviceInput\s*\}/);
    assert.match(userServiceSource, /const \{ serviceInput, academyId, role \} = splitRollfinderAcademyInput\(input\)/);
    assert.match(userServiceSource, /syncRollfinderUserProfile\(result\.user,\s*academyId(?:,\s*actor)?\)/);
    assert.match(userServiceSource, /replaceUserAuthorisationRole\(actor,\s*result\.user\.id,\s*role,\s*\{ organisationId: academyId \?\? undefined \}\)/);
    assert.match(actionsSource, /canAssignManagedUserRole\(actor,\s*\{ role,\s*academyId \}\)/);
    assert.match(profileSource, /listUserAuthorisationRoles/);
    assert.doesNotMatch(profileSource, /AcademyMemberRole|memberRole|member_role/);
    assert.doesNotMatch(profileSource, /roleForAcademyMember|profileRole/);
    assert.doesNotMatch(profileSource, /prisma\.user|tx\.user/);
    assert.match(profileSource, /addAcademyMemberInAcademyService/);
    assert.doesNotMatch(schemaSource, /enum AcademyMemberRole|role\s+AcademyMemberRole/);
    assert.doesNotMatch(schemaSource, /model User \{/);
  });

  it("managed user tables request exactly ten users per page", () => {
    const dashboardSource = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");
    const adminUsersSource = readSource("apps/portal/src/app/admin/users/page.tsx");

    assert.match(dashboardSource, /const\s+usersPageSize\s*=\s*10/);
    assert.match(dashboardSource, /pageSize:\s*String\(usersPageSize\)/);
    assert.match(dashboardSource, /userQueryParams\.set\("search",\s*search\)/);
    assert.doesNotMatch(dashboardSource, /userQueryParams\.set\("q",\s*search\)/);
    assert.match(dashboardSource, /const\s+currentUserPageSize\s*=\s*managedUsersPage\.pageSize\s*\|\|\s*usersPageSize/);
    assert.match(dashboardSource, /enrichUsersWithAcademyNames\(\s*managedUsersPage\.users\.map/);
    assert.match(dashboardSource, /itemsPerPage=\{currentUserPageSize\}/);
    assert.doesNotMatch(dashboardSource, /academy:\s*null/);
    assert.match(adminUsersSource, /const\s+usersPageSize\s*=\s*10/);
    assert.match(adminUsersSource, /const\s+pageSize\s*=\s*usersPageSize/);
    assert.match(adminUsersSource, /enrichUsersWithAcademyNames\(result\.users\)/);
    assert.match(adminUsersSource, /user\.academy\?\.name\s*\?\?\s*"None"/);
    assert.doesNotMatch(adminUsersSource, /supportedPageSizes|Rows per page/);
  });

  it("authorisation role and permission boards page from the service and cache loaded pages", () => {
    const dashboardSource = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");
    const actionsSource = readSource("apps/portal/src/app/dashboard/DashboardActions.ts");
    const rolesBoardSource = readSource("apps/portal/src/app/dashboard/users/SystemRolesBoard.tsx");
    const permissionsBoardSource = readSource("apps/portal/src/app/dashboard/users/UserPermissionsBoard.tsx");
    const authorisationSource = readSource("apps/portal/src/lib/authorisation-service.ts");

    assert.match(authorisationSource, /listAuthorisationRolesPage/);
    assert.match(authorisationSource, /listAuthorisationPermissionsPage/);
    assert.match(dashboardSource, /listAuthorisationRolesPage\(currentUser,\s*\{\s*limit:\s*pageSize,\s*offset:\s*0\s*\}\)/);
    assert.match(dashboardSource, /listAuthorisationPermissionsPage\(currentUser,\s*\{\s*limit:\s*pageSize,\s*offset:\s*0,\s*\}\)/);
    assert.match(actionsSource, /loadAuthorisationRolesPage/);
    assert.match(actionsSource, /loadAuthorisationPermissionsPage/);
    assert.match(dashboardSource, /effectivePermissions=\{currentUserEffectivePermissions\}/);
    assert.match(rolesBoardSource, /rolePages/);
    assert.match(rolesBoardSource, /loadAuthorisationRolesPage\(safePage,\s*pageSize\)/);
    assert.match(rolesBoardSource, /currentRolePage\.pagination\.has_more/);
    assert.match(permissionsBoardSource, /permissionPages/);
    assert.match(permissionsBoardSource, /effectivePermissions:\s*AuthorisationPermission\[\]/);
    assert.match(permissionsBoardSource, /effectivePermissions\.map\(\(permission\)\s*=>\s*permission\.code\)/);
    assert.doesNotMatch(permissionsBoardSource, /const canEditPermissions = rows\.some/);
    assert.match(permissionsBoardSource, /loadAuthorisationPermissionsPage\(safePage,\s*pageSize\)/);
    assert.match(permissionsBoardSource, /currentPermissionPage\.pagination\.has_more/);
  });

  it("keeps optional organisation lookups from crashing the permissions dashboard", () => {
    const dashboardSource = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");

    assert.match(dashboardSource, /listOrganisations\(currentUser\)\.catch\(\(\)\s*=>\s*\[\]\)/);
    assert.match(dashboardSource, /listOrganisationApplications\(currentUser\)\.catch\(\(\)\s*=>\s*\[\]\)/);
  });

  it("academy member surfaces do not depend on public user profiles", () => {
    const memberPage = readSource("apps/portal/src/app/dashboard/members/page.tsx");
    const memberApi = readSource("apps/portal/src/app/api/dashboard/members/route.ts");
    const academyTeamPage = readSource("apps/portal/src/app/admin/academies/[id]/team/page.tsx");
    const profileHelper = readSource("apps/portal/src/lib/rollfinder-user-profiles.ts");

    assert.match(memberPage, /redirect\(q \? `\/dashboard\?panel=members&search=\$\{encodeURIComponent\(q\)\}` : "\/dashboard\?panel=members"\)/);
    assert.match(memberApi, /academyMemberProfiles\(academy\.id,\s*q\)/);
    assert.match(academyTeamPage, /academyMemberProfiles\(academy\.id\)/);
    assert.match(profileHelper, /listAcademyMembersFromAcademyService/);
    assert.doesNotMatch(profileHelper, /prisma\.user|tx\.user/);
  });

  it("admin side-panel service navigation keeps footer-only Map and Settings out of primary navigation", () => {
    const source = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");
    const navigationSource = source.match(/const adminNavigationItems: SidePanelItem\[\] = \[[\s\S]*?\n  \];/)?.[0] ?? "";
    const mobileNavigationSource = source.match(/const dashboardServiceNavigationItems = adminNavigationItems[\s\S]*?;/)?.[0] ?? "";

    assert.notEqual(navigationSource, "", "Expected admin navigation source to be present");
    assert.notEqual(mobileNavigationSource, "", "Expected dashboard service navigation source to be present");
    for (const label of ["Dashboard", "Manage Users", "Analytics", "Academy Review", "Academy Claims", "Wallet", "Map", "Settings"]) {
      assert.match(navigationSource, new RegExp(`label:\\s*"${label}"`));
    }
    assert.match(navigationSource, /label:\s*academyAdmin\s*\?\s*"Academy Profile"\s*:\s*"Manage Academies"/);
    assert.match(navigationSource, /label:\s*openMatSessionsLabel/);
    assert.match(navigationSource, /href:\s*"\/dashboard\/academies"/);
    assert.match(navigationSource, /href:\s*"\/dashboard\/courses"/);
    assert.match(navigationSource, /href:\s*"\/dashboard\/users"/);
    assert.match(navigationSource, /academyAdmin[\s\S]*href:\s*"\/dashboard\?panel=settings"[\s\S]*label:\s*"Settings"/);
    assert.match(navigationSource, /href:\s*"\/dashboard\/academy-review"/);
    assert.match(navigationSource, /active:\s*!firstParam\(params\.panel\)/);
    assert.match(navigationSource, /label:\s*"Dashboard"[\s\S]*label:\s*academyAdmin\s*\?\s*"Academy Profile"\s*:\s*"Manage Academies"[\s\S]*label:\s*openMatSessionsLabel[\s\S]*label:\s*"Manage Users"[\s\S]*label:\s*"Analytics"[\s\S]*label:\s*"Academy Review"[\s\S]*label:\s*"Wallet"[\s\S]*label:\s*"Academy Claims"[\s\S]*label:\s*"Map"[\s\S]*label:\s*"Settings"/);
    assert.match(
      source,
      /\.filter\(\s*\(item\) =>\s*item\.href !== "\/dashboard" &&\s*item\.href !== "\/dashboard\?panel=maps" &&\s*item\.href !== "\/dashboard\?panel=settings",?\s*\)/,
    );
    assert.match(source, /\.map\(\(item\) =>\s*item\.href === "\/dashboard\/academies"\s*\?\s*\{ \.\.\.item, label: "Academies" \}\s*:\s*item,\s*\)/);
    assert.match(source, /mobileNavigationItems=\{dashboardServiceNavigationItems\}/);
    assert.match(source, /navigationItems=\{serviceNavigationItems\}/);
    assert.match(source, /footerNavigationItems=\{sidePanelFooterNavigationItems\}/);
    assert.match(source, /const\s+mapNavigationItem\s*=\s*adminNavigationItems\.find\(\s*\(item\) => item\.href === "\/dashboard\?panel=maps",?\s*\)/);
    assert.match(source, /\.\.\.\(mapNavigationItem \? \[mapNavigationItem\] : \[\]\)[\s\S]*\.\.\.\(\s*settingsNavigationItem && panel !== "settings"\s*\?\s*\[settingsNavigationItem\]\s*:\s*\[\],?\s*\)/);
    assert.match(source, /const paymentNavigationSections = \[/);
    assert.match(source, /label:\s*"Overview"/);
    assert.match(source, /label:\s*"Transactions"/);
    assert.match(source, /label:\s*"Earnings"/);
    assert.match(source, /label:\s*"Refunds"/);
    assert.match(source, /label:\s*"Payouts"/);
    assert.doesNotMatch(source, /label:\s*"Payment Settings"/);
    assert.match(source, /children:\s*paymentNavigationSections/);
    assert.match(source, /selectedPaymentOverviewPeriod\(\s*firstParam\(params\.paymentsPeriod\),?\s*\)/);
    for (const period of ["Daily", "Weekly", "Monthly", "Yearly"]) {
      assert.match(source, new RegExp(`label:\\s*"${period}"`));
    }
    assert.match(source, /<div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-4">[\s\S]*<DashboardAccountDropDownMenu/);
    assert.match(mobileNavigationSource, /item\.href !== "\/dashboard\?panel=maps"/);
    assert.match(mobileNavigationSource, /item\.href !== "\/dashboard\?panel=settings"/);
    assert.doesNotMatch(mobileNavigationSource, /label:\s*"Map"/);
    assert.doesNotMatch(mobileNavigationSource, /label:\s*"Settings"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Manage Academies"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Courses\/Sessions"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Manage Users"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Analytics"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Academy Review"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Wallet"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Academy Claims"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Map"/);
  });

  it("admin quick actions use concise analytics and academy review labels", () => {
    const source = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");

    assert.match(source, /id:\s*"analytics"[\s\S]*title:\s*"Analytics"/);
    assert.match(source, /id:\s*"platform-admin-created-academies"[\s\S]*title:\s*"Academy Review"/);
    assert.match(source, /detailHref\s*=\s*`\/dashboard\/courses\?dialog=view-event&eventId=\$\{event\.id\}`/);
    assert.match(source, /editHref\s*=\s*`\/dashboard\/courses\?dialog=edit-course&eventId=\$\{event\.id\}`/);
    assert.match(source, /permanentHref\s*=\s*eventPermanentPath\(event\.id\)/);
    assert.doesNotMatch(source, /adminHref\s*=\s*`\$\{openMat/);
    assert.match(source, /<QuickActionPanel[\s\S]*collapsible[\s\S]*defaultCollapsed[\s\S]*persistCollapseState/);
    assert.match(source, /collapseStorageKey="rollfinders\.dashboardQuickActionsCollapsed"/);
    assert.doesNotMatch(source, /title:\s*"Founder Analytics"/);
    assert.doesNotMatch(source, /title:\s*"Platform Admin Academy Review"/);
  });

  it("keeps course creation and editing inside the permission-aware dashboard flow", () => {
    const source = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");
    const actions = readSource("apps/portal/src/app/admin/courses/actions.ts");
    const editDialog = readSource("apps/portal/src/app/dashboard/courses/EditCourseDialog.tsx");

    assert.match(source, /authorize\(currentUser,\s*"course\.create"/);
    assert.match(source, /canCreateCourse\s*\?\s*\([\s\S]*href="\/dashboard\/courses\?dialog=create-course"/);
    assert.match(source, /\{canCreateCourse\s*\?\s*\([\s\S]*href=\{cloneHref\}/);
    assert.match(source, /dialog\s*===\s*"edit-course"/);
    assert.match(source, /<EditCourseDialog/);
    assert.match(actions, /authorize\(user,\s*"course\.create"/);
    assert.match(actions, /You do not have permission to create courses/);
    assert.match(editDialog, /<CourseForm[\s\S]*updateCourse\.bind\(null,\s*course\.id\)/);
    assert.match(editDialog, /deleteCourse\.bind\(null,\s*course\.id\)/);
  });

  it("platform admin academy review links are serializable across the server/client table boundary", () => {
    const source = readSource("apps/portal/src/app/dashboard/academies/SuperAdminPlatformAcademiesPanel.tsx");
    const columnsSource = readSource("apps/portal/src/app/dashboard/academies/platformAcademyColumns.tsx");
    const panelSource = source.match(/export function SuperAdminPlatformAcademiesPanel[\s\S]*$/)?.[0] ?? "";

    assert.notEqual(columnsSource, "", "Expected Platform Admin academy columns source to be present");
    assert.notEqual(panelSource, "", "Expected Platform Admin academy panel source to be present");
    assert.doesNotMatch(columnsSource, /<Button href=\{String\(value\)\}/);
    assert.match(columnsSource, /<Button href=\{row\.reviewHref\} aria-label=\{row\.reviewLabel\}/);
    assert.match(panelSource, /reviewLabel:\s*`Review \$\{academy\.name\}`/);
    assert.match(panelSource, /reviewHref:\s*`\/admin\/academies\/\$\{academy\.id\}`/);
    assert.doesNotMatch(panelSource, /actions=\{\[/);
    assert.doesNotMatch(panelSource, /ariaLabel:\s*\(row\)/);
    assert.doesNotMatch(panelSource, /href:\s*\(row\)/);
    assert.doesNotMatch(panelSource, /getRowHref=\{\(row\) => String\(row\.reviewHref\)\}/);
  });

  it("admin dashboard stats board is collapsible and collapsed by default", () => {
    const source = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");

    assert.match(source, /panel === "academies"\s*\?\s*"Academies"/);
    assert.match(source, /panel === "open-mats"\s*\?\s*"Course\/Events Dashboard"/);
    assert.match(source, /panel === "bookings"\s*\?\s*"Bookings"/);
    assert.match(source, /panel === "payments"\s*\?\s*"Payment Dashboard"/);
    assert.match(source, /panel === "wallet"\s*\?\s*"Wallet Dashboard"/);
    assert.match(source, /panel === "users"\s*\?\s*"Identity Access Management"/);
    assert.match(source, /const hideSharedDashboardSections = \[[\s\S]*"academies"[\s\S]*"wallet",[\s\S]*\]\.includes\(panel\)/);
    assert.match(source, /\{!dashboardLanding && !hideSharedDashboardSections \? \(/);
    assert.match(source, /getRowHref=\{\(booking\) => bookingEventHref\(booking\)\}/);
    assert.match(source, /<StatsPanel[\s\S]*title="Stats Board"[\s\S]*collapsible[\s\S]*defaultCollapsed[\s\S]*persistCollapseState/);
    assert.match(source, /collapseStorageKey="rollfinders\.dashboardStatsCollapsed"/);
  });

  it("admin settings use quick actions to inject one selected settings detail panel", () => {
    const dashboardSource = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");
    const legacySettingsSource = readSource("apps/portal/src/app/admin/settings/page.tsx");
    const passwordActionSource = readSource("apps/portal/src/app/dashboard/password/PasswordActions.ts");

    for (const source of [dashboardSource, legacySettingsSource]) {
      assert.match(source, /import\s+\{\s*QuickActionPanel,\s*type\s+QuickActionPanelItem\s*,?\s*\}\s+from\s+"@\/app\/_components\/QuickActionPanel"/);
      assert.match(source, /const\s+settingsActionItems:\s*QuickActionPanelItem\[\]\s*=\s*\[/);
      assert.match(source, /title:\s*"Change Password"[\s\S]*href:\s*"\/(?:dashboard\?panel=settings&|admin\/settings\?)settingsAction=change-password"/);
      assert.match(source, /title:\s*"Email Options"[\s\S]*href:\s*"\/(?:dashboard\?panel=settings&|admin\/settings\?)settingsAction=email-options"/);
      assert.match(source, /title:\s*"Recent Audits"[\s\S]*href:\s*"\/(?:dashboard\?panel=settings&|admin\/settings\?)settingsAction=recent-audits"/);
      assert.match(source, /title:\s*"Weekly Activity Summary"[\s\S]*href:\s*"\/(?:dashboard\?panel=settings&|admin\/settings\?)settingsAction=weekly-activity"/);
      assert.match(source, /<QuickActionPanel[\s\S]*items=\{settingsActionItems\}/);
      assert.match(source, /rounded-lg border border-blue-300 bg-blue-50\/20/);
      assert.doesNotMatch(source, /role="dialog"[\s\S]*Change Password/);
    }

    assert.match(dashboardSource, /const\s+effectiveSettingsAction\s*=/);
    assert.match(dashboardSource, /title:\s*"Edit Profile"[\s\S]*href:\s*"\/dashboard\?panel=settings&settingsAction=edit-profile"/);
    assert.match(dashboardSource, /id:\s*"edit-profile"/);
    assert.match(dashboardSource, /elevatedAdmin[\s\S]*id:\s*"email-options"[\s\S]*id:\s*"recent-audits"/);
    assert.match(dashboardSource, /effectiveSettingsAction\s*===\s*"change-password"[\s\S]*<ChangePasswordForm[\s\S]*embedded/);
    assert.match(dashboardSource, /effectiveSettingsAction\s*===\s*"edit-profile"\s*&&\s*account[\s\S]*<EditProfileForm/);
    assert.match(dashboardSource, /effectiveSettingsAction\s*===\s*"email-options"\s*&&\s*elevatedAdmin[\s\S]*<EmailOperationsPanel[\s\S]*activePage=\{[^}]*emailPage[^}]*\}[\s\S]*activeView=\{[^}]*emailOperationsView[^}]*\}/);
    assert.match(dashboardSource, /effectiveSettingsAction\s*===\s*"recent-audits"\s*&&\s*elevatedAdmin/);
    assert.match(dashboardSource, /effectiveSettingsAction\s*===\s*"weekly-activity"\s*&&\s*elevatedAdmin[\s\S]*<PlatformAdminActivitySummaryPanel[\s\S]*embedded[\s\S]*summary=\{platformAdminActivitySummary\}/);
    assert.doesNotMatch(dashboardSource, /<PlatformAdminActivitySummaryPanel summary=\{platformAdminActivitySummary\}/);

    assert.match(passwordActionSource, /changeDashboardUserPassword/);
    assert.match(passwordActionSource, /changeUserPassword\(user\.id,\s*password\)/);
    assert.match(passwordActionSource, /action:\s*"DASHBOARD_PASSWORD_CHANGED"/);
    assert.match(passwordActionSource, /metadata:\s*\{\s*role:\s*user\.role\s*\}/);
    const metadataLine = passwordActionSource.match(/metadata:\s*\{[^\n]+\}/)?.[0] ?? "";
    assert.doesNotMatch(metadataLine, /password/i);
  });

  it("academy admin user tables hide visible role columns while elevated admins keep them", () => {
    const source = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");

    assert.match(source, /const\s+canViewRoleColumn\s*=\s*isPlatformAdminRole\(actorRole\)/);
    assert.match(source, /canViewRoleColumn\s*\?\s*<th className="px-5 py-4">Role<\/th>\s*:\s*null/);
    assert.match(source, /canViewRoleColumn\s*\?\s*\(\s*<LinkedTableCell href=\{userHref\}>\s*<RolePill role=\{user\.role\} \/>\s*<\/LinkedTableCell>\s*\)\s*:\s*null/);
    assert.match(source, /const\s+emptyColSpan\s*=\s*canViewRoleColumn\s*\?\s*6\s*:\s*5/);
  });
});
