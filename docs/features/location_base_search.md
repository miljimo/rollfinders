# Feature.md

# Feature: Intelligent Location-Based Search & Discovery

## Feature ID

RF-005

## Priority

Critical

## Type

Core MVP Feature

---

# Objective

Provide users with the fastest and most relevant way to discover Brazilian Jiu-Jitsu academies and open mats near them.

The platform must prioritize location-based discovery because proximity is one of the strongest factors influencing whether a practitioner visits and consistently trains at an academy.

The search experience should help users answer:

> Where can I realistically train today?

---

# Business Justification

Research and practical experience within the BJJ community suggest that distance is one of the strongest indicators of academy attendance and long-term retention.

Most users do not choose the absolute best academy.

Most users choose the best academy they can consistently attend.

Therefore, location must be a first-class feature within the platform.

---

# User Goals

Users want to:

* Find nearby academies
* Find nearby open mats
* Understand travel distance
* Compare nearby academies
* Discover alternative training options
* Make informed training decisions

---

# Search Types

## Academy Search

Users can search by:

* Current location
* Postcode
* Borough
* Academy name
* Affiliation
* Gi
* No-Gi

---

## Open Mat Search

Users can search by:

* Current location
* Postcode
* Borough
* Date
* Gi
* No-Gi

---

# Location Sources

The platform should support:

## Browser Location

User grants location permission.

Platform obtains:

```text
Latitude
Longitude
```

---

## Manual Search

User enters:

```text
Postcode
```

Example:

```text
E14
SW1
SE1
```

---

## Borough Search

Example:

```text
Canary Wharf
Hackney
Greenwich
Croydon
```

---

# Academy Ranking Rules

Academies must be ordered by proximity to the user's selected location.

Default Sort:

```text
Nearest First
```

Ranking Priority:

```text
1. Distance
2. Verified Academy Status
3. Profile Completeness
```

Example:

```text
Academy A
0.8 miles

Academy B
1.2 miles

Academy C
2.4 miles
```

---

# Open Mat Ranking Rules

Open mats must prioritize availability while considering proximity.

Ranking Priority:

```text
1. Upcoming Session Date
2. Distance
3. Verified Academy Status
```

Example:

```text
Open Mat Today
2 miles away

Open Mat Tomorrow
0.5 miles away
```

The session happening sooner should appear first.

---

# Proximity Intelligence

The platform must calculate and display:

* Distance from user
* Nearby academies
* Nearby open mats

This information should be visible throughout the platform.

---

# Academy Search Result Requirements

Each search result must display:

```text
Academy Name

Distance

Address

Postcode

Gi / No-Gi

Drop-In Available

Drop-In Cost
```

Example:

```text
Roger Gracie Academy

3.2 miles away

SE1

Gi / No-Gi

Drop-In Available
```

---

# Academy Profile Requirements

Every academy profile must display:

## Distance

Example:

```text
Distance From You

3.2 miles
```

---

## Nearby Academies

Display:

```text
Nearby Academies

Academy B
1.1 miles away

Academy C
1.8 miles away

Academy D
2.4 miles away
```

Limit:

```text
5 nearby academies
```

---

## Nearby Open Mats

Display:

```text
Upcoming Nearby Open Mats

Saturday 10:00

0.9 miles away

Sunday 11:00

1.4 miles away
```

Limit:

```text
5 nearby open mats
```

---

# Open Mat Search Results

Display:

```text
Academy Name

Date

Time

Distance

Gi / No-Gi

Drop-In Cost
```

Example:

```text
Open Mat

Saturday
10:00

1.2 miles away

No-Gi

£10
```

---

# Database Requirements

Academies must store:

```text
latitude
longitude
postcode
address
borough
```

---

# Distance Calculation

The platform should calculate:

```text
User Location
        ↓
Academy Location
        ↓
Distance
```

Store:

```text
Miles
```

Display:

```text
0.5 miles
1.2 miles
3.4 miles
```

---

# Nearby Academy Discovery

When viewing an academy profile:

The platform must automatically find nearby academies within:

```text
10 miles
```

Default:

```text
Top 5 nearest academies
```

---

# Nearby Open Mat Discovery

When viewing an academy profile:

The platform must automatically find:

```text
Upcoming open mats
Within 10 miles
```

Display:

```text
Top 5 results
```

---

# Filters

Users must be able to filter by:

```text
Gi

No-Gi

Drop-In Available

Beginner Friendly

Competition Focused
```

---

# Mobile Requirements

Search experience must be mobile-first.

Users should be able to:

```text
Open RollFinder

Allow Location

See Nearby Academies

Within 10 Seconds
```

---

# Performance Requirements

Search Response:

```text
Less than 1 second
```

Academy Profile:

```text
Less than 2 seconds
```

Distance Calculation:

```text
Less than 500ms
```

---

# Acceptance Criteria

The feature is complete when:

* Users can search by postcode
* Users can search by current location
* Academy results are ordered by distance
* Open mats consider distance and availability
* Distance is displayed on results
* Nearby academies are displayed
* Nearby open mats are displayed
* Mobile search is supported
* Search performance targets are met

---

# AI Agent Implementation Instructions

Implementation should prioritize simplicity.

Recommended approach:

* Store academy latitude and longitude.
* Use PostgreSQL geographic queries.
* Calculate distance server-side.
* Cache frequently accessed search results.
* Reuse existing academy and open mat models.

Do not:

* Introduce external search engines.
* Introduce Elasticsearch.
* Introduce OpenSearch.
* Introduce unnecessary complexity.

Feature Status:

MVP CRITICAL
APPROVED FOR IMPLEMENTATION
