# Ticket: Marketplace Supply Analytics

Status: Done

Branch: `feature/marketplace-supply-analytics`

## Purpose

Track supply-side growth events when admins create academies or open mats.

## Source Review

Current code reviewed:

* `src/app/admin/academies/actions.ts`
* `src/app/admin/open-mats/actions.ts`
* `src/lib/platform-admin-activity.ts`
* `prisma/schema.prisma`

## Requirements

IF an authorized admin creates an academy

WHEN the academy creation transaction succeeds

THEN the system SHALL record `academy_created` analytics.

IF an authorized admin creates an open mat

WHEN the event creation transaction succeeds

THEN the system SHALL record `open_mat_created` analytics.

AND the analytics implementation SHOULD reuse the same successful-write boundaries as platform admin activity logging.

## Likely Files

* `src/app/admin/academies/actions.ts`
* `src/app/admin/open-mats/actions.ts`
* `src/lib/platform-admin-activity.ts` only if a shared hook is appropriate

## Done When

* Successful supply creation is tracked once.
* Failed validation or failed writes do not create analytics events.
* Existing admin audit and activity requirements still pass.
