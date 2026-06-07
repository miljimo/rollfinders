# PRD: Side Panel Control

## Status

Reviewing

## Component Name

`SidePanelControl`

## Feature Area

Shared admin navigation and responsive shell controls.

## Objective

Create a shared side panel control for the RollFinders admin board that supports:

* Expanded desktop sidebar.
* Collapsed desktop rail.
* Mobile off-canvas drawer.
* Role-aware navigation items.
* Accessible controls, labels, active states, and keyboard behavior.

The component SHALL make admin navigation compact, predictable, and usable on desktop and mobile without duplicating sidebar logic inside each admin page.

## Current Context

The current admin side panel is implemented inside `src/app/admin/page.tsx` as `AdminSidebar`.

The existing implementation provides:

* Desktop fixed sidebar.
* Mobile checkbox-driven drawer.
* Admin navigation links.
* Brand link.
* Help and logout actions.

This PRD defines the next shared component behavior and UI/UX requirements for the side panel control.

## In Scope

* Admin board side navigation.
* Desktop expanded sidebar.
* Desktop collapsed rail.
* Mobile off-canvas drawer.
* Active item styling.
* Tooltips for collapsed labels.
* Role-based item visibility.
* Close, collapse, expand, and keyboard behavior.
* Accessibility requirements.

## Out Of Scope

* Public site header navigation.
* Footer navigation.
* Admin page content layout beyond the shell offset required by the side panel.
* New admin permissions.
* New admin routes unless separately required by role PRDs.

## Visual Direction

The UI SHALL follow the supplied design direction:

* Expanded desktop panel uses `--admin-sidebar-width: 256px`, with an acceptable rendered range of `248px` to `264px`.
* Collapsed desktop rail uses `--admin-sidebar-rail-width: 72px`, with an acceptable rendered range of `68px` to `76px`.
* Mobile drawer shown off-canvas with backdrop scrim.
* Brand mark uses the same `70px` by `70px` object-contained size in expanded and collapsed states.
* Brand area remains compact and stable, with enough height to avoid cropping the `70px` mark.
* Active state uses a tinted background plus left accent bar.
* Navigation targets remain at least `44px` high.
* Buttons use icon controls with accessible names.
* Collapsed rail shows icon-only items with hover and focus tooltips.
* Reduced-motion preferences shorten or remove panel transitions.

## Layout Requirements

### Expanded Desktop Sidebar

IF the admin viewport is desktop width

WHEN the side panel is expanded

THEN the panel SHALL render as a persistent left sidebar.

AND the panel width SHALL be driven by `--admin-sidebar-width`.

AND the panel SHALL show:

* Brand mark.
* Product name.
* User or role context when available.
* Collapse control.
* Primary admin navigation.
* Secondary support/logout actions.

AND navigation item labels SHALL be visible.

AND the active navigation item SHALL show a left accent bar.

AND the active navigation item SHALL show a subtle tinted background.

AND the brand mark SHALL render in a fixed `70px` by `70px` box.

AND the brand mark SHALL use `object-fit: contain` or equivalent behavior so it is never squashed or cropped.

AND the brand mark SHALL remain the same size when the panel is expanded and collapsed.

AND the brand area SHOULD remain approximately `80px` high to fit the `70px` mark without visual crowding.

AND the main admin content SHALL be offset using the same sidebar width token so it is not hidden behind the sidebar.

AND primary navigation SHALL be visually separated from secondary support and logout actions.

### Collapsed Desktop Rail

IF the admin viewport is desktop width

WHEN the user collapses the side panel

THEN the panel SHALL render as a persistent icon rail.

AND the rail width SHALL be driven by `--admin-sidebar-rail-width`.

AND the panel SHALL keep the brand mark visible.

AND the panel SHALL hide text labels visually.

AND every icon-only navigation item SHALL expose an accessible label.

AND every collapsed navigation item SHALL show a tooltip on hover and keyboard focus.

AND the active navigation item SHALL retain a clear visual active state.

AND the main admin content SHALL offset using the same rail width token.

AND collapsed state SHOULD persist for the current browser session.

AND collapsed desktop state SHALL NOT force the mobile drawer to open or close.

### Mobile Drawer

IF the admin viewport is mobile width

WHEN the admin opens the side panel

THEN the panel SHALL render as an off-canvas drawer.

AND the drawer width SHALL be `min(320px, 88vw)` or an equivalent responsive constraint.

AND the drawer SHALL appear above page content.

AND the drawer SHALL include a backdrop scrim.

AND the drawer SHALL include a close button.

AND opening the drawer SHALL set `aria-expanded="true"` on the opener.

AND the opener SHALL reference the drawer with `aria-controls`.

AND focus SHALL move into the drawer when it opens.

AND focus SHALL return to the opener when the drawer closes.

AND the drawer SHALL close when the user activates the close button.

AND the drawer SHALL close when the user presses `Escape`.

AND the drawer SHALL close when the user activates the backdrop.

AND the drawer SHALL close when the user activates a navigation item.

AND focus SHALL remain inside the drawer while it is open.

AND the page behind the drawer SHALL NOT scroll while the drawer is open.

AND the drawer SHALL not render as a fixed desktop column on mobile.

AND the page SHALL avoid horizontal overflow.

AND the drawer SHALL use `role="dialog"` with `aria-modal="true"` or an equivalent labelled navigation drawer pattern.

## Navigation Requirements

### Role-Aware Items

IF the authenticated admin role is known

WHEN the side panel renders

THEN the component SHALL receive or derive only the navigation items allowed for that role.

AND the side panel SHALL NOT display unauthorized links.

AND unauthorized links SHALL be omitted from the DOM, not merely disabled or hidden with CSS.

