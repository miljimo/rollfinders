# PRD: Generic Course Service Data Ownership

Status: Ready For Review

Priority: Critical

Last updated: 2026-06-19

Product: RollFinders and Generic Courses Service

---

# Purpose

Move all course and event information out of RollFinders-owned public tables and into the generic Courses service.

The final state is:

* The Courses service is the system of record for courses, events, activities, schedules, sessions, occurrence state, and course/event public display data.
* RollFinders stores only external identifiers and RollFinders-specific relationships that are not course data.
* RollFinders retrieves course/event information from the Courses service by ID.
* RollFinders must not duplicate course/event details in its public schema.

---

# Problem

RollFinders historically stored course and open mat data in public tables such as:

```text
public.events
public.course_activities
```

This creates duplicate ownership now that a generic Courses service exists.

Keeping the same data in RollFinders and the Courses service causes:

* unclear ownership,
* drift between duplicated rows,
* foreign key coupling,
* harder deployments,
* service reuse problems for other applications,
* fragile migrations,
* unclear payment and analytics references.

---

# Product Decision

Course and event data must be owned by the generic Courses service.

RollFinders must only store IDs and local relationships.

RollFinders may store:

* `course_id`
* `course_session_id`
* `course_occurrence_id`
* `academy_id` assignment relationships
* payment references to course IDs or occurrence IDs
* analytics references to course IDs
* user-to-academy relationships
* RollFinders-specific preferences, permissions, and UI state

RollFinders must not store:

* course title,
* event title,
* description,
* activity outline,
* course type labels,
* event date,
* start time,
* end time,
* recurrence rules,
* capacity,
* pricing display fields,
* location name,
* address override,
* instructor/contact details,
* active/inactive course state.

Those fields belong to the Courses service.

---

# End State Architecture

```text
RollFinders Web App
      |
      | course_id / session_id only
      v
Courses Service
      |
      | owns course/event data
      v
courses schema
```

RollFinders remains the browser-facing application and marketplace experience.

The Courses service owns the course/event domain.

---

# Service Ownership

## Courses Service Owns

* Course types
* Courses
* Course activities / event outline
* Course schedules
* Course sessions
* Course occurrence identity
* Course locations
* Course recurrence rules
* Course lifecycle state
* Course display metadata
* Course public integration metadata

## RollFinders Owns

* Public marketplace pages
* Academy profiles
* Academy/user relationships
* Authentication session handling through the User service
* Authorization decisions through the relevant authz/domain checks
* Payment UI and payment references
* Analytics UI and analytics references
* Course ID references needed by RollFinders workflows

## RollFinders Must Not Own

RollFinders must not create new physical public tables that duplicate Courses service data.

Compatibility views are allowed only as a temporary migration bridge.

---

# Functional Requirements

## CRS-OWN-001 Backfill Existing Course Data

All existing RollFinders course/open-mat rows must be migrated into the Courses service.

Required sources:

```text
public.events
public.course_activities
```

Required targets:

```text
courses.courses
courses.course_activities
courses.course_schedules
courses.course_sessions
courses.session_locations
```

Existing IDs should be preserved where they are already public URLs, payment references, QR codes, or analytics identifiers.

---

## CRS-OWN-002 Remove Public Course Tables

RollFinders public schema must not contain physical course/event tables after migration.

The following must not exist as public tables:

```text
public.events
public.course_activities
```

Temporary compatibility views may exist during rollout:

```text
public.events
public.course_activities
```

These views must read/write through the Courses service schema or be removed once RollFinders reads directly from the Courses service.

---

## CRS-OWN-003 RollFinders Uses Course IDs Only

RollFinders database records may reference courses by ID.

Example:

```text
course_id text
course_session_id text
course_occurrence_id text
```

RollFinders must fetch course/event details from the Courses service when rendering:

* public course pages,
* open mat pages,
* academy upcoming courses,
* dashboard course tables,
* event dialogs,
* payment status pages,
* QR/integration URI redirects.

---

## CRS-OWN-004 Course Reads Go Through Service APIs

RollFinders must use Courses service APIs for course/event reads.

Required read capabilities:

```http
GET /v1/courses/{id}
GET /v1/courses
GET /v1/courses/{id}/activities
GET /v1/sessions/{id}
GET /v1/occurrences
GET /v1/occurrences/{id}
```

The API response must include enough data for existing RollFinders pages without querying duplicated public course tables.

---

