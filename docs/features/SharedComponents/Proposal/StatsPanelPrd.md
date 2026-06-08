# PRD: StatsPanel

## Status

Proposal

## Component Name

`StatsPanel`

## Feature Area

Shared dashboard metric panels and reusable admin board item surfaces.

## Objective

Create a reusable `StatsPanel` component that displays configurable dashboard metric items with the same component discipline and item behavior expectations as `QuickActionPanel`.

The component SHALL replace the current inline admin dashboard `StatCard` pattern in `src/app/admin/page.tsx` once implemented.

The implementation SHOULD reuse the same panel item foundation as `QuickActionPanel` where practical, or introduce a shared subcomponent that both panels can consume without changing each panel's product behavior.

## Current Context

The admin dashboard currently renders stat cards inline in `src/app/admin/page.tsx` using a local `StatCard` helper.

For platform-level admins, the current dashboard stat row includes:

* `Total Academies`
* `Verified Academies`
* `Pending Verification`
* `Total Users`
* `Open Mats`

For Academy Admins, the dashboard stat row SHALL include only:

* `Academy Users`
* `Academy Rolls`

Academy Admins SHALL NOT see academy record count, verified academy count, or pending verification count in the top dashboard stats.

Each card shows:

* Icon surface.
* Label.
* Primary value.
* Optional `StatIndicator`.

Related requirements:

* `docs/features/SharedComponents/Completed/StatIndicator.md`
* `docs/features/Users/Platform/Products/Completed/AdminDashboardStatIndicators.md`
* `docs/features/SharedComponents/Proposal/QuickActionPanelPrd.md`

## In Scope

* A reusable `StatsPanel` component.
* A reusable `StatItem` component inside the StatsPanel component set.
* A shared panel item base component or primitive that can be used by both `StatsPanel` and `QuickActionPanel` if implementation proves clean.
* Configurable maximum number of visible stat items.
* Content-driven item width on tablet and desktop.
* Role-scoped item data provided by callers.
* Support for icons, labels, values, and `StatIndicator`.
* Collapsed-by-default behavior for the dashboard Stats Board.
* Optional persisted collapse preference per browser/session.
* Accessibility requirements for metric cards.
* Implementation guidance for replacing the inline admin dashboard stat card row.

## Out Of Scope

* New metric calculations.
* New database schema.
* New dashboard permissions.
* New trend or comparison logic beyond existing `StatIndicator` requirements.
* Changing `StatIndicator` semantics.
* Changing QuickActionPanel routes or action behavior.

## Product Requirements

### Dashboard Space Management

IF the dashboard renders a Stats Board above primary content

WHEN the stat cards render expanded by default

THEN the metric card group can push the main dashboard content down before the user has chosen to review those metrics.

AND the dashboard SHALL allow the Stats Board to be collapsed so operational content can move up.

### Reusable Component

IF dashboard stat cards are needed

WHEN the page renders a metric group

THEN the page SHALL use `StatsPanel` instead of duplicating inline stat-card markup.

AND `StatsPanel` SHALL receive item data from the caller.

AND `StatsPanel` SHALL render only the stat items passed to it.

AND permission and role filtering SHALL happen before items are passed into the component.

### Component Composition

IF `StatsPanel` is implemented

WHEN the component set is created

THEN `StatsPanel` SHALL compose smaller components.

AND every stat card SHALL be rendered by a `StatItem` component.

AND `StatItem` SHALL live inside the `StatsPanel` component module or folder.

AND `StatsPanel` SHALL own layout, heading, item limiting, and empty-state behavior.

AND `StatItem` SHALL own icon surface, label, value, indicator placement, value formatting, focus treatment, and optional link behavior.

### Shared Item Primitive

IF `QuickActionPanel` and `StatsPanel` share the same item surface behavior

WHEN implementation starts

THEN the implementation SHOULD introduce a shared subcomponent such as `PanelItemSurface`, `DashboardPanelItem`, or an equivalent local primitive.

AND the shared primitive SHALL support:

* Content-driven width.
* Mobile full-width behavior.
* Bounded min and max widths.
* Icon surface slot.
* Main content slot.
* Optional trailing slot.
* Active state.
* Disabled state.
* Optional link wrapper.
* Accessible label support.

AND `QuickActionPanel.ActionItem` MAY reuse this primitive for action-specific rendering.

AND `StatsPanel.StatItem` MAY reuse this primitive for metric-specific rendering.

