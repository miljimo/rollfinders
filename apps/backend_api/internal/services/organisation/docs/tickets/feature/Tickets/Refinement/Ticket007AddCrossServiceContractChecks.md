# 007 - Add Cross-Service Contract Checks

## Feature / Component

- Feature: Organisation Service Architecture
- Component: Documentation contract tests
- Priority: P2
- Branch: `feature/organisation-contract-checks`
- Developer owner: Platform Engineer
- Test owner: Test Engineer
- Dependencies: Ticket001RewriteOrganisationServicePrdBoundaries, Ticket002DocumentCurrentImplementationFit, Ticket003DefinePreProvisionedRollFindersApplicationRequirement, Ticket005DefineOrganisationAcademyLocationModel, Ticket006DefineCompatibilityMappingAndMigrationRules
- Source PRD: `apps/backend_api/internal/services/organisation/docs/product.md`

## Task

Add lightweight documentation or static contract checks that guard the Organisation Service PRD against drifting back into duplicate ownership of IAM membership or academy domain data.

## Implementation Notes

- Add a focused test or documentation contract check only if the repo has an existing suitable test location.
- The check should assert that the Organisation Service PRD:
  - identifies Users/IAM as membership owner
  - identifies Academy domain as owner of `Academy` and `AcademyMember`
  - includes the v1 `organisation_id = academy.id` compatibility rule
  - states RollFinders requires a valid `application_id` created in Organisation Service
  - states RollFinders app flows do not create organisations
  - states one organisation can own multiple academies
  - states academies are location/domain resources under an organisation in the target model
  - includes the four rollout phases
- Keep the check non-invasive and documentation-focused.
- Do not add runtime service code for this ticket.

## Acceptance Criteria

- WHEN documentation tests run, THEN they fail if the PRD removes the IAM membership ownership boundary.
- WHEN documentation tests run, THEN they fail if the PRD removes the academy compatibility rule.
- WHEN documentation tests run, THEN they fail if the PRD allows RollFinders academy/admin flows to create organisations.
- WHEN documentation tests run, THEN they fail if the PRD removes the Organisation Service-created `application_id` requirement.
- WHEN documentation tests run, THEN they fail if the PRD removes the one-organisation-to-many-academies target model.
- WHEN documentation tests run, THEN they fail if rollout phases are removed.
- WHEN no suitable documentation test location exists, THEN this ticket may be satisfied by adding a manual review checklist to the PRD instead.

## Regression / Compatibility Tests

- Test Engineer SHALL run the relevant unit/static contract test command for the chosen location.
- Test Engineer SHALL verify no application runtime tests are required for this documentation-only change.

## Out Of Scope

- Full service integration tests.
- Build pipeline changes unless a documentation test already participates in CI.
