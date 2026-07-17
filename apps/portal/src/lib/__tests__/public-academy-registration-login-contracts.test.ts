import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSource(path: string) {
  assert.equal(existsSync(path), true, `${path} must exist`);
  return readFileSync(path, "utf8");
}

describe("public academy registration login contracts", () => {
  it("keeps credential login behavior intact while adding registration choices", () => {
    const loginFormSource = readSource(
      "apps/portal/src/app/login/LoginForm.tsx",
    );

    assert.match(loginFormSource, /signIn\(["']credentials["']/);
    assert.match(loginFormSource, /redirect:\s*false/);
    assert.match(loginFormSource, /callbackUrl/);
    assert.match(loginFormSource, /getSession\(\)/);
    assert.match(
      loginFormSource,
      /trackAnalyticsEvent\(["']user_logged_in["']/,
    );
    assert.match(loginFormSource, /window\.location\.href/);

    assert.match(loginFormSource, /Forgot password\?/);
    assert.match(loginFormSource, /href=["']\/forgot-password["']/);
    assert.match(loginFormSource, /Register Your Academy/);
    assert.match(loginFormSource, /href=["']\/register\/academy["']/);
    assert.match(loginFormSource, /Create User Account/);
    assert.match(loginFormSource, /href=["']\/register["']/);
  });

  it("keeps the login page success banner and safe redirect handling", () => {
    const loginPageSource = readSource("apps/portal/src/app/login/page.tsx");

    assert.match(loginPageSource, /function\s+safeRedirectTarget/);
    assert.match(loginPageSource, /startsWith\(["']\/["']\)/);
    assert.doesNotMatch(loginPageSource, /new URL\(redirectTarget\)/);
    assert.match(loginPageSource, /registered\s*===\s*["']1["']/);
    assert.match(loginPageSource, /verifyEmail\s*===\s*["']1["']/);
    assert.match(
      loginPageSource,
      /<LoginForm\s+callbackUrl=\{safeRedirectTarget/,
    );
    assert.match(loginPageSource, /Welcome back/);
    assert.match(loginPageSource, /Sign in to your academy account/);
  });

  it("provides a public academy registration entry point that reuses the academy form", () => {
    const academyRegisterSource = readSource(
      "apps/portal/src/app/register/academy/page.tsx",
    );

    assert.match(academyRegisterSource, /Register your academy or dojo/);
    assert.match(academyRegisterSource, /AcademyForm/);
    assert.match(academyRegisterSource, /action=\{createPublicAcademy\}/);
    assert.match(academyRegisterSource, /canManagePlatformFields=\{false\}/);
    assert.match(
      academyRegisterSource,
      /geocodeEndpoint=["']\/api\/public\/geocode["']/,
    );
    assert.doesNotMatch(academyRegisterSource, /emailVerification=\{\{/);
    assert.doesNotMatch(academyRegisterSource, /Verify academy email/);
    assert.match(academyRegisterSource, /href=["']\/register["']/);
    assert.doesNotMatch(academyRegisterSource, /LocationSearchForm/);
    assert.doesNotMatch(academyRegisterSource, /Find your academy first/);
    assert.doesNotMatch(academyRegisterSource, /Browse Academies/);
    assert.doesNotMatch(academyRegisterSource, /href=["']\/academies["']/);
  });

  it("creates public academies before sending the email verification code", () => {
    const publicActionSource = readSource(
      "apps/portal/src/app/register/academy/actions.ts",
    );

    const createCallIndex = publicActionSource.indexOf(
      "createPublicAcademyInAcademyService",
      publicActionSource.indexOf("try {"),
    );
    const sendCodeIndex = publicActionSource.indexOf(
      "sendAcademyRegistrationCode",
      createCallIndex,
    );
    const redirectIndex = publicActionSource.indexOf(
      "/register/academy/confirmation",
      sendCodeIndex,
    );
    assert.notEqual(createCallIndex, -1);
    assert.notEqual(sendCodeIndex, -1);
    assert.notEqual(redirectIndex, -1);
    assert.ok(
      createCallIndex < sendCodeIndex,
      "academy creation must happen before sending the verification code",
    );
    assert.ok(
      sendCodeIndex < redirectIndex,
      "confirmation redirect must happen after the email verification attempt",
    );
    assert.match(publicActionSource, /listAcademiesFromAcademyService/);
    assert.match(publicActionSource, /queueEmail/);
    assert.match(publicActionSource, /sendQueuedEmail/);
    assert.match(publicActionSource, /redirect/);
    assert.doesNotMatch(publicActionSource, /emailVerificationCode/);
    assert.match(publicActionSource, /bookingVerified:\s*["']off["']/);
    assert.match(publicActionSource, /featured:\s*["']off["']/);
    assert.match(publicActionSource, /paymentsVerified:\s*["']off["']/);
    assert.match(publicActionSource, /publicListingVerified:\s*["']off["']/);
    assert.match(
      publicActionSource,
      /verificationStatus:\s*AcademyVerificationStatus\.PENDING/,
    );
  });

  it("shows a public confirmation page after academy registration is sent", () => {
    const confirmationSource = readSource(
      "apps/portal/src/app/register/academy/confirmation/page.tsx",
    );

    assert.match(confirmationSource, /Claimed academy request has been sent/);
    assert.match(confirmationSource, /unverified public academy profile/);
    assert.match(confirmationSource, /claim process/);
    assert.match(confirmationSource, /verification code has been sent/);
    assert.match(confirmationSource, /Go to login/);
  });

  it("clears stale academy form server errors after a user edits the field", () => {
    const academyFormSource = readSource(
      "apps/portal/src/app/admin/academies/AcademyForm.tsx",
    );

    assert.match(academyFormSource, /function\s+activeServerErrors/);
    assert.match(
      academyFormSource,
      /submittedValues\[field\]\s*!==\s*currentValues\[field\]/,
    );
    assert.match(
      academyFormSource,
      /mergeErrors\(clientErrors,\s*serverErrors\)/,
    );
    assert.doesNotMatch(
      academyFormSource,
      /stepHasErrors[\s\S]{0,180}state\.fieldErrors\[field\]/,
    );
  });

  it("exposes public geocoding without admin route permission checks", () => {
    const publicGeocodeSource = readSource(
      "apps/portal/src/app/api/public/geocode/route.ts",
    );

    assert.match(publicGeocodeSource, /lookupCoordinates/);
    assert.match(publicGeocodeSource, /NextResponse\.json/);
    assert.doesNotMatch(publicGeocodeSource, /requireAdminApi/);
  });
});
