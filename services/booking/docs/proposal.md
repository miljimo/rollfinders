# PRD: Booking Service

Product: RollFinders

Service: Booking Service

Status: Reviewing

Last updated: 2026-06-21

---

## Overview

The Booking Service is a standalone internal microservice responsible for booking lifecycle management across bookable resources.

The service must use a generic internal model, but the first RollFinders MVP must focus on one concrete flow:

```text
RollFinders course/open-mat occurrence bookings
```

This means genericity is a design constraint, not the first product milestone. The MVP should solve durable bookings, attendee tracking, paid-booking linkage, and academy/admin visibility for RollFinders events without turning the first release into a universal booking platform.

---

## Product Decision

Create `services/booking` as a separate service.

The service will be generic enough to support future resource types, but the first supported `bookable_type` is:

```text
course_occurrence
```

Future resource types may include:

* seminar occurrence
* appointment slot
* rental slot
* hotel room night
* consultation
* membership session

Those future cases must not drive MVP complexity.

---

## Goals

* Create durable bookings for RollFinders course/open-mat occurrences.
* Replace client-only free booking state with persisted bookings.
* Link paid checkout flows to a durable booking record.
* Track participants and attendance.
* Support booking lifecycle management.
* Prevent duplicate active bookings for the same customer and bookable instance.
* Provide booking visibility to academy admins and platform admins.
* Remain resource-agnostic internally by storing opaque resource identifiers.
* Integrate cleanly with Course Service, User Service, Organisation/Academy data, and Payment Service.

---

## Non-Goals

The Booking Service must not:

* Store user profile or contact details.
* Store organisation or academy profile details.
* Store course, event, schedule, recurrence, location, or price definitions.
* Own resource availability rules or generated course schedules.
* Process payments or call Stripe/PayPal directly.
* Store payment provider transaction details.
* Make browser-facing authentication decisions.
* Replace RollFinders public pages or admin UI.

---

## Service Ownership

### Booking Service Owns

* Bookings.
* Booking references.
* Booking participants.
* Booking status lifecycle.
* Attendance/check-in state.
* Booking status history.
* Idempotency for booking mutations.
* Booking outbox events.

### Course Service Owns

* Course definitions.
* Course types.
* Course activities.
* Schedules and recurrence.
* Materialized sessions or generated occurrence rules.
* Course/session capacity definitions.
* Course/session price definitions.

### Payment Service Owns

* Checkout orchestration.
* Payment status.
* Provider payment IDs.
* Refund records.
* Provider webhook ingestion.
* Settlement/allocation history.

### User Service Owns

* User identity.
* User profile.
* User contact information.
* Authentication.

### Organisation/Academy Domain Owns

* Academy/organisation profile.
* Claim and verification status.
* Academy membership/admin authorization.

---

## Existing RollFinders Pattern

Current RollFinders behavior:

* Course/open-mat public pages derive occurrences from Course Service data.
* Free booking is currently UI-only and not durable.
* Paid/donation checkout currently calls Payment Service directly from the course page flow.
* Payment checkout uses `resource_type=course_occurrence` with course occurrence metadata.
* Payment Service is the source of truth for payment history.

Required future behavior:

* Free booking creates a confirmed Booking Service record.
* Paid booking creates a pending Booking Service record before checkout.
* Payment checkout references the booking, not only the course occurrence.
* Payment success confirms the booking through a trusted server-side flow.

---

## MVP Scope

### P0

* Booking service skeleton, config, health, internal auth, Docker, compose integration.
* Core schema for bookings, participants, status history, idempotency, and outbox.
* Create booking.
* Get booking.
* List/search bookings.
* Cancel booking.
* Confirm booking.
* Attach/link payment ID to booking.
* Prevent duplicate active bookings for the same customer and bookable instance.
* RollFinders Next.js booking client.
* Free course/open-mat occurrence booking integration.
* Paid course/open-mat occurrence booking-first checkout integration.
* Tests for create, confirm, cancel, duplicate booking, and payment failure paths.

### P1

* Participant check-in.
* Attendance/no-show tracking.
* Academy admin booking list.
* Platform admin booking search.
* Outbox event consumers or delivery jobs.
* Metrics and operational dashboards.
* User/org validation adapters.

### P2

* Generic resource-type onboarding guidance.
* Refund-aware booking lifecycle.
* Booking completion automation.
* Multi-participant group bookings.
* Waitlists.
* Capacity reservation protocol with Course Service.

