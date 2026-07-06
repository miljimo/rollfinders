# PRD: Admin Dashboard Stat Indicators

## Implementation Metadata

- Feature area: Admin Dashboard
- Suggested branch name: `feature/admin-dashboard-stat-indicators`
- Status: Completed

## Objective

Replace hardcoded admin dashboard trend text with shared, factual stat indicators powered by documented calculations.

This PRD applies to Super Admin, legacy Admin, Platform Admin, and Academy Admin admin-board metrics.

## Current State

The Admin Dashboard currently renders local metric card implementations.

Some dashboard metric cards use hardcoded trend strings such as `8% vs last 7 days`.

Open Mat management and email operations also define local metric components.

These local implementations SHALL be migrated toward the shared `MetricCard` and `StatIndicator` requirements.

## Dashboard Metric Requirements

IF `/admin` renders metric cards

WHEN an authorized admin views the board

THEN each metric card SHALL show a primary metric value.

AND optional indicators SHALL be backed by real data.

AND optional indicators SHALL follow the shared `StatIndicator` UI and data requirements.

AND hardcoded trend strings SHALL NOT be used.

## Role Scope Requirements

Super Admin and legacy Admin metrics MAY include platform-wide data.

Platform Admin metrics MAY include permitted platform operational data but SHALL continue hiding Super Admin-only data.

Academy Admin metrics SHALL include assigned-academy user and roll data only.

Academy Admins without an assigned academy SHALL NOT receive admin metric data.

Academy Admin metrics SHALL NOT include academy record count, verified academy count, or pending verification count.

## Initial Admin Indicator Examples

The first implementation SHOULD use factual period counts rather than directional trend claims unless comparison calculations are implemented.

Platform-wide examples:

* `Total Academies`: indicator `new this month`
* `Verified Academies`: indicator `verified this month`
* `Pending Verification`: warning indicator `pending review`
* `Total Users`: indicator `new this month`
* `Open Mats`: indicator `created this week`

Academy-scoped examples:

* `Academy Users`: indicator `new this month`
* `Academy Rolls`: indicator `created this week`

Email-operations examples:

* `Queued now`: neutral or warning count, no directional arrow by default
* `Scheduled retry`: neutral or warning count, no directional arrow by default
* `Needs attention`: warning or negative count, no directional arrow by default
* `Invalid emails`: negative count, no directional arrow by default

## Directional Indicator Requirements

IF the Admin Dashboard shows an up, down, or flat direction

WHEN the card renders

THEN the backend or server-side page query SHALL provide a real comparison against a defined baseline.

AND the visual text or accessible label SHALL identify the comparison period.

AND the direction SHALL NOT be inferred from a current-period count alone.

## Component Migration Requirements

Admin dashboard metrics SHOULD migrate to shared `MetricCard` and `StatIndicator` components.

Local `StatCard`, `Metric`, or equivalent metric-card helpers SHOULD be removed once the shared component supports the same behavior.

Migration targets include:

* `src/app/admin/page.tsx`
* `src/app/admin/open-mats/page.tsx`
* `src/app/admin/EmailOperationsPanel.tsx`

## Acceptance Criteria

* Admin dashboard metric indicators are not hardcoded.
* Existing Super Admin and Platform Admin metric access remains unchanged.
* Academy Admin metric counts are assigned-academy scoped.
* Plain period-count indicators render without directional arrows by default.
* Warning and negative operational counts do not rely on color alone.
* Existing admin pages continue rendering if an indicator is omitted.
* Tests cover metric rendering with and without indicators.
