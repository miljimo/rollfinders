# PRD: Course Activities Management

Version: 1.0

Priority: High

Status: Ready For Development

Branch:

```text
feature/course_activities_management
```

---

# Objective

Allow Academy Administrators to create structured Course schedules by adding one or more Activities to a Course.

A Course SHALL represent the overall training opportunity.

Course Activities SHALL represent the individual sessions occurring during the Course.

---

# Business Context

Many academies run events that contain multiple activities.

Example:

```text
Friday Night Rolls

18:00 - 18:20 Warm Up
18:20 - 19:00 Sparring
19:00 - 19:30 Open Rolling
19:30 - 20:00 Dinner & Talks
```

Current Course functionality cannot represent this structure.

The platform SHALL support activity-based schedules.

---

# Future Model

```text
Academy
    ↓
Course
        ↓
        Course Activities
```

---

# Requirements

IF an Academy Administrator creates or edits a Course

WHEN the Course form is displayed

THEN the administrator SHALL be able to add one or more Course Activities.

Each Activity SHALL belong to a single Course.

Each Course Activity SHALL contain:

| Field | Required |
| --- | --- |
| Activity Name | Yes |
| Activity Type | Yes |
| Start Time | Yes |
| End Time | Yes |
| Description | No |

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

IF the administrator selects `CUSTOM`

THEN the administrator SHALL provide a custom Activity Name.

Activities SHALL be displayed in chronological order based on Start Time.

The platform SHALL automatically sort Activities by Start Time.

Validation SHALL prevent:

* End Time earlier than or equal to Start Time.
* Overlapping Activities.
* Activities outside the Course start/end time.

The Course Details page SHALL display `Event Outline` when Activities exist.

The Course form SHALL include `Add Activity`.

Each Activity SHALL be editable and removable before saving.

Analytics SHALL track:

```text
course_activity_created
course_activity_updated
course_activity_deleted
```

Analytics SHALL include:

* Course Id
* Activity Type

Existing Courses and Open Mats SHALL remain valid.

Courses without Activities SHALL continue functioning.
