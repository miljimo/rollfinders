# 006 - Define Compatibility Mapping And Migration Rules

## Feature / Component

- Feature: Organisation Service Architecture
- Component: Compatibility and migration plan
- Priority: P1
- Branch: `feature/organisation-compatibility-rules`
- Developer owner: Platform Architect
- Test owner: Documentation Reviewer
- Dependencies: Ticket002DocumentCurrentImplementationFit, Ticket003DefinePreProvisionedRollFindersApplicationRequirement, Ticket004DefineOrganisationApplicationRegistryContract, Ticket005DefineOrganisationAcademyLocationModel
- Source PRD: `docs/services/organisation/products.md`

## Task

Add explicit rollout phases and compatibility rules so existing academy-scoped services keep working while organisation/application tenancy is introduced.

## Implementation Notes

- Add these rollout phases:
  - Phase 1: Document and enforce ownership boundaries. No new Organisation Service runtime.
  - Phase 2: Create RollFinders Marketplace as an active application in Organisation Service and configure RollFinders with that valid `application_id`.
  - Phase 3: Define organisation-to-academy ownership mapping while preserving current academy-scoped access.
  - Phase 4: Add application registry checks around existing organisation IDs.
  - Phase 5: Migrate service contracts to require both `organisation_id` and `application_id`.
  - Phase 6: Consider extracting a standalone Organisation Service runtime if platform reuse justifies it.
- Add the v1 compatibility rule:
  - Existing `organisation_id = academy.id` remains valid for Courses and Booking until dedicated organisation/application mapping exists.
- Add RollFinders concept mapping:
  - `Organisation`: an operator/business tenant that may own one or more academies.
  - `Application`: RollFinders Marketplace.
  - `Academy`: a location/domain resource owned by one organisation.
- State that `application_id` must not be required by existing consumers until compatibility is proven.
- State that RollFinders must not create organisations as part of academy onboarding, academy claiming, or dashboard setup.
- State that any `application_id` requirement starts with RollFinders-level configuration, not end-user input.
- State that organisation-level admin access should eventually replace the need to create duplicate admin accounts for each academy location.
- State that `AcademyMember` remains a compatibility mechanism until organisation-level access migration is designed.

## Acceptance Criteria

- WHEN the rollout plan is reviewed, THEN it is ordered and can be implemented without breaking current academy-scoped functionality.
- WHEN v1 compatibility is reviewed, THEN Courses and Booking can continue using existing `organisation_id` values.
- WHEN `application_id` migration is reviewed, THEN it is explicitly deferred until organisation compatibility is stable.
- WHEN RollFinders bootstrap is reviewed, THEN a valid Organisation Service-created `application_id` is required before Organisation Service-dependent features are enabled.
- WHEN RollFinders concept mapping is reviewed, THEN academy-as-domain-resource and organisation-as-tenant are not confused.
- WHEN multi-location operators are reviewed, THEN one organisation can manage multiple academy locations without multiple admin accounts.

## Regression / Compatibility Tests

- Documentation reviewer SHALL verify that existing Courses and Booking `organisation_id` contracts are not invalidated by the PRD.
- Documentation reviewer SHALL verify that no step requires bulk migration before the registry contract exists.

## Out Of Scope

- Data migration scripts.
- Backfill jobs.
- Consumer service code changes.
- Implementing organisation-level dashboard access.
