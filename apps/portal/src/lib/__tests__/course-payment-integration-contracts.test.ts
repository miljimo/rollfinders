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
    const paymentsSource = readSource("apps/portal/src/lib/payments.ts");
    assert.match(paymentsSource, /import\s+["']server-only["']/);
    assert.match(paymentsSource, /apiGatewayUrl/);
    assert.match(paymentsSource, /PAYMENT_PUBLIC_BASE_URL/);
    assert.match(paymentsSource, /normalizeBaseUrl\(directBaseUrl\)/);
    assert.match(paymentsSource, /\/v1\/checkouts/);
    assert.doesNotMatch(paymentsSource, /PAYMENT_SERVICE_API_KEY/);
    assert.doesNotMatch(paymentsSource, /Authorization:\s*`Bearer/);
  });

  it("routes RollFinders frontend service clients through the API gateway by default", () => {
    const gatewaySource = readSource("apps/portal/src/lib/apiGateway.ts");
    const serviceSources = [
      readSource("apps/portal/src/lib/payments.ts"),
      readSource("apps/portal/src/lib/bookings.ts"),
      readSource("apps/portal/src/lib/academyService.ts"),
      readSource("apps/portal/src/lib/courseService.ts"),
      readSource("apps/portal/src/lib/organisation-service.ts"),
      readSource("apps/portal/src/lib/users-service.ts"),
      readSource("apps/portal/src/lib/authorisation-service.ts"),
      readSource(
        "apps/portal/src/app/v1/checkouts/[id]/callbacks/[result]/route.ts",
      ),
    ].join("\n");

    assert.match(gatewaySource, /API_PUBLIC_BASE_URL/);
    assert.match(serviceSources, /apiGatewayUrl|apiGatewayPath/);
    assert.match(serviceSources, /\/v1\/authorisation/);
  });

  it("uses a server action for paid course checkout handoff", () => {
    const actionSource = readSource(
      "apps/portal/src/app/courses/[id]/payment-actions.ts",
    );
    const bookingSource = readSource("apps/portal/src/lib/bookings.ts");
    assert.match(actionSource, /["']use server["']/);
    assert.match(actionSource, /createBooking/);
    assert.match(actionSource, /linkBookingPayment/);
    assert.match(actionSource, /createCourseOccurrenceCheckout/);
    assert.match(actionSource, /bookableType:\s*"course_occurrence"/);
    assert.match(actionSource, /paymentRequired:\s*true/);
    assert.match(actionSource, /booking_id:\s*booking\.id/);
    assert.match(
      actionSource,
      /stripe_destination_account:\s*paymentAccount\.providerAccountId/,
    );
    assert.doesNotMatch(actionSource, /getPaymentPlatformSettings/);
    assert.doesNotMatch(actionSource, /calculatePlatformFeeMinor/);
    assert.doesNotMatch(actionSource, /stripe_application_fee_amount/);
    assert.match(
      actionSource,
      /clientState:\s*`booking:\$\{booking\.id\}:\$\{attemptId\}`/,
    );
    assert.match(actionSource, /provider:\s*["']stripe["']/);
    assert.match(actionSource, /paymentMethodType:\s*["']card["']/);
    assert.match(actionSource, /checkoutUrl:\s*checkout\.checkoutUrl/);
    assert.doesNotMatch(actionSource, /redirect\(checkout\.checkoutUrl\)/);
    assert.match(bookingSource, /export async function createBooking/);
    assert.match(bookingSource, /export async function linkBookingPayment/);
    assert.match(bookingSource, /\/v1\/bookings/);
    assert.match(bookingSource, /\/payment-link/);
  });

  it("passes the dashboard actor through booking history reads", () => {
    const bookingSource = readSource("apps/portal/src/lib/bookings.ts");
    const dashboardSource = readSource(
      "apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx",
    );

    assert.match(bookingSource, /Authorization/);
    assert.match(bookingSource, /X-Actor-User-ID/);
    assert.match(bookingSource, /actorUserId\?: string/);
    assert.match(
      dashboardSource,
      /getDashboardBookings\([\s\S]*bookingPage[\s\S]*currentUser\.id[\s\S]*currentUser\.accessToken/,
    );
    assert.match(
      dashboardSource,
      /listBookingsPage\(\{\s*accessToken,\s*actorUserId/,
    );
  });

  it("keeps legacy payment platform settings fallback aligned with the Prisma table shape", () => {
    const settingsSource = readSource(
      "apps/portal/src/lib/payment-platform-settings.ts",
    );
    const fallbackCreate =
      settingsSource.match(
        /prisma\.paymentPlatformSetting\.upsert\(\{[\s\S]*?create:\s*\{([\s\S]*?)\},\s*update:/,
      )?.[1] ?? "";

    assert.match(fallbackCreate, /platformFeeBasisPoints/);
    assert.match(fallbackCreate, /platformFeeFixedMinor/);
    assert.match(fallbackCreate, /currency/);
    assert.doesNotMatch(fallbackCreate, /providerId/);
    assert.doesNotMatch(
      settingsSource,
      /if \(!\(error instanceof PricingPolicyServiceError\)\) throw error/,
    );
    assert.match(
      settingsSource,
      /falling back to legacy payment platform settings/,
    );
  });

  it("renders checkout controls on course detail through a client handoff", () => {
    const pageSource = readSource("apps/portal/src/app/courses/[id]/page.tsx");
    assert.match(pageSource, /CourseCheckoutForm/);
    assert.doesNotMatch(pageSource, /paymentError/);

    const formSource = readSource(
      "apps/portal/src/app/courses/[id]/CourseCheckoutForm.tsx",
    );
    assert.match(formSource, /useActionState/);
    assert.match(formSource, /checkoutAttemptId/);
    assert.match(formSource, /startCourseCheckout/);
    assert.match(formSource, /window\.location\.href\s*=\s*state\.checkoutUrl/);
    assert.match(formSource, /BookEventButton/);
    assert.match(
      formSource,
      /eventKind=\{mode === "donation" \? "donation" : "paid"\}/,
    );
    assert.match(formSource, /Creating checkout/);
    assert.match(formSource, /Receipt email/);
    assert.match(formSource, /Required for guests/);
    assert.doesNotMatch(`${pageSource}\n${formSource}`, /stripe\.com|Stripe\(/);
  });

  it("keeps verified free events bookable without starting checkout", () => {
    const publicDetailSource = readSource(
      "apps/portal/src/app/_components/PublicEventDetailPage/PublicEventDetailPage.tsx",
    );
    const freeButtonSource = readSource(
      "apps/portal/src/app/_components/FreeEventBookingButton/FreeEventBookingButton.tsx",
    );
    const openMatPageSource = readSource(
      "apps/portal/src/app/open-mats/[id]/page.tsx",
    );
    const coursePageSource = readSource(
      "apps/portal/src/app/courses/[id]/page.tsx",
    );
    const actionSource = readSource(
      "apps/portal/src/app/courses/[id]/payment-actions.ts",
    );

    assert.match(publicDetailSource, /freeBookable/);
    assert.match(publicDetailSource, /FreeEventBookingButton/);
    assert.match(publicDetailSource, /freeBookingAction/);
    assert.match(freeButtonSource, /useActionState/);
    assert.match(freeButtonSource, /Booking confirmed/);
    assert.match(freeButtonSource, /Booking email/);
    assert.match(freeButtonSource, /No payment needed/);
    assert.doesNotMatch(
      freeButtonSource,
      /onClick=\{\(\) => setBooked\(true\)\}/,
    );
    assert.match(openMatPageSource, /EventPricingType\.FREE/);
    assert.match(openMatPageSource, /bookFreeCourseOccurrence/);
    assert.match(
      openMatPageSource,
      /freeBookingAction=\{canBookFree \? bookFreeCourseOccurrence : undefined\}/,
    );
    assert.match(coursePageSource, /EventPricingType\.FREE/);
    assert.match(coursePageSource, /bookFreeCourseOccurrence/);
    assert.match(
      coursePageSource,
      /freeBookingAction=\{canBookFree \? bookFreeCourseOccurrence : undefined\}/,
    );
    assert.match(
      actionSource,
      /export async function bookFreeCourseOccurrence/,
    );
    assert.match(actionSource, /paymentRequired:\s*false/);
    assert.match(actionSource, /pricingType !== EventPricingType\.FREE/);
    assert.match(
      actionSource,
      /Enter an email address so the academy knows who is attending/,
    );
  });

  it("supports donation checkout with a caller-specified amount", () => {
    const actionSource = readSource(
      "apps/portal/src/app/courses/[id]/payment-actions.ts",
    );
    assert.match(actionSource, /EventPricingType\.DONATION/);
    assert.match(actionSource, /donationAmount/);
    assert.match(actionSource, /checkoutIdempotencyKey/);
    assert.match(
      actionSource,
      /clientState:\s*`booking:\$\{booking\.id\}:\$\{attemptId\}`/,
    );
    assert.match(actionSource, /Enter a donation amount greater than zero/);
    assert.match(
      actionSource,
      /Enter an email address so the academy knows who is attending/,
    );
    assert.match(actionSource, /Payment service is not available/);

    const formSource = readSource(
      "apps/portal/src/app/courses/[id]/CourseCheckoutForm.tsx",
    );
    assert.match(formSource, /Donation amount/);
    assert.match(formSource, /name="donationAmount"/);
    assert.match(formSource, /BookEventButton/);

    const pageSource = readSource("apps/portal/src/app/courses/[id]/page.tsx");
    assert.match(pageSource, /EventPricingType\.DONATION/);
    assert.match(pageSource, /mode=\{checkoutMode\}/);
  });

  it("hides and rejects checkout for unverified or unclaimed academies", () => {
    const coursePageSource = readSource(
      "apps/portal/src/app/courses/[id]/page.tsx",
    );
    const openMatPageSource = readSource(
      "apps/portal/src/app/open-mats/[id]/page.tsx",
    );
    const actionSource = readSource(
      "apps/portal/src/app/courses/[id]/payment-actions.ts",
    );

    assert.match(coursePageSource, /isPublicAcademyTrusted/);
    assert.match(
      coursePageSource,
      /event\.active\s*&&\s*academyTrusted\s*&&\s*academyBookingVerified\s*&&\s*academyPaymentsVerified\s*&&\s*paymentAccount\.ready\s*&&/,
    );
    assert.match(openMatPageSource, /isPublicAcademyTrusted/);
    assert.match(
      openMatPageSource,
      /event\.active\s*&&\s*academyTrusted\s*&&\s*academyBookingVerified\s*&&\s*academyPaymentsVerified\s*&&\s*paymentAccount\.ready\s*&&/,
    );
    assert.match(actionSource, /isPublicAcademyTrusted\(event\.academy\)/);
    assert.match(
      actionSource,
      /isPublicAcademyBookingVerified\(event\.academy\)/,
    );
    assert.match(
      actionSource,
      /isPublicAcademyPaymentsVerified\(event\.academy\)/,
    );
    assert.match(actionSource, /not verified for online payments/);
  });

  it("requires a ready academy Stripe Connect account before collecting paid event payments", () => {
    const helperSource = readSource(
      "apps/portal/src/lib/academy-payment-account.ts",
    );
    const coursePageSource = readSource(
      "apps/portal/src/app/courses/[id]/page.tsx",
    );
    const openMatPageSource = readSource(
      "apps/portal/src/app/open-mats/[id]/page.tsx",
    );
    const actionSource = readSource(
      "apps/portal/src/app/courses/[id]/payment-actions.ts",
    );

    assert.match(helperSource, /import\s+["']server-only["']/);
    assert.match(helperSource, /WALLET_INTERNAL_BASE_URL/);
    assert.match(helperSource, /wallet_type:\s*"external"/);
    assert.match(helperSource, /owner_id:\s*ownerId/);
    assert.match(helperSource, /provider === "STRIPE"/);
    assert.match(helperSource, /status === "CONNECTED"/);
    assert.match(helperSource, /getStripePaymentAccountSetting/);
    assert.match(helperSource, /PaymentServiceError/);
    assert.match(
      helperSource,
      /error\.status === 401 \|\| error\.status === 403/,
    );
    assert.match(helperSource, /return unavailablePaymentAccount/);
    assert.match(helperSource, /ownerType:\s*"academy"/);
    assert.match(
      helperSource,
      /connected && chargesEnabled && payoutsEnabled && status === "verified"/,
    );

    for (const source of [coursePageSource, openMatPageSource, actionSource]) {
      assert.match(
        source,
        /academyPaymentAccountReadiness\(\s*event\.academyId/,
      );
      assert.match(source, /paymentAccount\.ready/);
    }
    assert.match(
      actionSource,
      /has not finished Stripe Connect setup for online payments/,
    );
  });

  it("keeps legacy verified academies bookable until a capability is explicitly disabled", () => {
    const academyServiceSource = readSource(
      "apps/portal/src/lib/academyService.ts",
    );

    assert.match(
      academyServiceSource,
      /optionalBooleanSetting\(settings,\s*"bookingVerified"\)\s*\?\?\s*publicListingVerified/,
    );
    assert.match(
      academyServiceSource,
      /optionalBooleanSetting\(settings,\s*"paymentsVerified"\)\s*\?\?\s*publicListingVerified/,
    );
  });

  it("exposes a scoped payments dashboard for academy and elevated admins", () => {
    const dashboardSource = readSource(
      "apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx",
    );
    const paymentsSource = readSource("apps/portal/src/lib/payments.ts");

    assert.match(paymentsSource, /listCourseOccurrencePayments/);
    assert.match(paymentsSource, /resource_type:\s*"course_occurrence"/);
    assert.match(paymentsSource, /isProviderBackedPaymentRecord/);
    assert.doesNotMatch(
      paymentsSource,
      /providerPaymentId\.startsWith\("cs_"\)/,
    );
    assert.match(dashboardSource, /\/dashboard\/payment/);
    assert.match(dashboardSource, /label:\s*"Payments"/);
    assert.match(dashboardSource, /academyId[\s\S]*\? payments\.filter/);
    assert.match(dashboardSource, /metadata\?\.academy_id === academyId/);
    assert.match(dashboardSource, /<PaymentsPanel/);
    assert.match(dashboardSource, /PaymentsPanelSearch/);
    assert.match(
      dashboardSource,
      /<div className="flex flex-wrap items-start gap-4">/,
    );
    assert.match(
      dashboardSource,
      /sm:w-fit sm:min-w-\[17rem\] sm:max-w-\[24rem\]/,
    );
    assert.doesNotMatch(dashboardSource, /PaymentsDashboardActions/);
    assert.match(dashboardSource, /paymentsSearch/);
    assert.match(dashboardSource, /paymentMatchesSearch/);
    assert.match(dashboardSource, /metadata\.payer_phone/);
    assert.match(
      dashboardSource,
      /formatMinorCurrency\(payment\.amount, payment\.currency\)/,
    );
    assert.match(dashboardSource, /\/courses\/\$\{courseId\}/);
    assert.doesNotMatch(
      dashboardSource,
      /PaymentServiceStatusPanel|Payment Service Status|View system status/,
    );
    const payoutsViewSource =
      dashboardSource.match(
        /function PaymentsPayoutsView[\s\S]*?function PaymentsPanel/,
      )?.[0] ?? "";
    assert.notEqual(
      payoutsViewSource,
      "",
      "Expected PaymentsPayoutsView source to be present",
    );
    assert.doesNotMatch(
      payoutsViewSource,
      /Payout Account|Barclays Bank|Secure Payouts|•••• 5678/,
    );
  });

  it("keeps Stripe Connect API keys out of dashboard-managed payment settings", () => {
    const dashboardSource = readSource(
      "apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx",
    );
    const stripeConnectSource = readSource(
      "apps/portal/src/lib/stripe-connect.ts",
    );
    const providerSource = readSource(
      "apps/backend_api/internal/services/payments/server/provider.go",
    );
    const schemaSource = readSource("prisma/schema.prisma");
    const removeKeysMigration = readSource(
      "prisma/migrations/20260621161500_remove_dashboard_stripe_api_keys/migration.sql",
    );

    assert.match(stripeConnectSource, /process\.env\.STRIPE_SECRET_KEY/);
    assert.match(stripeConnectSource, /process\.env\.PAYMENT_GATEWAY_API_KEY/);
    assert.match(
      providerSource,
      /req\.SetBasicAuth\(a\.secret\.value\(\),\s*""\)/,
    );

    assert.match(
      removeKeysMigration,
      /DROP COLUMN IF EXISTS "api_key_ciphertext"/,
    );
    assert.match(removeKeysMigration, /DROP COLUMN IF EXISTS "api_key_last4"/);
    assert.match(removeKeysMigration, /DROP COLUMN IF EXISTS "api_key_mode"/);

    assert.doesNotMatch(dashboardSource, /function PaymentsSettingsView/);
    assert.doesNotMatch(dashboardSource, /Payment Settings/);
    assert.doesNotMatch(dashboardSource, /Stripe API Key/i);
    assert.doesNotMatch(
      dashboardSource,
      /name=["'](?:api|secret|key|publishable)/i,
    );
    assert.doesNotMatch(
      dashboardSource,
      /textarea[\s\S]*(api|secret|key|publishable)/i,
    );
  });

  it("stores Stripe Connect accounts against academy or platform ownership", () => {
    const stripeConnectSource = readSource(
      "apps/portal/src/lib/stripe-connect.ts",
    );
    const connectRouteSource = readSource(
      "apps/portal/src/app/api/payments/stripe-connect/route.ts",
    );
    const refreshRouteSource = readSource(
      "apps/portal/src/app/api/payments/stripe-connect/refresh/route.ts",
    );
    const disconnectRouteSource = readSource(
      "apps/portal/src/app/api/payments/stripe-connect/disconnect/route.ts",
    );
    const dashboardSource = readSource(
      "apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx",
    );
    const paymentsClientSource = readSource("apps/portal/src/lib/payments.ts");
    const schemaSource = readSource("prisma/schema.prisma");
    const serviceMigrationSource = readSource(
      "apps/backend_api/internal/services/payments/migrations/tables/013_paymentAccountSettings.sql",
    );
    const serviceEndpointSource = readSource(
      "apps/backend_api/internal/services/payments/server/EndpointStripeConnect.go",
    );
    const servicePersistenceSource = readSource(
      "apps/backend_api/internal/services/payments/server/StorePersistence.go",
    );
    const serviceProviderSource = readSource(
      "apps/backend_api/internal/services/payments/server/provider.go",
    );

    assert.doesNotMatch(schemaSource, /model PaymentAccountSetting \{/);
    assert.match(
      serviceMigrationSource,
      /CREATE TABLE IF NOT EXISTS payment_account_settings/,
    );
    assert.match(
      serviceMigrationSource,
      /CONSTRAINT payment_account_settings_owner_key UNIQUE \(owner_type, owner_id, provider\)/,
    );
    assert.match(
      serviceMigrationSource,
      /FROM public\.payment_account_settings/,
    );

    assert.match(
      stripeConnectSource,
      /ownerType:\s*"academy"\s*\|\s*"platform"/,
    );
    assert.match(stripeConnectSource, /requestedOwner === "academy"/);
    assert.match(
      stripeConnectSource,
      /requestedOwner !== "platform" && Boolean\(user\.academyId\)/,
    );
    assert.match(
      stripeConnectSource,
      /ownerId:\s*"rollfinders",\s*ownerType:\s*"platform"/,
    );
    assert.match(
      stripeConnectSource,
      /export function rollfindersPlatformPaymentAccountStatus/,
    );
    assert.match(
      stripeConnectSource,
      /providerAccountId:\s*"rollfinders-stripe-platform"/,
    );

    assert.match(paymentsClientSource, /\/v1\/payment-accounts\/stripe/);
    assert.match(paymentsClientSource, /createStripeConnectAccountLink/);
    assert.match(paymentsClientSource, /refreshStripePaymentAccountSetting/);
    assert.match(paymentsClientSource, /disconnectStripePaymentAccountSetting/);
    assert.match(
      paymentsClientSource,
      /headers\["X-Subscription-Owner-Type"\]\s*=\s*actor\.ownerType/,
    );
    assert.match(
      paymentsClientSource,
      /headers\["X-Subscription-Owner-ID"\]\s*=\s*actor\.ownerId/,
    );
    assert.match(connectRouteSource, /createStripeConnectAccountLink/);
    assert.match(refreshRouteSource, /refreshStripePaymentAccountSetting/);
    assert.match(
      disconnectRouteSource,
      /disconnectStripePaymentAccountSetting/,
    );

    assert.match(serviceProviderSource, /metadata\[owner_id\]/);
    assert.match(serviceProviderSource, /metadata\[owner_type\]/);
    assert.match(serviceProviderSource, /FindReusableConnectedAccount/);
    assert.match(serviceProviderSource, /DeleteDuplicateConnectedAccounts/);
    assert.match(serviceEndpointSource, /upsertPaymentAccountSettingDB/);
    assert.match(serviceEndpointSource, /DeleteDuplicateConnectedAccounts/);
    assert.match(serviceEndpointSource, /CreateAccountLink/);
    assert.match(dashboardSource, /getStripePaymentAccountSetting/);
    assert.match(dashboardSource, /ownerId:\s*paymentAccountOwner\.ownerId/);
    assert.match(
      dashboardSource,
      /ownerType:\s*paymentAccountOwner\.ownerType/,
    );
    assert.match(disconnectRouteSource, /ownerId:\s*owner\.ownerId/);
    assert.match(disconnectRouteSource, /ownerType:\s*owner\.ownerType/);
    assert.match(disconnectRouteSource, /export async function POST/);
    assert.doesNotMatch(disconnectRouteSource, /export async function GET/);
    assert.match(
      servicePersistenceSource,
      /account\.DetailsSubmitted && chargesEnabled && payoutsEnabled/,
    );
    assert.match(dashboardSource, /rollfindersPlatformPaymentAccountStatus/);
    assert.match(
      dashboardSource,
      /fallback:\s*academyAdmin[\s\S]*\? null[\s\S]*: rollfindersPlatformPaymentAccountStatus\(\)/,
    );
  });

  it("hides platform payment revenue metrics from academy admins", () => {
    const dashboardSource = readSource(
      "apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx",
    );

    assert.match(
      dashboardSource,
      /authorize\(user,\s*"payment\.report\.platform_revenue\.read"/,
    );
    assert.match(
      dashboardSource,
      /<PaymentsPanel[\s\S]*metricVisibility=\{paymentMetricVisibility\}/,
    );
    assert.match(
      dashboardSource,
      /metric\.id === "platform-revenue"[\s\S]*return metricVisibility\.platformRevenue/,
    );
    assert.match(
      dashboardSource,
      /card\.id === "platform-revenue"[\s\S]*return metricVisibility\.platformRevenue/,
    );
  });

  it("keeps paid event links usable when stored occurrence dates are stale", () => {
    const courseSource = readSource("apps/portal/src/lib/courses.ts");
    const openMatSource = readSource("apps/portal/src/lib/data.ts");

    assert.match(courseSource, /const exactOccurrence = occurrences\.find/);
    assert.match(courseSource, /upcomingOccurrences\[0\]\s*\?\?\s*event/);
    assert.match(
      openMatSource,
      /getOpenMatOccurrence[\s\S]*getCourseOccurrence/,
    );
    assert.match(
      openMatSource,
      /event\?\.courseType\s*===\s*CourseType\.OPEN_MAT/,
    );
  });

  it("proxies public checkout callbacks to the private payment service", () => {
    const routeSource = readSource(
      "apps/portal/src/app/v1/checkouts/[id]/callbacks/[result]/route.ts",
    );
    const paymentStatusSource = readSource(
      "apps/portal/src/app/payments/status/page.tsx",
    );
    const bookingSource = readSource("apps/portal/src/lib/bookings.ts");

    assert.match(routeSource, /apiGatewayUrl/);
    assert.doesNotMatch(routeSource, /PAYMENT_PUBLIC_BASE_URL/);
    assert.match(
      routeSource,
      /\/v1\/checkouts\/\$\{encodeURIComponent\(id\)\}\/callbacks\/\$\{encodeURIComponent\(result\)\}/,
    );
    assert.match(routeSource, /redirect:\s*"manual"/);
    assert.match(routeSource, /metadata_booking_id/);
    assert.match(routeSource, /markBookingPaymentReceived/);
    assert.match(routeSource, /payment-callback-received/);
    assert.match(
      routeSource,
      /NextResponse\.redirect\(redirectUrl,\s*response\.status\)/,
    );
    assert.match(paymentStatusSource, /markPaidBookingPaymentReceived/);
    assert.match(paymentStatusSource, /metadata_booking_id/);
    assert.match(paymentStatusSource, /payment-status-received/);
    assert.match(paymentStatusSource, /markBookingPaymentReceived/);
    assert.match(
      bookingSource,
      /\/v1\/bookings\/\$\{encodeURIComponent\(bookingId\)\}\/payment-received/,
    );
    assert.match(
      bookingSource,
      /\/v1\/bookings\/\$\{encodeURIComponent\(bookingId\)\}\/confirm/,
    );
  });

  it("posts course payment wallet effects through the payment outbox adapter and backfill job", () => {
    const paymentSource = readSource("apps/portal/src/lib/payments.ts");
    const postingSource = readSource(
      "apps/portal/src/lib/payment-wallet-posting.ts",
    );
    const jobRouteSource = readSource(
      "apps/portal/src/app/api/jobs/course-payment-wallet-posting/route.ts",
    );
    const walletEffectsSource = readSource(
      "apps/portal/src/lib/course-payment-wallet-effects.ts",
    );

    assert.match(
      paymentSource,
      /export async function listPaymentOutboxEvents/,
    );
    assert.match(
      paymentSource,
      /\/internal\/outbox\/events\?\$\{params\.toString\(\)\}/,
    );
    assert.match(
      paymentSource,
      /export async function markPaymentOutboxEventDelivered/,
    );
    assert.match(
      paymentSource,
      /\/internal\/outbox\/events\/\$\{encodeURIComponent\(eventId\)\}\/delivered/,
    );
    assert.match(postingSource, /processCoursePaymentWalletOutbox/);
    assert.match(postingSource, /backfillCoursePaymentWalletEffects/);
    assert.match(postingSource, /recordCoursePaymentWalletEffects/);
    assert.match(postingSource, /markPaymentOutboxEventDelivered/);
    assert.match(postingSource, /eventType !== "payment\.succeeded"/);
    assert.match(postingSource, /resource_type !== "course_occurrence"/);
    assert.match(postingSource, /listCourseOccurrencePaymentsPage/);
    assert.match(jobRouteSource, /CRON_SECRET/);
    assert.match(jobRouteSource, /isPlatformAdminRole/);
    assert.match(jobRouteSource, /backfillCoursePaymentWalletEffects/);
    assert.match(jobRouteSource, /processCoursePaymentWalletOutbox/);
    assert.match(jobRouteSource, /recoverLegacyCoursePayments/);
    assert.match(jobRouteSource, /dryRun/);
    assert.match(
      walletEffectsSource,
      /course-payment-wallet-credit:\$\{payment\.id\}/,
    );
    assert.match(
      walletEffectsSource,
      /course-payment-platform-fee:\$\{payment\.id\}/,
    );
  });

  it("recovers legacy course payments through a dry-run-first import and wallet posting path", () => {
    const recoverySource = readSource(
      "apps/portal/src/lib/legacy-course-payment-recovery.ts",
    );
    const paymentSource = readSource("apps/portal/src/lib/payments.ts");
    const jobRouteSource = readSource(
      "apps/portal/src/app/api/jobs/course-payment-wallet-posting/route.ts",
    );

    assert.match(paymentSource, /export async function recordExternalPayment/);
    assert.match(paymentSource, /\/internal\/payments\/record-external/);
    assert.match(recoverySource, /export async function recoverLegacyCoursePayments/);
    assert.match(recoverySource, /dryRun = true/);
    assert.match(recoverySource, /to_regclass\('public\.payments'\)/);
    assert.match(recoverySource, /legacy_payment_id/);
    assert.match(recoverySource, /client_id:\s*"rollfinders"/);
    assert.match(recoverySource, /No actual settled payment amount was found/);
    assert.match(recoverySource, /legacy-course-payment-import:\$\{candidate\.payment_id\}/);
    assert.match(recoverySource, /recordCoursePaymentWalletEffects/);
    assert.match(jobRouteSource, /legacy/);
    assert.match(jobRouteSource, /request\.method === "GET"/);
  });

  it("cancels pending booking payments and requests refunds for received payments through the payment service", () => {
    const paymentSource = readSource("apps/portal/src/lib/payments.ts");
    const bookingSource = readSource("apps/portal/src/lib/bookings.ts");
    const dashboardActionSource = readSource(
      "apps/portal/src/app/dashboard/bookings/bookingActions.ts",
    );
    const dashboardSource = readSource(
      "apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx",
    );
    const stripeProviderSource = readSource(
      "apps/backend_api/internal/services/payments/server/provider.go",
    );

    assert.match(paymentSource, /export async function cancelPayment/);
    assert.match(
      paymentSource,
      /\/v1\/payments\/\$\{encodeURIComponent\(input\.paymentId\)\}\/cancel/,
    );
    assert.match(paymentSource, /export async function createPaymentRefund/);
    assert.match(
      paymentSource,
      /\/v1\/payments\/\$\{encodeURIComponent\(input\.paymentId\)\}\/refunds/,
    );
    assert.match(bookingSource, /export async function cancelBooking/);
    assert.match(
      bookingSource,
      /\/v1\/bookings\/\$\{encodeURIComponent\(bookingId\)\}\/cancel/,
    );
    assert.match(dashboardActionSource, /await cancelPayment/);
    assert.match(dashboardActionSource, /await createPaymentRefund/);
    assert.match(
      dashboardActionSource,
      /booking\.status === "payment_received"/,
    );
    assert.match(dashboardActionSource, /refund_requested_by_academy/);
    assert.match(dashboardActionSource, /refund-requested/);
    assert.match(dashboardActionSource, /await cancelBooking/);
    assert.match(dashboardActionSource, /payment_already_completed/);
    assert.doesNotMatch(dashboardActionSource, /markBookingPaymentReceived/);
    assert.match(dashboardSource, /cancelDashboardBooking/);
    assert.match(
      dashboardSource,
      /booking\.status === "payment_pending"[\s\S]*\|\|[\s\S]*booking\.status === "payment_received"/,
    );
    assert.match(
      dashboardSource,
      /Booking cancelled and refund request queued/,
    );
    assert.match(
      stripeProviderSource,
      /\/v1\/checkout\/sessions\/"\+url\.PathEscape\(p\.ProviderPaymentID\)\+"\/expire"/,
    );
  });
});
