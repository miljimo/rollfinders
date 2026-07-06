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

IF map-adjacent academy listings include approved/managed and unclaimed academies  
WHEN the list renders  
THEN it SHALL use academy discovery trust ranking for top-list candidate priority while preserving closest-first map/list order when distance is available.

## Done When

* Academy list links to profiles.
* Fallback is useful, not blank.
* Map/list layout is responsive.
* Map-adjacent candidate selection prioritizes verified-and-managed, managed, and verified academies ahead of otherwise comparable unclaimed academies.
* Distance-aware map-adjacent lists render closest-first after candidate priority is applied.
