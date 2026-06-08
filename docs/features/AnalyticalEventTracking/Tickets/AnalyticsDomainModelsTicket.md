# Ticket: Analytics Domain Models

Status: Done

Branch: `feature/analytics-domain-models`

## Purpose

Define the TypeScript contracts used by analytics callers so public pages, APIs, aggregation jobs, and dashboard panels share the same event names and metadata rules.

## Source Review

Current code reviewed:

* `src/lib/validators.ts`
* `src/lib/data.ts`
* `src/lib/admin.ts`
* `src/app/api/*`

## Requirements

IF a developer records analytics

WHEN they import analytics types

THEN the event names, source names, and metadata shape SHALL be constrained by shared TypeScript types.

AND the domain layer SHALL reject unknown event names before data reaches Prisma.

AND metadata SHALL avoid personal data unless a future PRD explicitly approves it.

## Event Groups

The initial event groups SHALL cover:

* Academy search
* Open mat search
* Academy profile views
* Open mat views
* Commercial intent clicks
* Claim funnel actions
* Marketplace supply changes

## Likely Files

* New `src/lib/analytics/types.ts`
* New `src/lib/analytics/events.ts`
* Unit tests under `src/lib/__tests__`

## Done When

* Event names are exported from one place.
* TypeScript catches invalid event names.
* Tests prove required metadata for academy/open mat/claim events.
