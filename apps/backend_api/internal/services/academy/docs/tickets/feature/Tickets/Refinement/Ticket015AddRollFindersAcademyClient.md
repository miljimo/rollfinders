# 015 - Add RollFinders Academy Client

## Feature / Component

- Feature: Academy Service
- Component: RollFinders Next.js service client
- Priority: P0
- Branch: `feature/rollfinders-academy-client`
- Developer owner: RollFinders Frontend/Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 004, 009, 010, 011
- Source PRD: `apps/backend_api/internal/services/academy/docs/product.md`

## Task

Add a RollFinders app client/helper for Academy Service APIs.

## Implementation Notes

- Add `ACADEMY_PUBLIC_BASE_URL` environment support using the service endpoint naming pattern.
- Implement typed client functions for academy list/get/update/profile/social/claims/verification/invitations/members/reminders/payment capability.
- Keep compatibility helpers that can fall back to existing Prisma paths only while cutover is incomplete.
- Do not add internal service API keys.
- Normalize Academy Service errors into existing UI error patterns.

## Acceptance Criteria

- WHEN RollFinders needs academy data, THEN it can call the Academy Service through one client module.
- WHEN Academy Service is unavailable during compatibility, THEN current Prisma-backed flows can still be used only where explicitly allowed.
- WHEN environment variables are reviewed, THEN there is a single Academy Service base URL.

## Regression / Compatibility Tests

- Tina SHALL add client unit tests with mocked responses and dependency failure cases.
- Tina SHALL verify existing dashboard and public pages still render before cutover.

## Out Of Scope

Replacing every academy read/write path.
