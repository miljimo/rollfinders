# 010 - Implement Academy Claims And Verification Endpoints

## Feature / Component

- Feature: Academy Service
- Component: Claims and verification APIs
- Priority: P0
- Branch: `feature/academy-claims-verification-endpoints`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 004, 008
- Source PRD: `docs/services/academy/product.md`

## Task

Implement academy claim and verification workflows in Academy Service.

## Implementation Notes

- Implement public claim submission under `POST /v1/academies/{academy_id}/claims`.
- Implement platform claim search/read/update/approve/reject/cancel routes.
- Implement verification submit/read/update/approve/reject routes.
- Claim approval must link claimant user ID from Users Service and create academy membership mapping only.
- Claim approval must request Authorisation Service role/permission assignment for academy admin/owner access where required.
- Verification approvals must update academy verification/listing flags through stored procedures.
- Add audit records for all review decisions.

## Acceptance Criteria

- WHEN a claim is approved, THEN Academy Service creates a membership mapping but does not store membership role.
- WHEN a claim is approved, THEN authorisation assignment is created or requested for the claimant.
- WHEN verification is approved/rejected, THEN review fields and audit trail are persisted.

## Regression / Compatibility Tests

- Tina SHALL add tests for duplicate claims, invalid state transitions, approval, rejection, and authorisation side effects.
- Tina SHALL verify existing public claim UI can be supported by the new API contract.

## Out Of Scope

Email template redesign and UI cutover.
