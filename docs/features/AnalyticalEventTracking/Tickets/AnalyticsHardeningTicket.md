# Ticket: Analytics Hardening

Status: Done

Branch: `feature/analytics-hardening`

## Purpose

Harden analytics for privacy, operational safety, and production reliability before enabling it broadly.

## Source Review

Current code reviewed:

* `src/app/api/health/route.ts`
* `src/lib/admin.ts`
* `src/lib/prisma.ts`
* Deployment scripts under `scripts/cicd`

## Requirements

IF analytics is enabled in production

WHEN traffic increases or analytics writes fail

THEN the public site and dashboard SHALL remain usable.

AND analytics SHALL avoid storing raw IP addresses, passwords, reset tokens, claim evidence text bodies, private email bodies, or other sensitive user content.

AND the implementation SHALL include rate limiting or abuse protection appropriate for public event ingestion.

## Operational Requirements

* Analytics can be disabled by environment configuration.
* Failed analytics writes are logged without flooding logs.
* Aggregation jobs are protected.
* Retention requirements are documented before raw event data is kept long-term.

## Done When

* Privacy-sensitive fields are excluded or hashed.
* Public ingestion is abuse-resistant.
* Feature flag/off switch is documented.
* Production deployment notes include migration and rollback considerations.
