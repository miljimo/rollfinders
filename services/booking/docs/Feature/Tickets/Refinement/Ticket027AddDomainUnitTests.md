# 027 - Add Domain Unit Tests

## Feature / Component

- Feature: Quality
- Component: Domain tests
- Priority: P0
- Suggested owner: Test Engineer
- Branch name: `feature/booking-027-domain-unit-tests`
- Dependencies: Ticket010ImplementBookingLifecycleStateMachine, Ticket011ImplementParticipantLifecycle

## Task

Add unit tests for booking and participant domain behavior.

## Implementation Notes

- Test state transitions.
- Test participant lifecycle rules.
- Test booking reference generation.
- Test validation helpers.

## Acceptance Criteria

- Legal booking transitions are covered.
- Illegal booking transitions are covered.
- Participant check-in/attendance paths are covered.
- Tests run locally with `go test ./...`.

## Out Of Scope

Database integration tests.
