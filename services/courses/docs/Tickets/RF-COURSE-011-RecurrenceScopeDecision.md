# Ticket: RF-COURSE-011 Recurrence Scope Decision

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Architecture / Backend / Product Decision

Primary agent: Human tech lead plus AI backend agent

Depends on: RF-COURSE-002

Status: Ready For Review

---

# Objective

Decide and implement the Course recurrence scope without regressing existing Open Mat recurrence.

---

# Requirement

IF Course recurrence is expanded

WHEN development starts

THEN daily recurrence SHALL be explicitly implemented or documented as deferred.

---

# Acceptance Criteria

* Weekly custom intervals are preserved.
* Fortnightly remains weekly interval `2`.
* Monthly custom intervals are preserved.
* Monthly interval cap remains intentional or is revised in a documented decision.
* Recurrence end-date behavior is tested.
* Future occurrence generation works for non-`OPEN_MAT` Course Types.
* Daily recurrence has a separate migration/test if implemented.
* If Daily is deferred, the PRD and ticket index are updated before implementation continues.

---

# Out Of Scope

* Per-occurrence exceptions.
* Holiday skipping.
* Multiple weekdays.
