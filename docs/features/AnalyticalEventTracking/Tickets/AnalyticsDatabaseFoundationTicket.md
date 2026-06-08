# Ticket: Analytics Database Foundation

Status: Done

Branch: `feature/analytics-database-foundation`

## Purpose

Create the persistent storage foundation for first-party RollFinders analytics. No analytics tables or Prisma models currently exist in `prisma/schema.prisma`, so this is a new database capability.

## Source Review

Current code reviewed:

* `prisma/schema.prisma`
* Existing migrations under `prisma/migrations`
* Public routes under `src/app/academies`, `src/app/open-mats`, and `src/app/map`
* Admin/dashboard routes under `src/app/dashboard`

## Requirements

IF analytics event collection is enabled

WHEN the database migration runs

THEN the system SHALL add analytics tables for immutable events, anonymous visitor/session state, and daily metric aggregates.

AND these tables SHALL use Prisma models mapped to snake_case database tables.

AND analytics writes SHALL NOT require changes to existing `Academy`, `Event`, `ClaimRequest`, `User`, or email queue behavior.

## Data Requirements

Add models equivalent to:

* `AnalyticsEvent`
* `AnalyticsVisitor`
* `AnalyticsDailyMetric`

The event model SHALL support:

* `eventName`
* `visitorId`
* `sessionId`
* `ipHash`
* optional `academyId`
* optional `openMatId`
* `source`
* JSON metadata
* `createdAt`

## Likely Files

* `prisma/schema.prisma`
* New Prisma migration under `prisma/migrations`

## Done When

* Prisma validates successfully.
* Migration applies against a local database.
* New tables are indexed by event name/date, visitor/date, academy, and open mat.
* Existing tests and build are not broken.
