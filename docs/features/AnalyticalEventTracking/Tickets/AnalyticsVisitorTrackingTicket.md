# Ticket: Analytics Visitor Tracking

Status: Done

Branch: `feature/analytics-visitor-tracking`

## Purpose

Create anonymous first-party visitor and session identifiers for analytics without introducing third-party tracking.

## Source Review

Current code reviewed:

* `src/app/layout.tsx`
* `src/components/SiteHeader.tsx`
* `src/components/StaticSiteHeader.tsx`
* `src/app/login/page.tsx`

## Requirements

IF a visitor opens a public RollFinders page

WHEN analytics is enabled

THEN the app SHALL create anonymous `rf_visitor_id` and `rf_session_id` cookies.

AND cookie values SHALL be random opaque identifiers, not email addresses, user IDs, names, or IP addresses.

AND the session cookie SHALL expire sooner than the visitor cookie.

AND logged-in users SHALL still be tracked anonymously for product analytics unless a later privacy requirement changes this.

## Likely Files

* New `src/lib/analytics/identity.ts`
* Route handler or middleware-compatible helper if needed
* Tests under `src/lib/__tests__`

## Done When

* Visitor/session IDs are generated once and reused.
* Cookies are first-party and HTTP safe.
* Existing NextAuth session behavior remains unchanged.