---

## Implementation Status

### Done

The current codebase has implemented:

* Standalone `services/booking` Go API service.
* Local compose integration and service health/readiness endpoints.
* Database-first migration structure with `schema`, `types`, `tables`, `functions`, and `procedures`.
* Core booking schema for bookings, participants, status history, idempotency keys, and outbox events.
* CamelCase booking SQL function/procedure names and matching routine filenames.
* Go `dataaccess` package using package-level functions rather than a struct store.
* Stored-function/stored-procedure data access for create, get, list, cancel, confirm, complete, payment link, participant creation/listing, and attendance record flows.
* HTTP endpoints for core booking lifecycle and participant attendance.
* Booking dashboard entry in the RollFinders admin service navigator.
* Static contract tests for Booking Service schema and service API structure.

### Partial

The current implementation is not yet a full RollFinders booking replacement:

* Booking Service endpoints exist, but the public free-booking UI is not fully switched from client-side booking state to durable Booking Service records.
* Paid course/open-mat checkout still starts primarily from the payment checkout flow; booking-first checkout linkage remains a planned integration step.
* Admin booking dashboard navigation exists, but production-ready search/filter/detail workflows need further integration.
* Payment confirmation can be linked conceptually, but trusted payment-status-to-booking confirmation is not fully wired through callbacks/webhooks.
* Participant and attendance endpoints exist, but public/admin UI coverage is still incomplete.

### Not Done

The following requirements remain to be implemented:

* RollFinders Next.js Booking Service client functions for all booking endpoints.
* Free event booking persistence through Booking Service from public detail pages.
* Paid booking creation before checkout and payment ID linkage before redirect.
* Trusted callback/webhook flow that confirms bookings after successful payment.
* Capacity reservation and duplicate active booking enforcement validated against live PostgreSQL.
* Academy admin and platform admin booking dashboard tables with search/filter/detail actions.
* Refund-aware booking state transitions.
* Outbox event consumers or delivery jobs.
* Booking service metrics and operational dashboards.
* Full API integration tests against a running Booking Service.

---

## Core Concepts

### Bookable Resource

A bookable resource is the external thing being booked.

The Booking Service stores resource references as opaque fields:

```text
bookable_type
bookable_id
bookable_instance_id
```

For RollFinders MVP:

```text
bookable_type = course_occurrence
bookable_id = course_id
bookable_instance_id = occurrence_key or course_session_id
```

The `bookable_instance_id` must be stable for the occurrence being booked. Until Course Service fully materializes sessions, RollFinders may use an occurrence key derived from:

```text
course_id + occurrence_date + start_time
```

### Booking

A booking represents a customer's reservation for a bookable resource instance.

### Participant

A participant represents a person attached to a booking.

For MVP, participant roles should be limited to:

```text
customer
attendee
guest
```

Broader roles such as instructor, host, and staff can be added later if needed.

### Payment Link

A payment link is the association between a booking and a Payment Service payment.

The Booking Service stores only:

```text
payment_id
payment_required
```

It does not store provider transaction details.

---

## Booking Lifecycle

Supported booking statuses:

```text
pending_payment
confirmed
cancelled
completed
no_show
manual_review
failed
```

Allowed MVP transitions:

```text
pending_payment -> confirmed
pending_payment -> cancelled
pending_payment -> failed
confirmed -> cancelled
confirmed -> completed
confirmed -> no_show
confirmed -> manual_review
manual_review -> confirmed
manual_review -> cancelled
```

Rules:

* Free bookings should be created as `confirmed`.
* Paid bookings should be created as `pending_payment`.
* Browser redirects must not directly confirm bookings.
* Paid bookings must be confirmed only by trusted server-side payment status handling.
* Pending paid bookings should not consume final capacity in MVP unless a future reservation protocol is added.

---

## Payment Flow

### Free Booking Flow

1. User clicks `Book`.
2. RollFinders server validates course occurrence, academy trust, and bookability.
3. RollFinders calls Booking Service:

```text
POST /v1/bookings
payment_required=false
status=confirmed
```

4. Booking Service creates booking and participant.
5. RollFinders UI shows confirmation.

### Paid Booking Flow

1. User clicks `Book`, `Donate`, or paid checkout action.
2. RollFinders server validates course occurrence, price, academy trust, and bookability.
3. RollFinders creates a Booking Service record:

```text
status=pending_payment
payment_required=true
```

