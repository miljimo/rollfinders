# Ticket: RF-COURSE-009 Academy Upcoming Courses

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Frontend / Data Integration

Primary agent: AI frontend/data agent

Depends on: RF-COURSE-007, RF-COURSE-008

Status: Ready For Review

---

# Objective

Update academy profiles from Open Mat-only upcoming activity to Course-based upcoming activity.

---

# Requirement

IF an academy has upcoming training opportunities

WHEN its profile renders

THEN the profile SHALL show Upcoming Courses with display name and Course Type.

---

# Acceptance Criteria

* Section label changes from `Upcoming Open Mats` to `Upcoming Courses`.
* Academy profile uses Course data.
* Each item shows display name and Course Type.
* Open Mat links still point to `/open-mats/[id]`.
* Non-Open-Mat links point to `/courses/[id]`.
* Existing Open Mat-only behavior is preserved through `OPEN_MAT` Courses.
* Empty state remains sensible.
* Layout remains usable on mobile and desktop.

---

# Out Of Scope

* Course admin UI.
* All-Courses analytics.
