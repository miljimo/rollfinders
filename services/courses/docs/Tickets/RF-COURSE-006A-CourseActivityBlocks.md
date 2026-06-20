# RF-COURSE-006A: Course Activity Blocks

Status: Ready For Review

Priority: High

Depends On:

* RF-COURSE-001 Persistence Foundation
* RF-COURSE-003 Validator Expansion
* RF-COURSE-006 Admin Course Management

---

# Objective

Allow one Course to contain an ordered activity agenda.

Sparring SHALL be represented as Activity Type `SPARRING`, not as a Course Type.

---

# Requirements

IF a Course is created or edited

WHEN the admin opens the New Course or Edit Course form

THEN the form SHALL include an `Activities` step between `Schedule` and `Details`.

IF the Course Type is `OPEN_MAT`

WHEN the form first opens

THEN the activity agenda SHOULD default to one `ROLLING` block covering the full Course duration.

IF the admin adds an activity block

WHEN the block is saved

THEN the block SHALL include:

* Activity Name
* Activity Type
* Sort order
* Start Time
* End Time
* Optional notes

Supported Activity Types:

```text
WARM_UP
DRILLING
TECHNICAL
ROLLING
SPARRING
COMPETITION
Q_AND_A
BREAK
LUNCH
DINNER
SOCIAL
CUSTOM
```

IF the admin selects Activity Type `CUSTOM`

THEN Activity Name SHALL be required and SHALL describe the custom activity.

IF activity blocks are submitted

WHEN validation runs

THEN the system SHALL reject:

* Missing Activity Type
* Missing Activity Name
* Invalid timing format
* End Time earlier than or equal to Start Time
* Activities outside the Course time window
* Overlapping blocks

IF the Course recurs

WHEN occurrences are generated

THEN each occurrence SHALL reuse the same activity agenda from the Course template.

---

# UX Requirements

The Activities step SHALL be optimized for fast entry.

Desktop layout SHOULD support repeatable rows:

```text
Activity Name | Activity Type | Start Time | End Time | Description | Remove
```

Mobile layout SHOULD stack each activity block with a compact header:

```text
1. Rolling · 18:00-18:30
```

The UI SHALL allow admins to add and remove activity blocks.

Activities SHALL be automatically sorted by Start Time.

The Review step SHALL show the Course time range and ordered activity agenda.

The UI SHALL use labels like `Activity plan` or `Session plan`.

The UI SHALL NOT label this section `Curriculum` for Open Mats.

---

# Public Display

IF a Course has more than one Activity Block

WHEN a user opens the Course detail page

THEN the page SHALL show the ordered activity sequence.

IF a Course appears on a public card

THEN the card MAY remain compact and show a summarized list of Activity Types.

IF a user searches or filters by Activity Type

THEN any matching Activity Block SHALL make the Course eligible for the result.

---

# Analytics

Course analytics SHALL include:

* Course Type
* Activity Type list
* Discipline
* Course ID
* Academy ID

Analytics SHALL NOT assume a Course has only one Activity Type.

---

# Out Of Scope

The first version SHALL NOT add per-activity:

* Recurrence
* Price
* Capacity
* Academy
* Location
* Instructor calendar availability

Those remain Course-level fields.
