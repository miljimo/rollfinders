# Courses Service Refinement Tickets

Source PRD: `apps/backend_api/internal/services/courses/docs/prds/proposal.md`

Review: `apps/backend_api/internal/services/courses/docs/architecture/ArchitectureAndProductReview.md`

Status: Ready For Review

## Delivery Direction

Build a standalone generic Courses service without breaking current RollFinders Open Mat and Course behavior.

The service must follow the users/payments service patterns:

* Go service under `services/courses`.
* Internal API-key access first.
* Versioned `/v1` JSON APIs.
* `GET /healthz` and `GET /readyz`.
* PostgreSQL schema named `courses`.
* Stored procedures for business writes.
* SQL functions for stable reads.
* No inline SQL business logic in handlers.
* No cross-service foreign keys.
* OpenAPI contract and contract tests.
* Docker and compose integration.

## Recommended Order

| Order | Ticket | Owner Type | Depends On |
| --- | --- | --- | --- |
| 1 | [COURSES-SVC-001 Tighten PRD And Domain Contract](Ticket001TightenPrdAndDomainContract.md) | Human tech lead + AI architect | None |
| 2 | [COURSES-SVC-002 Define OpenAPI MVP Contract](Ticket002DefineOpenapiMvpContract.md) | AI backend agent | 001 |
| 3 | [COURSES-SVC-003 Bootstrap Go API Service](Ticket003BootstrapGoApiService.md) | AI backend agent | 001 |
| 4 | [COURSES-SVC-004 Create Procedure-First Migration Framework](Ticket004CreateProcedureFirstMigrationFramework.md) | Human or AI database agent | 001 |
| 5 | [COURSES-SVC-005 Implement Core Course Schema](Ticket005ImplementCoreCourseSchema.md) | Human or AI database agent | 004 |
| 6 | [COURSES-SVC-006 Implement SQL Functions And Procedures](Ticket006ImplementSqlFunctionsAndProcedures.md) | AI database/backend agent | 005 |
| 7 | [COURSES-SVC-007 Backfill RollFinders Events](Ticket007BackfillRollfindersEvents.md) | Human database reviewer + AI agent | 005, 006 |
| 8 | [COURSES-SVC-008 Implement Data Access Layer](Ticket008ImplementDataAccessLayer.md) | AI backend agent | 006 |
| 9 | [COURSES-SVC-009 Implement Course Type And Course APIs](Ticket009ImplementCourseTypeAndCourseApis.md) | AI backend agent | 002, 008 |
| 10 | [COURSES-SVC-010 Implement Activity Schedule And Session APIs](Ticket010ImplementActivityScheduleAndSessionApis.md) | AI backend agent | 002, 008, recurrence decision |
| 11 | [COURSES-SVC-011 Add Outbox Metrics And Operational Hooks](Ticket011AddOutboxMetricsAndOperationalHooks.md) | AI backend/ops agent | 008, 009, 010 |
| 12 | [COURSES-SVC-012 Integrate RollFinders Behind Compatibility Adapter](Ticket012IntegrateRollfindersCompatibilityAdapter.md) | Human full-stack owner + AI agent | 007, 009, 010 |
| 13 | [COURSES-SVC-013 Add Verification And Release Gates](Ticket013AddVerificationAndReleaseGates.md) | Human release owner + AI tester | 001 through 012 |

## Critical Invariants

* Existing `/open-mats` behavior must remain stable.
* Existing `/open-mats/[id]` must not render non-Open-Mat courses.
* Existing public event IDs, QR links, analytics references, and payment references must be preserved or explicitly mapped.
* RollFinders owns browser sessions and admin UI; Courses owns course/session state.
* Users, organisations, payments, bookings, and attendance stay outside the Courses service.
* Course service migrations must be safe to run repeatedly.
* Writes must go through stored procedures.
