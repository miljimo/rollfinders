# PRD: StaticSiteHeader Component

## Implementation Metadata

- Source: `src/components/StaticSiteHeader.tsx`
- Status: Ready for development
- Related component: `NavLink`

## Purpose

Render public navigation for static pages without session lookup.

## Requirements

IF `StaticSiteHeader` renders  
WHEN desktop navigation is visible  
THEN it SHALL show Home, Academies, Open Mats, Map, and Login.

IF the viewport is mobile  
WHEN desktop navigation is hidden  
THEN it SHALL show the academy search icon link.

IF a nav link matches the current path  
WHEN `NavLink` renders  
THEN the active state SHALL be applied.

IF rendered on static pages  
WHEN session state is unavailable  
THEN the header SHALL still show logged-out public navigation.

## Done When

* Static header has no auth dependency.
* Public navigation matches `SiteHeader` logged-out navigation.
* Mobile behavior is consistent.