4. RollFinders creates Payment Service checkout with:

```text
resource_type = booking
resource_id = booking.id
```

5. RollFinders links the returned `payment_id` to the booking:

```text
POST /v1/bookings/{id}/payment-link
```

6. Payment Service handles Stripe or another provider.
7. Payment Service records canonical status.
8. RollFinders trusted callback/integration confirms or fails the booking.

### Payment Confirmation Rule

Only trusted server-side components may call:

```text
POST /v1/bookings/{id}/confirm
```

The public browser must never be treated as proof of payment.

---

## Capacity And Availability

The Booking Service must not own course availability, recurrence, or schedule generation.

For MVP:

* RollFinders validates course occurrence and academy trust before calling Booking Service.
* Course Service remains responsible for capacity definitions.
* Booking Service prevents duplicate active bookings for the same customer and bookable instance.
* Booking Service exposes booking counts by bookable instance so RollFinders can calculate remaining spaces.

Future capacity protocol:

* Course Service should expose an atomic bookability/reservation endpoint, or
* Booking Service and Course Service should coordinate through a reservation event protocol.

This is explicitly P2 unless overselling appears in production testing.

---

## Guest Booking

Guest paid checkout exists in the current payment flow.

The Booking Service must support:

```text
customer_id nullable
guest_reference nullable
```

Rules:

* Registered users should use `customer_id`.
* Guests should use a generated `guest_reference`.
* Booking Service must not store guest email as profile data.
* If lookup by guest email is needed, RollFinders should store a hash or external contact reference in metadata, not raw long-term profile data.

---

## Data Model

Use `text` identifiers unless a platform-wide UUID migration is approved.

Reason:

* Existing RollFinders IDs are text/cuid-style.
* Payment Service and Course Service already use text IDs.
* UUID-only Booking IDs would add unnecessary integration friction.

### bookings

```sql
CREATE TABLE booking.bookings (
    id TEXT PRIMARY KEY,
    organisation_id TEXT NULL,
    customer_id TEXT NULL,
    guest_reference TEXT NULL,
    booking_reference TEXT UNIQUE NOT NULL,
    bookable_type TEXT NOT NULL,
    bookable_id TEXT NOT NULL,
    bookable_instance_id TEXT NULL,
    status TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    starts_at TIMESTAMPTZ NULL,
    ends_at TIMESTAMPTZ NULL,
    total_amount_minor INTEGER NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'GBP',
    payment_required BOOLEAN NOT NULL DEFAULT FALSE,
    payment_id TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    booked_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ NULL,
    cancelled_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

Required indexes:

```sql
CREATE INDEX bookings_customer_created_idx
    ON booking.bookings (customer_id, created_at DESC);

CREATE INDEX bookings_organisation_created_idx
    ON booking.bookings (organisation_id, created_at DESC);

CREATE INDEX bookings_bookable_idx
    ON booking.bookings (bookable_type, bookable_id, bookable_instance_id);

CREATE INDEX bookings_payment_idx
    ON booking.bookings (payment_id);

CREATE INDEX bookings_status_idx
    ON booking.bookings (status);
```

Duplicate active booking protection:

```sql
CREATE UNIQUE INDEX bookings_unique_active_customer_instance_idx
    ON booking.bookings (customer_id, bookable_type, bookable_id, bookable_instance_id)
    WHERE customer_id IS NOT NULL
      AND status IN ('pending_payment', 'confirmed', 'manual_review');
