# Ticket: Commercial Intent Analytics

Status: Done

Branch: `feature/commercial-intent-analytics`

## Purpose

Track actions that suggest commercial value, such as website visits, map/directions clicks, contact clicks, and claim starts.

## Source Review

Current code reviewed:

* `src/app/academies/[slug]/page.tsx`
* `src/app/open-mats/[id]/page.tsx`
* `src/components/AcademyCard.tsx`
* `src/components/EventCard.tsx`

## Requirements

IF a user clicks a commercial intent control

WHEN the control targets an external website, directions, contact method, or claim start

THEN the system SHALL record a `commercial_intent_clicked` event.

AND metadata SHALL include the action type, source page, academy id where available, open mat id where available, and whether the destination is external.

AND metadata SHALL NOT store full personal message bodies or private user content.

## Likely Files

* Public profile/detail components
* New client component wrapper only where server components cannot capture click events
* `src/lib/analytics/events.ts`

## Done When

* Website, directions, contact, and claim-start actions are tracked.
* External links remain accessible and behave as before.
* Tracking failure does not block navigation.
