import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

describe("practitioner academy registration contracts", () => {
  it("creates public practitioner accounts through the users service and then links academy membership", () => {
    const actionSource = readSource("apps/portal/src/app/register/actions.ts");
    const userServiceSource = readSource("apps/portal/src/lib/users-service.ts");

    assert.match(userServiceSource, /export async function registerUserAccount/);
    assert.match(userServiceSource, /\/auth\/register/);
    assert.match(actionSource, /registerUserAccount/);
    assert.match(actionSource, /sendAccountVerificationEmail/);
    assert.match(actionSource, /authenticateUserCredentials/);
    assert.match(actionSource, /addPublicRegistrationAcademyMember/);
    assert.match(actionSource, /getAcademyFromAcademyService/);
    assert.match(actionSource, /if \(!academyId\)[\s\S]*failureRedirect[\s\S]*registerUserAccount/);
    assert.doesNotMatch(actionSource, /createManagedUser/);
    assert.doesNotMatch(actionSource, /replaceUserAuthorisationRole/);
  });

  it("requires public users to verify email before login", () => {
    const loginSource = readSource("apps/backend_api/internal/services/users/server/server.go");
    const runtimeMutations = readSource("apps/backend_api/internal/services/users/migrations/procedures/008_runtimeMutations.sql");
    const authSource = readSource("apps/portal/src/lib/auth.ts");
    const loginFormSource = readSource("apps/portal/src/app/login/LoginForm.tsx");

    assert.match(runtimeMutations, /'PENDING_VERIFICATION'/);
    assert.match(loginSource, /Verify your email before signing in/);
    assert.match(authSource, /EmailVerificationRequired/);
    assert.match(loginFormSource, /Verify your email before signing in/);
  });

  it("allows admin users to verify pending user emails", () => {
    const userActionsSource = readSource("apps/portal/src/app/admin/users/actions.ts");
    const usersServiceSource = readSource("apps/portal/src/lib/users-service.ts");
    const dashboardSource = readSource("apps/portal/src/app/dashboard/AdminDashboardWorkspace.tsx");

    assert.match(userActionsSource, /verifyManagedUserEmail/);
    assert.match(usersServiceSource, /"verify-email"/);
    assert.match(dashboardSource, /Verify Email/);
  });

  it("does not create a successful registration when academy membership linking fails", () => {
    const actionSource = readSource("apps/portal/src/app/register/actions.ts");

    assert.match(actionSource, /await addPublicRegistrationAcademyMember/);
    assert.match(actionSource, /We could not link your academy/);
    assert.doesNotMatch(actionSource, /warning: "academy-link"/);
  });

  it("exposes a public register page with academy selection and locked academy entry points", () => {
    const registerPageSource = readSource("apps/portal/src/app/register/page.tsx");
    const academyPageSource = readSource("apps/portal/src/app/academies/[slug]/page.tsx");
    const autocompleteSource = readSource("apps/portal/src/components/AutoCompleteTextField/AutoCompleteTextField.tsx");
    const loginFormSource = readSource("apps/portal/src/app/login/LoginForm.tsx");

    assert.match(registerPageSource, /findAcademyBySlugFromAcademyService/);
    assert.match(registerPageSource, /listAcademiesFromAcademyService/);
    assert.match(registerPageSource, /AutoCompleteTextField/);
    assert.match(registerPageSource, /name="academyId"/);
    assert.doesNotMatch(registerPageSource, /type="radio"/);
    assert.match(autocompleteSource, /function commitTypedMatch/);
    assert.match(autocompleteSource, /onBlur=\{commitTypedMatch\}/);
    assert.match(registerPageSource, /registerPractitioner/);
    assert.match(academyPageSource, /\/register\?academy=/);
    assert.match(loginFormSource, /\/register/);
  });

  it("does not send unsupported profile fields to the managed user update service", () => {
    const userServiceSource = readSource("apps/portal/src/lib/users-service.ts");

    assert.match(userServiceSource, /delete \(serviceInput as Record<string, unknown>\)\.phone/);
  });

  it("uses generic academy membership routes for user profile linking", () => {
    const academyServiceSource = readSource("apps/portal/src/lib/academyService.ts");
    const profileSource = readSource("apps/portal/src/lib/rollfinder-user-profiles.ts");

    assert.match(academyServiceSource, /request\("\/v1\/memberships"/);
    assert.match(academyServiceSource, /academy_id/);
    assert.match(academyServiceSource, /\/v1\/memberships\/\$\{encodeURIComponent\(membershipId\)\}/);
    assert.match(academyServiceSource, /ACADEMY_PUBLIC_BASE_URL/);
    assert.match(academyServiceSource, /addPublicRegistrationAcademyMember/);
    assert.match(profileSource, /removeAcademyMembershipInAcademyService\(membership\.id/);
  });

  it("keeps registered user table identity fields populated for dashboard listings", () => {
    const runtimeMutations = readSource("apps/backend_api/internal/services/users/migrations/procedures/008_runtimeMutations.sql");

    assert.match(runtimeMutations, /INSERT INTO users \(id, name, email, username, first_name, last_name, display_name, status, email_status\)/);
    assert.match(runtimeMutations, /NULLIF\(lower\(trim\(p_email\)\), ''\)/);
    assert.match(runtimeMutations, /NULLIF\(trim\(p_display_name\), ''\)/);
  });
});
