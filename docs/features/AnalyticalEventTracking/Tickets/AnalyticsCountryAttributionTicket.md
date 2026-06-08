# Ticket: Analytics Country Attribution

Status: Done

Branch: `feature/analytics-country-attribution`

## Purpose

Show Super Admins which countries analytics activity is coming from without storing precise user location.

## Source Review

Current code reviewed:

* `prisma/schema.prisma`
* `src/lib/analytics/country.ts`
* `src/lib/analytics/service.ts`
* `src/lib/analytics/reporting.ts`
* `src/app/api/analytics/events/route.ts`
* `src/app/dashboard/AdminDashboardWorkspace.tsx`

## Requirements

IF an analytics event is recorded from a public request

WHEN the request includes a trusted deployment, CDN, or proxy country header

THEN the system SHALL store `countryCode` and `countryName` on the analytics event.

AND supported country headers SHALL include:

```text
x-vercel-ip-country
cf-ipcountry
cloudfront-viewer-country
x-country-code
x-geo-country
```

AND invalid, local, anonymous, or unavailable country values SHALL be stored as null and displayed as `Unknown` in aggregate reporting.

AND the system SHALL NOT store raw IP addresses for country reporting.

AND country attribution SHALL be shown only in the Super Admin Founder Analytics panel.

AND country analytics SHALL be aggregate only, grouped by country, visitor count, and event count.

## Privacy Rules

The system SHALL NOT:

* Store exact latitude/longitude from IP geolocation.
* Store raw IP addresses.
* Show country attribution to Academy Admins, Platform Admins, or Standard Users.
* Use country attribution to identify a single person.

## Done When

* Analytics events have nullable `country_code` and `country_name` database fields.
* Public analytics API events enrich country from request headers.
* Server-side public profile/search/view events enrich country from request headers.
* Founder Analytics includes aggregate country attribution.
* Existing analytics writes remain best-effort and do not block browsing.
