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
* `../Reviewing/SidePanelControlPrd.md`

## In Scope

* A reusable `QuickActionPanel` component.
* A reusable `ActionItem` component owned by the Quick Action component set.
* Compact responsive layout that fits the number of visible actions.
* Configurable maximum number of visible items.
* Role-aware item filtering through caller-provided action data.
* Active action styling.
* Collapsed-by-default behavior with an accessible expand/collapse control.
* Optional persisted collapse preference per browser/session.
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

AND when Quick Actions render expanded by default, the card row can push the main dashboard content down before the user has chosen to use those shortcuts.

## Product Requirements

### Reusable Component

IF Quick Actions are needed on an admin-facing page

WHEN the page renders action shortcuts

THEN the page SHALL use `QuickActionPanel` instead of duplicating inline grid markup.

AND the component SHALL accept a list of action item objects.

AND the component SHALL render only the action items passed to it.

AND the component SHALL NOT know platform-specific permission rules internally.

AND permission filtering SHALL be performed by the caller before items are passed to the component.

### Component Composition

IF Quick Actions are implemented

WHEN the component set is created

THEN `QuickActionPanel` SHALL compose smaller reusable components instead of keeping all markup inside one component.

AND each rendered action SHALL be rendered by an `ActionItem` component.

AND `ActionItem` SHALL live inside the Quick Action component module or folder.

AND `ActionItem` SHALL be reusable by `QuickActionPanel` and any closely related action-list variant.

AND `QuickActionPanel` SHALL own layout, heading, item limiting, and empty-state behavior.

AND `ActionItem` SHALL own the visual rendering, active state, disabled state, icon tile, text wrapping, focus treatment, and link behavior for a single action.

AND callers SHALL pass action data to `QuickActionPanel`, not hand-written action card JSX.

AND callers SHOULD NOT import `ActionItem` directly unless there is a clear future usage that needs one-off item rendering.

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

AND the action card SHALL NOT be forced to the same width as sibling action cards on tablet or desktop.

AND each action card width SHALL be determined by its own title and description content, with minimum and maximum width constraints only to preserve usability.

IF the component receives two visible actions

WHEN the panel renders on desktop

THEN the layout SHALL use a compact fit-to-content row without a third empty column.

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

AND each action item SHALL keep an independent content-driven width instead of sharing equal grid tracks.

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

### Collapsible Default State

IF the `QuickActionPanel` renders on the dashboard

WHEN the user has not previously chosen an expand/collapse preference

THEN the panel SHALL render collapsed by default.

AND the collapsed panel SHALL show only the Quick Actions header row and the expand/collapse control.

AND the collapsed panel SHALL NOT render or reserve vertical space for action cards.

AND the main dashboard content SHALL move up when the panel is collapsed.

AND the Side Panel SHALL remain the always-visible primary navigation path for the same workflows.

IF the user activates the expand control

WHEN the panel expands

THEN the panel SHALL reveal the action card list without navigating away from the current dashboard panel.

AND the control SHALL update its icon and accessible state to communicate the expanded state.

IF the user activates the collapse control

WHEN the panel collapses

THEN the panel SHALL hide the action card list without losing current dashboard context.

AND the control SHALL update its icon and accessible state to communicate the collapsed state.

### Collapse Preference Persistence

IF the user expands or collapses Quick Actions

WHEN the dashboard is revisited in the same browser session

THEN the panel SHOULD restore the user's last chosen expanded/collapsed state.

AND the default collapsed state SHALL apply only when no saved preference exists.

AND persistence SHOULD use session storage or an equivalent browser-local mechanism.

AND persistence SHALL NOT require a database write.

AND persistence SHALL NOT be shared across different users on different browsers.

### Accessibility

IF an action has icon-only or ambiguous visible text

WHEN the component renders

THEN it SHALL provide a clear accessible label.

AND every action SHALL be keyboard focusable unless disabled.

