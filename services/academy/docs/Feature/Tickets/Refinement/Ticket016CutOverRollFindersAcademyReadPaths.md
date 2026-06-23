# 016 - Cut Over RollFinders Academy Read Paths

## Feature / Component

- Feature: Academy Service
- Component: RollFinders read integration
- Priority: P1
- Branch: `feature/academy-read-path-cutover`
- Developer owner: RollFinders Frontend/Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 014, 015
- Source PRD: `services/academy/docs/product.md`

## Task

Move RollFinders academy read paths from Prisma/public tables to Academy Service APIs.

## Implementation Notes

- Cut over public academy pages, academy dashboard panels, academy review screens, academy claim screens, user academy context lookups, and admin academy lists.
- Preserve existing route behavior and query parameters.
- Keep Courses, Booking, and Payments consuming stable academy IDs.
- Do not change payment, course, or booking ownership.
- Add graceful dependency errors where Academy Service is unavailable.

## Acceptance Criteria

- WHEN public academy pages render, THEN academy data comes from Academy Service.
- WHEN admin/academy dashboards render, THEN academy lists/details/profile/social/claims read from Academy Service.
- WHEN existing courses/bookings/payments display academy names, THEN stable academy IDs still resolve.

## Regression / Compatibility Tests

- Tina SHALL run E2E coverage for public academy pages, dashboard academies, claims, academy review, courses, bookings, and payments.

## Out Of Scope

Write-path cutover and legacy table deletion.
