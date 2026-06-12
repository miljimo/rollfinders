# Course Creation And Management Tickets

Source PRD: [`docs/features/Courses/Products/Reviewing/CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Status: Ready For Review

Branch:

```text
feature/course_creation_management
```

---

# Architectural Direction

Use an additive, compatibility-first migration.

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
| 7 | [RF-COURSE-007 Public Course Discovery](RF-COURSE-007-PublicCourseDiscovery.md) | AI full-stack agent | RF-COURSE-004, RF-COURSE-006 |
| 8 | [RF-COURSE-008 Course Detail Routes](RF-COURSE-008-CourseDetailRoutes.md) | AI full-stack agent | RF-COURSE-007 |
| 9 | [RF-COURSE-009 Academy Upcoming Courses](RF-COURSE-009-AcademyUpcomingCourses.md) | AI frontend/data agent | RF-COURSE-007, RF-COURSE-008 |
| 10 | [RF-COURSE-010 Analytics Compatibility](RF-COURSE-010-AnalyticsCompatibility.md) | AI backend/analytics agent | RF-COURSE-002, RF-COURSE-006, RF-COURSE-008 |
| 11 | [RF-COURSE-011 Recurrence Scope Decision](RF-COURSE-011-RecurrenceScopeDecision.md) | Human tech lead plus AI backend agent | RF-COURSE-002 |
| 12 | [RF-COURSE-012 Rollout Verification](RF-COURSE-012-RolloutVerification.md) | Human release owner plus AI verification agent | RF-COURSE-001 through RF-COURSE-011 |

---

# Risk Notes

* Do not rename `events` or change existing IDs in the first pass.
* Do not remove `open_mat_*` analytics in the first pass.
* Add `courseType` filters before exposing non-Open-Mat Courses, especially in dashboard and admin queries.
* `/open-mats/[id]` must not render non-`OPEN_MAT` Courses after Course Types exist.
* Decide whether Daily recurrence is truly required before implementation; the current recurrence engine supports weekly/monthly custom intervals but not daily.
* Decide whether v1 requires per-course location override or academy location fallback is enough.
