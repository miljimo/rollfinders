# PRD: Course Occurrence Payments

Version: 1.0

Priority: High

Status: Ready For Review

Branch:

```text
feature/course_occurrence_payments
```

---

# Objective

Allow users to pay online for a specific Course occurrence.

RollFinders SHALL support paid Course bookings while keeping the existing free and informational Course discovery flow intact.

Payments SHALL be processed by the existing external Go payment service.

RollFinders SHALL NOT store card details.

---

# Product Decision

Payments are per Course occurrence.

For recurring Courses, users SHALL pay for one scheduled occurrence, not for the entire recurring series.

Example:

```text
Course:
Gi Sparring Session

Occurrence:
Mon 8 Jun 2026
19:00 - 20:30

Payment Scope:
This single occurrence only
```

---

# Business Motivation

Academies may want to secure attendance and payment before users arrive.

Users need a simple way to book and pay for a Course without contacting the academy manually.

RollFinders needs payment visibility, booking state, and reconciliation while avoiding direct payment-provider complexity.

The external Go payment service SHALL own payment provider integration, hosted checkout, payment authorization, refunds, provider callback URI handling, provider webhook complexity, and canonical payment status orchestration.

RollFinders SHALL own:

* Course payment eligibility
* Booking records
* Payment status display from Go payment service state
* Academy-scoped payment visibility
* Platform payment operations
* Booking fulfillment after Go payment service confirmed status

---

# Current Model

```text
Academy
    ↓
Course
```

---

# Future Model

```text
Academy
    ↓
Course
    ↓
Course Occurrence
    ↓
Booking
    ↓
Payment
    ↓
Go Payment Service
```

---

# Requirement 1: Payment Scope

IF a Course is recurring

WHEN a user pays online

THEN the payment SHALL apply only to the selected Course occurrence.

The payment SHALL store:

| Field | Required |
| --- | --- |
| Course Id | Yes |
| Academy Id | Yes |
| Occurrence Date | Yes |
| Occurrence Start Time | Yes |
| Occurrence End Time | Yes |
| Amount | Yes |
| Currency | Yes |
| Payer User Id | No |
| Payer Email | No |

Guest users SHALL be allowed to pay without creating an account.

RollFinders SHALL ask guest users for an optional receipt email during checkout review.

IF a receipt email is provided

THEN RollFinders SHALL store it as the payer email and use it for booking receipt and support lookup.

IF no receipt email is provided

THEN RollFinders SHALL still allow checkout when the payment service can process the payment without it, and SHALL show an on-screen receipt after trusted payment confirmation.

---

# Requirement 2: Payment Eligibility

IF a Course occurrence is active, public, in the future, has a fixed price, and online payment is enabled

WHEN a user views the Course detail page

THEN RollFinders SHALL show a `Book course` action.

IF the Course is free

THEN RollFinders SHALL preserve the existing non-payment discovery flow.

IF the Course uses pay-at-academy or informational pricing

THEN RollFinders SHALL NOT force online checkout.

IF the Course is inactive, deleted, in the past, sold out, or payment disabled

THEN RollFinders SHALL block checkout creation.

---

# Requirement 3: Public Course Detail CTA

The Course detail page SHALL use a mobile-first booking action.

On mobile, the primary action SHOULD be a sticky bottom CTA:

```text
Book course
£10.00 · 4 places left
```

The Course detail page SHALL clearly display:

* Course name
* Academy
* Occurrence date
* Start time
* End time
* Location
* Price
* Availability, when capacity is enforced
* Refund or cancellation summary, when available

Discovery cards SHALL show price and availability but SHALL NOT use aggressive checkout language such as `Buy now`.

---

# Requirement 4: Checkout Review

IF a user selects `Book course`

WHEN the Course occurrence is eligible for payment

THEN RollFinders SHALL show a checkout review screen before redirecting to the Go payment service.

The checkout review screen SHALL display:

* Course name
* Academy
* Occurrence date
* Time
* Location
* Optional receipt email field for guest users
* Payer email for logged-in users, when available
* Course fee
* Service fee, if any
* Total amount

The primary CTA SHALL be:

```text
Continue to secure payment
```

The checkout review screen SHALL include trust copy:

```text
You will complete payment securely with our payment partner.
RollFinders does not store your card details.
```

The checkout review screen SHALL ask:

```text
Where should we send your receipt?
```

The receipt email field SHALL be optional for guest checkout.

IF the user leaves the receipt email blank

THEN the checkout review screen SHALL explain that the receipt will be shown on screen after payment confirmation and may not be recoverable by email.

---

# Requirement 5: Checkout Session Creation

IF the user confirms the checkout review

WHEN RollFinders creates a checkout session

THEN RollFinders SHALL call the Go payment service from the server only.

