# PRD: Mobile-First Public Navigation

Version: 1.0

Priority: High

Related components:

* `src/components/SiteHeader.tsx`
* `src/components/StaticSiteHeader.tsx`
* `src/components/NavLink.tsx`

---

# Objective

Make the public header navigation visible and usable on mobile so logged-out users can reach Login and explore Home, Academies, Open Mats, and Map without switching to desktop view.

---

# Problem

The public header currently hides the full navigation at mobile widths and only exposes a compact academy shortcut. This prevents mobile users from seeing the Login action and the primary public exploration routes in the header.

Mobile visitors are a primary audience for RollFinders because they may search for nearby academies or open mats while traveling. The public shell must therefore treat mobile navigation as the default experience, not a reduced fallback.

---

# Scope

In scope:

* Mobile-visible public navigation for logged-out users.
* Mobile-visible Login action.
* Consistent behavior between `SiteHeader` and `StaticSiteHeader`.
* Accessible tap targets and active states.
* Responsive layout that does not overflow narrow screens.

Out of scope:

* Role-specific authenticated mobile admin navigation.
* New routes.
* Login form redesign.
* Footer navigation changes.

---

# IF/WHEN/THEN Requirements

## MFN-001: Mobile Public Navigation Visibility

IF a logged-out user opens the site on a mobile viewport

WHEN the public header renders

THEN the header SHALL expose Home, Academies, Open Mats, Map, and Login navigation options without requiring desktop width.

Done when:

* Mobile users can reach `/`, `/academies`, `/open-mats`, `/map`, and `/login` from the header.
* Login is visible or reachable from the header at mobile widths.
* The header does not rely on the academy-only shortcut as the only mobile navigation.

---

## MFN-002: Mobile-First Layout

IF the public header renders at common mobile widths

WHEN the navigation contains Home, Academies, Open Mats, Map, and Login

THEN the layout SHALL fit within the viewport without clipped text, overlapping controls, or unintended horizontal page scroll.

Done when:

* Navigation may wrap, scroll horizontally within the header, or collapse into an accessible menu.
* Each option remains readable and tappable.
* The Login action remains visually distinct as the primary authentication action.

---

## MFN-003: Touch Target Size

IF a user taps any mobile header navigation item

WHEN the item is rendered

THEN the tap target SHOULD be at least 44px tall or provide equivalent comfortable spacing.

Done when:

* Links can be tapped reliably on small screens.
* Adjacent links are not so close that accidental taps are likely.

---

## MFN-004: Active Route State

IF a mobile user is on a public route

WHEN the matching header link renders

THEN the matching link SHALL expose the active state consistently with desktop navigation.

Done when:

* Active state continues to use `NavLink`.
* The active link exposes `aria-current="page"`.

---

## MFN-005: Static Header Parity

IF a static public page uses `StaticSiteHeader`

WHEN it renders on mobile

THEN it SHALL provide the same logged-out public navigation options as `SiteHeader`.

Done when:

* Static pages and app pages expose the same mobile public routes.
* Static pages do not require session lookup to show Login.

---

## MFN-006: Authenticated Fallback

IF a logged-in user opens the site on mobile

WHEN the header renders authenticated navigation

THEN the header SHALL keep Dashboard and Logout reachable without regressing the logged-out public navigation requirement.

Done when:

* Existing authenticated links remain functional.
* Logout remains keyboard and touch accessible.

---

# Acceptance Criteria

* Mobile logged-out users can navigate to Home, Academies, Open Mats, Map, and Login from the header.
* The Login action is visible or immediately reachable on mobile.
* Header navigation fits mobile viewports without page-level horizontal overflow.
* `SiteHeader` and `StaticSiteHeader` provide consistent logged-out mobile navigation.
* Active route state and accessible labels are preserved.
* Desktop navigation remains unchanged unless needed to support shared responsive behavior.

---

# Test Requirements

* Add or update component tests for logged-out mobile navigation content where the test environment supports responsive assertions.
* Add a visual or browser-level check at a mobile viewport such as 375px wide.
* Verify `/login`, `/academies`, `/open-mats`, `/map`, and `/` are reachable from mobile header navigation.