## CRS-OWN-005 Course Writes Go Through Service APIs

RollFinders must use Courses service APIs for course/event writes.

Required write capabilities:

```http
POST /v1/courses
PUT /v1/courses/{id}
DELETE /v1/courses/{id}
POST /v1/courses/{id}/activities
PUT /v1/activities/{id}
DELETE /v1/activities/{id}
POST /v1/courses/{id}/schedules
PUT /v1/schedules/{id}
POST /v1/sessions/{id}/cancel
```

Writes must execute Courses service stored procedures.

RollFinders must not write course/event details directly into its public schema.

---

## CRS-OWN-006 Preserve Existing Public URLs

Existing public IDs and URLs must continue working:

```text
/open-mats/{id}
/courses/{id}
/e/{id}
/api/events/{id}/qrcode
```

If a route receives an old event ID, the Courses service must resolve it as the canonical course or occurrence ID.

---

## CRS-OWN-007 Preserve Payments

Payment records must reference Courses service identifiers.

Payment service resources should use generic resource IDs:

```text
course_id
course_occurrence_id
course_session_id
```

RollFinders must not require duplicated course rows to render payment status or payment dashboards.

---

## CRS-OWN-008 Preserve Analytics

Analytics records may keep course IDs as references.

Analytics must not depend on public course tables for course details.

Analytics reports that need course labels must query the Courses service or use service-backed projections.

---

## CRS-OWN-009 No Cross-Service Foreign Keys

RollFinders must not create foreign keys into Courses service tables.

Courses service must not create foreign keys into RollFinders public tables.

References are external IDs.

---

## CRS-OWN-010 Compatibility Bridge Is Temporary

Compatibility views may exist only to avoid breaking current Prisma-backed pages during migration.

They must be treated as a bridge, not the final architecture.

The final migration must remove RollFinders read/write dependencies on:

```text
Prisma Event model
Prisma CourseActivity model
public.events view
public.course_activities view
```

---

# Non-Functional Requirements

## Procedure-First SQL

All Courses service business writes must use stored procedures.

All stable read projections must use SQL functions.

Inline SQL in service handlers is not allowed for business logic.

---

## Deployment Safety

Migration must be safe for production.

Required order:

1. Deploy Courses service schema and APIs.
2. Backfill RollFinders data into Courses service.
3. Verify counts and ID preservation.
4. Enable RollFinders read-through from Courses service.
5. Enable RollFinders write-through to Courses service.
6. Remove physical public course tables.
7. Remove compatibility views after RollFinders has no dependency on them.

Deployments must not put `rollfinders.com` offline.

---

## Idempotency

Backfills and migrations must be idempotent.

Repeated deployments must not duplicate courses, activities, schedules, sessions, or locations.

---

# Data Migration Requirements

## Required Verification

Before and after migration, verify:

* total course/open-mat count,
* total activity count,
* ID preservation,
* active/inactive state,
* recurrence fields,
* pricing fields,
* location fields,
* QR code route resolution,
* payment record references,
* analytics references,
* academy upcoming courses.

## Required Rollback

Rollback plan must include:

* service data snapshot,
* public view recreation,
* RollFinders read fallback,
* deployment rollback steps,
* validation queries.

---

# Acceptance Criteria

* Existing RollFinders course/open-mat data is migrated to `courses` schema.
* `public.events` and `public.course_activities` are no longer physical tables.
* RollFinders stores only course/session/occurrence IDs.
* RollFinders public course pages render from Courses service data.
* RollFinders admin course forms write to Courses service.
* Payments still resolve course/event context.
* Analytics still record and report course references.
* Existing public URLs still work.
* Existing QR code URLs still work.
* Existing dashboard course/event workflows still work.
* No course/event business logic is implemented with inline SQL in Go handlers.
* Local Docker migration is idempotent.
* Production deployment plan includes zero-downtime behavior.

---

# Out Of Scope

* Bookings service.
* Attendance service.
* Waitlists.
* Payment provider implementation.
* User and auth ownership.
* Academy canonical ownership.
* Public marketplace redesign.

---

# Open Questions

* Should `course_session_id` become mandatory for all paid occurrences?
* Should recurring occurrences be physically generated or resolved dynamically by the Courses service?
* Should RollFinders remove Prisma `Event` and `CourseActivity` models immediately after service read-through, or keep them as ignored compatibility models for one release?
* Should course detail labels be cached in RollFinders for performance, or always read live from the Courses service?
