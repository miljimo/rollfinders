# PRD: Unified Course & Activity Model

Version: 1.0

Priority: High

Status: Ready For Review

Branch:

```text
feature/unified_course_activity_model
```

Route: `/admin/open-mats/new`

Primary dashboard entry: `/dashboard?panel=open-mats&dialog=create-course`

Source:

```text
src/app/admin/open-mats/new/page.tsx
src/app/admin/open-mats/OpenMatForm.tsx
src/app/dashboard/AdminDashboardWorkspace.tsx
```

---

# Objective

Expand RollFinders from an Open Mat discovery platform into a Training Discovery Platform.

The platform SHALL support multiple types of training opportunities while preserving existing Open Mat functionality.

Open Mat SHALL become a Course Type.

Open Mat SHALL remain the default and first-class discovery experience.

The platform SHALL support additional training formats without requiring future redesigns.

---

# Business Motivation

Academies do not only offer Open Mats.

Academies commonly offer:

* Open Mats
* Classes
* Courses
* Workshops
* Seminars
* Competition Training
* Private Lessons

Academies also break a single Course into multiple activities.

Example:

```text
10:00:00 Warm-up
10:15:00 Drilling
10:45:00 Sparring
11:30:00 Open mat rolling
```

Small gyms often need this because one session may start at 10:00 and then move through drilling, sparring, rolling, announcements, or other activities.

The current Open Mat model limits how academies represent their training opportunities.

RollFinders SHALL provide a flexible model that supports different training formats while maintaining a simple user experience.

---

# Current Model

```text
Academy
    ↓
Open Mat
```

---

# Future Model

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

# Requirement 1: Course

The platform SHALL introduce a Course entity.

A Course SHALL represent any training opportunity offered by an academy.

Examples:

* Sunday Open Mat
* Beginner Fundamentals
* Friday Night Sparring
* Women's Self Defence
* Competition Team Training
* BJJ Seminar

---

# Requirement 2: Course Types

Course Types define the format of a training opportunity.

Supported Course Types:

```text
OPEN_MAT
CLASS
COURSE
SEMINAR
WORKSHOP
PRIVATE_LESSON
```

The platform SHALL allow additional Course Types in the future.

---

# Requirement 3: Activity Types

Activity Types define what participants will primarily do.

Sparring SHALL be an Activity Type, not a Course Type.

A Course MAY include more than one Activity Type through a timed activity schedule.

Supported Activity Types:

```text
ROLLING
DRILLING
SPARRING
TECHNICAL
CONDITIONING
COMPETITION
MIXED
```

The platform SHALL allow additional Activity Types in the future.

---

# Requirement 3A: Course Activity Schedule

The platform SHALL support repeatable activity blocks inside one Course.

Each Course Activity Block SHALL include:

* Activity Type
* Start timing in `HH:mm:ss`
* Optional duration in `HH:mm:ss`
* Optional activity label
* Optional notes

The timing SHALL allow small gyms to describe how a Course flows after the Course start time.

Example:

```text
Course:
Saturday Open Mat

Course Type:
OPEN_MAT

Activity Blocks:
10:00:00 ROLLING
10:45:00 SPARRING
11:15:00 TECHNICAL
```

The UI SHALL make activity blocks easy to add, remove, reorder, and scan.

The first activity block SHOULD default to the Course start time.

Validation SHALL prevent invalid timing formats and clearly indicate timing conflicts or activities outside the Course time window.

---

# Requirement 4: Discipline

The platform SHALL support training disciplines.

Examples:

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

A Course SHALL belong to one Discipline.

Future versions MAY support multiple disciplines.

---

# Requirement 5: Custom Naming

Academies SHALL define a custom display name.

Examples:

```text
Friday Night Rolls

Women's Open Mat

Competition Squad

Kids Fundamentals

Advanced No-Gi
```

The custom name SHALL be displayed to users.

The custom name SHALL NOT replace Course Type or Activity Type.

---

# Requirement 6: New Course Form