```

### booking_participants

```sql
CREATE TABLE booking.booking_participants (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES booking.bookings(id),
    user_id TEXT NULL,
    guest_reference TEXT NULL,
    participant_role TEXT NOT NULL,
    status TEXT NOT NULL,
    checked_in_at TIMESTAMPTZ NULL,
    attended_at TIMESTAMPTZ NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

### booking_status_history

```sql
CREATE TABLE booking.booking_status_history (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES booking.bookings(id),
    old_status TEXT NULL,
    new_status TEXT NOT NULL,
    changed_by_user_id TEXT NULL,
    reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
```

### idempotency_keys

```sql
CREATE TABLE booking.idempotency_keys (
    key TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
```

### outbox_events

```sql
CREATE TABLE booking.outbox_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ NULL
);
```

---

## Database Structure Requirements

Booking Service must follow the database-first structure used for service database work:

```text
services/booking/migrations/
  schema/
  tables/
  types/
  functions/
  procedures/
```

Requirements:

* One function or procedure per file.
* Function and procedure names must be camelCase.
* File names for functions/procedures must match the function/procedure name.
* Go code must use the internal `databases` wrapper.
* Data access package must be `dataaccess`.
* Database mutations and reads must go through stored functions/procedures.

---

## API Contract

All endpoints are internal and versioned under `/v1`.

All protected endpoints require internal bearer/API-key auth.

All mutation endpoints must support:

```http
Idempotency-Key: <stable-key>
```

### Create Booking

```http
POST /v1/bookings
```

Creates a booking.

Required fields:

```json
{
  "bookable_type": "course_occurrence",
  "bookable_id": "course_id",
  "bookable_instance_id": "course_id:2026-07-03:18:00",
  "organisation_id": "academy_id",
  "customer_id": "user_id",
  "guest_reference": null,
  "quantity": 1,
  "payment_required": false,
  "starts_at": "2026-07-03T18:00:00Z",
  "ends_at": "2026-07-03T22:00:00Z",
  "total_amount_minor": 0,
  "currency": "GBP",
  "metadata": {
    "source": "rollfinders",
    "course_title": "Open Mat"
  }
}
```

Behavior:

* If `payment_required=false`, create as `confirmed`.
* If `payment_required=true`, create as `pending_payment`.
* Create default participant for the customer/guest.
* Write status history.
* Write outbox event.

### Get Booking

```http
GET /v1/bookings/{id}
```

### List Bookings

```http
GET /v1/bookings
```

Filters:

```text
customer_id
organisation_id
status
bookable_type
bookable_id
bookable_instance_id
payment_id
limit
cursor
```

### Link Payment

```http
POST /v1/bookings/{id}/payment-link
```

Request:

```json
{
  "payment_id": "pay_123"
}
```

Rules:

* Booking must be `pending_payment`.
* Booking must have `payment_required=true`.
* Existing different `payment_id` must return conflict.

### Confirm Booking

```http
POST /v1/bookings/{id}/confirm
```

Rules:

* Internal/trusted caller only.
* Valid from `pending_payment` or `manual_review`.
* If `payment_required=true`, caller must provide or have already linked a valid `payment_id`.

### Cancel Booking

```http
POST /v1/bookings/{id}/cancel
```

Request:

```json
{
  "reason": "customer_requested"
}
```

### Complete Booking

```http
POST /v1/bookings/{id}/complete
```

P1/P2 unless needed for admin workflows.

### Add Participant

```http
POST /v1/bookings/{id}/participants
```

P1 for MVP unless group bookings are required.

### Check In Participant

```http
POST /v1/bookings/{id}/participants/{participant_id}/check-in
```

P1.

---

## Events

Booking Service must publish outbox records for:

```text
booking.created
booking.confirmed
booking.cancelled
booking.completed
booking.failed
booking.manual_review
participant.checked_in
participant.no_show
```

Outbox delivery may be P1, but outbox records must be written from P0 lifecycle mutations.

---

## RollFinders Integration Requirements

### Next.js App

Add a server-only booking client:

```text
src/lib/bookings.ts
```

Environment variables:

```text
BOOKING_PUBLIC_BASE_URL
Service-to-service authentication is handled by the orchestration layer; no shared booking service key is required.
```

### Free Booking UI

Replace client-only `FreeEventBookingButton` state with a server action that calls Booking Service.

### Paid Booking UI

Change `startCourseCheckout` flow:

Current:

```text
Course page -> Payment Service checkout
```

Target:

```text
Course page -> Booking Service pending booking -> Payment Service checkout -> Booking payment-link
```

Payment checkout should use:

```text
resource_type = booking
resource_id = booking.id
```

Course occurrence IDs and labels should be kept in Payment Service metadata for reporting and dashboard links.

### Payment Status

RollFinders payment status handling must confirm or fail bookings through Booking Service after trusted payment status is known.

---

## Non-Functional Requirements

### Technology

* Go.
* PostgreSQL 16+.
* Docker.
* REST JSON API.
* OpenAPI 3.

### Architecture

* Stateless service.
* Internal service auth.
* Health and readiness endpoints.
* Pagination for list endpoints.
* Idempotency for mutations.
* Database-first data access.
* Outbox event records.
* Horizontal scaling safe.

### Security

* Internal endpoints require bearer/API-key auth.
* Service must not store raw user profile/contact information.
* Service must not trust browser redirects for payment confirmation.
* Admin permissions remain in RollFinders/User/Organisation domains.

### Performance

* Common API responses should target under 200ms at MVP scale.
* Search/list endpoints must be indexed.
* Booking create/confirm/cancel must be transactionally safe.

---

## Risks

### Over-Generic MVP

Building for hotels, rentals, appointments, and consultations immediately will delay the RollFinders booking need. Keep MVP focused on `course_occurrence`.

### Capacity Split Brain

Course Service owns capacity definitions while Booking Service owns consumed bookings. MVP must be explicit about this composition and avoid hidden capacity logic in Booking Service.

### Payment Race Conditions

Payment success must be processed by trusted server-side code. Browser callback pages must not confirm bookings by themselves.

### Duplicate Bookings

Idempotency and active-booking uniqueness are required from P0.

### Guest Identity

Guest checkout requires nullable `customer_id` and `guest_reference`; do not force fake user records.

### ID Strategy

Use text IDs to match current RollFinders/Course/Payment service IDs.

---

## Implementation Tickets

### Ticket 001 - Booking Service Skeleton

Branch: `feature/booking-service-skeleton`

Scope:

* Add `services/booking` Go service.
* Add config, health endpoints, internal auth middleware.
* Add Dockerfile and compose integration.

### Ticket 002 - Booking OpenAPI Contract

Branch: `feature/booking-openapi-contract`

Scope:

* Define `/v1/bookings` contract.
* Include idempotency, pagination, error envelope, and status model.

### Ticket 003 - Booking Database Schema

Branch: `feature/booking-core-schema`

Scope:

* Add schema/tables/types/functions/procedures migration structure.
* Add bookings, participants, status history, idempotency, outbox.

### Ticket 004 - Booking State Machine

Branch: `feature/booking-state-machine`

Scope:

* Implement allowed status transitions.
* Add domain tests for lifecycle rules.

### Ticket 005 - Booking Data Access

Branch: `feature/booking-dataaccess-functions`

Scope:

* Implement dataaccess package.
* Use database wrapper and stored functions/procedures.

### Ticket 006 - Core Booking Endpoints

Branch: `feature/booking-core-endpoints`

Scope:

* Create/get/list/cancel/confirm endpoints.
* Add idempotency behavior.

### Ticket 007 - Payment Link Endpoint

Branch: `feature/booking-payment-link`

Scope:

* Attach Payment Service `payment_id` to pending bookings.
* Enforce conflict rules.

### Ticket 008 - Participant Attendance Endpoints

Branch: `feature/booking-participant-attendance`

Scope:

* Add participant list/add and check-in endpoints.
* Add attendance status transitions.

### Ticket 009 - RollFinders Booking Client

Branch: `feature/rollfinders-booking-client`

Scope:

* Add `src/lib/bookings.ts`.
* Add booking service env vars.
* Add service unavailable handling.

### Ticket 010 - Free Booking Integration

Branch: `feature/free-event-booking-service`

Scope:

* Replace client-only free booking state with Booking Service call.
* Show confirmed booking feedback.

### Ticket 011 - Paid Booking Checkout Integration

Branch: `feature/paid-booking-checkout-flow`

Scope:

* Create pending booking before Payment Service checkout.
* Use `resource_type=booking`.
* Link returned payment ID to booking.

### Ticket 012 - Payment Status Booking Confirmation

Branch: `feature/payment-status-booking-confirmation`

Scope:

* Confirm/fail bookings from trusted payment status flow.
* Add tests for successful, failed, and cancelled payments.

### Ticket 013 - Admin Booking Views

Branch: `feature/admin-booking-dashboard`

Scope:

* Show bookings per academy/course occurrence.
* Add attendee/check-in status for academy admins.

### Ticket 014 - Booking Regression Tests

Branch: `feature/booking-regression-suite`

Scope:

* Add service tests for idempotency, duplicates, lifecycle, and payment linking.
* Add RollFinders integration tests for free and paid booking flows.

---

## Success Criteria

* Free course/open-mat bookings persist and are visible to admins.
* Paid bookings create a pending booking before checkout.
* Successful payment confirms the booking through trusted server-side flow.
* Failed/cancelled payment does not confirm the booking.
* Duplicate active bookings are blocked.
* Booking Service stores only opaque external IDs and no user/course/payment profile data.
* Booking Service can later support new resource types without schema redesign.
