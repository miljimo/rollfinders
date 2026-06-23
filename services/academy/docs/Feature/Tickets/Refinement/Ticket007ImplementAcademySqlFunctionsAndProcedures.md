# 007 - Implement Academy SQL Functions And Procedures

## Feature / Component

- Feature: Academy Service
- Component: Database-first operations
- Priority: P0
- Branch: `feature/academy-sql-procedures`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket 006
- Source PRD: `services/academy/docs/product.md`

## Task

Implement all core Academy Service data operations as stored procedures/functions.

## Implementation Notes

- Add one file per function/procedure using camelCase names.
- Cover create/update/list/get/archive/publish/unpublish/suspend/restore academy.
- Cover get/update profile and replace social links.
- Cover create/list/remove academy membership mappings without role columns.
- Cover submit/approve/reject/cancel claims.
- Cover submit/update/approve/reject verification.
- Cover create/list/cancel/accept/resend/expire invitations.
- Cover create/list claim reminders.
- Cover audit writes for protected mutations.
- Functions/procedures should return structured records or JSON payloads consistently.

## Acceptance Criteria

- WHEN data operations are executed, THEN no Go handler performs direct ad hoc SQL for business mutations.
- WHEN membership mapping procedures are inspected, THEN they only map user IDs to academy IDs.
- WHEN claim approval or invitation acceptance needs permissions, THEN the procedure creates mapping only and the service calls Authorisation for role assignment.

## Regression / Compatibility Tests

- Tina SHALL add SQL-level tests for lifecycle, profile, claim, invitation, and membership mapping procedures.
- Tina SHALL add regression checks around duplicate slugs, duplicate membership, and invalid state transitions.

## Out Of Scope

Go endpoint wiring.
