# 009 - Implement Academy Lifecycle And Profile Endpoints

## Feature / Component

- Feature: Academy Service
- Component: Lifecycle/profile APIs
- Priority: P0
- Branch: `feature/academy-lifecycle-profile-endpoints`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 004, 008
- Source PRD: `services/academy/docs/product.md`

## Task

Implement Academy Service endpoints for academy lifecycle, profile, and social links.

## Implementation Notes

- Implement `POST /v1/academies`, `GET /v1/academies`, `GET /v1/academies/{academy_id}`, `PUT /v1/academies/{academy_id}`.
- Implement archive, publish, unpublish, suspend, restore, and delete routes.
- Implement profile get/update routes.
- Implement social links get/replace routes.
- Each endpoint should live in its own file under `internal/endpoints`.
- Delegate permission checks to Authorisation Service or consume trusted gateway context.
- Preserve stable existing IDs where the request supplies an allowed ID during migration/backfill.

## Acceptance Criteria

- WHEN lifecycle routes are called with valid input and permission, THEN they mutate through stored procedures.
- WHEN profile/social routes are called, THEN existing RollFinders academy profile fields can be represented.
- WHEN unauthorized requests are made, THEN responses use stable error envelopes.

## Regression / Compatibility Tests

- Tina SHALL add API integration tests for lifecycle, profile, social links, validation, and permission-denied cases.

## Out Of Scope

Claims, verification, invitations, reminders, and UI cutover.
