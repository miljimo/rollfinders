# Ticket: Daily Visits And Logged-In Users Analytics

Branch: `feature/daily-visits-and-logged-in-users-analytics`

Status: Reviewing

Priority: High

Review date: 2026-06-12

## Objective

Extend the Super Admin analytics panel so platform operators can see daily visit volume and understand how many users are currently active in the system.

The current visitor card is a rolling aggregate. This ticket adds a table-focused view that shows when visits occurred and separates current logged-in user activity from anonymous visitor analytics.

## Users

* Super Admins reviewing product traction.
* Platform operators checking live system usage.

## Scope

In scope:

* Daily visits table in Super Admin analytics.
* Daily unique visitor count.
* Daily unique session count.
* Daily analytics event count.
* Current logged-in user stat based on recent authenticated user activity.
* Recent logged-in user supporting stats, such as active in the last hour and active today.
* Read-only analytics API response fields for these values.

Out of scope:

* Real-time WebSocket presence.
* Exposing named currently online users.
* Third-party analytics provider integration.
* Tracking exact private browsing behavior for individual users.
* User session revocation or account-security workflows.

## Data Sources

Daily visit stats SHALL use first-party analytics data:

* `analytics_events.created_at`
* `analytics_events.visitor_id`
* `analytics_events.session_id`

Logged-in user stats SHALL use authenticated user activity that already exists in the platform:

* `users.last_login_at`
* `users.disabled`
* `users.status`

If a more accurate authenticated heartbeat is introduced later, this ticket MAY be superseded by a dedicated presence model. Until then, "currently logged in" means "recently active enough to be treated as currently active" and must be labelled clearly.

## Requirements

### DVA-001: Daily Visits Table

IF a Super Admin opens the analytics panel

WHEN analytics data exists for the selected reporting window

THEN the system SHALL show a table of daily visit statistics.

Done when:

* Each row represents one calendar date.
* Rows include date, unique visitors, unique sessions, and analytics event count.
* Rows are ordered newest first in the dashboard UI.
* Days with no activity may be omitted unless a future chart requires zero-filled rows.

### DVA-002: Visitor Metric Semantics

IF daily visits are displayed

WHEN unique visitor and session values are calculated

THEN unique visitor count SHALL use distinct non-null `visitor_id` values.

AND unique session count SHALL use distinct non-null `session_id` values.

AND event count SHALL use total analytics events for the date.

Done when:

* `0` values are rendered as `0`, not blank.
* Anonymous events without visitor IDs contribute to event count but not unique visitor count.
* The aggregate visitor card remains compatible with existing reporting.

### DVA-003: Currently Logged-In Users Stat

IF a Super Admin opens the analytics panel

WHEN user activity data exists

THEN the system SHALL show a current logged-in user stat.

Done when:

* The stat uses enabled active users only.
* The current window is explicitly documented in code and UI, for example "active in the last 15 minutes".
* The stat does not expose private user names or emails.
* Additional supporting values may include users active in the last hour and users active today.

### DVA-004: Analytics API Response

IF a Super Admin requests the founder analytics API

WHEN the API returns analytics data

THEN the response SHALL include daily visit rows and logged-in user summary fields.

Done when:

* The endpoint remains Super Admin only.
* Existing fields remain backward compatible.
* `days` query parameter continues to bound the reporting window.

### DVA-005: Empty And Error States

IF no analytics data exists

WHEN the analytics panel renders

THEN the daily visits table SHALL show an empty state instead of failing.

IF reporting queries fail

WHEN the analytics panel renders

THEN the existing analytics fallback behavior SHALL keep the dashboard available with zeroed values.

## Acceptance Criteria

* Super Admin analytics includes a daily visits table.
* Daily visits table shows date, unique visitors, unique sessions, and event count.
* Super Admin analytics includes a current logged-in user stat.
* Logged-in stat clearly communicates the freshness window used for "current".
* API response includes the daily visit rows and logged-in summary.
* Existing visitor, search, profile, commercial intent, claim, supply, and country analytics remain available.
* Tests or contracts cover the new reporting/API/dashboard fields.
