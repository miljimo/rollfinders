# PRD: SiteHeader Component

## Implementation Metadata

- Source: `src/components/SiteHeader.tsx`
- Status: Ready for development
- Related components: `NavLink`, `LogoutButton`
- Related PRD: `docs/features/SharedComponents/Completed/MobileFirstPublicNavigationPrd.md`

## Purpose

Render the primary site header with role-aware navigation.

## Requirements

IF the header renders for a logged-out user  
WHEN desktop navigation is visible  
THEN it SHALL show Home, Academies, Open Mats, Map, and Login.

IF the header renders for any logged-in user in the current implementation  
WHEN navigation is visible  
THEN it SHALL show Dashboard and Logout.

IF role-aware admin navigation is added later  
WHEN the session exposes the user's role  
THEN academy admins and platform-level admins MAY receive admin-specific links through a separate requirement update.

IF the viewport is mobile  
WHEN logged-out public navigation renders  
THEN the header SHALL follow `docs/features/SharedComponents/Completed/MobileFirstPublicNavigationPrd.md` and keep Home, Academies, Open Mats, Map, and Login visible or immediately reachable.

IF navigation links render  
WHEN the current route matches a link  
THEN active state SHALL be delegated to `NavLink`.

## Done When

* Logged-in and logged-out links match current session behavior.
* Mobile public navigation meets the mobile-first public navigation PRD.
* Header remains sticky and responsive.
