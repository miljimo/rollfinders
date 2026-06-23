# 003 - Permission Catalog Reconciliation

## Feature / Component

- Feature: API Orchestrator authorisation
- Component: Permission catalog registration
- Priority: P0
- Status: Not Implemented
- Branch: `feature/api-permission-catalog-reconciliation`
- Developer owner: API Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket001RouteRegistryAndPermissionMapping, Ticket002FailClosedAuthorisationEnforcement
- Source PRD: `services/api/docs/product.md`

## Task

Implement orchestrator-owned permission catalog reconciliation so route permission definitions are registered in Authorisation Service.

## Implementation Notes

- Use route-derived `PermissionDefinition` entries from the orchestrator route registry.
- Call Authorisation Service permission create/update APIs or a catalog reconciliation endpoint.
- Reconcile at startup or through an explicit admin/migration command.
- Treat reconciliation failure as deployment failure for environments that require strict permission catalog readiness.
- Keep downstream services dependency-free; they must not register gateway route permissions.

## Acceptance Criteria

- WHEN the orchestrator starts or reconciliation command runs, THEN missing route permission codes are created in Authorisation Service.
- WHEN a route permission definition changes name/description/resource type, THEN Authorisation Service is updated safely.
- WHEN reconciliation fails, THEN deployment reports the failure and does not silently allow traffic.
- WHEN tests run, THEN they prove the catalog payload is generated from route definitions.

## Current State

Route-derived permission definitions exist in code, but no Authorisation Service registration/reconciliation call has been implemented.

## Out Of Scope

Role assignments and user permission assignment.
