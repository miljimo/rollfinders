# PRD: Public Event and Course Details Page

Product: RollFinders

Feature: Public Event/Course Details Page

Status: Reviewing

Last updated: 2026-06-19

Source request: Inline product mockup and attached text PRD supplied on 2026-06-19.

Related documents:

* `docs/features/OpenMats/Pages/OpenMatDetailPage.md`
* `docs/services/courses/Tickets/RF-COURSE-008-CourseDetailRoutes.md`
* `docs/services/courses/Products/Reviewing/CourseOccurrencePaymentsPrd.md`
* `docs/services/courses/Products/Reviewing/EventPermanentUriAndQrCodePrd.md`
* `docs/services/courses/Products/Reviewing/EventLocationDirectionsButtonPrd.md`
* `docs/services/courses/Products/Reviewing/CourseActivitiesManagementPrd.md`
* `docs/features/SharedComponents/Reviewing/ReusableUiComponentPrd.md`
* `docs/features/SharedComponents/DomainCards.md`
* `docs/features/SharedComponents/Badge.md`

## Mockup

The page SHALL follow the supplied public event detail mockup from the request.

Embed the mockup image in this PRD using this asset path:

```text
docs/features/PublicSite/Pages/assets/PublicEventDetailsPageMockup.png
```

<figure>
  <img src="./assets/PublicEventDetailsPageMockup.png" alt="RollFinders public event detail page mockup showing event hero, booking CTA, event outline, location, host academy, verification warning, and share card" />
  <figcaption>Public event details page target layout.</figcaption>
</figure>

Note: the current Codex attachment folder included only `pasted-text.txt`; the screenshot file was not available as a filesystem attachment. Add the supplied screenshot at the UI feature asset path above so the embedded figure renders in Markdown viewers.

## Purpose

The public event/course details page is the primary conversion page for published RollFinders events and courses.

It helps visitors:

* Discover event information.
* Understand location, schedule, pricing, capacity, and attendance.
* View host academy information.
* Book or reserve a spot where booking is available.
* Save events when authenticated.
* Share events with training partners.
* Use a permanent event URI and QR code for posters, gym displays, social media, and external website embeds.

## Scope

This PRD covers the public detail experience for:

* `/open-mats/[id]`
* `/courses/[id]`
* permanent event redirects from `/e/[id]`

The page SHALL support all platform-configured event/course types, including:

* Open Mat
* Sparring Session
* Seminar
* Workshop
* Competition
* Training Camp
* Social Gathering
* Private Event
* Custom Event Type

## Non-Goals

This PRD does not require implementation in this task.

This PRD does not define:

* A full booking service implementation.
* Availability or capacity management internals.
* Payment provider processing.
* Reviews/rating data ownership.
* Calendar integrations.
* Waivers, discussions, or live check-in.

## Roles

### Guest

Guests can:

* View event details.
* View academy information.
* View location and directions.
* Share event links and QR codes.

Guests cannot:

* Save events.
* Book paid events unless guest checkout is explicitly enabled by the booking/payment flow.

### Registered User

Registered users can:

* Book or reserve eligible events.
* Save and unsave events.
* Share events.
* View academy profile.
* Access booking history when booking history exists.

### Academy Administrator

Academy administrators can:

* View the public event page.
* Edit the event from academy/admin workflows.
* Monitor payments/bookings where those features are enabled.
* Manage attendees where attendee management exists.

## Design Principles

The page SHALL be mobile-first while providing an enhanced desktop layout.

The implementation SHALL reuse existing components wherever possible:

* `PageShell` or the current public page shell/navigation primitives.
* Shared `Button`.
* Shared badge/tag components where available.
* `PublicListingWarning`.
* `LinkedText`.
* Course/activity label helpers.
* Course price, address, location, and type helpers.
* Existing analytics click tracking primitives.
* Existing QR/integration URI helpers.
* Existing map/location components where suitable.

The implementation SHOULD extract reusable components only when they reduce duplication across `/open-mats/[id]` and `/courses/[id]`.

