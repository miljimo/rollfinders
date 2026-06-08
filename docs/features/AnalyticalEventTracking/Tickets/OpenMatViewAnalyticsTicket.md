# Ticket: Open Mat View Analytics

Status: Done

Branch: `feature/open-mat-view-analytics`

## Purpose

Track detail views for open mats so the product can see which sessions create demand.

## Source Review

Current code reviewed:

* `src/app/open-mats/[id]/page.tsx`
* `src/components/EventCard.tsx`
* `src/lib/open-mat-occurrences.ts`

## Requirements

IF a public user opens an open mat detail page

WHEN the open mat exists and renders

THEN the system SHALL record an `open_mat_viewed` event with `openMatId` and `academyId`.

AND metadata SHOULD include gi type, price band, city/borough, recurrence type, and whether the listing is active.

IF the event is a recurring occurrence

WHEN occurrence details are rendered

THEN analytics SHALL keep the source `Event` id and MAY include the occurrence date in metadata.

## Likely Files

* `src/app/open-mats/[id]/page.tsx`
* `src/lib/analytics/service.ts`

## Done When

* Detail views are tracked for active existing events.
* Recurring listings remain linked to their source event.
* Existing detail page behavior is unchanged.
