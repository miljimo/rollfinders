# PRD: Terms Page

Route: `/terms`

Source: `src/app/terms/page.tsx`

## Purpose

Define platform usage rules and responsibilities.

## Requirements

IF a public user opens `/terms`  
WHEN the page renders  
THEN it SHALL explain platform usage, user responsibilities, academy responsibilities, content rules, and liability limits.

IF footer navigation renders  
WHEN the Terms link is clicked  
THEN it SHALL route to `/terms`.

## Done When

* Page works without auth.
* Content is readable on mobile.
