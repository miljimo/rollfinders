# 028 - Add Domain Unit Tests

## Feature / Component

- Feature: Quality
- Component: Unit tests
- Priority: P0
- Suggested owner: QA-minded Backend Engineer
- Dependencies: Ticket009ImplementPaymentStateMachine, Ticket010ImplementRefundStateMachine

## Task

Add table-driven unit tests for payment and refund state machines, validation rules, and typed domain errors.

## Implementation Notes

- Cover all valid transitions.
- Cover representative invalid transitions.
- Make status additions obvious in tests.

## Acceptance Criteria

- WHEN tests run, THEN every allowed payment transition is covered.
- WHEN tests run, THEN every allowed refund transition is covered.
- IF an invalid transition is attempted, THEN tests assert the typed error.
- IF a refund exceeds refundable balance, THEN tests assert rejection.
- WHEN a new status is added without updating tests, THEN test gaps are obvious to maintainers.

## Out Of Scope

Provider sandbox tests and API integration tests.
