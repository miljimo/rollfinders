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
    assert.match(dashboardActions, /isAnyAdminRole\(user\.role\)/);
    assert.match(dashboardActions, /Profile display name update for \$\{user\.id\} is managed by the users service/);
    assert.match(dashboardActions, /Profile updates are managed by the users service/);
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
    assert.match(admin, /hasPermission\(user,\s*"users\.admin\.access"\)/);
    assert.match(adminAcademiesApi, /const\s+forbidden\s*=\s*await\s+requireAdminApi\(\)/);
    assert.match(adminAcademiesApi, /if\s*\(\s*forbidden\s*\)\s*return\s+forbidden/);
  });

  it("admin dashboard canonical links and pagination stay on /dashboard with complete query strings", () => {
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const userActionsSource = readSource("src/app/admin/users/actions.ts");

    assert.match(source, /href:\s*"\/dashboard"/);
    assert.match(source, /href:\s*"\/dashboard\?panel=settings"/);
    assert.match(source, /return\s+query\s*\?\s*`\/dashboard\?\$\{query\}`\s*:\s*"\/dashboard"/);
    assert.match(source, /returnTo="\/dashboard\?panel=users"/);
    assert.match(source, /cancelHref="\/dashboard\?panel=users"/);
    assert.match(userActionsSource, /managedUsersReturnPath\(returnTo\)/);
    assert.match(userActionsSource, /revalidatePath\("\/dashboard"\)/);
    assert.doesNotMatch(source, /return\s+query\s*\?\s*`\/dashboard\?`\s*:\s*"\/dashboard"/);
  });

  it("academy profile analytics summary is reachable for admin roles but not standard users", () => {
    const adminSource = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const standardSource = readSource("src/app/dashboard/page.tsx");
    const academyDetailSource = readSource("src/app/admin/academies/[id]/page.tsx");

    assert.match(adminSource, /title:\s*academyAdmin\s*\?\s*"Academy Profile Summary"\s*:\s*"Manage Academies"/);
    assert.match(adminSource, /href:\s*"\/dashboard\?panel=academies"/);
    assert.match(adminSource, /function AcademyProfilePanel/);
    assert.match(adminSource, /returnTo="\/dashboard\?panel=academies"/);
    assert.match(adminSource, /updateAcademy\.bind\(null,\s*academy\.id\)/);
    assert.match(adminSource, /Edit Academy/);
    assert.match(academyDetailSource, /requireAcademyEditor\(id\)/);
    assert.match(academyDetailSource, /isPlatformAdminRole\(currentUser\?\.role\)/);
    assert.match(academyDetailSource, /prisma\.analyticsEvent\.count\(\{/);
    assert.match(academyDetailSource, /eventName:\s*"academy_profile_viewed"/);
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
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const academiesTableSource = source.match(/export function AcademiesTable[\s\S]*?function UsersTable/)?.[0] ?? "";

    assert.match(source, /dialog\s*===\s*"view-academy"/);
    assert.match(source, /dialog\s*===\s*"edit-academy"/);
    assert.match(source, /<ViewAcademyDialog/);
    assert.match(source, /<EditAcademyDialog/);
    assert.match(source, /function\s+ViewAcademyDialog/);
    assert.match(source, /function\s+EditAcademyDialog/);
    assert.match(source, /<AcademyForm[\s\S]*action=\{updateAcademy\.bind\(null,\s*academy\.id\)\}/);
    assert.match(academiesTableSource, /adminAcademiesHref\(params,\s*\{\s*dialog:\s*"view-academy",\s*academyId:\s*academy\.id\s*\}\)/);
    assert.match(academiesTableSource, /adminAcademiesHref\(params,\s*\{\s*dialog:\s*"edit-academy",\s*academyId:\s*academy\.id\s*\}\)/);
    assert.match(academiesTableSource, /Edit Academy/);
    assert.doesNotMatch(academiesTableSource, /const\s+academyHref\s*=\s*`\/admin\/academies\/\$\{academy\.id\}`/);
    assert.doesNotMatch(academiesTableSource, /href=\{`\/admin\/academies\/\$\{academy\.id\}`\}/);
    assert.doesNotMatch(academiesTableSource, /Profile Summary/);
  });

  it("managed user actions only return to canonical admin or dashboard paths", () => {
    assert.equal(managedUsersReturnPath("/dashboard?panel=users"), "/dashboard?panel=users");
    assert.equal(managedUsersReturnPath("/dashboard/users?panel=users"), "/dashboard/users?panel=users");
    assert.equal(managedUsersReturnPath("/admin?panel=users"), "/admin?panel=users");
    assert.equal(managedUsersReturnPath("/admin/users"), "/admin/users");

    assert.equal(managedUsersReturnPath("https://example.com/dashboard?panel=users"), "/admin/users");
    assert.equal(managedUsersReturnPath("//example.com/dashboard?panel=users"), "/admin/users");
    assert.equal(managedUsersReturnPath("/dashboardevil?panel=users"), "/admin/users");
    assert.equal(managedUsersReturnPath("/administration/users"), "/admin/users");
    assert.equal(managedUsersReturnPath("/admin.evil/users"), "/admin/users");
  });

  it("managed user create and edit keep academy assignment out of public users", () => {
    const actionsSource = readSource("src/app/admin/users/actions.ts");
    const userServiceSource = readSource("src/lib/users-service.ts");
    const profileSource = readSource("src/lib/rollfinder-user-profiles.ts");
    const schemaSource = readSource("prisma/schema.prisma");

    assert.match(actionsSource, /const\s+academyId\s*=\s*String\(formData\.get\("academyId"\)/);
    assert.match(actionsSource, /createUserInService\(actor,\s*\{[\s\S]*academyId[\s\S]*\}\)/);
    assert.match(actionsSource, /updateUserInService\(actor,\s*userId,\s*\{[\s\S]*academyId[\s\S]*\}\)/);
    assert.match(userServiceSource, /const serviceInput = \{ \.\.\.\(input as Record<string, unknown>\) \}/);
    assert.doesNotMatch(userServiceSource, /const\s+\{\s*academyId,\s*\.\.\.serviceInput\s*\}/);
    assert.match(userServiceSource, /const \{ serviceInput, academyId, role \} = splitRollfinderAcademyInput\(input\)/);
    assert.match(userServiceSource, /syncRollfinderUserProfile\(result\.user,\s*academyId\)/);
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
    const dashboardSource = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const adminUsersSource = readSource("src/app/admin/users/page.tsx");

    assert.match(dashboardSource, /const\s+usersPageSize\s*=\s*10/);
    assert.match(dashboardSource, /pageSize:\s*String\(usersPageSize\)/);
    assert.match(dashboardSource, /userQueryParams\.set\("search",\s*search\)/);
    assert.doesNotMatch(dashboardSource, /userQueryParams\.set\("q",\s*search\)/);
    assert.match(dashboardSource, /enrichUsersWithAcademyNames\(result\.users\.map/);
    assert.doesNotMatch(dashboardSource, /academy:\s*null/);
    assert.match(adminUsersSource, /const\s+usersPageSize\s*=\s*10/);
    assert.match(adminUsersSource, /const\s+pageSize\s*=\s*usersPageSize/);
    assert.match(adminUsersSource, /enrichUsersWithAcademyNames\(result\.users\)/);
    assert.match(adminUsersSource, /user\.academy\?\.name\s*\?\?\s*"None"/);
    assert.doesNotMatch(adminUsersSource, /supportedPageSizes|Rows per page/);
  });

  it("academy member surfaces do not depend on public user profiles", () => {
    const memberPage = readSource("src/app/dashboard/members/page.tsx");
    const memberApi = readSource("src/app/api/dashboard/members/route.ts");
    const academyTeamPage = readSource("src/app/admin/academies/[id]/team/page.tsx");
    const profileHelper = readSource("src/lib/rollfinder-user-profiles.ts");

    assert.match(memberPage, /academyMemberProfiles\(academy\.id,\s*q\)/);
    assert.match(memberPage, /member\.user\?\.name\s*\?\?\s*member\.user\?\.email/);
    assert.match(memberApi, /academyMemberProfiles\(academy\.id,\s*q\)/);
    assert.match(academyTeamPage, /academyMemberProfiles\(academy\.id\)/);
    assert.match(profileHelper, /listAcademyMembersFromAcademyService/);
    assert.doesNotMatch(profileHelper, /prisma\.user|tx\.user/);
  });

  it("admin top service menu keeps footer-only Map and Settings out of primary navigation", () => {
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const navigationSource = source.match(/const adminNavigationItems: SidePanelItem\[\] = \[[\s\S]*?\n  \];/)?.[0] ?? "";
    const serviceMenuSource = source.match(/function DashboardServiceMenu[\s\S]*?\n}\n\nfunction NewUserDialog/)?.[0] ?? "";

    assert.notEqual(navigationSource, "", "Expected admin navigation source to be present");
    assert.notEqual(serviceMenuSource, "", "Expected dashboard service menu source to be present");
    for (const label of ["Dashboard", "Manage Users", "Analytics", "Academy Review", "Academy Claims", "Map", "Settings"]) {
      assert.match(navigationSource, new RegExp(`label:\\s*"${label}"`));
    }
    assert.match(navigationSource, /label:\s*academyAdmin\s*\?\s*"Academy Profile"\s*:\s*"Manage Academies"/);
    assert.match(navigationSource, /label:\s*openMatSessionsLabel/);
    assert.match(navigationSource, /href:\s*"\/dashboard\?panel=academies"/);
    assert.match(navigationSource, /href:\s*"\/dashboard\?panel=open-mats"/);
    assert.match(navigationSource, /href:\s*"\/dashboard\?panel=users"/);
    assert.match(navigationSource, /academyAdmin[\s\S]*href:\s*"\/dashboard\?panel=settings"[\s\S]*label:\s*"Settings"/);
    assert.match(navigationSource, /href:\s*"\/dashboard\?panel=platform-admin-academies"/);
    assert.match(navigationSource, /active:\s*!firstParam\(params\.panel\)/);
    assert.match(navigationSource, /label:\s*"Dashboard"[\s\S]*label:\s*academyAdmin\s*\?\s*"Academy Profile"\s*:\s*"Manage Academies"[\s\S]*label:\s*openMatSessionsLabel[\s\S]*label:\s*"Manage Users"[\s\S]*label:\s*"Analytics"[\s\S]*label:\s*"Academy Review"[\s\S]*label:\s*"Academy Claims"[\s\S]*label:\s*"Map"[\s\S]*label:\s*"Settings"/);
    assert.match(
      source,
      /\.filter\(\(item\) => item\.href !== "\/dashboard" && item\.href !== "\/dashboard\?panel=maps" && item\.href !== "\/dashboard\?panel=settings"\)/,
    );
    assert.match(source, /\.map\(\(item\) => item\.href === "\/dashboard\?panel=academies" \? \{ \.\.\.item, label: "Academies" \} : item\)/);
    assert.match(source, /<DashboardServiceMenu items=\{dashboardServiceNavigationItems\} \/>/);
    assert.match(source, /mobileNavigationItems=\{dashboardServiceNavigationItems\}/);
    assert.match(source, /navigationItems=\{serviceNavigationItems\}/);
    assert.match(source, /footerNavigationItems=\{sidePanelFooterNavigationItems\}/);
    assert.match(source, /const\s+mapNavigationItem\s*=\s*adminNavigationItems\.find\(\(item\) => item\.href === "\/dashboard\?panel=maps"\)/);
    assert.match(source, /\.\.\.\(mapNavigationItem \? \[mapNavigationItem\] : \[\]\)[\s\S]*\.\.\.\(settingsNavigationItem \? \[settingsNavigationItem\] : \[\]\)/);
    assert.match(source, /const paymentNavigationSections = \[/);
    assert.match(source, /label:\s*"Overview"/);
    assert.match(source, /label:\s*"Transactions"/);
    assert.match(source, /label:\s*"Earnings"/);
    assert.match(source, /label:\s*"Refunds"/);
    assert.match(source, /label:\s*"Payouts"/);
    assert.match(source, /label:\s*"Payment Settings"/);
    assert.match(source, /children:\s*paymentNavigationSections/);
    assert.match(source, /selectedPaymentOverviewPeriod\(firstParam\(params\.paymentsPeriod\)\)/);
    for (const period of ["Daily", "Weekly", "Monthly", "Yearly"]) {
      assert.match(source, new RegExp(`label:\\s*"${period}"`));
    }
    assert.match(serviceMenuSource, /className="hidden min-w-0 overflow-x-auto md:block"/);
    assert.match(serviceMenuSource, /aria-label="Service dashboards"/);
    assert.match(source, /<div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-4">[\s\S]*<DashboardServiceMenu items=\{dashboardServiceNavigationItems\} \/>[\s\S]*<ActionMenu/);
    assert.match(source, /<nav className="mt-4 grid gap-1 border-b border-stone-100 pb-4 lg:hidden" aria-label="Service dashboards">/);
    assert.match(serviceMenuSource, /<div className="ml-auto flex min-w-max items-center justify-end gap-1">/);
    assert.match(serviceMenuSource, /text-sm transition-colors/);
    assert.match(serviceMenuSource, /<Icon name=\{item\.icon\}/);
    assert.match(serviceMenuSource, /item\.active \? "font-bold text-stone-950"/);
    assert.doesNotMatch(serviceMenuSource, /bg-teal-700 text-white shadow-sm/);
    assert.doesNotMatch(serviceMenuSource, /bg-sky-50/);
    assert.doesNotMatch(source, /const dashboardServiceNavigationItems[\s\S]*label:\s*"Map"[\s\S]*<DashboardServiceMenu/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Manage Academies"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Courses\/Sessions"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Manage Users"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Analytics"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Academy Review"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Academy Claims"/);
    assert.doesNotMatch(navigationSource, /label:\s*"Settings"[\s\S]*label:\s*"Map"/);
  });

  it("admin quick actions use concise analytics and academy review labels", () => {
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");

    assert.match(source, /id:\s*"analytics"[\s\S]*title:\s*"Analytics"/);
    assert.match(source, /id:\s*"platform-admin-created-academies"[\s\S]*title:\s*"Academy Review"/);
    assert.match(source, /detailHref\s*=\s*`\/dashboard\?panel=open-mats&dialog=view-event&eventId=\$\{event\.id\}`/);
    assert.match(source, /permanentHref\s*=\s*eventPermanentPath\(event\.id\)/);
    assert.match(source, /adminReturnTo\s*=\s*"\/dashboard\?panel=open-mats"/);
    assert.match(source, /adminHref\s*=\s*`\$\{openMat \? `\/admin\/open-mats\/\$\{event\.id\}` : `\/admin\/courses\/\$\{event\.id\}`\}\?returnTo=\$\{encodeURIComponent\(adminReturnTo\)\}`/);
    assert.match(source, /<QuickActionPanel[\s\S]*collapsible[\s\S]*defaultCollapsed[\s\S]*persistCollapseState/);
    assert.match(source, /collapseStorageKey="rollfinders\.dashboardQuickActionsCollapsed"/);
    assert.doesNotMatch(source, /title:\s*"Founder Analytics"/);
    assert.doesNotMatch(source, /title:\s*"Platform Admin Academy Review"/);
  });

  it("platform admin academy review links are serializable across the server/client table boundary", () => {
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const columnsSource = source.match(/const platformAdminAcademyColumns[\s\S]*?\n\];/)?.[0] ?? "";
    const panelSource = source.match(/export function SuperAdminPlatformAcademiesPanel[\s\S]*?\n}\n\nexport function AcademiesTable/)?.[0] ?? "";

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
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");

    assert.match(source, /panel === "academies" \? "Academies"/);
    assert.match(source, /panel === "open-mats" \? "Course\/Events Dashboard"/);
    assert.match(source, /panel === "bookings" \? "Bookings"/);
    assert.match(source, /panel === "payments" \? "Payment Dashboard"/);
    assert.match(source, /panel === "users" \? "User's Boards"/);
    assert.match(source, /const hideSharedDashboardSections = \["academies", "open-mats", "bookings", "payments", "users"\]\.includes\(panel\)/);
    assert.match(source, /\{!hideSharedDashboardSections \? \(/);
    assert.match(source, /getRowHref=\{\(booking\) => bookingEventHref\(booking\)\}/);
    assert.match(source, /<StatsPanel[\s\S]*title="Stats Board"[\s\S]*collapsible[\s\S]*defaultCollapsed[\s\S]*persistCollapseState/);
    assert.match(source, /collapseStorageKey="rollfinders\.dashboardStatsCollapsed"/);
  });

  it("admin settings use quick actions to inject one selected settings detail panel", () => {
    const dashboardSource = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const legacySettingsSource = readSource("src/app/admin/settings/page.tsx");
    const passwordActionSource = readSource("src/app/dashboard/password/PasswordActions.ts");

    for (const source of [dashboardSource, legacySettingsSource]) {
      assert.match(source, /import\s+\{\s*QuickActionPanel,\s*type\s+QuickActionPanelItem\s*\}\s+from\s+"@\/components\/QuickActionPanel"/);
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
    assert.match(dashboardSource, /effectiveSettingsAction\s*===\s*"weekly-activity"\s*&&\s*elevatedAdmin[\s\S]*<PlatformAdminActivitySummaryPanel embedded summary=\{platformAdminActivitySummary\}/);
    assert.doesNotMatch(dashboardSource, /<PlatformAdminActivitySummaryPanel summary=\{platformAdminActivitySummary\}/);

    assert.match(passwordActionSource, /changeDashboardUserPassword/);
    assert.match(passwordActionSource, /changeUserPassword\(user\.id,\s*password\)/);
    assert.match(passwordActionSource, /action:\s*"DASHBOARD_PASSWORD_CHANGED"/);
    assert.match(passwordActionSource, /metadata:\s*\{\s*role:\s*user\.role\s*\}/);
    const metadataLine = passwordActionSource.match(/metadata:\s*\{[^\n]+\}/)?.[0] ?? "";
    assert.doesNotMatch(metadataLine, /password/i);
  });

  it("academy admin user tables hide visible role columns while elevated admins keep them", () => {
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");

    assert.match(source, /const\s+canViewRoleColumn\s*=\s*isPlatformAdminRole\(actorRole\)/);
    assert.match(source, /canViewRoleColumn\s*\?\s*<th className="px-5 py-4">Role<\/th>\s*:\s*null/);
    assert.match(source, /canViewRoleColumn\s*\?\s*<LinkedTableCell href=\{userHref\}><RolePill role=\{user\.role\} \/><\/LinkedTableCell>\s*:\s*null/);
    assert.match(source, /const\s+emptyColSpan\s*=\s*canViewRoleColumn\s*\?\s*6\s*:\s*5/);
  });
});
