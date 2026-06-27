# Subscription Service Refinement Tickets

Source PRD: `docs/services/subscriptions/product.md`

Implement these tickets in order. Each ticket is intended to be independently understandable by a developer or AI agent.

## Sub-Agent Execution Model

Use three focused sub-agents for implementation:

| Sub-Agent | Responsibility |
| --- | --- |
| Developer sub-agent | Go service runtime, HTTP handlers, service clients, route contracts, domain logic, and non-database application code. |
| DB sub-agent | Subscription schema, migrations, SQL functions/procedures, database constraints, seed data, and database integration fixtures. |
| Tester sub-agent | Unit, contract, migration, gateway-authorisation, and regression tests plus sign-off evidence. |

The sub-agents must not integrate Subscription Service into existing dashboard panels or existing feature flows in this ticket set. Build the standalone service, API contracts, data model, and tests only. RollFinders dashboard/client integration remains blocked until a separate integration ticket is approved.

Coordination rules:

* DB sub-agent lands schema and migration contracts before Developer sub-agent depends on persistence.
* Developer sub-agent implements handlers against the documented API and repository contracts.
* Tester sub-agent starts contract tests from Ticket002 and expands coverage as each ticket lands.
* No sub-agent may change existing Academies, Courses/Events, Bookings, Payments, Manage Users, Analytics, Academy Review, or Academy Claims flows as part of these tickets.
* No sub-agent may expose browser/mobile routes outside the existing API gateway authorisation pattern.

| Order | Ticket | Purpose |
| --- | --- | --- |
| 001 | [Finalise Subscription Domain Boundaries](Ticket001FinaliseSubscriptionDomainBoundaries.md) | Lock ownership rules before implementation. |
| 002 | [Define Subscription OpenAPI Contract](Ticket002DefineSubscriptionOpenApiContract.md) | Define API endpoints and response shapes. |
| 003 | [Bootstrap Subscription Go API Service](Ticket003BootstrapSubscriptionGoApiService.md) | Create runnable service foundation. |
| 004 | [Create Subscription Database Schema](Ticket004CreateSubscriptionDatabaseSchema.md) | Add product, feature, plan, subscription, and entitlement schema. |
| 005 | [Implement Catalogue Data Access Layer](Ticket005ImplementCatalogueDataAccessLayer.md) | Add repository/data access for products, features, and plans. |
| 006 | [Implement Available Service Loading](Ticket006ImplementAvailableServiceLoading.md) | Load enabled services from Organisation Service with bootstrap fallback. |
| 007 | [Implement Product And Feature Catalogue APIs](Ticket007ImplementProductAndFeatureCatalogueApis.md) | Create APIs for product and feature setup. |
| 008 | [Implement Plan Catalogue And Feature Rules](Ticket008ImplementPlanCatalogueAndFeatureRules.md) | Create plans with explicit feature allowlists and validation. |
| 009 | [Implement Subscription Lifecycle APIs](Ticket009ImplementSubscriptionLifecycleApis.md) | Create and manage application-scoped organisation subscriptions. |
| 010 | [Implement Entitlement Evaluation APIs](Ticket010ImplementEntitlementEvaluationApis.md) | Publish active plan features as entitlements. |
| 011 | [Integrate Payments And Plan Changes](Ticket011IntegratePaymentsAndPlanChanges.md) | Add upgrade/downgrade/payment handoff behavior. |
| 012 | [Add Subscription Client And Gateway Route Contracts](Ticket012AddRollFindersClientAndGatewayIntegration.md) | Register protected subscription routes and client contracts without feature-flow cutover. |
| 013 | [Add Regression And Contract Test Suite](Ticket013AddRegressionAndContractTestSuite.md) | Add automated tests for boundaries, plan rules, fallback, and entitlements. |
| 014 | [Apply Scheduled Downgrades](Ticket014ApplyScheduledDowngrades.md) | Apply due downgrade plan changes and refresh entitlements. |
| 015 | [Implement Cancellation And Reactivation](Ticket015ImplementCancellationAndReactivation.md) | Support end-of-period cancellation and pre-effective reactivation. |
| 016 | [Implement Portal Plan Journey UI](Ticket016ImplementPortalPlanJourneyUI.md) | Render plan actions, checkout handoff, and pending state. |
| 017 | [Add Subscription End-To-End Tests](Ticket017AddSubscriptionEndToEndTests.md) | Prove IAM and subscription decisions across core journeys. |
| 018 | [Write Subscription Operational Runbook](Ticket018WriteSubscriptionOperationalRunbook.md) | Document operator diagnostics and recovery flows. |
