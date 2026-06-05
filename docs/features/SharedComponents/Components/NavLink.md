# PRD: NavLink Component

## Implementation Metadata

- Source: `src/components/NavLink.tsx`
- Status: Ready for development

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

IF a link receives additional class names  
WHEN active or inactive styles are composed  
THEN caller classes SHALL be preserved without removing accessibility state.

## Done When

* Active state works for nested routes.
* Accessibility state is present only on active link.
* Styling matches current header design.
