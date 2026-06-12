# PRD: Course Creation And Management

Version: 1.0

Priority: High

Status: Ready For Review

Branch:

```text
feature/course_creation_management
```

Product: RollFinders

Review date: 2026-06-11

---

# Objective

Expand RollFinders from an Open Mat discovery platform into a broader training opportunity platform.

The existing Open Mat concept SHALL become a Course Type.

Academies SHALL be able to create and manage different types of training opportunities through a single Course model.

This change SHALL preserve existing Open Mat functionality while enabling future growth into classes, courses, seminars, workshops, and other academy-led training opportunities.

---

# Business Motivation

Academy owners think in terms of:

* Courses
* Programs
* Classes
* Workshops
* Seminars
* Open Mats

RollFinders SHALL support these training opportunities using a unified Course model instead of hardcoding product behavior around Open Mats only.

---

# Existing And Future Model

Current:

```text
Academy
    ↓
Open Mat
```

Future:

```text
Academy
    ↓
Course
    ↓
Course Type
```

---

# Terminology

* `Course` means a dated or recurring training opportunity created by an academy.
* `Course Type` means the structured category used for filtering, analytics, and default labeling.
* `Display Name` means the user-facing course name entered by the academy.
* `Open Mat` means the existing public product experience and a future `OPEN_MAT` Course Type.
* `Existing Event/Open Mat model` means the current codebase model used for open mat records until migration is implemented.

---

# Scope

In scope:

* Course entity requirements.
* Course Type requirements.
* Custom display names for academy-created courses.
* Course create/edit/list/detail behavior for admins.
* Recurring course requirements.
* Existing Open Mat migration and backward compatibility.
* Public search and academy profile changes.
* Course analytics events.
* URL compatibility for existing Open Mat routes.

Out of scope for this PRD:

* Payments, bookings, attendance, waitlists, or reservations.
* Per-course media galleries.
* Per-occurrence exceptions or cancellation workflows.
* Multi-instructor scheduling.
* Course enrollment management.
* User purchase history.
* Replacing all public `/open-mats` copy in the first migration step if compatibility requires transitional naming.

---

# Requirement 1: Course Entity

The platform SHALL introduce a Course entity.

A Course SHALL represent a training opportunity created by an academy.

Examples:

* Open Mat
* Sparring Session
* Fundamentals Course
* Competition Training
* Seminar
* Workshop

Done when:

* Courses belong to an Academy.
* Courses can represent one-off and recurring opportunities.
* Courses preserve all currently required Open Mat fields or provide a migration-compatible equivalent.
* Course records can be created, edited, listed, viewed, searched, and retained historically.

---

# Requirement 2: Course Types

The platform SHALL support predefined Course Types.

Initial values:

```text
OPEN_MAT
TRAINING
SPARRING
SEMINAR
WORKSHOP
COMPETITION
PRIVATE_LESSON
```

Done when:

* Each Course has exactly one Course Type.
* Course Type is available for public display, filtering, analytics, and admin management.
* Unsupported direct submissions are rejected.

---

# Requirement 3: Custom Course Display Name

Academies SHALL be able to create custom course names.

Examples:

```text
Women's BJJ
Kids Program
Friday Night Rolls
Competition Squad
Beginner Fundamentals
MMA Conditioning
```

The custom name SHALL be displayed to users.

The underlying Course Type SHALL still be stored.

Example:

```text
Course Type:
TRAINING

Display Name:
Friday Night Rolls
```

Done when:

* Admins provide a required Course Name/Display Name.
* Public cards, detail pages, and academy profiles show the custom name.
* The Course Type remains visible enough for users to understand the category.
* Search can match both display name and Course Type.

---

# Requirement 4: Course Creation

Academy Administrators SHALL be able to create Courses.

Required fields:

* Course Name
* Course Type
* Description
* Date
* Start Time
* End Time or Duration
* Location

Optional fields:

* Capacity
* Price
* Price audience
* Instructor
* Contact information

Done when:

* Academy Admins can create Courses for their assigned academy only.
* Platform and Super Admin behavior follows existing academy/open mat permissions.
* Required fields are validated server-side.
* Course descriptions allow safe plain-text links using the existing URI-safety rules.
* Price audience behavior remains consistent with the current Open Mat pricing semantics.

---

# Requirement 5: Course Management

Academy Administrators SHALL be able to manage Courses.

Management includes:

* View Courses for the academy.
* Edit Course details.
* Activate or deactivate Course listings.
* Delete Courses when allowed by existing role policy.
* View recurring state.

Done when:

* Existing Open Mat admin workflows have Course equivalents.
* Academy Admins cannot manage Courses belonging to other academies.
* Historical Courses remain accessible where current Open Mat history is retained.

---

# Requirement 6: Recurring Courses

The platform SHALL support recurring Courses.

Supported recurrence:

```text
Daily
Weekly
Fortnightly
Monthly
Custom N-week intervals
Custom N-month intervals
```

Example:

```text
Friday Night Rolls

Every 2 Weeks
```

Done when:

