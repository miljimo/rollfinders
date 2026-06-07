# PRD: Stat Indicator Component

## Implementation Metadata

- Suggested component name: `StatIndicator`
- Suggested branch name: `feature/stat-indicator-component`
- Status: Completed

## Objective

Create a reusable stat indicator pattern for compact metric context such as `8 this month`, `3 this week`, `+4 vs last week`, `No change this week`, and `Needs attention`.

Stat indicators SHALL be factual, accessible, and visually secondary to the primary metric value. They SHALL NOT be used as decorative green arrows or unsupported trend claims.

## Problem

RollFinders currently has metric cards and local dashboard metric implementations, but there is no shared rule for small indicator text such as `↗ 8 this month`.

Without a shared requirement, indicators can become misleading, hardcoded, inconsistent, or imply growth, quality, popularity, or success without a real calculation.

## Component Relationship

`StatIndicator` SHALL be usable inside the shared `MetricCard` component and in compact dashboard summary panels.

`MetricCard` owns the card layout.

`StatIndicator` owns the compact metric context, direction icon, tone, and accessible meaning.

## Display Requirements

IF a metric card includes compact metric context

WHEN the metric card renders

THEN the UI SHALL render the indicator as secondary text near the metric value.

AND the primary metric value SHALL remain visually dominant.

AND the indicator SHALL use one consistent placement within a metric grid.

AND the indicator SHALL remain readable on desktop and mobile.

AND the indicator SHALL NOT resize the card unpredictably or overlap adjacent content.

## Supported Tones

`StatIndicator` SHALL support:

* `neutral` for factual period counts, unchanged values, unavailable comparisons, and ambiguous outcomes.
* `positive` for movement that is beneficial according to product rules.
* `negative` for movement that is harmful according to product rules.
* `warning` for values that need attention but are not strictly positive or negative.

Color SHALL NOT be the only way meaning is communicated.

## Supported Direction

`StatIndicator` SHALL support:

* `up`
* `down`
* `flat`
* `none`

Directional icons SHALL only be shown when the indicator represents a real comparison, delta, or directional state.

Plain period counts such as `8 this month` SHALL NOT show an upward arrow unless the product requirement defines the value as a positive delta against a baseline.

## Copy Requirements

Indicator copy SHALL be short and scannable.

Indicator copy SHALL include a period, status, or context, such as:

* `this week`
* `this month`
* `vs last week`
* `vs last month`
* `pending`
* `overdue`

Indicator copy SHALL NOT use vague or unsupported claims such as:

* `hot`
* `popular`
* `trending`
* `growing fast`
* `best`
* `top`

unless a separate product PRD defines the calculation and disclosure requirements for that claim.

## Empty And No-Data States

IF indicator data is missing

WHEN the indicator renders

THEN the UI SHALL either omit the indicator or show a muted factual fallback.

Allowed fallback examples:

* `No data yet`
* `No change this week`
* `Tracking starts now`
* `Not enough data`

The UI SHALL NOT show a directional icon when the baseline is unknown.

## Accessibility Requirements

IF an indicator uses an icon

WHEN assistive technology reads the metric card

THEN the accessible label SHALL communicate the indicator meaning in plain language.

AND decorative icons SHALL be hidden from assistive technology when the accessible label already explains the meaning.

AND screen readers SHALL NOT be forced to announce raw icon names such as `north east arrow`.

AND color SHALL NOT be the only indicator of positive, negative, warning, or neutral meaning.

AND text and icon contrast SHALL meet WCAG AA on supported card backgrounds.

## Responsive Requirements

IF a metric card is rendered in a narrow viewport

WHEN the indicator text is longer than one line

THEN the indicator MAY wrap below the metric value.

AND the indicator SHALL NOT overflow its card.

AND the indicator SHALL NOT force surrounding cards to overlap.

AND truncation SHALL be used only when the full meaning remains available through an accessible label or tooltip.

## Proposed Component API

```ts
type StatIndicatorTone = "neutral" | "positive" | "negative" | "warning";

type StatIndicatorDirection = "up" | "down" | "flat" | "none";

type StatIndicatorProps = {
  value?: string | number;
  label: string;
  tone?: StatIndicatorTone;
  direction?: StatIndicatorDirection;
  ariaLabel?: string;
  className?: string;
};
```

## Acceptance Criteria

* `StatIndicator` renders neutral, positive, negative, and warning states.
* Directional icons render only for `up`, `down`, and `flat`.
* `none` renders no directional icon.
* Numeric values are localized when supplied as numbers.
* Icon-only meaning is never required.
* `MetricCard` can render `StatIndicator` without custom per-page markup.
* Hardcoded decorative green-arrow indicators are not introduced.
