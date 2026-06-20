# Courses Service Architecture And Product Review

## Review Roles

* Architect: reviewed service boundaries, data ownership, API shape, migrations, RollFinders integration, and delivery risks.
* CEO / Product Owner: reviewed business goals, MVP value, rollout sequencing, admin impact, visitor impact, and ticket sizing.

## Sources Reviewed

* `services/courses/docs/proposal.md`
* `services/payments/docs/PaymentSystemMvpPrd.md`
* `services/payments/docs/architectures/ArchitectureReview.md`
* `services/payments/docs/Feature/Tickets/Refinement/Readme.md`
* `services/payments/Readme.md`
* `services/users/docs/Products/Reviewing/UserAndAuthGoServicePortPrd.md`
* `services/payments/migrations/001_core_schema.sql`
* `services/users/migrations/001_core_schema.sql`
* `services/payments/compose.yml`
* `services/users/compose.yml`
* `compose.yml`
* `scripts/cicd/run-service-sql-migrations.sh`
* `services/courses/docs/Products/Reviewing/CourseCreationAndManagementPrd.md`
* `services/courses/docs/Tickets/README.md`
* `prisma/schema.prisma`
* `src/lib/courses.ts`

## Product Goal

RollFinders should move from Open Mat discovery into a broader training marketplace where academies can publish open mats, classes, seminars, workshops, private lessons, competitions, and structured event outlines.

The standalone Courses service should make that domain reusable by RollFinders and future applications without taking ownership of users, organisations, payments, bookings, attendance, authentication, or authorization.

## Architecture Direction

Build the service as a generic Go service under `services/courses`, following the established users and payments service patterns.

The implementation should be compatibility-first. The current RollFinders app already models courses through the public `events` table, `course_activities`, `CourseType`, recurrence expansion, `/open-mats`, `/courses`, stable `/e/{id}` URIs, QR codes, analytics, and payment hooks. The standalone service must treat this as an ownership migration, not a clean greenfield replacement.

## Service Boundary

The Courses service owns:

* Course types and formats.
* Course definitions.
* Course activity blocks.
* Course recurrence schedules.
* Generated course sessions / occurrences.
* Session locations.
* Session cancellation and status history.
* Course-domain outbox events.

The Courses service does not own:

* Users, credentials, roles, sessions, or MFA.
* Organisations or academies as canonical entities.
* Payments, refunds, checkouts, or provider webhooks.
* Bookings, attendance, waitlists, or enrollment.
* Browser-facing authentication.
* Authorization policy decisions.
* Analytics aggregation.

Use external identifiers for `organisation_id`, `academy_id`, `created_by_user_id`, and future instructor references. Do not add cross-schema foreign keys into RollFinders public tables or the users/payments schemas.

## Proposal Corrections

The existing PRD is directionally right, but it needs these corrections before implementation:

* Use versioned routes such as `/v1/course-types`, `/v1/courses`, and `/v1/sessions`.
* Use `services/courses` as the service directory.
* Use `compose.yml`, matching users and payments.
* Start with internal API-key authentication and actor context from the RollFinders BFF. JWT trust via API Gateway can be a later deployment mode.
* Use a service-owned `courses` PostgreSQL schema.
* Use the service migration layout: `schema/`, `types/`, `tables/`, `functions/`, `procedures/`, and optional `backfills/`.
* Put business writes in stored procedures.
* Put stable reads and list projections in SQL functions.
* Include a backfill and verification plan from public `events` and `course_activities`.

## Data Ownership

Recommended service tables:

* `courses.course_types`
* `courses.courses`
* `courses.course_activities`
* `courses.course_schedules`
* `courses.course_sessions`
* `courses.session_locations`
* `courses.session_status_history`
* `courses.idempotency_keys`
* `courses.outbox_events`

Preserve current RollFinders IDs where possible. Existing public URLs, QR codes, analytics, payment references, and admin links depend on stable event IDs. A hard cutover that creates unrelated course IDs would risk breaking production behavior.

