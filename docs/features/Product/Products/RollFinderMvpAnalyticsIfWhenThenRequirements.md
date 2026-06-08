# PRD: MVP Analytics For Success Metrics (Internal Analytics Provider)

Version: 2.0

Priority: Medium

Status: Backlog - Not Required For Immediate MVP Launch

Review Date: 2026-06-08

Provider Decision: RollFinders Internal Analytics

---

# Product Decision

RollFinders SHALL implement and maintain an internal analytics platform for MVP success measurement.

The objective of MVP analytics is to measure:

* Training discovery demand
* Academy engagement
* Open Mat engagement
* Commercial intent
* Academy claiming adoption

without reliance on third-party analytics providers.

IF MVP analytics is implemented

WHEN the application is deployed

THEN RollFinders SHALL store analytics events within its own infrastructure.

AND analytics SHALL remain fully operational without external analytics vendors.

AND analytics SHALL NOT require PostHog, Google Analytics, Mixpanel, Segment, or any other third-party analytics platform.

AND analytics SHALL continue functioning if external services are unavailable.

---

# Analytics Architecture

The analytics platform SHALL consist of:

* Event Collection API
* Analytics Event Storage
* Analytics Reporting Dashboard
* Analytics Aggregation Services

Suggested implementation:

```text
src/lib/analytics
src/app/api/analytics/events
src/app/admin/analytics
```

---

# Database Requirements

A new analytics event table SHALL be created.

Suggested schema:

analytics_events

* id
* event_name
* academy_id
* open_mat_id
* session_id
* visitor_id
* source
* metadata_json
* created_at

Analytics data SHALL be append-only.

Analytics events SHALL NOT affect production user flows.

---

# Visitor Identification

IF a visitor accesses RollFinders

WHEN a session begins

THEN the system SHALL generate an anonymous visitor identifier.

AND the identifier SHALL be stored using cookies or local storage.

AND the identifier SHALL NOT contain personal information.

Examples:

* UUID
* Random generated token

The system SHALL support:

* Monthly Visitors
* Weekly Active Users
* Returning Visitors

using anonymous visitor identifiers.

---

# Event Collection API

IF an event is generated

WHEN the application submits analytics data

THEN the event SHALL be sent to:

```text
POST /api/analytics/events
```

The endpoint SHALL:

* Validate payloads
* Ignore malformed requests
* Store valid events
* Return success immediately

Analytics processing SHALL NEVER block user actions.

---

# Event Tracking Scope

The system SHALL support:

* academy_search_submitted
* open_mat_search_submitted
* academy_profile_viewed
* open_mat_detail_viewed
* directions_clicked
* website_clicked
* phone_clicked
* email_clicked
* social_clicked
* map_viewed
* map_marker_clicked
* claim_profile_started
* claim_profile_submitted
* claim_approved
* claim_rejected
* recurring_open_mat_created

---

# Founder Reporting Dashboard

A founder-only analytics dashboard SHALL be available.

Route:

```text
/admin/analytics
```

The dashboard SHALL display:

## Visitor Metrics

* Monthly Visitors
* Weekly Active Users
* Returning Visitor Percentage
* Sessions

## Search Metrics

* Academy Searches
* Open Mat Searches
* Search Conversion Rate

## Discovery Metrics

* Academy Profile Views
* Open Mat Detail Views
* Most Viewed Academies
* Most Viewed Open Mats

## Commercial Intent Metrics

* Directions Clicks
* Website Clicks
* Phone Clicks
* Email Clicks
* Social Clicks

## Claim Funnel Metrics

* Claim Starts
* Claim Submissions
* Claim Approvals
* Claim Rejections
* Claim Conversion Rate

---

# Reporting Targets

The system SHALL support measurement of:

Monthly Visitors Target

```text
3,000 visitors
```

Weekly Active Users Target

```text
500 active users
```

Monthly Searches Target

```text
1,000 searches
```

Returning User Target

```text
30%
```

---

# Privacy Requirements

The analytics system SHALL NOT store:

* Raw email addresses
* Phone numbers
* Claim notes
* Verification evidence
* Exact latitude
* Exact longitude

The analytics system SHALL use:

* Academy IDs
* Open Mat IDs
* Broad location regions
* Anonymous visitor identifiers

only.

---

# Failure Safety

IF analytics storage fails

WHEN users interact with RollFinders

THEN all user actions SHALL continue successfully.

Analytics failures SHALL:

* Never block page rendering
* Never block searches
* Never block directions clicks
* Never block claim submissions
* Never display errors to public users

Analytics SHALL operate as a non-critical background service.

---

# Future Analytics Provider Integration

IF future business requirements require advanced analytics

WHEN the founder decides to integrate a third-party provider

THEN analytics SHALL use a provider abstraction layer.

Example:

```typescript
AnalyticsProvider.track(eventName, payload)
```

Supported providers may include:

* Internal Analytics
* PostHog
* Google Analytics

The application SHALL default to Internal Analytics.