AND focus styles SHALL be visible.

AND semantic links SHALL be used for navigation actions.

AND the heading SHALL be configurable so pages can preserve correct heading order.

IF the panel is collapsible

WHEN the header control renders

THEN the control SHALL be a keyboard-operable button.

AND the button SHALL expose `aria-expanded`.

AND the button SHALL expose `aria-controls` for the action card container when the container is rendered.

AND the button SHALL have an accessible name such as `Expand Quick Actions` or `Collapse Quick Actions`.

AND the visual icon SHALL use a chevron or equivalent familiar disclosure indicator.

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

The collapsed state SHALL be visually compact: header text, chevron/disclosure button, border, and no hidden-card whitespace.

The expanded state SHALL preserve the existing action-card visual style.

## Proposed API

```ts
type ActionItemData = {
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
  items: ActionItemData[];
  maxItems?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  persistCollapseState?: boolean;
  collapseStorageKey?: string;
  emptyBehavior?: "hide" | "message";
  emptyMessage?: string;
  className?: string;
};

type ActionItemProps = {
  item: ActionItemData;
};
```

## Component Structure Specification

The implementation SHOULD use a dedicated component folder so future action panel variants can reuse the same item component.

Recommended structure:

```text
src/components/QuickActionPanel/
├── ActionItem.tsx
├── QuickActionPanel.tsx
├── index.ts
└── __tests__/
    └── QuickActionPanel.test.tsx
```

`index.ts` SHOULD export:

* `QuickActionPanel`
* `type QuickActionPanelProps`
* `type ActionItemData`

`ActionItem` MAY be exported from the folder if implementation requires direct testing or future reuse, but normal admin pages SHOULD consume `QuickActionPanel` only.

## Layout Implementation Specification

The implementation SHOULD use a wrapping layout instead of a fixed `lg:grid-cols-3` grid.

Recommended approach:

* Use `flex flex-wrap`.
* Give each card content-driven width such as `w-fit`.
* Add safety bounds such as `min-w-[18rem]` and `max-w-[34rem]`.
* Use `w-full` on mobile.
* Use `sm:w-fit` or equivalent responsive constraints on wider screens.
* Avoid `flex-1`, fixed equal widths, or equal grid tracks when they cause cards to share the same width regardless of content.

The exact classes may differ if the implementation produces the same fit-to-content behavior.

## Admin Dashboard Replacement Requirement

IF this PRD is implemented

WHEN `src/app/admin/page.tsx` renders the Quick Actions section

THEN the inline section around the `Quick Actions` heading SHALL be replaced by `QuickActionPanel`.

AND the dashboard SHALL pass only actions allowed by the current admin policy.

AND Academy Admin users SHALL see only academy-appropriate actions.

AND Platform Admin and Super Admin users SHALL retain their current available actions.

AND every visible Quick Action SHALL have a matching primary Side Panel navigation item for the same role and destination.

AND Quick Actions SHALL NOT be the only way to reach primary dashboard workflows.

AND the Side Panel item SHALL use the same title or a clearly equivalent concise label.

AND the Side Panel item SHALL be omitted whenever the Quick Action is omitted for role policy.

AND the dashboard Quick Actions usage SHALL configure the panel as collapsible.

AND the dashboard Quick Actions usage SHALL default to collapsed when no saved browser preference exists.

AND the dashboard Quick Actions usage SHOULD persist the user's expanded/collapsed preference for the current browser session.

AND the current canonical dashboard links SHALL remain unchanged unless another PRD changes them:

* Manage Academies or My Academy: `/dashboard?panel=academies`
* Academy Profile Summary: `/admin/academies/{academyId}`
* Academy Review: `/dashboard?panel=platform-admin-academies`
* Academy Claims: `/dashboard?panel=academy-claims`
* Manage Open Mats or Manage Rolls: `/dashboard?panel=open-mats`
* Manage Users: `/dashboard?panel=users`
* Analytics: `/dashboard?panel=analytics`
* Map: `/dashboard?panel=maps`
* Settings: `/dashboard?panel=settings`

