# Ticket: Analytics Daily Aggregation

Status: Done

Branch: `feature/analytics-daily-aggregation`

## Purpose

Aggregate raw analytics events into daily metrics for fast founder dashboard reads.

## Source Review

Current code reviewed:

* `src/app/api/jobs/email-delivery/route.ts`
* `src/lib/reliable-email.ts`
* `src/lib/admin.ts`

## Requirements

IF raw analytics events exist for a date

WHEN the aggregation job runs

THEN the system SHALL upsert daily metric rows for visitor, search, profile, open mat, claim, and supply metrics.

AND the job SHALL be idempotent for a given date.

AND it SHALL not delete raw events.

## Likely Files

* New `src/lib/analytics/aggregation.ts`
* New `src/app/api/jobs/analytics-aggregation/route.ts`
* Tests under `src/lib/__tests__`

## Done When

* Aggregation can run repeatedly without double-counting.
* The route is protected from public unauthenticated use.
* Existing email delivery job behavior is unaffected.
