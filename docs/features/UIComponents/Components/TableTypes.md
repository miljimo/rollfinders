# PRD: Table Types

Source: `src/components/Table/types.ts`

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
THEN pagination props SHALL describe page, total pages, previous href, and next href.

## Done When

* Table types support current academy, user, and open mat tables.
* TypeScript build passes.
