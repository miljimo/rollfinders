# PRD: Admin Payments Dashboard

Status: Reviewing

Last updated: 2026-06-17

## Overview

RollFinders needs an administrative payments dashboard so Academy Admins, Platform Admins, and Super Admins can review payments made to courses and events without calling Stripe directly.

This PRD complements `services/courses/docs/Products/Reviewing/CourseOccurrencePaymentsPrd.md`, especially Requirement 10, Academy Admin Visibility, and Requirement 11, Platform Admin Operations. The payment service remains the transaction system of record; RollFinders reads recorded payment history from the payment service.

## Goals

1. Give Academy Admins visibility into payments made to their academy courses and events.
2. Give Platform Admins and Super Admins visibility into course and event payments across RollFinders.
3. Keep payment history inside RollFinders operational dashboards without requiring admins to log into Stripe.
4. Preserve academy data boundaries: academy-scoped admins must not see payments for other academies.
5. Surface enough payment context for support, reconciliation, and manual review.

## Non-Goals

1. This dashboard does not create refunds, captures, or cancellations in the first release.
2. This dashboard does not expose raw card, wallet, or provider-sensitive payment details.
3. This dashboard does not replace payment-service transaction storage.
4. This dashboard does not calculate final settlement, fees, payout timing, or tax reporting.

## Personas

### Academy Admin

An academy admin needs to see whether students or guests have paid for their academy courses/events.

### Platform Admin

A platform admin needs to support academies, inspect recent payment activity, and investigate payment status issues.

### Super Admin

A super admin needs platform-wide operational visibility and payment monitoring.

## Permissions

IF a user is an Academy Admin or Academy Owner

WHEN they open the Payments dashboard

THEN they SHALL see only payment records whose metadata `academy_id` matches their assigned academy.

IF a user is a Platform Admin

WHEN they open the Payments dashboard

THEN they SHALL see RollFinders course/event payment records across academies.

IF a user is a Super Admin

WHEN they open the Payments dashboard

THEN they SHALL see RollFinders course/event payment records across academies.

IF a standard user attempts to access the admin Payments dashboard

THEN access SHALL be denied by the existing dashboard role guard.

## Navigation

The dashboard side navigation SHALL include a `Payments` item for:

* Academy Admins
* Academy Owners
* Platform Admins
* Super Admins

The route SHALL use the unified dashboard route:

```text
/dashboard?panel=payments
```

## Data Source

RollFinders SHALL call the payment service payment-history API.

The MVP dashboard query SHALL request:

```text
GET /v1/payments?client_id=rollfinders&resource_type=course_occurrence&limit=100
```

The payment service SHALL return recorded transactions and checkout context. RollFinders SHALL NOT call Stripe directly for this dashboard.

Academy scoping MAY be applied in RollFinders after reading payment-service records when the payment-service endpoint does not support metadata filtering. The scoping rule SHALL use trusted payment metadata:

```text
payment.metadata.academy_id === currentUser.academyId
```

Future payment-service versions SHOULD support metadata-aware filtering so academy-scoped reads can be pushed down to the payment service.

## Dashboard Summary

The Payments dashboard SHALL show summary cards:

* Gross paid amount from successful payments
* Successful payment count
* Total payment records in the current scope

Gross paid SHALL sum only payments whose status is `succeeded`.

## Payment Table

The payment table SHALL show:

* Course/event title
* Occurrence date, when available
* Academy name for Platform Admins and Super Admins
* Payer email or payer user id
* Amount
* Currency
* Payment method type
* Payment status
* Created date

The table SHALL show an empty state when no course/event payments exist.

The table SHALL show a non-crashing warning state when the payment service is unavailable or misconfigured.

## Payment Search

The Payments dashboard SHALL provide a search input that filters payment records in the current admin scope.

Admins SHALL be able to search by:

* Payment amount, including formatted major units such as `10.00` and minor-unit values when available
* Course/event title
* Course/event identifiers
* Payer email
* Payer phone number when the payment service stores phone metadata
* Academy name for Platform Admins and Super Admins

Search SHALL be applied after role and academy scoping so academy admins cannot discover out-of-scope payments through search terms.

When no payments match the search, the dashboard SHALL show a filtered empty state instead of the global no-payments state.

## Payment Detail Navigation

Each visible payment row SHALL be clickable.

WHEN an admin clicks a payment row

THEN RollFinders SHALL navigate to the related course/event detail page.

For course occurrence payments, the target SHOULD use payment metadata:

```text
/courses/{metadata.course_id}?date={metadata.occurrence_date}
```

IF the payment record does not contain enough course/event metadata to build a detail route

THEN the row SHALL remain visible but SHALL NOT navigate to an invalid URL.

## Status Display

The dashboard SHALL visually distinguish at least:

* `succeeded`
* `failed`
* `cancelled`
* `refunded`
* `partially_refunded`
* non-terminal statuses such as `requires_action`, `authorized`, and `processing`

The first release MAY render status as text badges. It does not need advanced workflow actions.

## Security Requirements

The dashboard SHALL NOT render:

* Raw card number
* CVV
* Stripe secret keys
* Provider authorization headers
* Provider webhook signatures
* Full provider payloads

Payment records MAY show provider payment id only when needed for support and only to Platform Admin or Super Admin users.

## Reliability Requirements

IF the payment service is down

THEN the dashboard SHALL render a clear warning message and an empty payment table instead of failing the whole dashboard.

IF `PAYMENT_SERVICE_API_KEY` is missing

THEN the dashboard SHALL show a configuration warning instead of exposing stack traces.

## Acceptance Criteria

### Academy Admin Scope

GIVEN an Academy Admin belongs to academy A

AND payments exist for academy A and academy B

WHEN the Academy Admin opens `/dashboard?panel=payments`

THEN only academy A payment records SHALL be visible.

### Platform-Wide Visibility

GIVEN a Platform Admin or Super Admin opens `/dashboard?panel=payments`

THEN course/event payment records across academies SHALL be visible.

### Payment Summary

GIVEN successful and non-successful payment records exist

WHEN the dashboard summary renders

THEN gross paid SHALL include only successful payment amounts.

### Payment-Service Failure

GIVEN the payment service is unavailable

WHEN an admin opens the Payments dashboard

THEN the dashboard SHALL show a payment-service warning and SHALL NOT crash.

### Sensitive Data

GIVEN payment records are displayed

THEN raw card or provider secret data SHALL NOT be displayed.

### Payment Search

GIVEN payment records exist for multiple course/event payments

WHEN an admin searches by amount, event title, payer email, or payer phone number

THEN the dashboard SHALL show only scoped payments matching the search.

### Payment Row Navigation

GIVEN a payment record includes `metadata.course_id` and `metadata.occurrence_date`

WHEN an admin clicks the payment row

THEN the admin SHALL be taken to the matching course/event detail page.

## Implementation Notes

Current implementation points:

* `src/lib/payments.ts` provides `listCourseOccurrencePayments`.
* `src/app/dashboard/AdminDashboardWorkspace.tsx` renders the `Payments` panel.
* `services/payments/internal/server/EndpointListPayments.go` exposes `GET /v1/payments`.

The current MVP applies academy scoping inside RollFinders using `metadata.academy_id`. A future payment-service ticket should add metadata filters for stronger server-side filtering.

## Open Questions

1. Should Platform Admins be allowed to see provider payment ids, or should that remain Super Admin only?
2. Should refunds and manual review actions be added to this panel or kept in a separate finance operations panel?
3. Should academy payout/settlement reporting be part of this dashboard or a separate payouts product?
4. Should the payment service support explicit `academy_id` indexed columns for faster dashboard filtering?
