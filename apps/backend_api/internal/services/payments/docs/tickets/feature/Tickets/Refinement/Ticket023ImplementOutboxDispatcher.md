# 023 - Implement Outbox Dispatcher

## Feature / Component

- Feature: Events
- Component: Outbox worker
- Priority: P1
- Suggested owner: Backend Engineer
- Dependencies: Ticket022ImplementOutboxEventCreation

## Task

Poll and dispatch outbox events from stateless application instances using database-safe coordination.

## Implementation Notes

- Initial sink may be log/stdout or configurable internal webhook.
- Use PostgreSQL locking semantics to avoid duplicate active processing.
- Keep failed events retryable.

## Acceptance Criteria

- WHEN pending outbox events exist, THEN the dispatcher attempts delivery.
- IF delivery succeeds, THEN the event is marked delivered.
- IF delivery fails, THEN retry metadata and last error are updated.
- WHEN multiple dispatchers run, THEN one event is actively processed by only one worker at a time.
- WHEN the app restarts, THEN undelivered events remain pending.

## Out Of Scope

Kafka, cloud pub/sub, advanced routing, exactly-once delivery guarantee.