Suggested reusable components:

* `EventDetailHero`
* `EventSummaryGrid`
* `EventBookingActions`
* `EventOutlineTimeline`
* `EventLocationCard`
* `EventHostAcademyCard`
* `EventShareCard`
* `EventTrustWarning`
* `EventTags`

## Desktop Layout

Desktop SHALL use a two-column layout.

Left content column:

1. Event hero section.
2. Event summary.
3. Booking actions.
4. Event outline/timeline.
5. Event description and tags.

Right sidebar:

1. Location card.
2. Host academy card.
3. Academy verification warning.
4. Share event card.

The hero image and primary event details SHALL be the first major visual signal.

## Mobile Layout

Mobile SHALL use this display order:

1. Event hero.
2. Booking CTA.
3. Event summary.
4. Event description.
5. Event outline/timeline.
6. Location.
7. Host academy information.
8. Academy verification warning.
9. Share section.

The page SHALL provide a sticky bottom booking button when booking is available and not already visible in the viewport.

## Header And Navigation

The public navigation SHALL match the supplied mockup direction:

* RollFinders brand.
* Discover.
* Open Mats.
* Academies.
* Events.
* Seminars.
* Travel.
* Add Event CTA for authorized users.
* Notification and account controls for authenticated users.

If the current global public navigation does not yet support all items, implementation SHALL use the existing navigation system and add only route-safe, approved items.

## Event Hero

The hero section SHALL show:

* Event type badge, for example `OPEN MAT`, `SEMINAR`, `TRAINING`, `WORKSHOP`.
* Event title.
* Host academy name.
* Optional academy verification badge.
* Cover image.
* Attendee preview when privacy settings allow it.
* Remaining capacity when capacity is configured.

Cover image requirements:

* Responsive.
* Optimized for mobile.
* Lazy loaded when it is not the LCP image; priority loaded only when it is the LCP image.
* Recommended source aspect ratio: `16:9`.
* Recommended original size: `1920 x 1080`.

If no event cover image exists, the page SHALL use an appropriate fallback from academy media, event type imagery, or a neutral default.

## Event Summary

The event summary SHALL show key facts in compact cards or cells:

* Date, for example `Thu 25 Jun`.
* Time, for example `18:30 - 20:00`.
* Cost, for example `£10.00` and `For visitors`, or `Free`.
* Capacity, for example `20 Total spots`.

The summary SHALL use shared formatting helpers for dates, prices, and course/event labels.

## Booking Actions

The booking section is the primary conversion component.

The primary CTA SHALL render according to booking state:

* `Book Now` when capacity remains and the event has a paid fixed price.
* `Reserve Spot` when the event is free.
* `Donate` or the existing donation CTA when the event uses donation pricing.
* `Join Waiting List` when capacity is full and waiting list is enabled.
* Disabled `Booking Closed` when booking is closed.
* Disabled `Event Cancelled` when cancelled.
* Disabled `Event Completed` when completed.

The CTA SHALL display the price/subtitle where relevant, for example:

```text
Book Now
£10.00 for visitors
```

Guest behavior SHALL follow the active booking/payment policy:

* Guest share and viewing are always allowed for published public events.
* Paid guest booking SHALL be allowed only when the booking/payment flow supports guest checkout.
* Otherwise, paid guest booking SHALL guide the user to log in or register.

## Save Event

Save event is available to authenticated users only.

The page SHALL support:

* Save event.
* Remove saved event.
* Success/error feedback.

Guests SHALL see either no save action or a login-aware disabled/action state, based on final UX decision.

## Share Event

The page SHALL support sharing via:

* Copy link.
* QR code.
* WhatsApp.
* Facebook.
* X.
* Instagram where technically practical.

The share URL SHALL use the permanent event URI from `/e/[id]` unless product decides canonical public route sharing is preferred.

The share section SHALL record analytics events.

## Location Card

The location card SHALL show:

* Interactive or static map.
* Pin/marker.
* Address.
* Directions button.

Supported map providers:

