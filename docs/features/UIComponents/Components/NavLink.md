# PRD: NavLink Component

Source: `src/components/NavLink.tsx`

## Purpose

Render navigation links with active state based on the current path.

## Requirements

IF `href` is `/`  
WHEN the current path is exactly `/`  
THEN the link SHALL be active.

IF `href` is not `/`  
WHEN the current path equals `href` or starts with `href/`  
THEN the link SHALL be active.

IF the link is active  
WHEN rendered  
THEN it SHALL set `aria-current="page"` and active styling.

IF the link is inactive  
WHEN rendered  
THEN it SHALL use inactive styling with hover behavior.

## Done When

* Active state works for nested routes.
* Accessibility state is present only on active link.
* Styling matches current header design.
