# COURSES-SVC-007 Backfill RollFinders Events

## Goal

Backfill existing RollFinders course/open-mat data into the Courses service schema without breaking public IDs.

## Scope

* Read from public `events`.
* Read from public `course_activities`.
* Map `CourseType` values into service course types.
* Preserve existing event IDs or store them as stable external references.
* Preserve recurrence data.
* Preserve activity ordering and timing.
* Add verification SQL.

## Acceptance Criteria

* Row counts match expected active/inactive course data.
* Every public Open Mat remains identifiable as Open Mat.
* Existing `/open-mats/[id]`, `/courses/[id]`, `/e/[id]`, QR, analytics, and payment references can be mapped.
* Verification SQL reports mismatches.
* Backfill is repeatable and does not duplicate rows.
* No canonical users/payments data is copied into Courses.
