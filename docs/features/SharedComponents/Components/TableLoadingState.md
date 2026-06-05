# PRD: TableLoadingState Component

## Implementation Metadata

- Source: `src/components/Table/TableLoadingState.tsx`
- Status: Ready for development

## Purpose

Render a consistent table loading state.

## Requirements

IF table data is loading  
WHEN the loading state renders  
THEN the component SHALL show a clear loading message or placeholder.

IF loading finishes  
WHEN data renders  
THEN loading state SHALL be replaced by rows or empty state.

IF a custom loading message is supplied  
WHEN the state renders  
THEN the message SHALL display instead of the default copy.

## Done When

* Loading state is visually consistent.
* Loading text does not overflow.
* Loading state remains a standalone status panel owned by `Table` orchestration.
