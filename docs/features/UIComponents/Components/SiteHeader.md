# PRD: SiteHeader Component

Source: `src/components/shell.tsx`

## Purpose

Render the primary site header with role-aware navigation.

## Requirements

IF the header renders for a logged-out user  
WHEN desktop navigation is visible  
THEN it SHALL show Home, Academies, Open Mats, Map, and Login.

IF the header renders for a standard user  
WHEN navigation is visible  
THEN it SHALL show Dashboard and Logout.

IF the header renders for an academy admin  
WHEN navigation is visible  
THEN Dashboard SHALL route to `/admin`.

IF the header renders for a platform-level admin  
WHEN navigation is visible  
THEN it SHALL show Admin and Logout.

IF the viewport is mobile  
WHEN desktop nav is hidden  
THEN the header SHALL show an accessible icon link to `/academies`.

## Done When

* Role-aware links match existing auth helpers.
* Mobile shortcut has an accessible label.
* Header remains sticky and responsive.
