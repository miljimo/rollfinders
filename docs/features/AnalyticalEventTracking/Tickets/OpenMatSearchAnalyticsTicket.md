# Ticket: Open Mat Search Analytics

Status: Done

Branch: `feature/open-mat-search-analytics`

## Purpose

Track open mat demand from the public `/open-mats` experience, including date and gi/no-gi filters.

## Source Review

Current code reviewed:

* `src/app/open-mats/page.tsx`
* `src/components/OpenMatLocationFilterForm.tsx`
* `src/lib/open-mat-occurrences.ts`
* `src/lib/data.ts`

## Requirements

IF a public user searches open mats

WHEN `/open-mats` renders filtered results from an explicit open mat search/filter form submission

THEN the system SHALL record an `open_mat_search_submitted` event.

AND the open mat filter form SHALL include an analytics intent marker so the server can distinguish a user-submitted search/filter from page loads, geolocation hydration, direct links, bookmarks, quick links, and pagination.

AND `/open-mats` SHALL NOT record `open_mat_search_submitted` only because `q`, `when`, `gi`, `lat`, `lng`, or `page` query parameters are present.

AND metadata SHALL include query, `when`, `gi`, coordinate-presence flag, result count, page number, and zero-result flag.

AND recurring open mat occurrences SHALL be counted consistently with the rendered result list.

## Likely Files

* `src/app/open-mats/page.tsx`
* `src/lib/analytics/service.ts`
* `src/lib/open-mat-occurrences.ts` only if occurrence metadata needs normalizing

## Done When

* Open mat searches produce analytics events.
* Today/tomorrow/weekend form submissions can be distinguished.
* Today/tomorrow/weekend quick links do not increase open mat search demand unless a future PRD classifies them as a separate quick-filter event.
* Existing open mat results and pagination still render correctly.
