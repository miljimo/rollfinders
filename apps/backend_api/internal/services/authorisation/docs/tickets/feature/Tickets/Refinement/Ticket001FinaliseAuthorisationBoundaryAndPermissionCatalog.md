# 001 - Finalise Authorisation Service Boundary And Permission Catalog

## Feature / Component

- Feature: Authorisation Service
- Component: Product boundary and permission catalog
- Priority: P0
- Status: Needs Revision
- Branch: `feature/authorisation-boundary-permission-catalog`
- Developer owner: Platform Architect
- Test owner: Documentation Reviewer
- Dependencies: None
- Source PRD: `apps/backend_api/internal/services/authorisation/docs/product.md`

## Task

Finalise the Authorisation Service PRD so implementation teams have a stable ownership boundary, permission naming convention, scope model, and initial RollFinders permission catalog.

## Implementation Notes

- Confirm Users Service owns only identity, authentication, credentials, sessions, MFA, and actor identity.
- Confirm Authorisation Service owns permissions, roles as permission bundles, mappings, assignments, effective permission resolution, delegation rules, and audit.
- Confirm Organisation Service owns organisation/application context and that Authorisation Service consumes `organisation_id` and `application_id`.
- Define permission naming convention as `resource.action` or `resource.subresource.action`.
- Define initial permissions for:
  - academy lifecycle and claims
  - course management
  - booking management
  - payment refund and payout actions
  - user administration
  - organisation/application administration
  - authorisation administration
- Define scope rules for platform, organisation, application, and resource scopes.
- Explicitly state that new code must check permissions, not role names.
- Revise permission catalog ownership to state that API Orchestrator owns gateway route permission registration and Authorisation Service stores/evaluates those permission records.

## Acceptance Criteria

- WHEN the PRD is reviewed, THEN the Users Service no longer owns authorisation in the target state.
- WHEN permission names are reviewed, THEN every initial permission follows a consistent naming convention.
- WHEN scope is reviewed, THEN `organisation_id`, `application_id`, `resource_type`, and `resource_id` are supported.
- WHEN RollFinders migration is reviewed, THEN hardcoded role guards are identified as legacy compatibility only.

## Regression / Compatibility Tests

- Documentation reviewer SHALL verify the PRD references current Users Service role/privilege data as legacy migration source, not target ownership.
- Documentation reviewer SHALL verify the PRD includes migration phases for removing hardcoded guards.

## Out Of Scope

- Runtime service implementation.
- Database migrations.
- RollFinders code changes.
