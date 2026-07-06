# 012 - Implement Claim Reminder And Audit Endpoints

## Feature / Component

- Feature: Academy Service
- Component: Claim reminders and audit
- Priority: P1
- Branch: `feature/academy-reminders-audit-endpoints`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 008, 010
- Source PRD: `apps/backend_api/internal/services/academy/docs/product.md`

## Task

Implement claim reminder history and academy domain audit endpoints.

## Implementation Notes

- Implement `POST /v1/academies/{academy_id}/claim-reminders`.
- Implement `GET /v1/academies/{academy_id}/claim-reminders`.
- Implement `GET /v1/academies/{academy_id}/audit`.
- Enforce weekly reminder cooldown rules where product requires them.
- Persist outcome, reason, source, actor user ID, recipient email, and timestamps.
- Use existing reliable email patterns through the orchestration/application layer where email sending remains outside Academy Service.

## Acceptance Criteria

- WHEN a reminder is sent or skipped, THEN the outcome is recorded.
- WHEN reminder history is queried, THEN records are paginated and scoped to academy/platform permissions.
- WHEN audit is queried, THEN claim/verification/profile/lifecycle mutations are visible.

## Regression / Compatibility Tests

- Tina SHALL add tests for weekly cooldown, recently sent skips, queued outcomes, failed outcomes, and audit filtering.

## Out Of Scope

Email provider implementation.
