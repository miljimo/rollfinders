# 002 - Document Current Implementation Fit

## Feature / Component

- Feature: Organisation Service Architecture
- Component: Current-state implementation mapping
- Priority: P0
- Branch: `feature/organisation-current-fit`
- Developer owner: Platform Architect
- Test owner: Documentation Reviewer
- Dependencies: Ticket001RewriteOrganisationServicePrdBoundaries
- Source PRD: `docs/services/organisation/products.md`

## Task

Add a `Current Implementation Fit` section to the Organisation Service PRD that records how organisation concepts are implemented in the current RollFinders codebase.

## Implementation Notes

- Document that `services/users` already has:
  - `organisations`
  - `organisation_users`
  - organisation-scoped `user_roles`
  - organisation-scoped `user_permissions`
  - `/v1/organisations`
  - `/v1/organisations/{id}`
- Document that Prisma currently has:
  - `Academy`
  - `AcademyMember`
  - academy-owned payment account settings through `PaymentAccountSetting`
- Document that current RollFinders access is academy-scoped:
  - local users have a single optional `academyId`
  - `AcademyMember` grants access per academy
  - this is a compatibility model, not the target organisation-level admin model
- Document that Courses and Booking already use `organisation_id`.
- Document that today, `organisation_id` commonly maps to `academy.id` for RollFinders compatibility.
- Document the target model:
  - one organisation may own many academies
  - an academy is a location/domain resource under an organisation
  - organisation admins should be able to manage all academies owned by the organisation
- Document that Payments uses owner-style scope for academy/platform payment account settings and should later consume organisation/application scope through a compatibility contract.

## Acceptance Criteria

- WHEN an engineer reads the PRD, THEN they can identify which existing service/table currently owns each related concept.
- WHEN the current implementation section is compared with the repo, THEN it references the existing Users service organisation APIs and the Prisma Academy/AcademyMember model.
- WHEN Courses and Booking integration is reviewed, THEN the PRD explicitly states that `organisation_id = academy.id` remains a compatibility rule for now.
- WHEN target tenancy is reviewed, THEN the PRD explicitly states that one organisation can own multiple academies.

## Regression / Compatibility Tests

- Documentation reviewer SHALL cross-check:
  - `services/users/internal/server/server.go`
  - `apps/backend_api/migrations/users/tables/003_organisations.sql`
  - `apps/backend_api/migrations/users/tables/004_user_roles_and_permissions.sql`
  - `prisma/schema.prisma`
  - Booking and Courses references to `organisation_id`

## Out Of Scope

- Changing any current implementation.
- Renaming `academyId` or `organisation_id` fields.
- Replacing current `AcademyMember` access in this ticket.
