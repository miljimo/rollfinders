# PRD: Course Creation And Management

Version: 1.2

Priority: High

Status: Ready For Review

Branch:

```text
feature/course_creation_management
```

Product: RollFinders

Review date: 2026-06-12

---

# Objective

Expand RollFinders from an Open Mat discovery platform into a broader Training Discovery Platform.

The existing Open Mat concept SHALL become a Course Type.

Academies SHALL be able to create and manage different types of training opportunities through a single Course model.

The Course model SHALL support Course Type, Activity Type, and Discipline so the platform can expand beyond Brazilian Jiu-Jitsu Open Mats over time.

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
    ↓
Activity Type
    ↓
Discipline
```

---

# Terminology

* `Course` means a dated or recurring training opportunity created by an academy.
* `Course Type` means the format of a training opportunity, such as `OPEN_MAT`, `CLASS`, `COURSE`, `SEMINAR`, `WORKSHOP`, or `PRIVATE_LESSON`.
* `Activity Type` means what participants do within a Course, such as `ROLLING`, `DRILLING`, `SPARRING`, `TECHNICAL`, `CONDITIONING`, `COMPETITION`, or `MIXED`.
* `Course Activity Block` means one ordered segment within a Course agenda, with an Activity Type, timing, optional title, and optional notes.
* `Discipline` means the training discipline, such as `BJJ`, `NO_GI`, `MMA`, `BOXING`, `MUAY_THAI`, `JUDO`, `WRESTLING`, or `SELF_DEFENCE`.
* `Display Name` means the user-facing course name entered by the academy.
* `Open Mat` means the existing public product experience and the default `OPEN_MAT` Course Type.
* `Existing Event/Open Mat model` means the current codebase model used for open mat records until migration is implemented.
* `New Course Form` means the shared admin creation form used to create Open Mat, Class, Course, Seminar, Workshop, Private Lesson, and other supported Course Types.

---

# Scope

In scope:

* Course entity requirements.
* Course Type requirements.
* Activity Type requirements.
* Discipline requirements.
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
* Multi-instructor scheduling, availability, or per-instructor calendars.
* Course enrollment management.
* User purchase history.
* Replacing all public `/open-mats` copy in the first migration step if compatibility requires transitional naming.

---

# Requirement 1: Course Entity

The platform SHALL introduce a Course entity.

A Course SHALL represent a training opportunity created by an academy.

Examples:

* Open Mat
* Sparring Session as a named Course with Course Type `CLASS` or `OPEN_MAT` and Activity Type `SPARRING`
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
CLASS
COURSE
SEMINAR
WORKSHOP
PRIVATE_LESSON
```

Done when:

* Each Course has exactly one Course Type.
* Course Type is available for public display, filtering, analytics, and admin management.
* Unsupported direct submissions are rejected.

---

# Requirement 2A: Activity Types

The platform SHALL support predefined Activity Types.

Sparring SHALL be an Activity Type, not a Course Type.

A Course MAY include more than one Activity Type through Course Activity Blocks.

Initial values:

```text
ROLLING
DRILLING
SPARRING
TECHNICAL
CONDITIONING
COMPETITION
MIXED
```

Done when:

* Each Course can expose one or more Activity Types once Course Activity Blocks are supported.
* Activity Type is available for public display, filtering, analytics, and admin management.
* Search and filters can match any Activity Type attached to the Course.
* Unsupported direct submissions are rejected.

---

# Requirement 2AA: Course Activity Blocks

The platform SHALL support an ordered activity agenda inside one Course.

Each Course Activity Block SHALL include:

* Activity Name
* Activity Type
* Sort order
* Start Time
* End Time
* Optional description

Example:

```text
Course:
Saturday Open Mat

Course Type:
OPEN_MAT

Course Time:
10:00-12:00

Activity Blocks:
10:00-10:30 Open Rolling
10:30-10:50 Drilling
10:50-11:30 Sparring
```

Done when:

* A Course can have one or more Activity Blocks.
* Existing Open Mats default to one `ROLLING` Activity Block unless an admin adds more.
* Recurring Courses repeat the same activity agenda for every occurrence.
* Activity Blocks do not overlap unless a future requirement explicitly allows parallel activities.
* Activity Blocks fit within the Course start/end time.
* Activity Blocks are sorted by Start Time.
* Public Course detail pages show the activity sequence when more than one block exists.
* Public cards may remain simple and show the primary Course Type plus summary Activity Types.
* Analytics includes Course Type and the list of Activity Types.

---

# Requirement 2B: Discipline

The platform SHALL support predefined Disciplines.

Initial values:

```text
BJJ
NO_GI
MMA
BOXING
MUAY_THAI
JUDO
WRESTLING
SELF_DEFENCE
```

Done when:

* Each Course has exactly one Discipline once persistence supports it.
* Discipline is available for public display, filtering, analytics, and admin management.
* Future versions may allow more than one Discipline per Course.

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

The underlying Activity Blocks and Discipline SHALL also be stored once persistence supports them.

Example:

```text
Course Type:
OPEN_MAT

Activity Type:
ROLLING

Discipline:
BJJ

Display Name:
Friday Night Rolls
```

Done when:

* Admins provide a required Course Name/Display Name.
* Public cards, detail pages, and academy profiles show the custom name.
* The Course Type remains visible enough for users to understand the category.
* Activity Blocks and Discipline remain visible enough for users to understand the training format.
* Search can match display name, Course Type, Activity Type, and Discipline.

