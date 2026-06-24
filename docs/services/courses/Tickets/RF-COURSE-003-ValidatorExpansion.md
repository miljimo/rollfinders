# Ticket: RF-COURSE-003 Validator Expansion

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Backend / Validation

Primary agent: AI backend agent

Depends on: RF-COURSE-001, RF-COURSE-002

Status: Ready For Review

---

# Objective

Validate Course submissions while preserving existing Open Mat validation behavior.

---

# Requirement

IF an admin submits a Course form

WHEN server validation runs

THEN unsupported Course Types and unsafe descriptions SHALL be rejected, and existing Open Mat validations SHALL still pass.

---

# Acceptance Criteria

* `courseType` is required for Course routes.
* Existing Open Mat routes default to `OPEN_MAT`.
* Unknown Course Type values are rejected server-side.
* Course name/display name is required.
* Description URI safety reuses existing allowed schemes:
  * `http`
  * `https`
  * `mailto`
  * `tel`
* Price audience behavior remains consistent with current Open Mat behavior.
* End time after start time is still enforced.
* Recurrence interval validation remains intact.
* Unit tests cover supported and unsupported Course Types.

---

# Out Of Scope

* Building Course forms.
* Public discovery.
* Analytics.
