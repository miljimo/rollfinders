# 025 - Implement Outbox Events

## Feature / Component

- Feature: Events And Operations
- Component: Transactional outbox
- Priority: P1
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-025-outbox-events`
- Dependencies: Ticket008CreateCoreBookingSchema, Ticket024ImplementStatusHistoryAndAuditTrail

## Task

Create transactional outbox records for important booking lifecycle events.

## Implementation Notes

- Suggested events: `booking.created`, `booking.confirmed`, `booking.cancelled`, `booking.completed`, `participant.checked_in`, `participant.attended`.
- Store event payloads without PII.
- Keep dispatcher implementation separate unless intentionally included.

## Acceptance Criteria

- Booking mutations create outbox records in the same transaction.
- Event payloads include booking ID, reference, status, bookable identifiers, organisation ID, customer ID, and payment ID where relevant.
- Event payloads do not include user profiles or resource details.

## Out Of Scope

Message broker integration.
