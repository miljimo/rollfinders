# PRD: Stat Indicator Data And Trust Requirements

## Implementation Metadata

- Feature area: Product analytics and UI integrity
- Suggested branch name: `feature/stat-indicator-data-requirements`
- Status: Completed

## Objective

Define the product data rules for every RollFinders stat indicator so compact dashboard signals are trustworthy, explainable, scoped, and privacy-safe.

A stat indicator is any compact metric context shown alongside a primary metric, such as `8 this month`, `+4 vs last week`, `No change this week`, or `3 pending`.

## Product Principle

Stat indicators SHALL communicate measurable activity or change.

Stat indicators SHALL NOT imply academy quality, instructor credibility, student satisfaction, competitive superiority, or business success unless a separate PRD defines and validates that claim.

IF RollFinders cannot explain the metric plainly to an academy owner, platform admin, or user

THEN RollFinders SHALL NOT display the indicator.

## Required Metric Definition

Every PRD or implementation ticket that introduces a stat indicator SHALL define:

* Metric name
* Product owner or feature area
* UI surface
* Event source or database source
* Actor and data scope
* Calculation window
* Comparison window when directional
* Timezone rule
* Data freshness expectation
* Empty state
* Privacy considerations
* Abuse, spam, duplicate, or test-data exclusions where relevant

## Calculation Requirements

IF an indicator is directional

WHEN the indicator is calculated

THEN the system SHALL compare the current period with a defined previous equivalent period.

Examples:

* current week vs previous week
* current month vs previous month
* current 7 days vs previous 7 days

IF the indicator is not directional

WHEN the indicator is displayed

THEN the indicator MAY show a factual current-period count such as `8 this month`.

AND it SHALL use neutral tone unless a product requirement explicitly defines a semantic tone.

## Low-Volume Rules

IF the baseline count is small

WHEN the indicator displays change

THEN the indicator SHOULD prefer absolute deltas over percentages.

AND the indicator SHALL NOT use exaggerated percentage language such as `+300%` when that would mislead users about significance.

## Timezone Requirements

Academy-admin and academy-owned metrics SHALL use the academy's local timezone when available.

Platform-wide admin metrics SHALL use the configured platform reporting timezone.

Personal user-facing metrics MAY use the user's locale or configured timezone when that surface is introduced by a separate PRD.

## Data Freshness Requirements

Every indicator SHALL have a known freshness expectation.

Allowed freshness examples:

* real-time query
* refreshed on page load
* refreshed daily
* refreshed by scheduled analytics job

IF an indicator is delayed enough to affect operational decisions

THEN the UI or surrounding PRD SHALL document the expected freshness.

## Empty And Missing Data Requirements

IF source data is unavailable

THEN the indicator SHALL show an empty state or be omitted.

The system SHALL distinguish:

* no data yet
* no change
* tracking not started
* metric temporarily unavailable

The system SHALL NOT manufacture positive or negative indicators when source data is missing.

## Privacy Requirements

Indicators SHALL be aggregated enough to avoid exposing individual user behavior.

Academy owners and Academy Admins SHALL NOT be able to infer a specific member's activity from low-count indicators.

Consumer-facing discovery indicators SHALL be introduced only with separate privacy and ranking requirements.

## Integrity Requirements

Where relevant, indicator calculations SHALL exclude:

* test data
* duplicate events
* spam or bot-like activity
* internal/admin actions that should not count as external engagement
* deleted or disabled records when the metric definition excludes them

## Acceptance Criteria

* No stat indicator ships without a documented metric definition.
* Directional indicators have a documented comparison window.
* Non-directional period counts do not use arrows by default.
* Missing data produces a factual empty state or no indicator.
* Indicators do not imply quality, popularity, or ranking without explicit requirements.
* Academy-scoped indicators do not leak cross-academy data.
