# Ticket: Analytics Testing

Status: Done

Branch: `feature/analytics-testing`

## Purpose

Add regression coverage for analytics so tracking work does not break the public site, dashboard, claims, or email operations.

## Source Review

Current code reviewed:

* `src/lib/__tests__`
* `src/app/admin/__tests__`
* `tests/e2e/mvp.spec.ts`
* `tests/e2e/login.spec.ts`

## Requirements

IF analytics is implemented

WHEN tests run locally or in CI

THEN the suite SHALL prove event validation, best-effort writes, role-based dashboard/API access, and aggregation idempotency.

AND public MVP flows SHALL continue to pass.

## Likely Files

* `src/lib/__tests__/analytics-*.test.ts`
* `src/app/admin/__tests__` if dashboard UI changes
* `tests/e2e/mvp.spec.ts` only if end-to-end analytics smoke coverage is valuable

## Done When

* Unit tests cover event contract and service behavior.
* API tests cover authorization and invalid payloads.
* Dashboard tests cover Super Admin-only visibility.
* Existing MVP and login e2e tests still pass.
