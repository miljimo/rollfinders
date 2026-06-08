# Ticket: Founder Analytics API

Status: Done

Branch: `feature/founder-analytics-api`

## Purpose

Expose read-only analytics data for founder/super-admin dashboard panels.

## Source Review

Current code reviewed:

* `src/lib/admin.ts`
* `src/app/api/admin/*`
* `src/app/dashboard/page.tsx`
* `src/app/dashboard/AdminDashboardWorkspace.tsx`

## Requirements

IF a Super Admin opens founder analytics

WHEN dashboard data is requested

THEN the API SHALL return aggregate analytics metrics and recent trends.

AND Platform Admin, Academy Admin, Standard User, and unauthenticated users SHALL NOT access founder-only analytics unless a future PRD broadens access.

## Likely Files

* New `src/app/api/admin/analytics/route.ts`
* New `src/lib/analytics/reporting.ts`
* `src/lib/admin.ts` authorization helpers if needed

## Done When

* Super Admin can read aggregate metrics.
* Unauthorized roles receive 403.
* The API returns stable empty states when no analytics data exists.
