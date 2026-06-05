# PRD: OpenMatLocationFilterForm Component

## Implementation Metadata

- Source: `src/components/OpenMatLocationFilterForm.tsx`
- Status: Ready for development
- Related component: `LocationSearchForm`
- Shared behavior: location lookup should match `LocationSearchForm`; extraction is preferred when both forms are changed together.

## Purpose

Render open mat search controls for query, date bucket, gi type, and location.

## Requirements

IF the form renders  
WHEN props `q`, `when`, and `gi` are supplied  
THEN those values SHALL prefill the query/select controls.

IF the form submits  
WHEN the user applies filters  
THEN it SHALL submit to `/open-mats` with `q`, `when`, `gi`, `lat`, and `lng`.

IF the user chooses date bucket  
WHEN the select renders  
THEN options SHALL include any upcoming, today, tomorrow, and weekend.

IF the user chooses gi type  
WHEN the select renders  
THEN options SHALL include any style, gi, and no-gi.

IF latitude and longitude are present  
WHEN the form submits  
THEN location fields SHALL be preserved with the selected filters.

## Done When

* Filter form is usable on mobile.
* Location button behavior matches `LocationSearchForm` for success, failure, and pending states.
* Current filter values are preserved after navigation.
