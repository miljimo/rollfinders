# 010 - Implement Refund State Machine

## Feature / Component

- Feature: Payment Core
- Component: Refund domain
- Priority: P0
- Suggested owner: Domain Engineer
- Dependencies: Ticket008ImplementRepositoryLayer, Ticket009ImplementPaymentStateMachine

## Task

Centralize refund lifecycle, refund amount checks, and payment aggregate refund totals.

## Implementation Notes

- Support full and partial refunds.
- Prevent over-refunds.
- Track pending, succeeded, failed, and cancelled refund states.

## Acceptance Criteria

- WHEN a refund is created, THEN it starts as `pending` unless provider response gives a terminal result.
- IF refund amount exceeds refundable amount, THEN creation is rejected.
- WHEN a refund succeeds, THEN the parent payment refund totals are updated.
- WHEN total refunded amount equals captured amount, THEN payment status becomes `refunded`.
- IF a partial refund succeeds, THEN payment status becomes `partially_refunded`.

## Out Of Scope

Provider refund API calls and admin approval flows.
