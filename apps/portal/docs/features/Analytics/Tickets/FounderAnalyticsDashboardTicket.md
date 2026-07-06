# Ticket: Founder Analytics Dashboard

Status: Done

Branch: `feature/founder-analytics-dashboard`

## Purpose

Add founder analytics visibility to the unified dashboard without breaking role-scoped dashboard panels.

## Source Review

Current code reviewed:

* `src/app/dashboard/page.tsx`
* `src/app/dashboard/AdminDashboardWorkspace.tsx`
* `src/components/StatsPanel`
* `src/components/Table`
* `src/components/QuickActionPanel`

## Requirements

IF a Super Admin opens `/dashboard`

WHEN analytics has been implemented

THEN the dashboard SHALL expose an Analytics panel with marketplace, visitor, search, profile, commercial intent, claim funnel, and supply metrics.

AND the panel SHALL use existing dashboard visual patterns where practical.

AND non-super-admin roles SHALL NOT see founder-only analytics navigation or panels.

## Likely Files

* `src/app/dashboard/AdminDashboardWorkspace.tsx`
* `src/components/StatsPanel`
* `src/components/Table`
* New analytics panel component if needed

## Done When

* Analytics is visible to Super Admin only.
* Empty states are readable.
* Existing dashboard panels and role navigation still work.
