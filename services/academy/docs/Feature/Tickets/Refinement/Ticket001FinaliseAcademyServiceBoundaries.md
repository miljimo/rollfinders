# 001 - Finalise Academy Service Boundaries

## Feature / Component

- Feature: Academy Service
- Component: Product and domain contract
- Priority: P0
- Branch: `feature/academy-service-boundaries`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: None
- Source PRD: `services/academy/docs/product.md`

## Task

Finalise the Academy Service implementation contract before code work begins.

## Implementation Notes

- Update the PRD where needed so it reflects the current platform decision: academy membership is a domain mapping only, not an authorisation source.
- Do not add a `role`, `member_role`, owner, or admin column to the academy membership mapping table.
- Define academy ownership/admin capability as Authorisation Service role/permission assignments scoped to `organisation_id`, `application_id`, `resource_type = academy`, and `resource_id`.
- Confirm Academy Service owns academy lifecycle, profile, social links, claims, verification, invitations, reminders, settings, listing state, and academy/user mapping.
- Confirm it does not own users, authentication, platform roles, courses, bookings, payments, or Stripe Connect state.
- Document all compatibility assumptions for stable existing academy IDs.

## Acceptance Criteria

- WHEN the PRD is reviewed, THEN membership mapping is not described as the source of platform role or permission decisions.
- WHEN a developer reads the PRD, THEN they can identify which service owns users, roles, payments, courses, bookings, and organisations.
- WHEN future tickets reference membership, THEN they use academy membership as `academy_id + user_id` mapping only.

## Regression / Compatibility Tests

- Tina SHALL review this boundary against current RollFinders dashboard, academy claim, academy team, course, booking, and payment flows.
- Tina SHALL confirm no ticket requires adding role semantics back to `academy_members`.

## Out Of Scope

Runtime implementation.
