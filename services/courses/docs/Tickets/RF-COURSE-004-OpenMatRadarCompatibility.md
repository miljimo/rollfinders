# Ticket: RF-COURSE-004 Open Mat Radar Compatibility

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Backend / Public Discovery / Testing

Primary agent: AI backend/testing agent

Depends on: RF-COURSE-001, RF-COURSE-002

Status: Ready For Review

---

# Objective

Guarantee the current Open Mat discovery experience remains Open Mat-only after Course Type exists.

---

# Requirement

IF users visit `/open-mats`

WHEN Course migration is deployed

THEN only `OPEN_MAT` Courses SHALL appear and existing filters SHALL behave as before.

---

# Acceptance Criteria

* `getOpenMatRadar` or its replacement filters to `courseType = OPEN_MAT`.
* Today, tomorrow, and weekend filters remain Open Mat-only.
* Public `/open-mats` cards show Open Mat results only.
* `/open-mats/[id]?date=...` still resolves recurring Open Mat occurrences.
* Existing `open_mat_search_submitted` and `open_mat_viewed` analytics still fire.
* Regression tests cover:
  * one-off Open Mat,
  * recurring Open Mat,
  * non-Open-Mat Course excluded from `/open-mats`.

---

# Out Of Scope

* Building all-Courses discovery.
* Changing Open Mat page copy.
