# PRD: Map Page

Route: `/map`

Source: `src/app/map/page.tsx`

## Purpose

Support location-based discovery of academies and open mats.

## Requirements

IF Google Maps key exists  
WHEN page renders  
THEN it SHALL show map area and academy list.

IF Google Maps key is missing  
WHEN page renders  
THEN it SHALL show a clear fallback message and keep listings available.

IF academies have upcoming events  
WHEN list renders  
THEN the first upcoming event summary SHALL be shown.

## Done When

* Academy list links to profiles.
* Fallback is useful, not blank.
* Map/list layout is responsive.