The checkout request SHALL include:

* Course Id
* Academy Id
* Occurrence Date
* Occurrence Start Time
* Occurrence End Time
* Amount
* Currency
* Payer User Id, when logged in
* Payer Email, when provided
* Metadata
* Idempotency key

RollFinders SHALL NOT build or send provider success, cancel, or callback URLs for the default Course occurrence checkout flow. Callback URI handling and provider return routing SHALL be configured and owned by the Go payment service.

IF the Go payment service returns a checkout URL

THEN RollFinders SHALL redirect the user to the hosted payment flow.

IF checkout creation fails

THEN RollFinders SHALL show:

```text
Could not start payment.
Your card has not been charged.
Please try again.
```

---

# Requirement 6: Payment Status Return

RollFinders SHALL support payment status display after the Go payment service redirects the user back to the RollFinders payment status route.

Supported states:

```text
SUCCESS
PENDING
FAILED
CANCELLED
EXPIRED
ALREADY_CONFIRMED
```

IF the user returns before the Go payment service has confirmed a terminal status

THEN RollFinders SHALL show `Payment pending`.

RollFinders SHALL NOT mark a booking as confirmed based only on browser redirect.

Trusted confirmation SHALL come from Go payment service owned payment status orchestration.

IF the Go payment service has already confirmed successful payment

THEN RollFinders SHALL show an on-screen booking receipt.

The on-screen receipt SHALL include:

* Booking reference
* Course name
* Academy
* Occurrence date
* Time
* Amount paid
* Payment status
* Receipt email, when one was provided

IF no receipt email was provided

THEN the on-screen receipt SHALL remain the primary receipt for the user.

---

# Requirement 7: Payment Status Synchronization

The Go payment service SHALL own provider webhook ingestion and callback processing.

RollFinders SHALL consume payment status from the Go payment service through service-owned status callbacks, status API reads, or future service-originated application events.

The RollFinders synchronization handler SHALL:

* Trust only authenticated Go payment service communication or server-side status reads
* Process status updates idempotently
* Verify amount and currency
* Verify Course Id and occurrence metadata
* Update booking and payment state
* Store Go payment service references for operations

IF a duplicate status update is received

THEN RollFinders SHALL NOT create duplicate paid bookings.

IF amount or currency does not match the expected checkout record

THEN RollFinders SHALL mark the payment for manual review.

---

# Requirement 8: Booking And Payment Statuses

RollFinders SHALL support booking statuses:

```text
PENDING_PAYMENT
CONFIRMED
CANCELLED
REFUNDED
PAYMENT_FAILED
MANUAL_REVIEW
```

RollFinders SHALL support payment statuses:

```text
CHECKOUT_CREATED
PENDING
SUCCEEDED
FAILED
CANCELLED
EXPIRED
REFUNDED
PARTIALLY_REFUNDED
DISPUTED
MANUAL_REVIEW
```

---

# Requirement 9: Capacity Handling

IF a Course occurrence has capacity

WHEN checkout is created

THEN RollFinders SHALL check remaining capacity.

IF the occurrence is sold out

THEN checkout SHALL be blocked.

IF multiple users attempt payment for the last place

THEN RollFinders SHALL prevent over-confirming paid bookings.

The MVP policy SHALL be:

```text
Capacity is consumed only after trusted payment success.
```

IF payment succeeds but the occurrence became full before service-confirmed status synchronization

THEN RollFinders SHALL mark the booking as `MANUAL_REVIEW`.

Future versions MAY support temporary seat reservations during checkout.

---

# Requirement 10: Academy Admin Visibility

IF an Academy Admin views payments

WHEN payments exist for Courses belonging to their academy

THEN the Academy Admin SHALL see only their academy payments.

The Academy Admin payment view SHALL display:

* Course name
* Occurrence date
* Payer name or email
* Amount
* Currency
* Payment status
* Booking status
* Provider reference
* Created date

---

# Requirement 11: Platform Admin Operations

Platform Admins and Super Admins SHALL be able to view all Course payments.

The platform payment operations view SHALL support:

* Search by payer email
* Search by Course
* Search by provider reference
* Filter by status
* Filter by academy
* View payment status synchronization history
* Identify manual review records

Platform Admins SHALL be able to add reconciliation notes.

Refund initiation MAY be external-only in MVP unless the Go payment service already exposes a safe refund API.

---

# Requirement 12: Course Management Safeguards

IF a Course occurrence has confirmed paid bookings

WHEN an Academy Admin edits the Course date, time, price, capacity, or active status

THEN RollFinders SHALL show a warning before saving.

IF a change would invalidate paid bookings

THEN RollFinders SHALL require Platform Admin review or a defined cancellation/refund workflow.

---

