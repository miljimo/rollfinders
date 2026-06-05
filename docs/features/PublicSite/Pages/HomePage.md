# PRD: Home Page

Route: `/`

Source: `src/app/page.tsx`

## Purpose

Help users quickly start BJJ training discovery.

## Requirements

IF the home page renders  
WHEN featured data is available  
THEN it SHALL show hero search, differentiators, featured open mats, featured academies, and final CTA.

IF a user submits hero search  
WHEN the form posts  
THEN it SHALL route to `/open-mats`.

IF featured events or academies are empty  
WHEN the page renders  
THEN layout SHALL remain stable.

## Done When

* Page uses `PageShell`.
* Search routes correctly.
* Cards render responsively.
