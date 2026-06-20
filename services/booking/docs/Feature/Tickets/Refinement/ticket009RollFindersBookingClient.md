# 009 - RollFinders Booking Client

## Feature / Component

- Feature: RollFinders booking integration
- Component: Next.js server-only service client
- Priority: P0
- Branch: `feature/rollfinders-booking-client`
- Developer owner: RollFinders Frontend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket006CoreBookingEndpoints
- Source PRD: `services/booking/docs/proposal.md`

## Task

Add a server-only RollFinders booking client for calling Booking Service from Next.js server actions and server components.

## Implementation Notes

- Add `src/lib/bookings.ts`.
- Use `BOOKING_SERVICE_URL` and `BOOKING_SERVICE_API_KEY`.
- Throw a typed service error for unavailable service, unauthorized, validation failure, duplicate booking, and conflict responses.
- Keep browser code from calling Booking Service directly.
- Match the style of `src/lib/payments.ts`.
- Add helpful unavailable-service UI messages in callers.

## Acceptance Criteria

- WHEN Booking Service is configured, THEN RollFinders server code can create/get/list/cancel/confirm bookings.
- WHEN Booking Service is unreachable, THEN callers receive a typed unavailable error.
- WHEN called from client/browser code, THEN the module prevents unsafe usage.
- WHEN API credentials are missing, THEN a clear configuration error is returned.

## Regression / Compatibility Tests

- Tina SHALL add contract tests that assert booking client is server-only and uses service auth.
- Tina SHALL verify existing payment client behavior is unchanged.

## Out Of Scope

Changing public booking UI.
