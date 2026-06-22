# 003 - Define Pre-Provisioned RollFinders Application Requirement

## Feature / Component

- Feature: Organisation Service Architecture
- Component: RollFinders application bootstrap contract
- Priority: P0
- Branch: `feature/organisation-rollfinders-application-bootstrap`
- Developer owner: Platform Architect
- Test owner: Documentation Reviewer
- Dependencies: Ticket001RewriteOrganisationServicePrdBoundaries, Ticket002DocumentCurrentImplementationFit
- Source PRD: `services/organisation/docs/products.md`

## Task

Update the PRD to state that RollFinders does not create organisations through the RollFinders application flow. RollFinders may consume Organisation Service only when it is configured with a valid `application_id` that was created in the Organisation Service registry.

## Implementation Notes

- Add a `RollFinders Application Bootstrap` section to the PRD.
- State that organisations and applications are created in the Organisation Service registry by platform operations, not self-created by RollFinders academy/admin workflows.
- State that the RollFinders Marketplace application record is created in Organisation Service under its owning organisation.
- State that RollFinders startup/configuration must provide the valid `application_id` created by Organisation Service for `RollFinders Marketplace`.
- State that the configured `application_id` must resolve to an active application in the Organisation Service registry before RollFinders uses organisation-scoped platform services.
- State that academy onboarding, academy claims, and academy profile management must not create Organisation Service organisations.
- State that missing, disabled, or unknown `application_id` is a platform configuration error and should fail closed for Organisation Service-dependent features.

## Acceptance Criteria

- WHEN the PRD is reviewed, THEN it clearly says RollFinders cannot create organisations from the RollFinders app flow.
- WHEN bootstrap requirements are reviewed, THEN RollFinders requires a valid `application_id` created in Organisation Service.
- WHEN academy workflows are reviewed, THEN they do not create organisations or applications.
- WHEN invalid application configuration is reviewed, THEN the PRD requires Organisation Service-dependent features to fail closed.

## Regression / Compatibility Tests

- Documentation reviewer SHALL verify the PRD does not describe a RollFinders UI/API for creating organisations.
- Documentation reviewer SHALL verify `application_id` is described as an Organisation Service-created config dependency for RollFinders.

## Out Of Scope

- Building an Organisation Service admin console.
- Adding RollFinders UI for organisation creation.
- Implementing runtime application validation.
