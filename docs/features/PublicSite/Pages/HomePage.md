# PRD: Home Page

Route: `/`

Source: `src/app/page.tsx`

## Purpose

Help users quickly start BJJ training discovery.

## Requirements

IF the home page renders  
WHEN featured data is available  
THEN it SHALL show hero search, differentiators, Upcoming Open Mats, and final CTA.

IF a user submits hero search  
WHEN the form posts  
THEN it SHALL route to `/open-mats`.

IF the home page renders on a mobile viewport
WHEN the differentiator band would normally render
THEN the page SHALL hide the differentiator cards to keep Upcoming Open Mats visible without extra scrolling.

IF the home page renders on a mobile viewport
WHEN the hero renders
THEN the page SHALL hide the long supporting hero copy and shortcut chips while keeping the primary heading and search form visible.

AND the mobile hero heading SHALL use a smaller type scale than tablet and desktop so the headline does not dominate the first viewport.

IF featured events are empty
WHEN the page renders  
THEN layout SHALL remain stable.

IF Upcoming Open Mats data includes sessions from approved/managed and unclaimed academies
WHEN the home page renders upcoming open mat cards
THEN it SHALL use academy discovery trust ranking to prioritize which sessions enter the featured/top candidate set while preserving closest-first card order when distance is available.

## Done When

* Page uses `PageShell`.
* Search routes correctly.
* Cards render responsively.
* Differentiator cards are hidden on mobile and visible from tablet/desktop layouts.
* Long hero copy and shortcut chips are hidden on mobile and visible from tablet/desktop layouts.
* Mobile hero heading uses a compact type scale while tablet and desktop keep larger display sizing.
* Upcoming Open Mats apply academy discovery trust ranking for candidate priority, then render distance-aware cards closest-first where distance is available.
* Featured Academies are not rendered on the home page unless a reviewed Featured Academies PRD explicitly reintroduces them.
