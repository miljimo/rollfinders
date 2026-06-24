# Ticket: RF-COURSE-002 Course Domain Adapter

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Backend / Domain Layer

Primary agent: AI backend agent

Depends on: RF-COURSE-001

Status: Ready For Review

---

# Objective

Expose Course terminology in application code while preserving the legacy Event/Open Mat persistence layer.

---

# Requirement

IF application code needs Course semantics

WHEN reading or writing `Event` records

THEN shared Course helpers SHALL expose Course terminology while preserving legacy Event persistence.

---

# Implementation Notes

Create a Course domain layer that can wrap the existing Event model.

Candidate helpers:

* `CourseWithAcademy`
* `courseDisplayName`
* `courseTypeLabel`
* `isOpenMatCourse`
* `courseHref`
* `openMatHref`
* Course occurrence wrappers around existing recurrence logic

Keep `open-mat-occurrences` behavior intact unless the wrapper can be added without changing existing public behavior.

---

# Acceptance Criteria

* Course Type labels are centralized.
* Course display name is centralized and maps to the current `title` field.
* `OPEN_MAT` Course URLs still point to `/open-mats/[id]`.
* Non-Open-Mat Course URLs can point to the planned `/courses/[id]` route.
* Existing Open Mat UI does not change unless explicitly required by a later ticket.
* Typecheck passes.

---

# Out Of Scope

* Public `/courses` pages.
* Admin Course UI.
* Database migration beyond RF-COURSE-001.