# Requirement 13: Notifications

IF payment succeeds

WHEN RollFinders receives trusted payment success confirmation from the Go payment service

THEN RollFinders SHOULD send a booking confirmation email when a receipt email is available.

IF no receipt email is available

THEN RollFinders SHALL NOT fail the booking confirmation, and SHALL rely on the on-screen receipt.

The confirmation email SHOULD include:

* Course name
* Academy
* Occurrence date
* Time
* Location
* Amount paid
* Booking reference
* Support contact or help link

IF payment fails or is cancelled

THEN RollFinders MAY send no email in MVP.

---

# Requirement 14: Analytics

RollFinders SHALL track:

```text
course_checkout_started
course_checkout_created
course_checkout_failed
course_payment_pending
course_payment_succeeded
course_payment_failed
course_payment_cancelled
course_payment_refunded
course_booking_confirmed
```

Analytics SHALL support reporting by:

* Course Id
* Academy Id
* Course Type
* Activity Type
* Discipline
* Occurrence Date
* Amount
* Currency

---

# Requirement 15: Backward Compatibility

Existing Courses SHALL remain valid.

Existing Open Mats SHALL remain valid.

Existing free Courses SHALL continue functioning without payment setup.

Existing public Course and Open Mat URLs SHALL continue working.

No existing discovery functionality SHALL be broken.

---

# Go Payment Service Contract

The Go payment service SHALL provide a checkout creation endpoint.

The Go payment service SHALL provide a client registration endpoint so RollFinders and future services can register their own callback URI and receive a stable client id.

Registered clients SHALL include:

* Client id
* Client name
* Callback URI
* Created timestamp

Checkout creation requests SHALL include the registered client id and MAY include opaque client state.

The Go payment service SHALL use the stored callback URI for payment status returns and SHALL NOT rely on callback URIs supplied per checkout request.

Example request:

```json
{
  "idempotencyKey": "course_cmq123_2026-06-08_1900_user_abc",
  "clientId": "rollfinders",
  "clientState": "order_123",
  "courseId": "cmq123",
  "academyId": "academy123",
  "occurrenceDate": "2026-06-08",
  "occurrenceStartTime": "19:00",
  "occurrenceEndTime": "20:30",
  "amountMinor": 1000,
  "currency": "GBP",
  "payerUserId": "user123",
  "payerEmail": "student@example.com",
  "metadata": {
    "source": "rollfinders",
    "paymentScope": "COURSE_OCCURRENCE"
  }
}
```

Example response:

```json
{
  "checkoutSessionId": "go_checkout_123",
  "checkoutUrl": "https://payments.example.com/checkout/go_checkout_123",
  "expiresAt": "2026-06-08T18:45:00Z"
}
```

The Go payment service SHALL own provider callback URLs and SHALL redirect users to the configured RollFinders payment status URL after it maps provider return state to canonical payment state.

Service-confirmed status payloads or status API responses SHOULD include:

* Checkout session id
* Payment id
* Status
* Amount
* Currency
* Course Id
* Academy Id
* Occurrence Date
* Occurrence Start Time
* Payer email
* Timestamp

---

# UX Principles

The payment flow SHALL be mobile-first.

The user journey SHOULD be:

```text
Course Detail
    ↓
Review Booking
    ↓
Continue to Secure Payment
    ↓
External Go Checkout
    ↓
Payment Return State
    ↓
Booking Receipt
```

The UI SHALL use direct language:

* Book course
* Review booking
* Continue to secure payment
* Opening secure payment
* Booking confirmed
* Payment failed
* No payment was taken

The UI SHALL avoid:

* Buy now
* Submit
* Proceed
* Transaction error
* Ambiguous failure states

Error states SHALL clearly say whether money was taken.

---

# Open Decisions

The following decisions SHALL be confirmed before implementation:

| Decision | Recommendation |
| --- | --- |
| Payment scope | Per Course occurrence |
| Initial currency | GBP |
| Card handling | External Go payment service only |
| Online payment eligibility | Verified or approved academies only |
| Guest checkout | Allow guest payment, ask for optional receipt email, link to user when logged in |
| Seat reservation | Confirm capacity only after payment success for MVP |
| Refund initiation | External-only or Platform Admin only for MVP |
| Seller of record | To be confirmed |
| Platform fee | To be confirmed |

---

# Acceptance Criteria

IF a paid Course occurrence is active and payment-enabled

THEN users can start a checkout from the Course detail page.

IF checkout is created successfully

THEN the user is redirected to the Go payment service.

IF payment succeeds and RollFinders receives service-confirmed payment status

THEN RollFinders marks the booking as confirmed.

IF a confirmed booking has a receipt email

THEN RollFinders sends the receipt or confirmation email to that address.

