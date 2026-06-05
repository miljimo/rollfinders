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

IF Featured Academies data includes approved/managed and unclaimed academies  
WHEN the home page renders the Featured Academies section  
THEN it SHALL use academy discovery trust ranking to prioritize which academies enter the featured/top candidate set while preserving closest-first card order when distance is available.

IF Featured Open Mats data includes sessions from approved/managed and unclaimed academies  
WHEN the home page renders featured open mat cards  
THEN it SHALL use academy discovery trust ranking to prioritize which sessions enter the featured/top candidate set while preserving closest-first card order when distance is available.

## Done When

* Page uses `PageShell`.
* Search routes correctly.
* Cards render responsively.
* Featured Academies and Featured Open Mats apply academy discovery trust ranking for candidate priority, then render distance-aware cards closest-first where distance is available.
