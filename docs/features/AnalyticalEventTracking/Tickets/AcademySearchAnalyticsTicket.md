# Ticket: Academy Search Analytics

Status: Done

Branch: `feature/academy-search-analytics`

## Purpose

Track academy search demand from the public `/academies` experience.

## Source Review

Current code reviewed:

* `src/app/academies/page.tsx`
* `src/components/LocationSearchForm.tsx`
* `src/lib/data.ts`

## Requirements

IF a public user searches academies

WHEN `/academies` renders search results from an explicit academy search form submission

THEN the system SHALL record an `academy_search_submitted` event.

AND the search form SHALL include an analytics intent marker so the server can distinguish a user-submitted search from page loads, geolocation hydration, direct links, bookmarks, and pagination.

AND `/academies` SHALL NOT record `academy_search_submitted` only because `q`, `lat`, `lng`, or `page` query parameters are present.

AND metadata SHALL include the normalized query, whether coordinates were present, result count, page number, and whether the search returned zero results.

AND the event SHALL NOT store raw precise location beyond the query and coarse coordinate-presence flag unless a future PRD approves it.

## Likely Files

* `src/app/academies/page.tsx`
* `src/lib/analytics/service.ts`
* `src/lib/data.ts` only if result metadata needs to be surfaced

## Done When

* Academy searches produce analytics events.
* Empty-result searches are distinguishable.
* Pagination does not duplicate the original search intent unexpectedly.
* Visiting an academy profile or browsing `/academies` without submitting the academy search form does not increase academy search demand.
