# 009 - Implement Payment State Machine

## Feature / Component

- Feature: Payment Core
- Component: Domain state
- Priority: P0
- Suggested owner: Domain Engineer
- Dependencies: Ticket008ImplementRepositoryLayer

## Task

Centralize canonical payment statuses and allowed transitions across Stripe and PayPal.

## Implementation Notes

- Use canonical statuses from the PRD.
- Do not force Stripe and PayPal to have identical internal flows.
- Terminal state regression must be rejected.

## Acceptance Criteria

- WHEN a valid transition is requested, THEN payment status changes and history is appended.
- IF an invalid transition is requested, THEN the domain layer rejects it.
- WHEN provider webhook updates arrive, THEN they use the same transition rules.
- IF a terminal payment is updated to an incompatible state, THEN the update is rejected.
- WHEN status changes, THEN an outbox event can be created in the same transaction.

## Out Of Scope

Provider-specific adapters, refunds, HTTP routes.