* Google Maps.
* OpenStreetMap.

The directions action SHALL use the existing directions helper and launch a suitable map application or web map based on core/browser support.

## Host Academy Card

The host academy card SHALL show:

* Academy logo or fallback.
* Academy name.
* Optional verification badge.
* Rating and review count when available.
* `View Academy Profile` button.

The academy profile action SHALL navigate to the public academy profile page.

If rating/review data does not yet exist, the UI SHALL omit that row rather than showing fake data.

## Academy Verification Warning

The page SHALL show a warning when the academy is not both claimed/managed and verified.

Warning copy:

```text
This academy listing has not been claimed and verified by the academy.
Prices and session details may change, so confirm with the academy before visiting.
```

This warning SHALL be non-blocking for free/public discovery.

Payment/booking visibility SHALL continue to follow the current trust requirement: unverified/unclaimed academies must not show paid checkout controls.

## Event Outline

The event outline SHALL render activity blocks when available.

Timeline item fields:

| Field | Required |
| --- | --- |
| Start Time | Yes |
| End Time | Yes |
| Activity Name | Yes |
| Activity Type | Yes |

Supported activity labels include:

* Warm Up
* Drilling
* Sparring
* Open Rolling
* Seminar
* Q&A
* Social
* Dinner
* Competition
* Custom Activity

If no activity blocks exist, the page SHOULD show a simple start/end timeline derived from event start and end time.

## Event Description

The description SHALL support:

* Paragraphs.
* Lists where rich text support exists.
* Safe hyperlinks via existing linked-text behavior.

Recommended content:

* Who can attend.
* Experience requirements.
* What to bring.
* Arrival instructions.
* Parking information.
* Event rules.

## Event Tags

The page MAY show optional labels such as:

* GI
* NO-GI
* ALL LEVELS
* BEGINNERS
* OPEN MAT
* SEMINAR
* COMPETITION
* FRIENDLY

Maximum displayed tags: 20.

Tags SHALL use shared badge/tag components where available.

## Attendees Preview

The page MAY show:

* Avatar list, max 5.
* Total attendees.
* Remaining spaces.

Attendee visibility SHALL respect privacy settings.

If attendee data does not exist, the UI SHALL omit attendee preview and avoid fake counts.

## Share Event Card And QR Code

The share event card SHALL show:

* Copy Link.
* QR Code.
* Event ID.

The QR code SHALL use the existing event integration URI endpoint:

```text
/api/events/{event_id}/qrcode
```

Supported QR use cases:

* Posters.
* Gym displays.
* Social media.
* Event flyers.
* External website embeds.

## Event States

The page SHALL represent event states clearly:

* Draft: not visible publicly.
* Published: visible publicly.
* Cancelled: show `Event Cancelled`; booking disabled.
* Completed: show `Event Completed`; booking disabled.
* Sold Out: show `Sold Out`; waiting list available only if enabled.
* In Session: show an in-session state.

Completed historical visibility SHALL follow existing open-mat/course occurrence rules.

## Analytics Requirements

The system SHALL record:

| Event | Trigger |
| --- | --- |
| Event Viewed | Public detail page loads |
| Booking Started | User clicks booking CTA |
| Booking Completed | Booking/payment flow succeeds |
| Save Event Clicked | User clicks save/unsave |
| Event Shared | User shares or copies link |
| QR Generated | QR code panel or endpoint is used where measurable |
| Directions Clicked | User clicks directions |
| Academy Profile Viewed | User clicks academy profile |
| Waiting List Joined | User joins waiting list |

Analytics SHALL reuse existing analytics primitives and metadata sanitization.

## API Requirements

The page MAY continue to render from server-side data access while APIs mature.

If a public event API is introduced, it SHOULD follow this shape:

```http
GET /api/v1/public/events/{eventId}
```

Response fields SHOULD include:

