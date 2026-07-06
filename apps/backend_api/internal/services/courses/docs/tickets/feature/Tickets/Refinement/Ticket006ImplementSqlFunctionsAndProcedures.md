# COURSES-SVC-006 Implement SQL Functions And Procedures

## Goal

Move course business persistence into SQL functions and stored procedures, matching users/payments.

## Scope

* Read functions for course type get/list.
* Read functions for course get/list.
* Read functions for activity list.
* Read functions for schedule list.
* Read functions for session get/list.
* Procedures for course type mutations.
* Procedures for course mutations.
* Procedures for activity mutations.
* Procedures for schedule mutations.
* Procedures for session generation/cancellation/status transitions.
* Idempotency key save/get procedures where needed.

## Acceptance Criteria

* Handlers and data-access code do not contain inline SQL for business writes.
* Mutating procedures validate ownership scope and lifecycle constraints.
* Procedures write status history where lifecycle state changes.
* Procedures write outbox rows in the same transaction for domain events.
* Database integration tests cover success and invalid-state cases.
