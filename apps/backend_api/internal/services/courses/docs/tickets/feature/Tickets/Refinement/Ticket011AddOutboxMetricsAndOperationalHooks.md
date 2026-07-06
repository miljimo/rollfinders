# COURSES-SVC-011 Add Outbox Metrics And Operational Hooks

## Goal

Make the service observable and integration-ready.

## Scope

* Transactional outbox event creation.
* Outbox dispatcher or documented integration with an existing dispatcher pattern.
* Metrics endpoint.
* Structured logs.
* Sensitive data redaction.
* Request IDs across handlers and logs.

## Acceptance Criteria

* Domain events are written transactionally with mutations.
* Dispatcher is safe to retry.
* Metrics expose health of API, DB, outbox, and worker paths.
* Logs do not leak API keys, secrets, or large payloads.
* Operational behavior matches the payments service style.