Settings-specific Quick Actions SHALL use the same component and detail-panel pattern for:

* Change Password: `/dashboard?panel=settings&settingsAction=change-password`
* Email Options: `/dashboard?panel=settings&settingsAction=email-options`
* Recent Audits: `/dashboard?panel=settings&settingsAction=recent-audits`
* Weekly Activity Summary: `/dashboard?panel=settings&settingsAction=weekly-activity`

Weekly Activity Summary SHALL only be shown to Platform Admin and Super Admin users.

Weekly Activity Summary SHALL be omitted for Academy Admin and Standard User accounts.

Legacy admin links SHALL only be used when intentionally preserving old-route compatibility:

* Manage Academies or My Academy: `/admin?panel=academies`
* Academy Claims: `/admin?panel=academy-claims`
* Manage Open Mats or Manage Rolls: `/admin?panel=open-mats`
* Manage Users: `/admin?panel=users`

## Acceptance Criteria

1. `QuickActionPanel` is implemented as a reusable component outside `src/app/admin/page.tsx`.
2. `ActionItem` is implemented as a component inside the `QuickActionPanel` component set.
3. `QuickActionPanel` renders actions through `ActionItem`, not duplicated inline action card markup.
4. The admin dashboard uses `QuickActionPanel` for its Quick Actions section.
5. `maxItems` controls the number of rendered actions.
6. Hidden actions do not reserve empty visual space.
7. One or two visible actions fit their content instead of stretching across the full dashboard width.
8. Mobile layout stacks actions cleanly.
9. Existing admin action titles, descriptions, icons, active states, and routes remain functionally unchanged.
10. Academy Admins do not see platform-only quick actions.
11. Platform Admin and Super Admin functionality is not removed or regressed.
12. Every visible Quick Action has a corresponding role-permitted primary Side Panel item.
13. Settings remains the final primary Side Panel item before Help & Support and Logout.
14. Quick Actions renders collapsed by default when no saved preference exists.
15. Collapsed Quick Actions does not reserve card-row whitespace.
16. Expanding Quick Actions reveals the same role-filtered action cards.
17. The expand/collapse control is keyboard accessible and exposes `aria-expanded`.
18. The user's expand/collapse preference is restored for the current browser session when persistence is enabled.
19. TypeScript, unit tests, and production build checks pass.

## Test Requirements

Automated tests SHOULD verify:

* Rendering one action does not render placeholder items.
* Rendering two actions does not render placeholder items.
* `maxItems` limits rendered actions.
* Active action state is exposed.
* Disabled action state does not provide navigation.
* Empty behavior can hide the component.
* `QuickActionPanel` renders the expected number of `ActionItem` outputs.
* `ActionItem` renders title, description, icon, active state, disabled state, and accessible label correctly.
* Admin dashboard passes role-filtered action items.
* Admin dashboard side-panel navigation includes corresponding items for every visible primary Quick Action.
* Settings stays after Manage Academies, Manage Open Mats, Manage Users, Analytics, Academy Review, Academy Claims, and Map in the primary side-panel ordering.
* `QuickActionPanel` renders collapsed by default when configured with `defaultCollapsed`.
* Collapsed `QuickActionPanel` renders the heading and disclosure button but not action cards.
* Expanded `QuickActionPanel` renders the permitted action cards.
* The disclosure button exposes `aria-expanded` and toggles state.
* Session persistence restores the user's last expanded/collapsed state when enabled.

Visual or browser verification SHOULD cover:

* Desktop with one visible action.
* Desktop with two visible actions.
* Desktop with three or more visible actions.
* Desktop with Quick Actions collapsed by default.
* Desktop after expanding Quick Actions.
* Mobile with Quick Actions collapsed by default.
* Mobile after expanding Quick Actions.
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
