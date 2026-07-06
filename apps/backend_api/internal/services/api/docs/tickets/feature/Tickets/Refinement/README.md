# API Orchestrator Authorisation Tickets

Source PRD: [`apps/backend_api/internal/services/api/docs/product.md`](../../../../product.md)

Status: In Progress

These tickets cover the API Orchestrator enforcement layer. Downstream services do not register gateway permissions. The orchestrator owns route definitions, permission codes, resource mapping, and permission catalog reconciliation with Authorisation Service.

## Current Implementation State

| Ticket | State | Notes |
| --- | --- | --- |
| [001 - Route Registry And Permission Mapping](ticket001RouteRegistryAndPermissionMapping.md) | Implemented | Explicit route registry exists in `internal/server/routes.go`. |
| [002 - Fail Closed Authorisation Enforcement](ticket002FailClosedAuthorisationEnforcement.md) | Implemented | Gateway resolves route, permission, and resource scope before forwarding. |
| [003 - Permission Catalog Reconciliation](ticket003PermissionCatalogReconciliation.md) | Not Implemented | Route-derived catalog exists in code; registration/reconciliation call to Authorisation Service is pending. |

## Ownership Rule

The API Orchestrator SHALL register or reconcile permission definitions for routes it exposes. Authorisation Service SHALL persist and evaluate them. Downstream services SHALL NOT register gateway route permissions.
