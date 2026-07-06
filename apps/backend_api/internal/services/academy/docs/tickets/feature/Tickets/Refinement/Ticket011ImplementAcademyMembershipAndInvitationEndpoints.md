# 011 - Implement Academy Membership And Invitation Endpoints

## Feature / Component

- Feature: Academy Service
- Component: Membership mapping and invitations
- Priority: P0
- Branch: `feature/academy-membership-invitation-endpoints`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 004, 008
- Source PRD: `apps/backend_api/internal/services/academy/docs/product.md`

## Task

Implement academy membership mapping and invitation endpoints.

## Implementation Notes

- Implement `GET /v1/academies/{academy_id}/members`.
- Implement `POST /v1/academies/{academy_id}/members`.
- Implement `DELETE /v1/academies/{academy_id}/members/{member_id}`.
- Membership payloads must not include role/admin/owner values.
- Implement invitation create/read/accept/cancel/resend/expire routes.
- Invitation acceptance creates or preserves academy membership mapping only.
- If invitation acceptance should grant academy admin capability, call Authorisation Service for the scoped assignment rather than writing membership role.
- Do not use membership mapping to decide platform permissions.

## Acceptance Criteria

- WHEN a user is added to an academy, THEN the mapping has only academy/user identity plus status/timestamps.
- WHEN an invitation is accepted, THEN the academy membership mapping exists and role assignment is handled by Authorisation Service.
- WHEN a member is removed, THEN membership mapping is removed without deleting the user account.

## Regression / Compatibility Tests

- Tina SHALL add API tests for invite, accept, cancel, resend, expire, add member, remove member, and duplicate membership.
- Tina SHALL add contract tests proving no membership role field is returned.

## Out Of Scope

Authorisation catalog changes outside permissions required by these flows.
