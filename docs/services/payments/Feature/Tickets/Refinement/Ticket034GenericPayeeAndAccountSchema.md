# 034 - Create Generic Payee And Payee Account Schema

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Database schema
- Priority: P0
- Branch: `feature/payments-payee-account-schema`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket006CreatePostgresqlMigrationFramework, Ticket007CreateCorePaymentSchema, Ticket033GenericPaymentServiceOpenApiContract
- Source PRD: `docs/services/payments/paymentService.md`

## Task

Create database-first schema support for generic payees and payee provider accounts.

## Implementation Notes

- Add tables such as `payees` and `payee_accounts`.
- Support `client_id`, display metadata, active/deactivated state, provider, provider account ID, account status, charges enabled, payouts enabled, requirements due, and timestamps.
- Use migrations in the existing payments migration structure.
- Use stored procedures for writes and functions for reads.
- Use camelCase procedure/function names.
- Preserve existing payment tables and data.

## Acceptance Criteria

- WHEN migrations run, THEN payee and payee account tables are created in the payments schema.
- WHEN a payee is deactivated, THEN historical payment records remain queryable.
- WHEN a payee account is refreshed, THEN canonical account status can be stored separately from provider raw status.
- WHEN existing migrations run on a populated local database, THEN existing payment records are not deleted or corrupted.

## Regression / Compatibility Tests

- Tina SHALL run payment service migration tests against an existing database snapshot.
- Tina SHALL verify old payment history queries still return existing records.

## Out Of Scope

Stripe Connect provider calls.
