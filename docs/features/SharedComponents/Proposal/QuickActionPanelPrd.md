# PRD: QuickActionPanel

## Status

Proposal

## Component Name

`QuickActionPanel`

## Feature Area

Shared admin dashboard actions and compact action lists.

## Objective

Create a reusable `QuickActionPanel` component that displays a configurable set of role-aware action cards without leaving empty grid spaces when fewer actions are available.

The component SHALL replace the current inline Quick Actions section in `src/app/admin/page.tsx` and SHALL be reusable by future dashboard or panel views that need compact action shortcuts.

## Current Context

The admin dashboard currently renders Quick Actions inline in `src/app/admin/page.tsx` around the `Quick Actions` heading.

The current layout uses a fixed responsive grid. When policy filtering removes actions, such as hiding Academy Claims for academy admins, the remaining cards can leave large empty horizontal spaces or appear stretched across the dashboard.

Related requirements:

* `docs/features/Users/Platform/Products/EnhanceAdminPage.md`
* `docs/features/Users/Platform/Products/AdminDashboardRestructureWithPagination.md`
* `docs/features/Users/Academies/Products/AcademyAdminWithDashboardRoles.md`
* `docs/features/SharedComponents/Reviewing/SidePanelControlPrd.md`

## In Scope

* A reusable `QuickActionPanel` component.
* Compact responsive layout that fits the number of visible actions.
* Configurable maximum number of visible items.
* Role-aware item filtering through caller-provided action data.
* Active action styling.
* Empty-state handling.
* Accessibility requirements for action links.
* Implementation guidance for replacing the existing admin dashboard Quick Actions section.

## Out Of Scope

* New admin routes.
* New admin permissions.
* New database schema.
* New analytics tracking unless added by a separate PRD.
* Replacing the side navigation.
* Changing existing dashboard panel behavior beyond the Quick Actions layout.

## User Problem

IF an administrator sees the Quick Actions area

WHEN some actions are hidden by role policy

THEN the action area can show excessive blank space.

AND the layout can feel unfinished because visible cards do not fit their content count.

AND the same action-card pattern is not reusable outside the current admin dashboard file.

## Product Requirements

### Reusable Component

IF Quick Actions are needed on an admin-facing page

WHEN the page renders action shortcuts

THEN the page SHALL use `QuickActionPanel` instead of duplicating inline grid markup.

AND the component SHALL accept a list of action item objects.

AND the component SHALL render only the action items passed to it.

AND the component SHALL NOT know platform-specific permission rules internally.

AND permission filtering SHALL be performed by the caller before items are passed to the component.

### Configurable Item Count

IF the caller provides more actions than should be shown

WHEN `maxItems` is configured

THEN `QuickActionPanel` SHALL render no more than `maxItems` visible actions.

AND hidden overflow actions SHALL NOT leave reserved empty cells.

AND the default `maxItems` SHALL be undefined, meaning all provided actions render.

AND the caller SHALL be able to configure `maxItems` per usage.

### Fit-To-Content Layout

IF the component receives one visible action

WHEN the panel renders on desktop

THEN the action card SHALL fit its content with a sensible maximum width instead of stretching across the entire dashboard.

IF the component receives two visible actions

WHEN the panel renders on desktop

THEN the layout SHALL use two compact columns or an equivalent fit-to-content row without a third empty column.

IF the component receives three or more visible actions

WHEN the panel renders on desktop

THEN the layout SHALL wrap into as many compact columns as the available space and configured item count support.

AND the component SHALL NOT render empty placeholder cards.

AND the component SHALL NOT reserve grid tracks for hidden actions.

AND the component SHALL keep vertical spacing tight enough that the Quick Actions area visually fits its rendered content.

### Responsive Layout

IF the viewport is mobile width

WHEN the component renders

THEN actions SHALL stack in a single column.

AND each action target SHALL remain at least `44px` high.

AND labels and descriptions SHALL wrap without overflowing.

IF the viewport is tablet or desktop width

WHEN multiple actions are visible

THEN the component SHALL use a wrapping layout with bounded card widths.

AND the component SHALL avoid large empty gaps caused by fixed full-width grid columns.

### Action Item Content

Each action item SHALL support:

* `id`
* `title`
* `description`
* `href`
* `icon`
* `active`
* optional `disabled`
* optional `ariaLabel`

The component SHOULD support optional item metadata for future usage, but metadata SHALL NOT render unless explicitly supported.

### Active And Disabled States

IF an action is active

WHEN the panel renders

THEN the action SHALL show the existing active visual treatment used by admin action cards.

AND active state SHALL not rely on color alone.

IF an action is disabled

WHEN the panel renders

