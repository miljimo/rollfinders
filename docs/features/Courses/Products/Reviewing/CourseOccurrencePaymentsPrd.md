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

The external Go payment service SHALL own payment provider integration, hosted checkout, payment authorization, refunds, and provider webhook complexity.

RollFinders SHALL own:

* Course payment eligibility
* Booking records
* Payment status display
* Academy-scoped payment visibility
* Platform payment operations
* Webhook verification and reconciliation records

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
| Payer Email | Yes |

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
* Payer email
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
* Payer Email
* Success URL
* Cancel URL
* Metadata
* Idempotency key

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

# Requirement 6: Payment Return States

RollFinders SHALL support payment return states after the Go payment service redirects the user back.

Supported states:

```text
SUCCESS
PENDING
FAILED
CANCELLED
EXPIRED
ALREADY_CONFIRMED
```

IF the user returns before webhook confirmation

THEN RollFinders SHALL show `Payment pending`.

RollFinders SHALL NOT mark a booking as confirmed based only on browser redirect.

Trusted confirmation SHALL come from a signed webhook.

---

# Requirement 7: Webhook Processing

The Go payment service SHALL send signed payment webhooks to RollFinders.

RollFinders SHALL expose a webhook endpoint:

```text
POST /api/payments/go/webhook
```

The webhook handler SHALL:

* Verify signature or shared secret
* Reject invalid webhook events
* Store provider event ids
* Process events idempotently
* Verify amount and currency
* Verify Course Id and occurrence metadata
* Update booking and payment state
* Store raw event reference for operations

IF a duplicate webhook is received

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

IF payment succeeds but the occurrence became full before webhook confirmation

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
* View webhook processing history
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

WHEN RollFinders receives trusted webhook confirmation

THEN RollFinders SHOULD send a booking confirmation email.

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

Example request:

```json
{
  "idempotencyKey": "course_cmq123_2026-06-08_1900_user_abc",
  "courseId": "cmq123",
  "academyId": "academy123",
  "occurrenceDate": "2026-06-08",
  "occurrenceStartTime": "19:00",
  "occurrenceEndTime": "20:30",
  "amountMinor": 1000,
  "currency": "GBP",
  "payerUserId": "user123",
  "payerEmail": "student@example.com",
  "successUrl": "https://rollfinders.com/payments/return?status=success",
  "cancelUrl": "https://rollfinders.com/payments/return?status=cancelled",
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

The Go payment service SHALL send signed webhook events.

Webhook events SHOULD include:

* Provider event id
* Event type
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
| Guest checkout | Allow payer email, link to user when logged in |
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

IF payment succeeds and RollFinders receives a valid webhook

THEN RollFinders marks the booking as confirmed.

IF the user returns before webhook confirmation

THEN RollFinders shows a pending state.

IF payment fails or is cancelled

THEN RollFinders does not confirm the booking and clearly states that no booking was confirmed.

IF duplicate webhooks are received

THEN RollFinders processes them idempotently.

IF amount, currency, Course Id, or occurrence metadata does not match

THEN RollFinders marks the payment for manual review.

IF an Academy Admin views payments

THEN they only see payments for their academy.

IF a Platform Admin views payments

THEN they can inspect all payment records and webhook processing history.

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
* Go webhook event contract
* Signature verification method
* Payment status model
* Capacity policy
* Guest checkout policy

## P0: Payment Data Model

Add RollFinders persistence for:

* Course booking
* Course payment
* Payment webhook event
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

## P0: Go Webhook Receiver

Build the signed webhook endpoint.

Support:

* Signature verification
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

Send confirmation emails after trusted payment success.

Reuse the existing reliable email infrastructure where possible.

## P2: Refund And Reconciliation Workflow

Expose refund status from Go webhooks.

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
