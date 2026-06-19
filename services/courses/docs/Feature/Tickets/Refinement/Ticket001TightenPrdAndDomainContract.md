# COURSES-SVC-001 Tighten PRD And Domain Contract

## Goal

Update the Courses service PRD so it matches the current RollFinders product reality and the established users/payments service conventions.

## Scope

* Replace unversioned API examples with `/v1` routes.
* Clarify `services/courses` as the service root.
* Clarify `compose.yml` naming.
* Define canonical vocabulary: course, activity, schedule, session, occurrence, location, history.
* Clarify that users, organisations, payments, bookings, attendance, auth, and authorization are external.
* Define how existing RollFinders `events` and `course_activities` map to the service contract.
* Document that internal API-key auth is v1; JWT/API Gateway trust is a future deployment mode.

## Acceptance Criteria

* `services/courses/docs/proposal.md` has no unversioned route examples.
* The PRD explicitly requires procedure-first SQL migrations.
* The PRD explicitly requires Open Mat compatibility and stable existing IDs.
* The PRD identifies all external identifiers and forbids cross-service foreign keys.
* A human can read the PRD and know what is v1 versus deferred.
