# 008 - Decide Runtime Extraction Readiness

## Feature / Component

- Feature: Organisation Service Architecture
- Component: Runtime extraction decision gate
- Priority: P2
- Branch: `feature/organisation-runtime-readiness`
- Developer owner: Platform Architect
- Test owner: Documentation Reviewer
- Dependencies: Ticket004DefineOrganisationApplicationRegistryContract, Ticket005DefineOrganisationAcademyLocationModel, Ticket006DefineCompatibilityMappingAndMigrationRules
- Source PRD: `apps/backend_api/internal/services/organisation/docs/product.md`

## Task

Define the decision gate for whether Organisation Service should remain a documented platform boundary around existing services or become a standalone runtime service.

## Implementation Notes

- Add a `Runtime Extraction Readiness` section to the PRD.
- Require standalone service extraction only when at least one of these is true:
  - more than one application needs the application registry
  - more than one domain service must validate `application_services`
  - platform tenancy needs independent lifecycle/status controls outside Users/IAM
  - organisation/application ownership becomes a shared contract for Payments, Booking, Courses, and future services
- State that until those conditions are met, Users service `/v1/organisations` remains the source of organisation records.
- State that a standalone runtime must not introduce a second source of truth for membership.

## Acceptance Criteria

- WHEN runtime extraction is reviewed, THEN the PRD has clear criteria for when to build a standalone Organisation Service.
- WHEN current RollFinders-only scope is reviewed, THEN the PRD permits no new runtime service.
- WHEN extraction is approved in the future, THEN the PRD preserves Users/IAM ownership of membership and permissions.

## Regression / Compatibility Tests

- Documentation reviewer SHALL verify the readiness section does not force premature runtime work.
- Documentation reviewer SHALL verify runtime extraction remains compatible with the staged rollout phases.

## Out Of Scope

- Creating a new service scaffold.
- Moving Users service organisation APIs.
- Migrating existing data.
