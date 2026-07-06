# Ticket: RF-COURSE-010 Analytics Compatibility

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Backend / Analytics

Primary agent: AI backend/analytics agent

Depends on: RF-COURSE-002, RF-COURSE-006, RF-COURSE-008

Status: Ready For Review

---

# Objective

Add Course analytics while preserving existing Open Mat analytics.

---

# Requirement

IF Course events are tracked

WHEN creation, search, recurring creation, or detail views occur

THEN Course analytics SHALL include Course ID, Academy ID, Course Type, recurrence state, and source.

---

# Acceptance Criteria

* Add analytics event names:
  * `course_created`
  * `course_viewed`
  * `course_search_submitted`
  * `recurring_course_created`
* Metadata includes:
  * Course ID,
  * Academy ID,
  * Course Type,
  * recurrence state,
  * source page where available.
* Existing `open_mat_*` events continue working for Open Mat surfaces.
* Analytics either add `courseId` support or document temporary compatibility through the existing Open Mat ID field.
* Reporting can count both legacy Open Mat and new Course supply/search/view metrics.
* Metadata excludes sensitive instructor/contact data beyond existing analytics policy.
* Analytics allowlist tests are updated.

---

# Out Of Scope

* Founder dashboard redesign unless needed to expose Course metrics.
