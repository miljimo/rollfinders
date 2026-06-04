# PRD: TableActions Component

Source: `src/components/Table/TableActions.tsx`

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

## Done When

* Actions are not hardcoded to a business entity.
* Buttons/links remain accessible.
