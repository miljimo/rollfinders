# PRD: OpenMatLocationFilterForm Component

Source: `src/components/LocationSearchForm.tsx`

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

## Done When

* Filter form is usable on mobile.
* Location button behavior matches `LocationSearchForm`.
* Current filter values are preserved after navigation.
