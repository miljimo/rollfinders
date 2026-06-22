import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function readSource(path: string) {
  const absolutePath = resolve(root, path);
  assert.equal(existsSync(absolutePath), true, `Expected ${path} to exist`);
  return readFileSync(absolutePath, "utf8");
}

describe("course payment service integration", () => {
  it("calls the payment service from server-only code", () => {
    const paymentsSource = readSource("src/lib/payments.ts");
    assert.match(paymentsSource, /import\s+["']server-only["']/);
    assert.match(paymentsSource, /PAYMENT_SERVICE_URL/);
    assert.match(paymentsSource, /PAYMENT_SERVICE_API_KEY/);
    assert.match(paymentsSource, /\/v1\/checkouts/);
    assert.match(paymentsSource, /Authorization:\s*`Bearer \$\{apiKey\}`/);
  });

  it("uses a server action for paid course checkout handoff", () => {
    const actionSource = readSource("src/app/courses/[id]/payment-actions.ts");
    const bookingSource = readSource("src/lib/bookings.ts");
    assert.match(actionSource, /["']use server["']/);
    assert.match(actionSource, /createBooking/);
    assert.match(actionSource, /linkBookingPayment/);
    assert.match(actionSource, /createCourseOccurrenceCheckout/);
    assert.match(actionSource, /bookableType:\s*"course_occurrence"/);
    assert.match(actionSource, /paymentRequired:\s*true/);
    assert.match(actionSource, /booking_id:\s*booking\.id/);
    assert.match(actionSource, /clientState:\s*`booking:\$\{booking\.id\}:\$\{attemptId\}`/);
    assert.match(actionSource, /provider:\s*["']stripe["']/);
    assert.match(actionSource, /paymentMethodType:\s*["']card["']/);
    assert.match(actionSource, /checkoutUrl:\s*checkout\.checkoutUrl/);
    assert.doesNotMatch(actionSource, /redirect\(checkout\.checkoutUrl\)/);
    assert.match(bookingSource, /export async function createBooking/);
    assert.match(bookingSource, /export async function linkBookingPayment/);
    assert.match(bookingSource, /\/v1\/bookings/);
    assert.match(bookingSource, /\/payment-link/);
  });

  it("renders checkout controls on course detail through a client handoff", () => {
    const pageSource = readSource("src/app/courses/[id]/page.tsx");
    assert.match(pageSource, /CourseCheckoutForm/);
    assert.doesNotMatch(pageSource, /paymentError/);

    const formSource = readSource("src/app/courses/[id]/CourseCheckoutForm.tsx");
    assert.match(formSource, /useActionState/);
    assert.match(formSource, /checkoutAttemptId/);
    assert.match(formSource, /startCourseCheckout/);
    assert.match(formSource, /window\.location\.href\s*=\s*state\.checkoutUrl/);
    assert.match(formSource, /BookEventButton/);
    assert.match(formSource, /eventKind=\{mode === "donation" \? "donation" : "paid"\}/);
    assert.match(formSource, /Creating checkout/);
    assert.match(formSource, /Receipt email/);
    assert.doesNotMatch(`${pageSource}\n${formSource}`, /stripe\.com|Stripe\(/);
  });

  it("keeps verified free events bookable without starting checkout", () => {
    const publicDetailSource = readSource("src/components/PublicEventDetailPage.tsx");
    const freeButtonSource = readSource("src/components/FreeEventBookingButton.tsx");
    const openMatPageSource = readSource("src/app/open-mats/[id]/page.tsx");
    const coursePageSource = readSource("src/app/courses/[id]/page.tsx");

    assert.match(publicDetailSource, /freeBookable/);
    assert.match(publicDetailSource, /FreeEventBookingButton/);
    assert.match(freeButtonSource, /No payment needed/);
    assert.match(openMatPageSource, /EventPricingType\.FREE/);
    assert.match(coursePageSource, /EventPricingType\.FREE/);
  });

  it("supports donation checkout with a caller-specified amount", () => {
    const actionSource = readSource("src/app/courses/[id]/payment-actions.ts");
    assert.match(actionSource, /EventPricingType\.DONATION/);
    assert.match(actionSource, /donationAmount/);
    assert.match(actionSource, /checkoutIdempotencyKey/);
    assert.match(actionSource, /clientState:\s*`booking:\$\{booking\.id\}:\$\{attemptId\}`/);
    assert.match(actionSource, /Enter a donation amount greater than zero/);
    assert.match(actionSource, /Payment service is not available/);

    const formSource = readSource("src/app/courses/[id]/CourseCheckoutForm.tsx");
    assert.match(formSource, /Donation amount/);
    assert.match(formSource, /name="donationAmount"/);
    assert.match(formSource, /BookEventButton/);

    const pageSource = readSource("src/app/courses/[id]/page.tsx");
    assert.match(pageSource, /EventPricingType\.DONATION/);
    assert.match(pageSource, /mode=\{checkoutMode\}/);
  });

  it("hides and rejects checkout for unverified or unclaimed academies", () => {
    const coursePageSource = readSource("src/app/courses/[id]/page.tsx");
    const openMatPageSource = readSource("src/app/open-mats/[id]/page.tsx");
    const actionSource = readSource("src/app/courses/[id]/payment-actions.ts");

    assert.match(coursePageSource, /isPublicAcademyTrusted/);
    assert.match(coursePageSource, /event\.active\s*&&\s*academyTrusted\s*&&\s*paymentAccount\.ready\s*&&/);
    assert.match(openMatPageSource, /isPublicAcademyTrusted/);
    assert.match(openMatPageSource, /event\.active\s*&&\s*academyTrusted\s*&&\s*paymentAccount\.ready\s*&&/);
    assert.match(actionSource, /isPublicAcademyTrusted\(event\.academy\)/);
    assert.match(actionSource, /not verified for online payments/);
  });

  it("requires a ready academy Stripe Connect account before collecting paid event payments", () => {
    const helperSource = readSource("src/lib/academy-payment-account.ts");
    const coursePageSource = readSource("src/app/courses/[id]/page.tsx");
    const openMatPageSource = readSource("src/app/open-mats/[id]/page.tsx");
    const actionSource = readSource("src/app/courses/[id]/payment-actions.ts");

    assert.match(helperSource, /import\s+["']server-only["']/);
    assert.match(helperSource, /prisma\.paymentAccountSetting\.findFirst/);
    assert.match(helperSource, /ownerType:\s*"academy"/);
    assert.match(helperSource, /provider:\s*"stripe"/);
    assert.match(helperSource, /connected && chargesEnabled && payoutsEnabled && status === "verified"/);

    for (const source of [coursePageSource, openMatPageSource, actionSource]) {
      assert.match(source, /academyPaymentAccountReadiness\(event\.academyId\)/);
      assert.match(source, /paymentAccount\.ready/);
    }
    assert.match(actionSource, /has not finished Stripe Connect setup for online payments/);
  });

  it("exposes a scoped payments dashboard for academy and elevated admins", () => {
    const dashboardSource = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const paymentsSource = readSource("src/lib/payments.ts");

    assert.match(paymentsSource, /listCourseOccurrencePayments/);
    assert.match(paymentsSource, /resource_type:\s*"course_occurrence"/);
    assert.match(paymentsSource, /isProviderBackedPaymentRecord/);
    assert.match(paymentsSource, /providerPaymentId\.startsWith\("cs_"\)/);
    assert.match(dashboardSource, /panel=payments/);
    assert.match(dashboardSource, /label:\s*"Payments"/);
    assert.match(dashboardSource, /academyId \? payments\.filter/);
    assert.match(dashboardSource, /metadata\?\.academy_id === academyId/);
    assert.match(dashboardSource, /<PaymentsPanel/);
    assert.match(dashboardSource, /PaymentsPanelSearch/);
    assert.match(dashboardSource, /paymentsSearch/);
    assert.match(dashboardSource, /paymentMatchesSearch/);
    assert.match(dashboardSource, /metadata\.payer_phone/);
    assert.match(dashboardSource, /formatMinorCurrency\(payment\.amount, payment\.currency\)/);
    assert.match(dashboardSource, /\/courses\/\$\{courseId\}/);
    assert.doesNotMatch(dashboardSource, /PaymentServiceStatusPanel|Payment Service Status|View system status/);
  });

  it("keeps Stripe Connect API keys out of dashboard-managed payment settings", () => {
    const dashboardSource = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const setupSource = readSource("src/components/PaymentAccountSetup/PaymentAccountSetup.tsx");
    const setupTypesSource = readSource("src/components/PaymentAccountSetup/types.ts");
    const stripeConnectSource = readSource("src/lib/stripe-connect.ts");
    const schemaSource = readSource("prisma/schema.prisma");
    const removeKeysMigration = readSource("prisma/migrations/20260621161500_remove_dashboard_stripe_api_keys/migration.sql");

    assert.match(stripeConnectSource, /process\.env\.STRIPE_SECRET_KEY/);
    assert.match(stripeConnectSource, /process\.env\.PAYMENT_GATEWAY_API_KEY/);
    assert.match(stripeConnectSource, /Authorization:\s*`Bearer \$\{key\}`/);

    for (const source of [dashboardSource, setupSource, setupTypesSource, schemaSource]) {
      assert.doesNotMatch(source, /apiKey|secretKey|publishableKey|clientSecret|STRIPE_SECRET_KEY|PAYMENT_GATEWAY_API_KEY/i);
    }
    assert.match(removeKeysMigration, /DROP COLUMN IF EXISTS "api_key_ciphertext"/);
    assert.match(removeKeysMigration, /DROP COLUMN IF EXISTS "api_key_last4"/);
    assert.match(removeKeysMigration, /DROP COLUMN IF EXISTS "api_key_mode"/);

    const settingsSource = dashboardSource.match(/function PaymentsSettingsView[\s\S]*?function PaymentsPanel/)?.[0] ?? "";
    assert.notEqual(settingsSource, "", "Expected PaymentsSettingsView source to be present");
    assert.match(settingsSource, /\/api\/payments\/stripe-connect\?owner=\$\{ownerQuery\}/);
    assert.match(settingsSource, /<form action=\{`\/api\/payments\/stripe-connect\/disconnect\?owner=\$\{ownerQuery\}`\} method="post">/);
    assert.doesNotMatch(settingsSource, /<Button href=\{`\/api\/payments\/stripe-connect\/disconnect/);
    assert.doesNotMatch(settingsSource, /<input[\s\S]*(api|secret|key|publishable)/i);
    assert.doesNotMatch(settingsSource, /textarea[\s\S]*(api|secret|key|publishable)/i);
  });

  it("stores Stripe Connect accounts against academy or platform ownership", () => {
    const stripeConnectSource = readSource("src/lib/stripe-connect.ts");
    const connectRouteSource = readSource("src/app/api/payments/stripe-connect/route.ts");
    const refreshRouteSource = readSource("src/app/api/payments/stripe-connect/refresh/route.ts");
    const disconnectRouteSource = readSource("src/app/api/payments/stripe-connect/disconnect/route.ts");
    const dashboardSource = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");
    const schemaSource = readSource("prisma/schema.prisma");

    assert.match(schemaSource, /model PaymentAccountSetting \{[\s\S]*academyId\s+String\?/);
    assert.match(schemaSource, /academy\s+Academy\?\s+@relation\(fields:\s*\[academyId\]/);
    assert.match(schemaSource, /@@unique\(\[ownerType,\s*ownerId,\s*provider\]\)/);

    assert.match(stripeConnectSource, /ownerType:\s*"academy"\s*\|\s*"platform"/);
    assert.match(stripeConnectSource, /requestedOwner === "academy"/);
    assert.match(stripeConnectSource, /requestedOwner !== "platform" && Boolean\(user\.academyId\)/);
    assert.match(stripeConnectSource, /ownerId:\s*"rollfinders",\s*ownerType:\s*"platform"/);
    assert.match(stripeConnectSource, /export function rollfindersPlatformPaymentAccountStatus/);
    assert.match(stripeConnectSource, /providerAccountId:\s*"rollfinders-stripe-platform"/);
    assert.match(stripeConnectSource, /academyId:\s*owner\.ownerType === "academy" \? owner\.ownerId : null/);
    assert.match(stripeConnectSource, /ownerType_ownerId_provider:\s*\{\s*\n\s*ownerId:\s*owner\.ownerId,\s*\n\s*ownerType:\s*owner\.ownerType,\s*\n\s*provider:\s*"stripe"/);
    assert.match(stripeConnectSource, /"metadata\[owner_id\]":\s*owner\.ownerId/);
    assert.match(stripeConnectSource, /"metadata\[owner_type\]":\s*owner\.ownerType/);
    assert.match(stripeConnectSource, /findReusableStripeConnectedAccount/);
    assert.match(stripeConnectSource, /accountMatchesOwner\(account,\s*owner\)/);
    assert.match(stripeConnectSource, /sortedAccounts\.find\(isReadyStripeAccount\)/);
    assert.match(stripeConnectSource, /deleteDuplicateStripeConnectedAccounts/);
    assert.match(stripeConnectSource, /account\.id !== retainedAccountId/);
    assert.match(stripeConnectSource, /deleteStripeConnectedAccount\(account\.id,\s*owner\)/);
    assert.match(connectRouteSource, /findReusableStripeConnectedAccount\(owner\)/);
    assert.match(connectRouteSource, /deleteDuplicateStripeConnectedAccounts\(owner,\s*account\.id\)/);

    for (const source of [connectRouteSource, refreshRouteSource, dashboardSource]) {
      assert.match(source, /ownerType_ownerId_provider:\s*\{\s*\n\s*ownerId:\s*owner\.ownerId|ownerId:\s*paymentAccountOwner\.ownerId/);
      assert.match(source, /provider:\s*"stripe"/);
    }
    assert.match(disconnectRouteSource, /ownerId:\s*owner\.ownerId/);
    assert.match(disconnectRouteSource, /ownerType:\s*owner\.ownerType/);
    assert.match(disconnectRouteSource, /export async function POST/);
    assert.doesNotMatch(disconnectRouteSource, /export async function GET/);
    assert.match(stripeConnectSource, /account\.details_submitted && chargesEnabled && payoutsEnabled \? "verified" : "verification_required"/);
    assert.match(dashboardSource, /rollfindersPlatformPaymentAccountStatus/);
    assert.match(dashboardSource, /setting \?\? \(academyAdmin \? null : rollfindersPlatformPaymentAccountStatus\(\)\)/);
    assert.match(dashboardSource, /const ownerQuery = academyAdmin \? "academy" : "platform"/);
  });

  it("keeps paid event links usable when stored occurrence dates are stale", () => {
    const courseSource = readSource("src/lib/courses.ts");
    const openMatSource = readSource("src/lib/data.ts");

    assert.match(courseSource, /const exactOccurrence = occurrences\.find/);
    assert.match(courseSource, /upcomingOccurrences\[0\]\s*\?\?\s*event/);
    assert.match(openMatSource, /getOpenMatOccurrence[\s\S]*getCourseOccurrence/);
    assert.match(openMatSource, /event\?\.courseType\s*===\s*CourseType\.OPEN_MAT/);
  });

  it("proxies public checkout callbacks to the private payment service", () => {
    const routeSource = readSource("src/app/v1/checkouts/[id]/callbacks/[result]/route.ts");

    assert.match(routeSource, /PAYMENT_SERVICE_URL/);
    assert.match(routeSource, /\/v1\/checkouts\/\$\{encodeURIComponent\(id\)\}\/callbacks\/\$\{encodeURIComponent\(result\)\}/);
    assert.match(routeSource, /redirect:\s*"manual"/);
    assert.match(routeSource, /NextResponse\.redirect\(location,\s*response\.status\)/);
  });
});
