# Ticket: RF-COURSE-012 Rollout Verification

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Release / Operations / Verification

Primary agent: Human release owner plus AI verification agent

Depends on: RF-COURSE-001 through RF-COURSE-011

Status: Ready For Review

---

# Objective

Verify Course migration safety before broad Course navigation is exposed.

---

# Requirement

IF Course migration reaches staging or production

WHEN deployed

THEN the team SHALL verify data integrity and Open Mat compatibility before exposing broad Course navigation.

---

# Acceptance Criteria

* Migration applies cleanly.
* Existing Open Mat counts before/after match.
* Existing Open Mat IDs still resolve.
* Sample one-off Open Mat detail URLs resolve.
* Sample recurring Open Mat detail URLs resolve.
* `/open-mats` only shows `OPEN_MAT` Courses.
* `/courses` shows non-Open-Mat Courses where seeded/test data exists.
* Admin create/edit/delete works for:
  * Open Mat,
  * at least one non-Open-Mat Course.
* Academy profile Upcoming Courses renders mixed Course Types correctly.
* Analytics ingestion accepts both legacy Open Mat and Course events.
* Typecheck passes.
* Relevant unit tests pass.
* Production build passes.
* Rollback or compatibility plan is documented.

---

# Out Of Scope

* Feature expansion after launch.
* Payment or booking readiness.
