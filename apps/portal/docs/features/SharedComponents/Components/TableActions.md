# PRD: TableActions Component

## Implementation Metadata

- Source: `src/components/Table/TableActions.tsx`
- Status: Ready for development
- Related shared primitive: `Button`

## Purpose

Render configurable row-level table actions.

## Requirements

IF action definitions are supplied  
WHEN actions render  
THEN each action SHALL render according to its label, href, handler, or configuration.

IF no actions are supplied  
WHEN the component renders  
THEN it SHALL not render broken controls.

IF actions wrap on narrow screens  
WHEN table scrolls  
THEN controls SHALL remain usable.

IF an action is configured as a link or form action  
WHEN rendered  
THEN the component SHALL preserve the correct semantic element and accessible label.

## Done When

* Actions are not hardcoded to a business entity.
* Buttons/links remain accessible.
* Missing or empty action sets do not create blank table controls.
