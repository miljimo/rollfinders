# 005 - Define Organisation Academy Location Model

## Feature / Component

- Feature: Organisation Service Architecture
- Component: Organisation-to-academy ownership model
- Priority: P0
- Branch: `feature/organisation-academy-location-model`
- Developer owner: Platform Architect
- Test owner: Documentation Reviewer
- Dependencies: Ticket002DocumentCurrentImplementationFit, Ticket003DefinePreProvisionedRollFindersApplicationRequirement, Ticket004DefineOrganisationApplicationRegistryContract
- Source PRD: `apps/backend_api/internal/services/organisation/docs/product.md`

## Task

Update the PRD to define the target RollFinders tenancy model where one organisation can own one or more academies. In this model, an academy represents a location or operating site under an organisation, so an organisation admin can manage multiple academy locations without creating separate admin accounts per academy.

## Implementation Notes

- Add a `Organisation And Academy Location Model` section to the PRD.
- Define `Organisation` as the tenant/admin boundary for a business or operator.
- Define `Academy` as a domain resource/location owned by one organisation.
- State that an organisation may own zero, one, or many academies.
- State that an academy belongs to exactly one organisation in the target model.
- State that organisation-level admins can manage all academies owned by their organisation, subject to IAM roles and permissions.
- State that academy-specific staff access may still exist as a narrower permission model, but broad admin access should come from organisation membership.
- State that this model avoids creating multiple admin accounts for the same operator when they manage multiple academy locations.
- State that RollFinders academy creation should eventually require an owning `organisation_id`, but existing academy records keep their current shape until migration.

## Acceptance Criteria

- WHEN the PRD is reviewed, THEN it clearly states that an organisation can own multiple academies.
- WHEN admin access is reviewed, THEN organisation admins can manage all academy locations under their organisation without separate academy admin accounts.
- WHEN academy ownership is reviewed, THEN each academy has one owning organisation in the target model.
- WHEN existing implementation compatibility is reviewed, THEN the PRD preserves today’s `Academy`, `AcademyMember`, and `academyId` fields until migration.

## Regression / Compatibility Tests

- Documentation reviewer SHALL verify the PRD does not describe one organisation per academy as the long-term model.
- Documentation reviewer SHALL verify the PRD does not require immediate deletion of `AcademyMember`.
- Documentation reviewer SHALL verify organisation-level membership remains IAM-owned.

## Out Of Scope

- Adding `organisationId` to the Prisma `Academy` model.
- Migrating existing academy admins.
- Rewriting dashboard access controls.
