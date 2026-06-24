# Ticket: RF-COURSE-007 Public Course Discovery

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Full Stack / Public Discovery

Primary agent: AI full-stack agent

Depends on: RF-COURSE-004, RF-COURSE-006

Status: Ready For Review

---

# Objective

Introduce public discovery for all upcoming Courses while preserving `/open-mats` as an Open Mat filtered view.

---

# Requirement

IF public users search training opportunities

WHEN `/courses` is introduced

THEN upcoming active Courses across all Course Types SHALL be searchable and filterable.

---

# Acceptance Criteria

* `/courses` lists upcoming active Courses across Course Types.
* Search matches:
  * Course display name/title,
  * Course Type,
  * academy name,
  * borough,
  * city,
  * postcode,
  * description,
  * supported training attributes.
* Users can filter or navigate by Course Type.
* Results reuse existing recurrence occurrence expansion.
* Public cards show display name and Course Type.
* Non-Open-Mat Courses appear on `/courses`.
* `/open-mats` remains filtered to `OPEN_MAT`.
* Pagination or result limiting handles larger result volume.

---

# Out Of Scope

* Academy profile section rename.
* Course analytics, except where needed for wiring a later ticket.
