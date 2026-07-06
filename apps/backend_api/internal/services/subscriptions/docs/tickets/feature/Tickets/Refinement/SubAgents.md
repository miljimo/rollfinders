# Subscription Service Sub-Agent Plan

Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

This plan lets developer, DB, and tester sub-agents implement the Subscription Service without integrating it into existing RollFinders features yet.

## Global Constraints

* Do not modify existing dashboard panels or feature flows:
  * Academies
  * Courses/Events
  * Bookings
  * Payments
  * Manage Users
  * Analytics
  * Academy Review
  * Academy Claims
* Do not cut over any existing product area to Subscription Service.
* Do not add subscription checks to existing user-facing workflows yet.
* Do not expose Subscription Service business routes directly to browser/mobile clients.
* Do not bypass Authorisation Service. All business routes must be gateway-protected by `subscription.*` permissions.
* Do not store Authorisation permissions as Subscription-owned permissions. Permission catalogue fallback is only a bootstrap source for draft product-feature candidates.

## Developer Sub-Agent

### Owns

* Go service skeleton and runtime.
* HTTP handlers and request/response models.
* Repository interfaces and domain validation.
* Organisation Service client for enabled service loading.
* Authorisation Service client for bootstrap permission catalogue fallback.
* Payments Service handoff request shape for plan changes.
* API gateway route registry entries only after endpoint contracts and permissions exist.

### Must Not Do

* Do not integrate with existing dashboard pages or panels.
* Do not add feature gating to existing Academies, Courses/Events, Bookings, Payments, Users, Analytics, Academy Review, or Academy Claims flows.
* Do not create database schema outside the Subscription Service schema; coordinate database work through the DB sub-agent.

### Primary Tickets

* Ticket002 - Define Subscription OpenAPI Contract
* Ticket003 - Bootstrap Subscription Go API Service
* Ticket005 - Implement Catalogue Data Access Layer
* Ticket006 - Implement Available Service Loading
* Ticket007 - Implement Product And Feature Catalogue APIs
* Ticket008 - Implement Plan Catalogue And Feature Rules
* Ticket009 - Implement Subscription Lifecycle APIs
* Ticket010 - Implement Entitlement Evaluation APIs
* Ticket011 - Integrate Payments And Plan Changes

## DB Sub-Agent

### Owns

* Subscription Service schema design.
* Migrations under `apps/backend_api/internal/services/subscriptions/migrations`.
* Tables, indexes, constraints, and status checks.
* SQL functions/procedures where the service pattern expects procedure-first writes.
* Seed data for bootstrap product/feature examples only when explicitly required by the ticket.
* Migration and schema ownership tests.

### Must Not Do

* Do not add foreign keys to Organisation, Authorisation, Payments, Academy, Booking, Courses, or Users schemas.
* Do not create or mutate Authorisation-owned permission assignment tables.
* Do not edit existing feature tables to add subscription columns.
* Do not wire existing service data to subscription records.

### Primary Tickets

* Ticket004 - Create Subscription Database Schema
* Ticket005 - Implement Catalogue Data Access Layer
* Ticket008 - Implement Plan Catalogue And Feature Rules
* Ticket009 - Implement Subscription Lifecycle APIs
* Ticket010 - Implement Entitlement Evaluation APIs
* Ticket013 - Add Regression And Contract Test Suite

## Tester Sub-Agent

### Owns

* OpenAPI contract tests.
* Gateway route-permission tests for all Subscription Service business routes.
* Migration and schema ownership tests.
* Repository and handler validation tests.
* Bootstrap fallback tests.
* Plan allowlist tests.
* Entitlement response contract tests.
* Payment handoff contract tests.
* Final sign-off evidence for standalone service readiness.

### Must Not Do

* Do not add Playwright or dashboard integration tests for existing panels in this phase.
* Do not assert that existing product flows are subscription-gated yet.
* Do not require live third-party payment provider tests.

### Primary Tickets

* Ticket001 - Finalise Subscription Domain Boundaries
* Ticket002 - Define Subscription OpenAPI Contract
* Ticket006 - Implement Available Service Loading
* Ticket008 - Implement Plan Catalogue And Feature Rules
* Ticket010 - Implement Entitlement Evaluation APIs
* Ticket011 - Integrate Payments And Plan Changes
* Ticket012 - Add Subscription Client And Gateway Route Contracts
* Ticket013 - Add Regression And Contract Test Suite

## Handoff Order

1. Tester sub-agent writes/updates contract expectations from Ticket001 and Ticket002.
2. DB sub-agent implements Ticket004 and schema ownership tests.
3. Developer sub-agent implements Ticket003 against empty business routes.
4. Developer and DB sub-agents pair on Tickets005 through Ticket010.
5. Tester sub-agent expands regression coverage after each implementation ticket.
6. Developer sub-agent may implement gateway route registration in Ticket012, but must not connect existing product flows.
7. Tester sub-agent completes Ticket013 sign-off for standalone service readiness.

## Standalone Completion Definition

The standalone Subscription Service implementation is complete when:

* service starts locally;
* migrations run cleanly;
* product, feature, plan, subscription, and entitlement APIs pass contract tests;
* all business routes are protected by `subscription.*` Authorisation permissions;
* bootstrap fallback can create product-feature candidates without granting customer access;
* no existing dashboard panel or feature flow depends on Subscription Service yet.
