# Course Creation And Management Tickets

Source PRDs:

* [`apps/backend_api/internal/services/courses/docs/prds/Reviewing/CourseCreationAndManagementPrd.md`](../prds/Reviewing/CourseCreationAndManagementPrd.md)
* [`apps/backend_api/internal/services/courses/docs/prds/Reviewing/GenericCourseServiceDataOwnershipPrd.md`](../prds/Reviewing/GenericCourseServiceDataOwnershipPrd.md)

Status: Ready For Review

Branch:

```text
feature/course_creation_management
```

---

# Architectural Direction

Use an additive, compatibility-first migration.

The final architecture is defined by the Generic Course Service Data Ownership PRD:

* Courses service owns all course/event information.
* RollFinders stores only course/session/occurrence IDs and RollFinders-specific relationships.
* `public.events` and `public.course_activities` may exist only as temporary compatibility views, not physical source-of-truth tables.
* RollFinders must move reads and writes to Courses service APIs before compatibility views are removed.

The first implementation SHALL keep the existing physical `events` table and existing event IDs. Course semantics SHALL be added onto the current Event/Open Mat persistence model before any broad rename is attempted.

This avoids breaking:

* `/open-mats`
* `/open-mats/[id]`
* `/admin/open-mats`
* Existing recurrence expansion
* Existing analytics references
* Existing dashboard links
* Existing Open Mat IDs

Invariant for every ticket:

IF `courseType = OPEN_MAT`

WHEN existing Open Mat public, admin, recurrence, permission, search, or analytics flows run

THEN behavior SHALL remain equivalent to the current Open Mat behavior.

Product direction:

IF an admin creates a new training opportunity from the dashboard

WHEN the Open Mats/Sessions management panel is shown

THEN the create action SHALL be labelled `New Course` and SHALL open one shared New Course Form.

IF the New Course Form opens

THEN `OPEN_MAT` SHALL be selected by default.

IF the admin changes Course Type

THEN the same form SHALL create the selected supported Course Type, such as Open Mat, Class, Course, Seminar, Workshop, or Private Lesson.

IF the admin wants to describe Sparring

THEN Sparring SHALL be selected as an Activity Type in the Course activity plan, not as a Course Type.

---

# Recommended Order

| Order | Ticket | Primary Agent | Depends On |
| --- | --- | --- | --- |
| 1 | [RF-COURSE-001 Persistence Foundation](RF-COURSE-001-PersistenceFoundation.md) | Human or AI backend agent | None |
| 2 | [RF-COURSE-002 Course Domain Adapter](RF-COURSE-002-CourseDomainAdapter.md) | AI backend agent | RF-COURSE-001 |
| 3 | [RF-COURSE-003 Validator Expansion](RF-COURSE-003-ValidatorExpansion.md) | AI backend agent | RF-COURSE-001, RF-COURSE-002 |
| 4 | [RF-COURSE-004 Open Mat Radar Compatibility](RF-COURSE-004-OpenMatRadarCompatibility.md) | AI backend/testing agent | RF-COURSE-001, RF-COURSE-002 |
| 5 | [RF-COURSE-005 Admin Open Mat Compatibility](RF-COURSE-005-AdminOpenMatCompatibility.md) | AI full-stack agent | RF-COURSE-003, RF-COURSE-004 |
| 6 | [RF-COURSE-006 Admin Course Management](RF-COURSE-006-AdminCourseManagement.md) | Human or AI full-stack agent | RF-COURSE-003, RF-COURSE-005 |
| 7 | [RF-COURSE-006A Course Activity Blocks](RF-COURSE-006A-CourseActivityBlocks.md) | UX engineer plus AI full-stack agent | RF-COURSE-001, RF-COURSE-003, RF-COURSE-006 |
| 8 | [RF-COURSE-007 Public Course Discovery](RF-COURSE-007-PublicCourseDiscovery.md) | AI full-stack agent | RF-COURSE-004, RF-COURSE-006, RF-COURSE-006A |
| 9 | [RF-COURSE-008 Course Detail Routes](RF-COURSE-008-CourseDetailRoutes.md) | AI full-stack agent | RF-COURSE-006A, RF-COURSE-007 |
| 10 | [RF-COURSE-009 Academy Upcoming Courses](RF-COURSE-009-AcademyUpcomingCourses.md) | AI frontend/data agent | RF-COURSE-007, RF-COURSE-008 |
| 11 | [RF-COURSE-010 Analytics Compatibility](RF-COURSE-010-AnalyticsCompatibility.md) | AI backend/analytics agent | RF-COURSE-002, RF-COURSE-006, RF-COURSE-006A, RF-COURSE-008 |
| 12 | [RF-COURSE-011 Recurrence Scope Decision](RF-COURSE-011-RecurrenceScopeDecision.md) | Human tech lead plus AI backend agent | RF-COURSE-002, RF-COURSE-006A |
| 13 | [RF-COURSE-012 Rollout Verification](RF-COURSE-012-RolloutVerification.md) | Human release owner plus AI verification agent | RF-COURSE-001 through RF-COURSE-011 |

---

# Risk Notes

* Do not rename `events` or change existing IDs in the first pass.
* Do not remove `open_mat_*` analytics in the first pass.
* Add `courseType` filters before exposing non-Open-Mat Courses, especially in dashboard and admin queries.
* Do not create a second competing admin create form for non-Open-Mat Courses; reuse the existing Open Mat form as the New Course Form with Course Type selection.
* `/open-mats/[id]` must not render non-`OPEN_MAT` Courses after Course Types exist.
* Decide whether Daily recurrence is truly required before implementation; the current recurrence engine supports weekly/monthly custom intervals but not daily.
* Decide whether v1 requires per-course location override or academy location fallback is enough.
