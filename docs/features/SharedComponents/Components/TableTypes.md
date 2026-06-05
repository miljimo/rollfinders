# PRD: Table Types

## Implementation Metadata

- Source: `src/components/Table/types.ts`
- Status: Ready for development

## Purpose

Define reusable table TypeScript interfaces.

## Requirements

IF table columns are defined  
WHEN TypeScript checks run  
THEN column definitions SHALL support key, title, className, and optional render behavior.

IF table rows use arbitrary data  
WHEN generic types are applied  
THEN the table SHALL remain entity-agnostic.

IF pagination is configured  
WHEN types are imported  
THEN pagination props SHALL describe page, total pages, optional previous/next hrefs, optional previous/next handlers, and optional labels.

IF custom cell rendering is configured  
WHEN TypeScript checks run  
THEN renderer types SHALL receive the row value and full row data.

## Done When

* Table types support current academy, user, and open mat tables.
* TypeScript build passes.
* Generic types do not force entity-specific fields.
