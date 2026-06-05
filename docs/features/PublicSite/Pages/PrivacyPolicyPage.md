# PRD: Privacy Policy Page

Route: `/privacy-policy`

Source: `src/app/privacy-policy/page.tsx`

## Purpose

Explain RollFinder data collection, cookies, analytics, and user rights.

## Requirements

IF a public user opens `/privacy-policy`  
WHEN the page renders  
THEN it SHALL explain data collection, account data, cookies, analytics, retention, and user rights.

IF analytics provider changes  
WHEN privacy copy is reviewed  
THEN analytics language SHALL remain accurate.

## Done When

* Page works without authentication.
* Copy is readable on mobile.
* Footer links route to this page.
