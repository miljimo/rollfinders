# 001 - Rewrite Organisation Service PRD Boundaries

## Feature / Component

- Feature: Organisation Service Architecture
- Component: Organisation Service PRD
- Priority: P0
- Branch: `feature/organisation-service-boundaries`
- Developer owner: Platform Architect
- Test owner: Documentation Reviewer
- Dependencies: None
- Source PRD: `apps/backend_api/internal/services/organisation/docs/product.md`

## Task

Rewrite the Organisation Service PRD so it defines Organisation Service as a platform tenancy and application-boundary service, not as a duplicate owner of users, academy business data, IAM membership, courses, bookings, or payments.

## Implementation Notes

- Replace any claim that Organisation Service owns users, academy membership, payments, bookings, courses, or academy domain workflows.
- State that Organisation Service owns:
  - organisations
  - applications
  - application-service enablement
  - tenant status
  - tenant settings
- State that Users/IAM owns:
  - users
  - authentication
  - roles
  - permissions
  - user-to-organisation membership
- State that Academy domain owns:
  - academy profile/listing data
  - academy claim workflows
  - academy team business workflows
- State that Academy domain treats academies as location/domain resources under an organisation in the target model.
- State that Courses, Booking, and Payments consume `organisation_id`, and later `application_id`, for scope.
- Use British spelling `organisation` consistently because the existing Go services and database use that spelling.

## Acceptance Criteria

- WHEN the PRD is reviewed, THEN it clearly defines Organisation Service as a tenancy/application-boundary service.
- WHEN ownership boundaries are reviewed, THEN no section says Organisation Service owns users, authentication, roles, permissions, `Academy`, `AcademyMember`, courses, bookings, or payments.
- WHEN the responsibilities list is reviewed, THEN “Organisation Users” is removed or explicitly marked as IAM-owned.
- WHEN service consumers are reviewed, THEN Courses, Booking, and Payments are described as consumers of organisation/application scope, not owners of those identifiers.
- WHEN academy boundaries are reviewed, THEN the PRD distinguishes organisation tenancy from academy location/profile data.

## Regression / Compatibility Tests

- Documentation reviewer SHALL grep the PRD for ownership claims over `users`, `AcademyMember`, `payments`, `bookings`, and `courses`.
- Documentation reviewer SHALL verify the PRD still gives Organisation Service enough responsibility to support platform tenancy.

## Out Of Scope

- Service runtime implementation.
- Database migrations.
- API endpoint implementation.
