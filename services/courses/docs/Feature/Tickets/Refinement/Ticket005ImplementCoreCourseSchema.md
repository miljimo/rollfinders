# COURSES-SVC-005 Implement Core Course Schema

## Goal

Create the core service-owned tables, types, indexes, and uniqueness constraints.

## Scope

Implement schema-local objects for:

* `course_types`
* `courses`
* `course_activities`
* `course_schedules`
* `course_sessions`
* `session_locations`
* `session_status_history`
* `idempotency_keys`
* `outbox_events`

## Acceptance Criteria

* All tables live under `courses`.
* External IDs have no cross-schema foreign keys.
* Unique constraints prevent duplicate generated sessions.
* Lifecycle state values are constrained.
* Organisation-custom course types are supported.
* Existing RollFinders IDs can be preserved or stored as stable external references.
