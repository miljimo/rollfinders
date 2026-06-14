# 022 - Implement Outbox Event Creation

## Feature / Component

- Feature: Events
- Component: Transactional outbox
- Priority: P0
- Suggested owner: Backend Engineer
- Dependencies: Ticket008ImplementRepositoryLayer, Ticket009ImplementPaymentStateMachine, Ticket010ImplementRefundStateMachine

## Task

Create outbox records atomically whenever payment or refund lifecycle state changes.

## Implementation Notes

- Do not publish directly from request handlers.
- Event payloads should include aggregate ID, event type, status, amount, currency, and timestamps.

## Acceptance Criteria

- WHEN payment status changes, THEN an outbox event is created transactionally.
- WHEN refund status changes, THEN an outbox event is created transactionally.
- IF the transaction rolls back, THEN no outbox event remains.
- WHEN an outbox event is created, THEN it includes event type, aggregate ID, payload, and timestamp.
- IF multiple changes occur in one transaction, THEN event ordering is deterministic.

## Out Of Scope

External message broker selection and merchant webhook delivery UI.
