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
    assert.match(actionSource, /["']use server["']/);
    assert.match(actionSource, /createCourseOccurrenceCheckout/);
    assert.match(actionSource, /provider:\s*["']stripe["']/);
    assert.match(actionSource, /paymentMethodType:\s*["']card["']/);
    assert.match(actionSource, /checkoutUrl:\s*checkout\.checkoutUrl/);
    assert.doesNotMatch(actionSource, /redirect\(checkout\.checkoutUrl\)/);
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
    assert.match(formSource, /Continue to Secure Payment/);
    assert.match(formSource, /Creating checkout/);
    assert.match(formSource, /Receipt email/);
    assert.doesNotMatch(`${pageSource}\n${formSource}`, /stripe\.com|Stripe\(/);
  });

  it("supports donation checkout with a caller-specified amount", () => {
    const actionSource = readSource("src/app/courses/[id]/payment-actions.ts");
    assert.match(actionSource, /EventPricingType\.DONATION/);
    assert.match(actionSource, /donationAmount/);
    assert.match(actionSource, /checkoutIdempotencyKey/);
    assert.match(actionSource, /clientState:\s*`\$\{courseId\}:\$\{event\.occurrenceDateParam\}:\$\{attemptId\}`/);
    assert.match(actionSource, /Enter a donation amount greater than zero/);

    const formSource = readSource("src/app/courses/[id]/CourseCheckoutForm.tsx");
    assert.match(formSource, /Donation amount/);
    assert.match(formSource, /name="donationAmount"/);
    assert.match(formSource, /Donate/);

    const pageSource = readSource("src/app/courses/[id]/page.tsx");
    assert.match(pageSource, /EventPricingType\.DONATION/);
    assert.match(pageSource, /mode=\{checkoutMode\}/);
  });

  it("hides and rejects checkout for unverified or unclaimed academies", () => {
    const coursePageSource = readSource("src/app/courses/[id]/page.tsx");
    const openMatPageSource = readSource("src/app/open-mats/[id]/page.tsx");
    const actionSource = readSource("src/app/courses/[id]/payment-actions.ts");

    assert.match(coursePageSource, /isPublicAcademyTrusted/);
    assert.match(coursePageSource, /academyTrusted\s*&&/);
    assert.match(openMatPageSource, /isPublicAcademyTrusted/);
    assert.match(openMatPageSource, /academyTrusted\s*&&/);
    assert.match(actionSource, /isPublicAcademyTrusted\(event\.academy\)/);
    assert.match(actionSource, /not verified for online payments/);
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