THEN the action SHALL remain visible only when the caller intentionally passes it as disabled.

AND disabled actions SHALL not navigate.

AND disabled actions SHALL expose `aria-disabled="true"`.

### Empty State

IF the component receives no visible action items

WHEN the panel renders

THEN it SHALL either render nothing or render a compact empty state based on caller configuration.

AND the admin dashboard SHOULD render nothing for empty Quick Actions to avoid dead space.

### Accessibility

IF an action has icon-only or ambiguous visible text

WHEN the component renders

THEN it SHALL provide a clear accessible label.

AND every action SHALL be keyboard focusable unless disabled.

AND focus styles SHALL be visible.

AND semantic links SHALL be used for navigation actions.

AND the heading SHALL be configurable so pages can preserve correct heading order.

## UX Requirements

The panel SHALL preserve the current RollFinders admin visual language:

* White action surfaces.
* Stone borders and subtle shadows.
* Teal icon tile treatment.
* Compact typography.
* `rounded-md` or `rounded-lg` radius.
* Existing active border treatment.

The panel SHALL feel like a compact shortcut group, not a full-width content section.

The panel SHALL avoid creating a large blank row when only one or two actions are visible.

## Proposed API

```ts
type QuickActionPanelItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

type QuickActionPanelProps = {
  title?: string;
  items: QuickActionPanelItem[];
  maxItems?: number;
  emptyBehavior?: "hide" | "message";
  emptyMessage?: string;
  className?: string;
};
```

## Layout Implementation Specification

The implementation SHOULD use a wrapping layout instead of a fixed `lg:grid-cols-3` grid.

Recommended approach:

* Use `flex flex-wrap`.
* Give each card a bounded width such as `min-w-[18rem]` and `max-w-[28rem]`.
* Use `w-full` on mobile.
* Use `sm:w-[min(28rem,100%)]` or equivalent responsive constraints on wider screens.
* Avoid `flex-1` when it causes one or two cards to stretch across large desktop widths.

The exact classes may differ if the implementation produces the same fit-to-content behavior.

## Admin Dashboard Replacement Requirement

IF this PRD is implemented

WHEN `src/app/admin/page.tsx` renders the Quick Actions section

THEN the inline section around the `Quick Actions` heading SHALL be replaced by `QuickActionPanel`.

AND the dashboard SHALL pass only actions allowed by the current admin policy.

AND Academy Admin users SHALL see only academy-appropriate actions.

AND Platform Admin and Super Admin users SHALL retain their current available actions.

AND the current links SHALL remain unchanged unless another PRD changes them:

* Manage Academies or My Academy: `/admin?panel=academies`
* Academy Claims: `/admin?panel=academy-claims`
* Manage Open Mats or Manage Rolls: `/admin?panel=open-mats`
* Manage Users: `/admin?panel=users`

## Acceptance Criteria

1. `QuickActionPanel` is implemented as a reusable component outside `src/app/admin/page.tsx`.
2. The admin dashboard uses `QuickActionPanel` for its Quick Actions section.
3. `maxItems` controls the number of rendered actions.
4. Hidden actions do not reserve empty visual space.
5. One or two visible actions fit their content instead of stretching across the full dashboard width.
6. Mobile layout stacks actions cleanly.
7. Existing admin action titles, descriptions, icons, active states, and routes remain functionally unchanged.
8. Academy Admins do not see platform-only quick actions.
9. Platform Admin and Super Admin functionality is not removed or regressed.
10. TypeScript, unit tests, and production build checks pass.

## Test Requirements

Automated tests SHOULD verify:

* Rendering one action does not render placeholder items.
* Rendering two actions does not render placeholder items.
* `maxItems` limits rendered actions.
* Active action state is exposed.
* Disabled action state does not provide navigation.
* Empty behavior can hide the component.
* Admin dashboard passes role-filtered action items.

Visual or browser verification SHOULD cover:

* Desktop with one visible action.
* Desktop with two visible actions.
* Desktop with three or more visible actions.
* Mobile stacked layout.
* Academy Admin quick actions.
* Platform Admin or Super Admin quick actions.

## Current Implementation Status

Reviewed against source code on 2026-06-07.

Status: Not implemented.

Implemented:

* Inline Quick Actions section exists in `src/app/admin/page.tsx`.
* Existing action card styling exists through the local `ActionCard` implementation.
* Role-aware filtering is partially applied by conditionally rendering Academy Claims for elevated admins.

MVP gaps:

* No reusable `QuickActionPanel` component exists.
* Quick Actions layout can leave excessive blank space when fewer actions are visible.
* The number of visible items is not configurable through a reusable prop.
* The inline implementation is tied to `src/app/admin/page.tsx`.
