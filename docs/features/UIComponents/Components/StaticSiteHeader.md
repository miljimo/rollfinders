# PRD: StaticSiteHeader Component

Source: `src/components/shell.tsx`

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

## Done When

* Static header has no auth dependency.
* Public navigation matches `SiteHeader` logged-out navigation.
* Mobile behavior is consistent.