The existing admin action labelled `New Open Mat` SHALL be replaced by `New Course`.

WHEN an authorized admin clicks `New Course`

THEN the system SHALL show a New Course Form dialog.

The New Course Form SHALL reuse the existing Open Mat form structure.

The New Course Form SHALL default Course Type to `OPEN_MAT`.

The form SHALL support:

* Academy
* Course Name
* Course Type
* Activity Types / Activity Schedule
* Discipline
* Description
* Date
* Start Time
* End Time
* Gi Type, while BJJ-specific discipline support remains active
* Price
* Price audience
* Capacity
* Active state
* Recurrence
* Instructors
* Contact Email
* Contact Phone
* Location Name
* Location Address Override

Instructor rows SHALL select existing system Users.

Instructor rows SHALL filter by selected academy where possible.

The form SHALL allow more than one instructor to be selected.

---

# Example Models

Example 1:

```text
Course Name:
Friday Night Rolls

Course Type:
OPEN_MAT

Activity Type:
ROLLING

Discipline:
BJJ
```

Example 2:

```text
Course Name:
Competition Sparring

Course Type:
CLASS

Activity Type:
SPARRING

Discipline:
MMA
```

Example 3:

```text
Course Name:
Women's Self Defence

Course Type:
COURSE

Activity Type:
TECHNICAL

Discipline:
SELF_DEFENCE
```

---

# Requirement 7: Search

Users SHALL be able to search by:

* Course Name
* Course Type
* Activity Type
* Discipline

Examples:

```text
Find Open Mats

Find Sparring Sessions

Find BJJ Courses

Find MMA Training
```

The existing Open Mat search SHALL default to `OPEN_MAT`.

Users MAY change the Open Mats/Sessions search to include any supported type.

---

# Requirement 8: Academy Profiles

Academy profiles SHALL display:

```text
Upcoming Courses
```

instead of:

```text
Upcoming Open Mats
```

Each Course SHALL display:

* Name
* Course Type
* Activity Type
* Discipline
* Date
* Time

---

# Requirement 9: Backward Compatibility

Existing Open Mats SHALL continue functioning.

Migration rule:

```text
Open Mat
    ↓
Course

Course Type = OPEN_MAT
```

Existing:

* URLs
* Searches
* Analytics
* Academy Pages
* Admin routes
* Recurrence behavior

SHALL continue working.

No existing functionality SHALL be broken.

---

# Requirement 10: Analytics

The platform SHALL measure:

```text
course_created

course_viewed

course_search_submitted

recurring_course_created
```

Analytics SHALL support reporting by:

* Course Type
* Activity Type
* Discipline

---

# Requirement 11: Recurrence

The New Course Form SHALL preserve the existing Open Mat recurrence behavior.

IF admin selects a recurring option

WHEN the course/open mat is created

THEN the system SHALL create one recurring source listing/rule and derive future visible occurrences from it rather than creating duplicate future event records.

IF admin selects `Does not repeat`

WHEN the course/open mat is created

THEN the system SHALL create a one-off event/course for the selected date and time only.

---

# Success Criteria

Academies can represent multiple training opportunities using a single Course model.

Users can discover training opportunities beyond Open Mats.

Existing Open Mat functionality remains fully operational.

Open Mat remains the default first-class discovery path.

The platform can expand into a broader training marketplace without future redesign.

---

# Done When

* `New Course` opens a dialog from the Open Mats/Sessions dashboard panel.
* New Course Form defaults Course Type to `OPEN_MAT`.
* New Course Form supports Course Type, Activity Type, and Discipline.
* New Course Form reuses the existing Open Mat form structure.
* Instructor rows select existing system users and can be added or removed.
* Instructor options filter by selected academy where possible.
* Academy selection follows role scope.
* Academy search selection submits the selected `academyId`.
* Recurring courses/open mats are saved as one source listing/rule.
* Existing Open Mat URLs, search, analytics, academy pages, and admin routes remain compatible.