AND reuse SHALL NOT force stat cards to behave like navigation actions unless the stat item explicitly has an `href`.

AND reuse SHALL NOT remove the chevron, active, disabled, and link behavior currently required for QuickActionPanel items.

### Matching Item Functionality

IF `StatsPanel` supports item behavior

WHEN compared to `QuickActionPanel`

THEN both panel item types SHALL support the same base item capabilities where they make product sense:

* `id`
* `icon`
* `active`
* `disabled`
* optional `href`
* optional `ariaLabel`
* content-driven width
* mobile full-width behavior
* `maxItems` limiting at panel level
* empty-state handling at panel level

AND `QuickActionPanel` SHALL keep action-specific fields:

* `title`
* `description`
* required `href` for enabled actions
* trailing chevron

AND `StatsPanel` SHALL keep stat-specific fields:

* `label`
* `value`
* optional `indicator`
* optional metric tone or icon color
* optional `href` only when a metric card intentionally navigates to a detail view

### Configurable Item Count

IF the caller provides more stats than should be shown

WHEN `maxItems` is configured

THEN `StatsPanel` SHALL render no more than `maxItems` visible stat items.

AND hidden overflow stats SHALL NOT reserve visual space.

AND the default `maxItems` SHALL be undefined, meaning all provided stats render.

### Content-Driven Layout

IF the component renders on tablet or desktop

WHEN stat items are visible

THEN each stat item width SHALL be determined by its own content.

AND stat items SHALL NOT be forced into equal-width grid tracks.

AND stat items SHALL use minimum and maximum width constraints only to preserve usability.

AND the layout SHALL wrap without rendering empty placeholder cells.

IF the viewport is mobile width

WHEN stat items render

THEN each stat item SHALL stack as a full-width row or card.

AND metric text SHALL wrap without overflowing.

### Collapsible Default State

IF the `StatsPanel` renders as the dashboard Stats Board

WHEN the user has not previously chosen an expand/collapse preference

THEN the panel SHALL render collapsed by default.

AND the collapsed panel SHALL show only the `Stats Board` header row and the expand/collapse control.

AND the collapsed panel SHALL NOT render or reserve vertical space for stat cards.

AND the main dashboard content SHALL move up when the panel is collapsed.

IF the user activates the expand control

WHEN the panel expands

THEN the panel SHALL reveal the same role-scoped stat cards without navigating away from the current dashboard panel.

AND the control SHALL update its icon and accessible state to communicate the expanded state.

IF the user activates the collapse control

WHEN the panel collapses

THEN the panel SHALL hide the stat card list without losing current dashboard context.

AND the control SHALL update its icon and accessible state to communicate the collapsed state.

### Collapse Preference Persistence

IF the user expands or collapses the Stats Board

WHEN the dashboard is revisited in the same browser session

THEN the panel SHOULD restore the user's last chosen expanded/collapsed state.

AND the default collapsed state SHALL apply only when no saved preference exists.

AND persistence SHOULD use session storage or an equivalent browser-local mechanism.

AND persistence SHALL NOT require a database write.

AND persistence SHALL NOT be shared across different users on different browsers.

### Accessibility

IF the panel is collapsible

WHEN the header control renders

THEN the control SHALL be a keyboard-operable button.

AND the button SHALL expose `aria-expanded`.

AND the button SHALL expose `aria-controls` for the stat card container when the container is rendered.

AND the button SHALL have an accessible name such as `Expand Stats Board` or `Collapse Stats Board`.

AND the visual icon SHALL use a chevron or equivalent familiar disclosure indicator.

## Proposed API

```ts
type StatsPanelItem = {
  id: string;
  label: string;
  value: number | string;
  icon: React.ReactNode;
  iconTone?: "blue" | "orange" | "teal" | "violet" | "neutral";
  indicator?: {
    label: string;
    tone?: StatIndicatorTone;
    value?: number | string;
    ariaLabel?: string;
  };
  active?: boolean;
  disabled?: boolean;
  href?: string;
  ariaLabel?: string;
};

type StatsPanelProps = {
  title?: string;
  items: StatsPanelItem[];
  maxItems?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  persistCollapseState?: boolean;
  collapseStorageKey?: string;
  emptyBehavior?: "hide" | "message";
  emptyMessage?: string;
  className?: string;
};
```

## Component Structure Specification

Recommended structure:

```text
src/components/StatsPanel/
├── StatItem.tsx
├── StatsPanel.tsx
├── types.ts
├── index.ts
└── __tests__/
    └── StatsPanel.test.tsx
```