* Existing Open Mat recurrence behavior is preserved for `OPEN_MAT` Courses.
* Course recurrence supports at least the existing custom weekly/monthly interval behavior.
* Daily recurrence is either implemented for Courses or explicitly deferred before development begins.
* Recurring Courses use one source listing/rule and derive future visible occurrences without creating duplicate future source records.
* Recurrence end-date behavior is documented and validated.

---

# Requirement 7: Open Mat Migration

Existing Open Mats SHALL become Courses.

Migration rule:

```text
Open Mat
    ↓
Course

Course Type = OPEN_MAT
```

No existing Open Mat data SHALL be lost.

No existing URLs SHALL break.

Done when:

* Existing Open Mat records are migrated or mapped to Course records.
* `OPEN_MAT` Courses retain date, time, recurrence, location, price, audience, capacity, active state, academy, creator, and analytics linkage where available.
* Existing Open Mat public detail URLs keep resolving.
* Existing Open Mat admin links keep resolving or redirect to the equivalent Course admin route.
* Existing Open Mat search, radar, and academy-profile behavior continue working during and after migration.

---

# Requirement 8: Search

Users SHALL be able to search:

* All Courses
* Specific Course Types

Examples:

```text
Open Mats
Training
Sparring
Seminars
```

Done when:

* Public users can discover upcoming Courses.
* Users can filter or navigate to a specific Course Type.
* Existing `/open-mats` discovery remains available for `OPEN_MAT` Courses.
* Search matches Course Name, Course Type, academy name, borough, city, postcode, description, and relevant training attributes where supported.

---

# Requirement 9: Academy Profile

Academy profiles SHALL display:

```text
Upcoming Courses
```

instead of:

```text
Upcoming Open Mats
```

The Course Type SHALL be visible.

Examples:

```text
Open Mat
Friday Night Rolls
Competition Training
Beginner Course
```

Done when:

* Academy profile upcoming activity uses Course data.
* Each visible Course item shows the display name and Course Type.
* Existing Open Mat-only academy profile behavior is preserved through `OPEN_MAT` Courses.

---

# Requirement 10: Analytics

Track:

```text
course_created
course_viewed
course_search_submitted
recurring_course_created
```

Track Course Type.

Example:

```text
course_type=OPEN_MAT
```

Done when:

* Course analytics events are added to the analytics domain allowlist.
* Course events include Course ID, Academy ID, Course Type, recurrence state, and source page where available.
* Existing Open Mat analytics continue working or are mapped compatibly during transition.
* Analytics do not include sensitive instructor/contact data beyond the existing metadata policy.

---

# Requirement 11: Backward Compatibility

Existing:

* Open Mat pages
* Open Mat URLs
* Open Mat searches
* Open Mat analytics
* Open Mat admin workflows

SHALL continue working.

Open Mat SHALL become a specialised Course Type.

The migration SHALL NOT break existing functionality.

Done when:

* `/open-mats` continues to show Open Mat opportunities.
* `/open-mats/[id]` continues to resolve existing links.
* Existing Open Mat admin routes either remain functional or redirect safely.
* Existing Open Mat tests are updated rather than removed.
* Rollback or compatibility strategy is documented before data migration is deployed.

---

# Suggested Implementation Phases

## Phase 1: Model And Compatibility Design

* Decide whether to rename the existing `Event` model to `Course` or introduce a new `Course` model with a migration bridge.
* Define Course Type enum.
* Define URL strategy for `/open-mats` and future `/courses`.
* Define analytics compatibility mapping.

## Phase 2: Data Migration

* Add Course fields and Course Type.
* Migrate existing Open Mats to `OPEN_MAT` Courses.
* Preserve existing identifiers where required for URL compatibility.
* Add migration tests or documented verification queries.

## Phase 3: Admin Course Management

* Add Course create/edit/list surfaces.
* Keep Open Mat admin routes compatible.
* Add Course Type and Display Name fields.
* Reuse existing recurrence, price audience, URI-safe description, and academy permission logic.

## Phase 4: Public Discovery

* Add all-Courses discovery.
* Preserve Open Mat radar as a filtered Course Type view.
* Update academy profiles to Upcoming Courses.
* Update cards/detail labels to include Course Type.

## Phase 5: Analytics And Hardening

* Add Course analytics events.
* Add regression tests for Open Mat compatibility.
* Add search and recurrence tests for non-Open-Mat Course Types.
* Run production build and migration verification.

---

# Acceptance Criteria

IF an Academy Admin creates a training opportunity

THEN the opportunity SHALL be stored as a Course.

IF the Course Type is `OPEN_MAT`

THEN the platform SHALL behave exactly as current Open Mat functionality.

IF a Course is recurring

THEN recurrence SHALL be supported according to the approved recurrence scope.

IF existing Open Mats exist

THEN they SHALL continue functioning after migration.

IF users visit existing Open Mat URLs

THEN those URLs SHALL continue resolving to the correct training opportunity.

IF users search for Open Mats

THEN they SHALL continue seeing `OPEN_MAT` Courses.

No existing academy or Open Mat functionality SHALL be broken.
