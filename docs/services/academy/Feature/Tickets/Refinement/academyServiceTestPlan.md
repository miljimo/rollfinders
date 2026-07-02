# Academy Service Test Plan

Owner: Tina Ugbekile, Test Engineer

## Purpose

This plan defines the regression and release test scope for the Academy Service implementation. It is designed to run alongside developer delivery and protect the service boundaries agreed in the Academy Service PRD and refinement tickets.

## Current Implementation State

As of this pass, `services/academy` contains PRD and ticket documentation only. No Go service, migration framework, endpoint handlers, or Academy Service tests exist yet.

The first automated check for this pass is therefore a static boundary contract. It is intentionally narrow and will begin enforcing the rules as implementation files are added.

## Critical Boundary Rules

- Academy membership is only an academy/user mapping.
- `academy_members` must not contain role, owner, admin, coach, permission, or capability columns.
- Academy Service must not own user identity, authentication, platform roles, permissions, courses, bookings, payments, Stripe Connect state, organisations, or application registry.
- Authorisation Service owns permissions, roles, role assignments, and permission evaluation.
- Payments Service owns Stripe Connect account state, provider transactions, refunds, payment settings, and provider payment capability.
- Wallet Service owns payout-linked wallet accounts, balances, reservations, and ledger entries.
- Transfer Service owns payout and withdrawal workflow records.
- Database writes and reads must go through stored procedures/functions.
- Each stored procedure/function must live in its own SQL file.
- SQL function and procedure names must be camelCase.
- Endpoint handlers must live as separate files under `services/academy/internal/endpoints`.
- Go file names must be CamelCase except folders.

## Test Strategy

### P0 Contract Gates

- Static scan for forbidden role/capability ownership in Academy Service implementation files.
- Static scan that `academy_members` schema contains only mapping fields and timestamps.
- Static scan that endpoint handlers are split into separate files under `internal/endpoints`.
- Static scan that SQL functions/procedures are one function/procedure per file and use camelCase names.
- OpenAPI contract validation once `openapi.yaml` or equivalent exists.
- Authorisation integration contract tests for permission calls, with Academy Service not making local role decisions.

### P0 API Regression

- Academy lifecycle: create, update, publish, archive, suspend, restore where supported.
- Academy profile: name, slug, branding, description, address, geocoding, contact details, images, listing flags.
- Academy claims: submit, approve, reject, audit trail, duplicate prevention, claimant user id reference.
- Academy verification: submit, approve, reject, status transitions, reviewer notes.
- Academy membership mapping: add user to academy, remove user from academy, list academy users, list user academies.
- Academy invitations: create, accept, cancel, expire, duplicate invitation handling.
- Claim reminders: create/send reminder, weekly throttle, audit record.
- Payment capability proxy: reads capability summary from Payments Service without persisting Stripe account state.

### P0 Data Regression

- Backfill preserves existing academy ids and slugs.
- Backfill preserves claim request state, invitations, social links, reminders, and membership mappings.
- Backfill does not introduce roles into membership records.
- Procedures are idempotent where required.
- Soft delete/archive behavior does not orphan claims, invitations, reminders, or social links.

### P1 Cross-Service Regression

- RollFinders UI can list, view, edit, claim, verify, and invite via Academy Service client.
- Courses Service continues to resolve academy identifiers.
- Booking Service continues to display academy/event context.
- Payments Service continues to evaluate academy payment capability independently.
- Users Service remains the identity source.
- Authorisation Service remains the permission source.

### P1 Observability And Failure Modes

- Health endpoint returns service and database status.
- Structured error payloads match existing service style.
- Request ids are included in errors.
- Authorisation failure returns 403 without mutating academy data.
- Users/Payments/Courses/Booking service failures are surfaced without local ownership fallback.
- Audit events are created for protected state changes.

## Manual Smoke Checklist

- Create academy as authorised core/admin user.
- Reject create/update as unauthorised user.
- Update profile details and confirm public read reflects changes.
- Submit a claim as a user.
- Approve claim as authorised admin and confirm only academy membership mapping is created.
- Confirm authorisation role assignment is not created by Academy Service membership logic.
- Send a claim reminder and confirm weekly throttling.
- Check payment capability summary for academy with and without Stripe Connect setup.
- Confirm no Stripe account id is stored in Academy Service tables.

## Automation Checklist

- `go test ./...` under `services/academy` once `go.mod` exists.
- SQL migration contract tests against a disposable PostgreSQL database.
- OpenAPI schema lint and request/response examples.
- Node static contract tests from the root test runner.
- Docker compose service startup and health check.
- End-to-end UI smoke for academy dashboard, claims, invitations, and verification after cutover.

## Signoff Criteria

- All P0 contract gates pass.
- All Academy Service Go tests pass.
- SQL migration tests pass on a clean database and an existing RollFinders database snapshot.
- RollFinders UI regression tests pass for academy admin, platform admin, and super admin flows.
- No implementation file introduces academy membership roles.
- No implementation file stores Stripe Connect account state in Academy Service.
- Release notes list implemented tickets, deferred tickets, known risks, and rollback steps.

## Known Gaps

- No Academy Service implementation exists yet, so API, data access, migration, and Docker tests cannot run.
- Payment capability proxy behavior needs a mock Payments Service contract before endpoint tests are implemented.
- Authorisation permission fixtures need to be finalized with Ticket 002.
- Backfill tests need a sanitized production-like academy data fixture.
