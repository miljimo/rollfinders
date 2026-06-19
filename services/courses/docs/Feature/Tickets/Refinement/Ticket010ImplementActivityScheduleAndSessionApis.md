# COURSES-SVC-010 Implement Activity Schedule And Session APIs

## Goal

Expose activity, schedule, and session APIs after recurrence scope is agreed.

## Scope

* Activity CRUD.
* Schedule CRUD.
* Session list/get/update.
* Session cancellation.
* Session generation worker or explicit occurrence resolver, depending on the recurrence decision.

## Acceptance Criteria

* Activity blocks render in chronological order.
* Activity blocks cannot exceed the session time range.
* Schedule rules prevent duplicate generated sessions.
* Session cancellation writes status history and outbox events.
* Recurrence support is explicit: weekly, fortnightly, monthly, and any approved daily behavior.
* Tests cover duplicate prevention and cancellation.