```json
{
  "id": "",
  "name": "",
  "description": "",
  "type": "OPEN_MAT",
  "date": "",
  "startTime": "",
  "endTime": "",
  "price": 10.00,
  "currency": "GBP",
  "capacity": 20,
  "availableSpots": 8,
  "academy": {},
  "location": {},
  "timeline": [],
  "tags": [],
  "attendees": []
}
```

Related future APIs:

* `POST /api/v1/bookings`
* `POST /api/v1/users/saved-events`
* `POST /api/v1/events/share`

These APIs are not required for this PRD unless their backing features are scheduled.

## Performance Requirements

Targets:

* First Contentful Paint under 2 seconds on supported mobile profiles.
* Largest Contentful Paint under 3 seconds on supported mobile profiles.

Implementation SHALL:

* Optimize hero media.
* Avoid unnecessary client-side JavaScript.
* Use server rendering for stable event data.
* Lazy-load non-critical cards where appropriate.

## Accessibility Requirements

The page SHALL meet WCAG AA expectations:

* Keyboard navigation.
* Screen reader labels for actions.
* High contrast support.
* Accessible button/link distinctions.
* Meaningful image alt text.
* Focus states for share, save, booking, QR, and directions actions.

## SEO Requirements

Public event pages SHALL support:

* Meta title.
* Meta description.
* Open Graph tags.
* Structured data using Schema.org `Event` where practical.
* Canonical URL strategy for `/e/[id]` versus `/courses/[id]` and `/open-mats/[id]`.

## Success Metrics

| Metric | Target |
| --- | --- |
| Event View to Booking Conversion | >15% |
| Booking Completion Rate | >80% |
| Share Rate | >10% |
| Directions Click Rate | >20% |
| Academy Profile Visits | >25% |
| Mobile Booking Completion | >90% |

## Acceptance Criteria

### Layout

GIVEN a visitor opens a published event on desktop

THEN the page SHALL render the hero, summary, booking actions, outline, and description in the main column

AND location, host academy, warning, and share cards in the sidebar.

GIVEN a visitor opens the page on mobile

THEN the page SHALL follow the mobile ordering defined in this PRD

AND the booking CTA SHALL remain easy to access.

### Component Reuse

GIVEN the implementation begins

THEN engineers SHALL first inspect existing shared components and helpers

AND reuse them unless a specific gap requires a new component.

### Booking

GIVEN an event is paid, trusted, and has capacity

THEN the page SHALL show a `Book Now` CTA with price context.

GIVEN an event is free and has capacity

THEN the page SHALL show a `Reserve Spot` CTA.

GIVEN an event is sold out

THEN the page SHALL show `Sold Out` and waiting-list affordance only if waiting lists are enabled.

GIVEN an academy is not claimed/verified

THEN paid booking/payment controls SHALL not appear.

### Sharing

GIVEN a visitor opens the share card

THEN they SHALL be able to copy the event URI

AND view or use the event QR code.

### Academy Trust

GIVEN an event belongs to an academy that is not claimed/verified

THEN the page SHALL show the academy verification warning.

### SEO And Accessibility

GIVEN a public event page renders

THEN it SHALL include event metadata suitable for sharing and search indexing

AND all primary interactions SHALL be keyboard and screen-reader accessible.

## Open Questions

1. Should the canonical share URL be `/e/{event_id}` or the resolved `/courses/{id}` / `/open-mats/{id}` route?
2. Should guests be allowed to book paid events once guest checkout is available, or should login remain required?
3. What service owns saved events?
4. What service owns waiting lists?
5. What service owns attendee avatars/counts?
6. Where will academy ratings/reviews come from?
7. Should Instagram sharing be treated as copy-link only because direct web share support is limited?
8. Which image source owns event cover images: course service, academy media, or a media service?

## Future Enhancements

Phase 2:

* Waiting lists.
* Calendar integration.
* Add to Google Calendar.
* Add to Apple Calendar.
* Friend invitations.
* Event discussions.
* Live check-in.
* Digital waivers.

Phase 3:

* Nearby accommodation.
* Travel recommendations.
* Ride sharing.
* Academy membership promotions.
* AI event recommendations.
