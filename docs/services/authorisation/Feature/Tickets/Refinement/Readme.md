# Authorisation Service Refinement Tickets

Ordered implementation tickets for moving roles, permissions, permission assignments, and authorisation decisions out of Users Service and into a dedicated Authorisation Service.

These tickets are intentionally staged so developers and AI agents can pick them up in priority order without making architecture decisions during implementation.

## Current Status

Authorisation Service runtime, APIs, schema, decision evaluation, and migration scaffolding exist in the codebase. The permission catalog ownership model has changed: API Orchestrator owns gateway route permission definitions and must register/reconcile them with Authorisation Service. Authorisation Service remains the persistence and decision source of truth.

## Delivery Roles

Each ticket has an assigned `Developer owner` and `Test owner`.

* Developer owner is responsible for implementation, migration scripts, service integration, and developer-facing documentation.
* Test owner is responsible for acceptance tests, regression tests, migration verification, and sign-off evidence.

The key migration rule is that Authorisation Service becomes the only source of permission truth. Users Service may keep authentication and identity data, but role, permission, and assignment writes must move to Authorisation Service.

## Ordered Tickets

| Order | Ticket | State |
| --- | --- | --- |
| 1 | [Ticket001 - Finalise Authorisation Service Boundary And Permission Catalog](Ticket001FinaliseAuthorisationBoundaryAndPermissionCatalog.md) | Needs Revision |
| 2 | [Ticket002 - Bootstrap Authorisation Service Runtime](Ticket002BootstrapAuthorisationServiceRuntime.md) | Implemented |
| 3 | [Ticket003 - Define Authorisation OpenAPI Contract](Ticket003DefineAuthorisationOpenApiContract.md) | Implemented |
| 4 | [Ticket004 - Implement Authorisation Database Schema](Ticket004ImplementAuthorisationDatabaseSchema.md) | Implemented |
| 5 | [Ticket005 - Implement Permission And Role Management APIs](Ticket005ImplementPermissionAndRoleManagementApis.md) | Implemented |
| 6 | [Ticket006 - Implement User Permission Assignment APIs](Ticket006ImplementUserPermissionAssignmentApis.md) | Implemented |
| 7 | [Ticket007 - Implement Authorize And Effective Permissions APIs](Ticket007ImplementAuthorizeAndEffectivePermissionsApis.md) | Implemented |
| 8 | [Ticket008 - Translate Existing Users Service Authorisation Data](Ticket008TranslateExistingUsersServiceAuthorisationData.md) | Partially Implemented |
| 9 | [Ticket009 - Cut Over Permission Tables To Authorisation Source Of Truth](Ticket009CutOverPermissionTablesToAuthorisationSourceOfTruth.md) | Partially Implemented |
| 10 | [Ticket010 - Add RollFinders Authorisation Client And Compatibility Helper](Ticket010AddRollFindersAuthorisationClientAndCompatibilityHelper.md) | Partially Implemented |
| 11 | [Ticket011 - Replace RollFinders Hardcoded Role Guards](Ticket011ReplaceRollFindersHardcodedRoleGuards.md) | Partially Implemented |
| 12 | [Ticket012 - Enforce Authorisation In Domain Services](Ticket012EnforceAuthorisationInDomainServices.md) | Moved To API Orchestrator |
| 13 | [Ticket013 - Remove Authorisation Ownership From Users Service](Ticket013RemoveAuthorisationOwnershipFromUsersService.md) | Partially Implemented |
| 14 | [Ticket014 - Add Authorisation Regression Suite And Migration Contracts](Ticket014AddAuthorisationRegressionSuiteAndMigrationContracts.md) | Partially Implemented |

## Owner Matrix

| Order | Ticket | Developer owner | Test owner |
| --- | --- | --- | --- |
| 001 | Boundary and permission catalog | Platform Architect | Documentation Reviewer |
| 002 | Runtime bootstrap | Platform Backend Developer | Test Engineer |
| 003 | OpenAPI contract | API Developer | Test Engineer |
| 004 | Database schema | Platform Backend Developer | Test Engineer |
| 005 | Permission and role APIs | Platform Backend Developer | Test Engineer |
| 006 | User permission assignment APIs | Platform Backend Developer | Test Engineer |
| 007 | Authorize and effective permissions APIs | Platform Backend Developer | Test Engineer |
| 008 | Translate Users Service data | Platform Backend Developer | Test Engineer |
| 009 | Permission table cutover | Platform Backend Developer | Test Engineer |
| 010 | RollFinders authorisation helper | RollFinders Full Stack Developer | Test Engineer |
| 011 | Replace hardcoded guards | RollFinders Full Stack Developer | Test Engineer |
| 012 | Domain service enforcement | Platform Backend Developer | Test Engineer |
| 013 | Remove Users Service ownership | Users Backend Developer | Test Engineer |
| 014 | Regression and migration contracts | Test Engineer | Test Engineer |
