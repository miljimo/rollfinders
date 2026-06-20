# PRD: Generic Booking Service

## Overview

The Booking Service is a standalone microservice responsible for managing bookings across any bookable resource within the platform ecosystem.

The service must be generic and reusable for:

* Courses
* Course Sessions
* Events
* Hotel Rooms
* Appointments
* Consultations
* Rentals
* Future Bookable Resources

The service must not contain business-specific logic related to any particular domain.

---

# Goals

* Create and manage bookings.
* Track attendees/participants.
* Integrate with User Service.
* Integrate with Organisation Service.
* Integrate with Payment Service.
* Support attendance tracking.
* Support booking lifecycle management.
* Remain completely resource-agnostic.

---

# Out of Scope

The Booking Service MUST NOT:

* Store user personal information.
* Store organisation details.
* Store course details.
* Store payment transaction details.
* Manage resource availability.
* Manage schedules.
* Process payments.

These responsibilities belong to their respective services.

---

# Service Dependencies

## User Service

Source of truth for:

* User Profile
* User Contact Information
* Authentication
* Authorization

Booking Service stores only:

```text
user_id
```

---

## Organisation Service

Source of truth for:

* Organisations
* Organisation Membership
* Organisation Configuration

Booking Service stores only:

```text
organisation_id
```

---

## Payment Service

Source of truth for:

* Payments
* Refunds
* Transactions

Booking Service stores only:

```text
payment_id
```

---

# Core Concepts

## Bookable Resource

Any resource that can be reserved.

Examples:

```text
course
course_session
hotel_room
appointment_slot
consultation
event
rental
```

Represented as:

```text
bookable_type
bookable_id
bookable_instance_id
```

Example:

Course Session

bookable_type = course
bookable_id = course_id
bookable_instance_id = session_id

Hotel Room

bookable_type = hotel
bookable_id = hotel_id
bookable_instance_id = room_id

Appointment

bookable_type = appointment
bookable_id = service_id
bookable_instance_id = slot_id

````

---

# Database Schema

## bookings

```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY,

    organisation_id UUID NULL,

    customer_id UUID NOT NULL,

    booking_reference VARCHAR(80) UNIQUE NOT NULL,

    bookable_type VARCHAR(100) NOT NULL,
    bookable_id UUID NOT NULL,
    bookable_instance_id UUID NULL,

    status VARCHAR(40) NOT NULL,

    quantity INT NOT NULL DEFAULT 1,

    starts_at TIMESTAMP NULL,
    ends_at TIMESTAMP NULL,

    total_amount NUMERIC(12,2) DEFAULT 0,
    currency CHAR(3) DEFAULT 'GBP',

    payment_required BOOLEAN DEFAULT FALSE,
    payment_id UUID NULL,

    metadata JSONB NULL,

    booked_at TIMESTAMP NOT NULL,

    confirmed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    cancellation_reason TEXT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
````

---

## booking_participants

Tracks who is attending a booking.

```sql
CREATE TABLE booking_participants (
    id UUID PRIMARY KEY,

    booking_id UUID NOT NULL,

    user_id UUID NOT NULL,

    participant_role VARCHAR(50) NOT NULL,
    status VARCHAR(40) NOT NULL,

    checked_in_at TIMESTAMP NULL,
    attended_at TIMESTAMP NULL,

    metadata JSONB NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

Examples:

```text
participant_role

customer
attendee
instructor
host
staff
guest
```

---

## booking_status_history

Audit trail of booking lifecycle.

```sql
CREATE TABLE booking_status_history (
    id UUID PRIMARY KEY,

    booking_id UUID NOT NULL,

    old_status VARCHAR(40),
    new_status VARCHAR(40) NOT NULL,

    changed_by_user_id UUID NULL,

    reason TEXT NULL,

    created_at TIMESTAMP NOT NULL
);
```

---

# Booking Lifecycle

Supported statuses:

```text
pending
confirmed
cancelled
completed
no_show
failed
refunded
```

Flow:

```text
pending
   ↓
confirmed
   ↓
completed

pending
   ↓
cancelled

confirmed
   ↓
no_show

confirmed
   ↓
refunded
```

---

# Attendance Tracking

Participant statuses:

```text
booked
confirmed
checked_in
attended
no_show
cancelled
```

Examples:

Course:

```text
User books session
User checks in
User attends
```

Appointment:

```text
User books slot
User arrives
User attends
```

Event:

```text
User books ticket
User checks in
User attends
```

---

# API Endpoints

## Create Booking

```http
POST /bookings
```

Creates booking.

---

## Get Booking

```http
GET /bookings/{id}
```

Returns booking.

---

## Search Bookings

```http
GET /bookings
```

Filters:

```text
customer_id
organisation_id
status
bookable_type
bookable_id
```

---

## Cancel Booking

```http
POST /bookings/{id}/cancel
```

---

## Confirm Booking

```http
POST /bookings/{id}/confirm
```

---

## Complete Booking

```http
POST /bookings/{id}/complete
```

---

## Add Participant

```http
POST /bookings/{id}/participants
```

---

## Remove Participant

```http
DELETE /bookings/{id}/participants/{participant_id}
```

---

## Check-In Participant

```http
POST /bookings/{id}/participants/{participant_id}/check-in
```

---

# Events

The service must publish events.

## Booking Created

```json
{
  "booking_id": "",
  "customer_id": "",
  "bookable_type": ""
}
```

---

## Booking Confirmed

```json
{
  "booking_id": ""
}
```

---

## Booking Cancelled

```json
{
  "booking_id": ""
}
```

---

## Booking Completed

```json
{
  "booking_id": ""
}
```

---

## Participant Checked In

```json
{
  "booking_id": "",
  "participant_id": ""
}
```

---

# Non-Functional Requirements

## Technology

* Golang
* PostgreSQL
* Docker
* REST API
* OpenAPI Specification

## Architecture

* Stateless Service
* Horizontal Scaling
* Database Migration Support

## Security

* No Authentications : Internal services only.


## Performance

* API Response < 200ms
* Pagination Required
* Indexed Search Queries

---

# Success Criteria

* Supports any bookable resource.
* No dependency on course-specific logic.
* No duplicated user data.
* Tracks attendees accurately.
* Supports payment integration.
* Supports event-driven architecture.
* Can be reused across multiple products without schema changes.