Course type modelling should support both platform defaults and organisation-defined types. Use lookup rows for custom types. Keep enum usage narrow for lifecycle state only.

## API Standards

The service should expose:

* `GET /healthz`
* `GET /readyz`
* `/v1/...` JSON APIs
* API-key authentication for internal callers
* request IDs
* structured logging
* stable JSON error shape
* OpenAPI 3 contract under `services/courses/docs/api/OpenApi.yaml`
* API contract tests against OpenAPI

## Migration Standards

Mirror the payment and user service SQL pattern:

```text
services/courses/migrations/001_coreSchema.sql
services/courses/migrations/schema/
services/courses/migrations/types/
services/courses/migrations/tables/
services/courses/migrations/functions/
services/courses/migrations/procedures/
services/courses/migrations/backfills/
```

Rules:

* Create all service tables in the `courses` schema.
* Keep external IDs as values, without cross-service foreign keys.
* Implement writes through stored procedures.
* Implement read projections through SQL functions.
* Add schema migration tracking.
* Add backfills from public `events` and `course_activities`.
* Add verification SQL for row counts, preserved IDs, Open Mat compatibility, recurrence parity, and activity mapping.
* Update `scripts/cicd/run-service-sql-migrations.sh` once Courses migrations exist.

## RollFinders Integration

RollFinders remains the browser-facing BFF:

* Existing `/open-mats` and `/open-mats/[id]` routes stay stable.
* Existing admin routes stay stable while delegating server-side to Courses when ready.
* New `/courses` pages consume service-backed data after the compatibility adapter is ready.
* RollFinders passes actor context and internal API key to the Courses service.
* The Courses service does not validate academy existence directly.
* Payments reference course occurrences through the generic payment resource contract.
* Bookings and attendance remain future services that reference `course_session_id` or `course_occurrence_id`.

## Product MVP

MVP should include:

* Course type management.
* Course CRUD.
* Activity blocks / Event Outline.
* Schedules and recurrence scope agreed before code.
* Session generation or a clearly documented occurrence-resolution strategy.
* Session cancellation.
* Service migrations and backfills.
* OpenAPI contract.
* RollFinders compatibility adapter.
* Open Mat regression coverage.

MVP should exclude:

* Bookings.
* Attendance.
* Waitlists.
* Payment provider logic.
* Card handling.
* Full academy/org ownership.
* Full auth/authorization service logic.
* Media galleries.
* Complex per-occurrence exception calendars.

## Delivery Risks

* A hard cutover from `events` to `courses` can break URLs, analytics, recurrence, admin screens, and payment references.
* Session generation can create duplicates without uniqueness constraints and idempotent procedures.
* Recurrence scope is not final enough for blind implementation.
* OpenAPI drift is likely without early contract tests.
* Pricing fields can drift into payment ownership if not kept display-oriented.
* Moving public reads before compatibility projections exist can break Prisma-backed pages.
* JWT/API Gateway assumptions do not match current local compose and internal service deployment.

## Rollout Sequence

1. Tighten the service PRD and OpenAPI contract.
2. Bootstrap the Courses Go service using users/payments patterns.
3. Add procedure-first SQL migrations and schema ownership.
4. Backfill existing RollFinders course/open-mat data with verification SQL.
5. Implement service reads/writes and domain rules.
6. Add RollFinders service client behind existing public/admin routes.
7. Move admin writes behind the service.
8. Move public discovery/detail reads behind the service.
9. Verify Open Mat parity, stable IDs, QR links, analytics, and payment references.
10. Decide payment/booking integration after occurrence identity is stable.

## Decision Points

* Should service course IDs equal current public `events.id`, or should `events.id` become `external_reference`?
* Should MVP generate sessions physically or keep app-side recurrence expansion until service rollout stabilizes?
* Which recurrence rules are truly v1: weekly, fortnightly, monthly, daily?
* Which pricing fields are display metadata versus payment-owned state?
* How should organisation-defined course types be moderated and displayed across applications?
