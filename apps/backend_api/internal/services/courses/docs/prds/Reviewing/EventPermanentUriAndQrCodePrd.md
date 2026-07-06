# PRD: Event Integration URI and QR Code

Status: Reviewing

Last updated: 2026-06-17

## Summary

Every RollFinders course/event needs a stable public URI and QR code that can be shared on posters, social posts, emails, and embedded external websites.

The stable URI must continue to resolve to the latest available public event occurrence even when the event is recurring.

## Goals

1. Give every created event one integration URI.
2. Generate a QR code for the integration URI.
3. Let admins open or copy the URI from the event management dashboard.
4. Let external websites embed the URI or QR code.
5. Preserve existing `/open-mats/[id]` and `/courses/[id]` detail routes.

## Requirements

### Integration Event URI

Each active event SHALL have a integration URI:

```text
/e/{event_id}
```

WHEN a user opens `/e/{event_id}`

THEN RollFinders SHALL redirect to the correct public detail route for that event:

* Open mats redirect to `/open-mats/{event_id}`
* Other course/event types redirect to `/courses/{event_id}`

The public detail route SHALL resolve the latest upcoming occurrence when no explicit `date` query parameter is present.

IF the event is inactive or not found

THEN the integration URI SHALL return not found.

### QR Code

Each active event SHALL expose a QR code endpoint:

```text
/api/events/{event_id}/qrcode
```

The QR code SHALL encode the absolute integration event URI, using the configured application base URL.

The QR response SHALL be embeddable as an image from external websites.

### Admin Experience

The admin courses/events table action menu SHALL include:

* Integration URI
* QR Code

The event view dialog SHALL show:

* Absolute integration URI
* QR preview
* Button to open the integration URI
* Button to open the QR code image

### Public Detail Experience

The public `/courses/{event_id}` and `/open-mats/{event_id}` detail pages SHALL show:

* Absolute integration URI
* QR preview
* Button to open the QR code image

The public detail page integration URI panel SHALL NOT show an `Open URI` button because the visitor is already on a public detail route.

## Acceptance Criteria

GIVEN an admin creates an active event

WHEN they open the event actions or event view dialog

THEN they SHALL see a integration URI and QR code option.

GIVEN a visitor opens a public Course or Open Mat detail page

THEN they SHALL see the integration URI and QR code panel.

GIVEN a user opens `/e/{event_id}` for an open mat

THEN they SHALL be redirected to the open mat detail page.

GIVEN a user opens `/e/{event_id}` for a non-open-mat course/event

THEN they SHALL be redirected to the course detail page.

GIVEN a recurring event has future occurrences

WHEN a user opens the integration URI

THEN the public detail page SHALL show the latest upcoming occurrence.

GIVEN an external website embeds `/api/events/{event_id}/qrcode` as an image

THEN the SVG QR code SHALL render and encode the integration URI.

## Implementation Notes

Current implementation points:

* `src/lib/event-share-links.ts` builds integration URI and QR paths.
* `src/app/e/[id]/page.tsx` resolves integration event URIs.
* `src/app/api/events/[id]/qrcode/route.ts` generates SVG QR codes.
* `src/app/dashboard/AdminDashboardWorkspace.tsx` exposes the URI and QR code to admins.
