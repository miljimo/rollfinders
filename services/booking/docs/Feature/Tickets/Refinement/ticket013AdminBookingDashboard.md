# 013 - Admin Booking Dashboard

## Feature / Component

- Feature: Admin booking visibility
- Component: RollFinders dashboard UI
- Priority: P1
- Branch: `feature/admin-booking-dashboard`
- Developer owner: RollFinders Frontend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket010FreeEventBookingIntegration, Ticket012PaymentStatusBookingConfirmation
- Source PRD: `services/booking/docs/proposal.md`

## Task

Add academy admin and platform admin booking visibility for course/open-mat occurrences.

## Implementation Notes

- Academy admins should see bookings scoped to their academy/organisation.
- Platform admins should search bookings across academies.
- Include event/course title from RollFinders/Course Service metadata, booking reference, customer/guest label, quantity, status, payment status when available, and attendance status.
- Clicking a booking/event row should navigate to the event detail or admin event dialog.
- Do not expose raw guest contact data from Booking Service.
- Reuse existing dashboard table/dialog patterns.

## Acceptance Criteria

- WHEN an academy admin opens bookings, THEN only their academy bookings are shown.
- WHEN a platform admin searches bookings, THEN status, event, booking reference, and customer/guest fields are searchable.
- WHEN a booking row is clicked, THEN the user can reach the related event details.
- WHEN a booking has payment information, THEN status is shown without calling Stripe directly.

## Regression / Compatibility Tests

- Tina SHALL add dashboard tests for academy scope, platform scope, empty state, search, and event navigation.
- Tina SHALL verify existing payments dashboard continues to work.

## Out Of Scope

Bulk attendance import/export.
