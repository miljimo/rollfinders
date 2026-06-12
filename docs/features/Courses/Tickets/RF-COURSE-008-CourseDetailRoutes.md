# Ticket: RF-COURSE-008 Course Detail Routes

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Full Stack / Public Detail

Primary agent: AI full-stack agent

Depends on: RF-COURSE-007

Status: Ready For Review

---

# Objective

Provide a public Course detail experience for non-Open-Mat Courses while preserving Open Mat detail URLs.

---

# Requirement

IF a Course is not an Open Mat

WHEN a user opens its detail page

THEN `/courses/[id]` SHALL render the Course detail without relying on Open Mat-only copy or analytics.

---

# Acceptance Criteria

* Non-Open-Mat Courses use `/courses/[id]`.
* `OPEN_MAT` Courses may canonicalize to `/open-mats/[id]` during transition.
* Detail page shows:
  * Course display name,
  * Course Type,
  * description with safe clickable links,
  * date/time,
  * location,
  * recurrence state,
  * price/audience,
  * capacity,
  * instructor/contact when available.
* Academy address remains fallback location.
* Completed historical Courses can be viewed directly where historical Open Mats can be viewed directly.

---

# Out Of Scope

* Bookings.
* Payments.
* Per-occurrence overrides.