IF a confirmed booking has no receipt email

THEN RollFinders shows the receipt on screen.

IF the user returns before service-confirmed terminal status

THEN RollFinders shows a pending state.

IF payment fails or is cancelled

THEN RollFinders does not confirm the booking and clearly states that no booking was confirmed.

IF duplicate status updates are received

THEN RollFinders processes them idempotently.

IF amount, currency, Course Id, or occurrence metadata does not match

THEN RollFinders marks the payment for manual review.

IF an Academy Admin views payments

THEN they only see payments for their academy.

IF a Platform Admin views payments

THEN they can inspect all payment records and payment status synchronization history.

IF existing free Courses or Open Mats are viewed

THEN their current behavior remains unchanged.

---

# Prioritized Implementation Tickets

## P0: Payment Architecture And Go Service Contract

Define the final business and technical contract before implementation.

Includes:

* Seller of record decision
* Platform fee decision
* Refund ownership
* Go checkout endpoint contract
* Go status callback/API contract
* Payment client registration contract
* Signature verification method
* Payment status model
* Capacity policy
* Guest checkout and receipt email policy

IF a client is not registered

WHEN it attempts to create a checkout

THEN the payment service SHALL reject the request.

## P0: Payment Service Runtime And Deployment

Deploy the Go payment service as its own runtime container, separate from the RollFinders Next.js application container.

The payment service SHALL be independently buildable, testable, and deployable.

Local development SHALL support running the payment service through Docker Compose with its PostgreSQL dependency.

The root RollFinders compose workflow SHALL make it clear how to run the application and payment service together for end-to-end payment development.

Includes:

* Payment service Docker image definition.
* Local payment-service PostgreSQL dependency.
* Root or documented compose workflow that starts RollFinders app, RollFinders database, payment service, and payment-service database together.
* Environment variables for RollFinders-to-payment-service API URL and API key.
* Health check for the payment service container.
* Production deployment definition for a separate payment service container or ECS service.
* Network/security boundary so only server-side RollFinders code calls the payment service.
* CI validation that runs Go tests and verifies the payment service container starts.

Done when:

* `npm run payments:test` passes.
* The payment service can run locally with Docker Compose.
* The RollFinders app can call the local payment service from the compose network.
* Production infrastructure can deploy the payment service without baking it into the Next.js container.
* Payment service logs and health checks are independently visible from the RollFinders app.

## P0: Payment Data Model

Add RollFinders persistence for:

* Course booking
* Course payment
* Payment status synchronization event
* Provider references
* Idempotency keys
* Manual review state

## P0: Go Checkout Integration

Create server-side integration for checkout session creation.

Validate:

* Course exists
* Course occurrence exists
* Course is active
* Occurrence is in the future
* Payment is enabled
* Price is fixed
* Capacity is available, when enforced

## P0: Go Payment Status Synchronization

Build the RollFinders side of service-confirmed payment status synchronization.

Support:

* Authenticated Go payment service communication or server-side status reads
* Idempotency
* Amount and currency verification
* Course occurrence verification
* Status transitions
* Failure logging

## P0: Public Course Payment Flow

Add:

* Mobile sticky `Book course` CTA
* Checkout review screen
* Payment handoff loading state
* Success return state
* On-screen booking receipt
* Pending return state
* Failed return state
* Cancelled return state

## P1: Academy Payment Settings

Allow eligible Academy Admins to enable online payment for Courses.

Admin UI SHALL clearly distinguish:

* Free
* Pay at academy
* Pay online
* Check with academy

## P1: Payment Admin Views

Add Academy Admin and Platform Admin payment views.

Include search, filters, payment status, booking status, Course occurrence, payer email, and provider reference.

## P1: Course Edit Safeguards

Warn or block risky Course edits when paid bookings exist.

Scope:

* Price changes
* Date changes
* Time changes
* Capacity changes
* Deactivation
* Cancellation

## P1: Payment Confirmation Emails

Send confirmation emails after trusted payment success when a receipt email is available.

Reuse the existing reliable email infrastructure where possible.

If no receipt email was provided during guest checkout, the booking confirmation email SHALL be skipped and the on-screen receipt SHALL be the customer receipt.

## P2: Refund And Reconciliation Workflow

Expose refund status from Go payment service status synchronization.

Add manual review and reconciliation notes for Platform Admins.

Refund initiation MAY remain external-only in MVP.

## P2: Payment Analytics And Reporting

Add payment analytics and reporting by academy, Course, occurrence, status, amount, and conversion.

## P3: Payment Enhancements

Future enhancements MAY include:

* Temporary seat reservations
* Discount codes
* Deposits
* Waitlists
* Partial refunds
* Course transfer
* Multi-currency
* In-platform refund initiation