---

# Requirement 4: Course Creation

Academy Administrators SHALL be able to create Courses.

The existing admin create action currently labelled `New Open Mat` SHALL be renamed to `New Course`.

When an authorized admin clicks `New Course`, the platform SHALL open a New Course Form dialog.

The New Course Form SHALL reuse the existing Open Mat creation form behavior and fields, with Course Type added as the control that determines which event/course type is being created.

Open Mat SHALL remain the default Course Type in the New Course Form because Open Mat is the first-class discovery experience in RollFinders.

Required fields:

* Course Name
* Course Type
* Activity Types / Activity Blocks
* Discipline
* Description
* Date
* Start Time
* End Time or Duration
* Location

Optional fields:

* Capacity
* Price
* Price audience
* Instructors
* Contact information

Done when:

* Academy Admins can create Courses for their assigned academy only.
* Platform and Super Admin behavior follows existing academy/open mat permissions.
* The dashboard action previously labelled `New Open Mat` is presented as `New Course`.
* Clicking `New Course` opens the New Course Form in a dialog without requiring navigation away from the dashboard.
* The form defaults Course Type to `OPEN_MAT`.
* The form allows the admin to change Course Type to supported values such as `CLASS`, `COURSE`, `SEMINAR`, `WORKSHOP`, and `PRIVATE_LESSON`.
* The form allows the admin to set one or more Activity Blocks and a Discipline once persistence supports those fields.
* The form includes an Activities step between Schedule and Details once Activity Blocks are enabled.
* The same form posts all supported Course Types through the Course creation flow instead of forcing every submission to `OPEN_MAT`.
* Course Type selection controls which optional fields are shown when a Course Type needs additional course/session details.
* The New Course Form supports adding more than one instructor through repeatable instructor user selectors.
* Instructor selectors use existing system users and are scoped to the selected academy where possible.
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
* Specific Activity Types
* Specific Disciplines

Examples:

```text
Open Mats
Sparring Sessions
BJJ Courses
MMA Training
```

Done when:

* Public users can discover upcoming Courses.
* Users can filter or navigate to a specific Course Type.
* Users can filter or navigate to a specific Activity Type.
* Users can filter or navigate to a specific Discipline.
* Existing `/open-mats` discovery remains available for `OPEN_MAT` Courses.
* Search matches Course Name, Course Type, any Activity Type in the Course Activity Blocks, Discipline, academy name, borough, city, postcode, description, and relevant training attributes where supported.

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

The Course Type, Activity Type, and Discipline SHALL be visible.

Examples:

```text
Open Mat
Friday Night Rolls
Competition Training
Beginner Course
```

Done when:

* Academy profile upcoming activity uses Course data.
* Each visible Course item shows the display name, Course Type, Activity Type, and Discipline.
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

Track Course Type, Activity Type, and Discipline.

Example:

```text
course_type=OPEN_MAT
```

Done when:

* Course analytics events are added to the analytics domain allowlist.
* Course events include Course ID, Academy ID, Course Type, Activity Type list, Discipline, recurrence state, and source page where available.
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
* Define Course Type, Activity Type, and Discipline enums.
* Define URL strategy for `/open-mats` and future `/courses`.
* Define analytics compatibility mapping.

## Phase 2: Data Migration

* Add Course fields, Course Type, Activity Type, and Discipline.
* Migrate existing Open Mats to `OPEN_MAT` Courses.
* Preserve existing identifiers where required for URL compatibility.
* Add migration tests or documented verification queries.

## Phase 3: Admin Course Management

* Add Course create/edit/list surfaces.
* Keep Open Mat admin routes compatible.
* Add Course Type, Course Activity Blocks, Discipline, and Display Name fields.
* Rename dashboard `New Open Mat` action to `New Course`.
* Reuse the Open Mat form as the New Course Form dialog, defaulting to `OPEN_MAT` while allowing supported Course Type, Activity Type, and Discipline selection.
* Reuse existing recurrence, price audience, URI-safe description, and academy permission logic.

## Phase 4: Public Discovery

* Add all-Courses discovery.
* Preserve Open Mat radar as a filtered Course Type view.
* Update academy profiles to Upcoming Courses.
* Update cards/detail labels to include Course Type, Activity Type, and Discipline.

## Phase 5: Analytics And Hardening

* Add Course analytics events.
* Add regression tests for Open Mat compatibility.
* Add search and recurrence tests for non-Open-Mat Course Types, Activity Types, and Disciplines.
* Run production build and migration verification.

---

# Acceptance Criteria

IF an Academy Admin creates a training opportunity

THEN the opportunity SHALL be stored as a Course.

IF an authorized admin clicks `New Course`

WHEN the admin dashboard is on the Open Mats/Sessions management panel

THEN a New Course Form dialog SHALL open.

IF the New Course Form opens

THEN `OPEN_MAT` SHALL be selected by default.

IF the admin changes Course Type to `CLASS`, `COURSE`, `SEMINAR`, `WORKSHOP`, or `PRIVATE_LESSON`

WHEN the form is submitted successfully

THEN the created Course SHALL use the selected Course Type.

IF the admin sets Activity Blocks and Discipline

WHEN the form is submitted successfully

THEN the created Course SHALL use the selected Activity Blocks and Discipline once persistence supports those fields.

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
