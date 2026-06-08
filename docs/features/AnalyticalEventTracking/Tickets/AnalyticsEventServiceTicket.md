# Ticket: Analytics Event Service

Status: Done

Branch: `feature/analytics-event-service`

## Purpose

Add the server-side analytics write service and API endpoint. Analytics must be best-effort: failures cannot block public browsing, login, dashboard actions, claim submissions, or email delivery.

## Source Review

Current code reviewed:

* `src/app/api/health/route.ts`
* `src/app/api/academy-claims/route.ts`
* `src/lib/prisma.ts`
* `src/lib/admin.ts`

## Requirements

IF the browser or server submits a valid analytics event

WHEN `POST /api/analytics/events` receives it

THEN the API SHALL persist the event through a shared analytics service.

AND the API SHALL return a successful no-content or JSON response without exposing internal analytics table details.

IF persistence fails

WHEN the request is otherwise valid

THEN the API SHALL log the failure server-side and return a non-blocking response where appropriate.

## Likely Files

* New `src/lib/analytics/service.ts`
* New `src/app/api/analytics/events/route.ts`
* New tests under `src/lib/__tests__`

## Done When

* Valid event payloads are saved.
* Invalid payloads are rejected.
* Analytics errors do not break existing public or dashboard workflows.