AND the active state calculation SHALL ignore unauthorized or omitted items.

AND group dividers and group labels SHALL NOT render when all items in that group are unauthorized.

AND role changes between requests SHALL NOT leave stale persisted navigation labels or routes visible.

AND the side panel SHALL use the existing admin role PRDs as the source of role visibility rules:

* Super Admin navigation requirements.
* Platform Admin navigation requirements.
* Academy Admin navigation requirements.

### Active State

IF a navigation item matches the current admin route or selected panel

WHEN the side panel renders

THEN that item SHALL be marked active.

AND the active item SHALL expose `aria-current="page"` when it maps to the current route or selected panel.

AND the active state SHALL not rely on color alone.

AND collapsed active state SHALL remain distinguishable without the text label.

AND dashboard parent matching SHALL be explicit so grouped panels such as `academies`, `open-mats`, and `users` do not accidentally mark unrelated navigation items active.

### Navigation Targets

IF a navigation item is rendered

WHEN the user activates it

THEN it SHALL navigate to the correct admin route or panel.

AND navigation SHALL preserve expected panel query behavior where the admin board uses `?panel=`.

AND icon-only buttons SHALL not use ambiguous text-only controls when a recognizable icon exists.

### Collapsed Tooltip Behavior

IF the side panel is collapsed on desktop

WHEN a navigation item receives hover or keyboard focus

THEN a tooltip SHALL appear to the right of the rail.

AND the tooltip text SHALL match the navigation item label.

AND the tooltip SHALL NOT steal focus.

AND the tooltip SHALL dismiss on blur, pointer leave, `Escape`, and route change.

AND the tooltip SHALL be vertically aligned with its triggering item where possible.

AND the tooltip SHALL avoid viewport overflow and SHALL NOT create page-level horizontal scrolling.

AND tooltips SHALL NOT appear in expanded desktop mode or mobile drawer mode.

## Control Requirements

### Collapse And Expand

IF the side panel supports desktop collapse

WHEN the user activates the collapse control

THEN the panel SHALL switch between expanded and collapsed states.

AND the control SHALL expose an accessible label such as `Collapse admin navigation` or `Expand admin navigation`.

AND the control SHALL be at least `44px` high and wide.

AND the collapsed state SHOULD persist for the current browser session.

### Mobile Open Control

IF the viewport is mobile width

WHEN the admin shell renders

THEN an open-menu control SHALL be visible in the admin header.

AND the control SHALL expose an accessible label such as `Open admin navigation`.

AND the control SHALL be at least `44px` high and wide.

## Accessibility Requirements

IF the side panel renders

WHEN assistive technology reads the page

THEN the side panel SHALL expose a navigation landmark.

AND controls SHALL have accessible names.

AND icon-only controls SHALL not depend on visual icon meaning alone.

AND keyboard users SHALL be able to:

* Open the mobile drawer.
* Close the mobile drawer.
* Move through navigation links in a logical order.
* Activate collapse and expand controls.

AND focus outlines SHALL remain visible.

AND mobile drawer focus SHALL remain inside the drawer while it is open.

AND color contrast SHALL meet WCAG AA for labels, icons, active states, and tooltips.

## Responsive Requirements

IF the viewport changes between mobile and desktop

WHEN the side panel layout changes

THEN navigation items SHALL remain available according to role permissions.

AND text SHALL not overflow its panel.

AND tooltips SHALL not force page-level horizontal scrolling.

AND the mobile drawer SHALL fit within the viewport height.

AND secondary actions SHALL remain reachable without covering primary navigation.

## Proposed Component API

```ts
type SidePanelNavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
  requiredRoles?: string[];
};

type SidePanelUserContext = {
  displayName?: string;
  roleLabel?: string;
  avatarUrl?: string;
  initials?: string;
};

type SidePanelControlProps = {
  items: SidePanelNavItem[];
  secondaryItems?: SidePanelNavItem[];
  user?: SidePanelUserContext;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};
```

## Implementation Notes

* The first implementation MAY replace `AdminSidebar` in `src/app/admin/page.tsx`.
* The component SHOULD live under shared admin or shared component ownership.
* Existing admin routes and panel query behavior SHOULD be preserved.
* The mobile implementation MAY use React state instead of the current checkbox peer pattern if that improves accessibility and maintainability.
* Lucide icons SHOULD be used for common controls and navigation icons.

## Acceptance Criteria

* Desktop expanded sidebar shows labels and active state.
* Desktop collapsed rail shows icon-only navigation with tooltips.
* Mobile side panel opens as an off-canvas drawer with backdrop and close control.
* Expanded desktop sidebar renders at `248px` to `264px`.
* Collapsed desktop rail renders at `68px` to `76px`.
* Desktop content offset exactly matches the active sidebar or rail width.
* Mobile drawer traps focus, closes with `Escape`, backdrop, close button, and nav selection, and restores focus to the opener.
* Navigation items are role-aware and do not expose unauthorized admin areas.
* Unauthorized links are absent from the DOM.
* All controls have accessible labels.
* Targets are at least `44px` high and icon-only targets are at least `44px` wide.
* Active state uses `aria-current="page"`, tint, and a non-color left accent indicator.
* Keyboard users can open, close, collapse, expand, and navigate.
* Collapsed rail tooltips appear on hover and focus, dismiss predictably, and do not create horizontal page scroll.
* Collapse state persists for the current browser session only.
* Keyboard-only testing can open mobile nav, close it, collapse and expand desktop nav, reach every visible item, and identify the active item.
* Admin content is not hidden behind the side panel in any supported viewport.
* Existing `/admin` panel routing continues to work.
