# Ticket: RF-COURSE-005 Admin Open Mat Compatibility

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Full Stack / Admin Compatibility

Primary agent: AI full-stack agent

Depends on: RF-COURSE-003, RF-COURSE-004

Status: Ready For Review

---

# Objective

Keep existing Open Mat admin workflows working after Course Type exists.

---

# Requirement

IF a user visits existing Open Mat admin routes

WHEN Course admin capability exists

THEN `/admin/open-mats` SHALL continue to show only `OPEN_MAT` Courses or safely redirect with equivalent filtering.

---

# Acceptance Criteria

* `/admin/open-mats` does not show seminars, training, private lessons, or other non-Open-Mat Courses.
* `/admin/open-mats/[id]` rejects or redirects non-`OPEN_MAT` Courses.
* Existing dashboard Open Mat links continue working.
* Open Mat create/edit/delete still creates `OPEN_MAT` Courses.
* Existing Open Mat recurrence, pricing, permission, duplicate detection, and active-state behavior are preserved.
* Existing Open Mat tests are updated, not deleted.

---

# Out Of Scope

* New all-Courses admin surface.
* Public `/courses` pages.