If a shared item primitive is introduced:

```text
src/components/PanelItemSurface/
├── PanelItemSurface.tsx
├── types.ts
└── index.ts
```

The exact folder name may differ, but the shared primitive SHALL remain generic and SHALL NOT contain action-specific or stat-specific copy.

## Admin Dashboard Replacement Requirement

IF this PRD is implemented

WHEN `src/app/admin/page.tsx` renders the top metric row

THEN the inline `StatCard` helper SHALL be replaced by `StatsPanel`.

AND the current stat labels, values, icons, tones, and `StatIndicator` content SHALL remain functionally unchanged unless another PRD changes them.

AND Academy Admin counts SHALL remain assigned-academy scoped.

AND Academy Admin stat rows SHALL include only users within the assigned academy and rolls within the assigned academy.

AND Academy Admin stat rows SHALL NOT include `My Academy`, `Verified`, `Verified Academies`, or `Pending Verification` stats.

AND Platform Admin and Super Admin counts SHALL remain scoped according to existing policy.

AND the top dashboard Stats Board usage SHALL configure `StatsPanel` as collapsible.

AND the top dashboard Stats Board usage SHALL default to collapsed when no saved browser preference exists.

AND the top dashboard Stats Board usage SHOULD persist the user's expanded/collapsed preference for the current browser session.

AND secondary stats panels inside detail views MAY remain expanded unless another PRD requires them to collapse.

## Acceptance Criteria

1. `StatsPanel` is implemented as a reusable component outside `src/app/admin/page.tsx`.
2. `StatItem` is implemented as a component inside the StatsPanel component set.
3. A shared item primitive is used by both `StatsPanel` and `QuickActionPanel` if it can be done without weakening either component's behavior.
4. `StatsPanel` supports `maxItems`.
5. Hidden stat items do not reserve empty visual space.
6. Stat items are content-width on tablet and desktop, not equal-width.
7. Mobile layout stacks stat items cleanly.
8. `StatIndicator` is reused for metric context.
9. Existing admin dashboard metric labels, values, indicators, and role scoping remain unchanged.
10. Dashboard Stats Board renders collapsed by default when no saved preference exists.
11. Collapsed Stats Board does not reserve stat-card whitespace.
12. Expanding Stats Board reveals the same role-scoped stat cards.
13. The expand/collapse control is keyboard accessible and exposes `aria-expanded`.
14. The user's expand/collapse preference is restored for the current browser session when persistence is enabled.
15. TypeScript, unit tests, and production build checks pass.

## Test Requirements

Automated tests SHOULD verify:

* `StatsPanel` renders supplied stat items.
* `StatsPanel` respects `maxItems`.
* Empty behavior can hide the component or show a message.
* `StatItem` formats numeric values with locale separators.
* `StatItem` renders `StatIndicator` when provided.
* Disabled linked stat items do not navigate.
* Optional linked stat items render as links only when `href` exists and item is not disabled.
* Stat items expose accessible labels.
* Shared item primitive behavior does not regress QuickActionPanel tests.
* `StatsPanel` renders collapsed by default when configured with `defaultCollapsed`.
* Collapsed `StatsPanel` renders the heading and disclosure button but not stat cards.
* Expanded `StatsPanel` renders the role-scoped stat cards.
* The disclosure button exposes `aria-expanded` and toggles state.
* Session persistence restores the user's last expanded/collapsed state when enabled.
* Admin dashboard configures the top Stats Board as collapsible and collapsed by default.

Visual or browser verification SHOULD cover:

* Desktop with one stat item.
* Desktop with two stat items.
* Desktop with five stat items.
* Desktop with Stats Board collapsed by default.
* Desktop after expanding Stats Board.
* Mobile with Stats Board collapsed by default.
* Mobile after expanding Stats Board.
* Mobile stacked layout.
* Academy Admin stat row.
* Platform Admin or Super Admin stat row.

## Current Implementation Status

Reviewed against source code on 2026-06-07.

Status: Not implemented.

Implemented:

* Inline `StatCard` exists in `src/app/admin/page.tsx`.
* `StatIndicator` exists and is used by the inline stat card.
* Admin dashboard metric data is already role-scoped by current admin dashboard queries.

MVP gaps:

* No reusable `StatsPanel` component exists.
* No reusable `StatItem` component exists.
* StatsPanel and QuickActionPanel do not yet share a base item primitive.
* Inline stat-card markup remains tied to `src/app/admin/page.tsx`.
