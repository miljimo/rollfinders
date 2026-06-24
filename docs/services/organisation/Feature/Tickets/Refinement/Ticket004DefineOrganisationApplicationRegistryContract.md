# 004 - Define Organisation Application Registry Contract

## Feature / Component

- Feature: Organisation Service Architecture
- Component: Organisation/application registry contract
- Priority: P1
- Branch: `feature/organisation-application-registry-contract`
- Developer owner: Platform Architect
- Test owner: Documentation Reviewer
- Dependencies: Ticket001RewriteOrganisationServicePrdBoundaries, Ticket002DocumentCurrentImplementationFit, Ticket003DefinePreProvisionedRollFindersApplicationRequirement
- Source PRD: `docs/services/organisation/products.md`

## Task

Define the minimum organisation/application registry contract needed for future multi-application platform tenancy while preserving current RollFinders behaviour.

## Implementation Notes

- Keep `organisations`, `organisation_profiles`, `applications`, and `application_services` in the PRD database section.
- Define `applications` as software products owned by an organisation, such as `RollFinders Marketplace`.
- Define RollFinders application records as Organisation Service-created records that RollFinders references by configured `application_id`.
- Define `application_services` as service enablement records for shared services such as Users, Courses, Booking, Payments, Notifications, and Analytics.
- Define the minimum application read contract needed by RollFinders to validate that its configured `application_id` exists, is active, and has required services enabled.
- Mark `organisation_users` as IAM-owned and not part of the Organisation Service schema.
- Add a future-only `organisation_resource_links` concept for mapping organisation/application ownership to domain resources such as academies.
- Define the academy resource link use case as one organisation owning one or more academy location resources.
- State that `organisation_resource_links` is not required for v1 and must not block the compatibility bridge.

## Acceptance Criteria

- WHEN the database section is reviewed, THEN it includes organisation, profile, application, and application service records.
- WHEN membership tables are reviewed, THEN no Organisation Service-owned membership table is required.
- WHEN future academy mapping is reviewed, THEN the PRD allows a future resource link without forcing immediate migration.
- WHEN academy location ownership is reviewed, THEN the registry contract can represent multiple academy resources under one organisation.
- WHEN application service enablement is reviewed, THEN the PRD can answer which shared services an application is allowed to consume.
- WHEN RollFinders integration is reviewed, THEN the PRD requires RollFinders to use an Organisation Service-created `application_id`, not create an application dynamically.

## Regression / Compatibility Tests

- Documentation reviewer SHALL verify that application registry additions do not require immediate changes to Users, Academy, Courses, Booking, or Payments.
- Documentation reviewer SHALL verify that every new concept has an owner and does not duplicate IAM membership.

## Out Of Scope

- Physical database migration.
- OpenAPI contract implementation.
- RollFinders organisation/application creation flows.
- Admin UI for applications.
