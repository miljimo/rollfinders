# COURSES-SVC-002 Define OpenAPI MVP Contract

## Goal

Create the initial OpenAPI 3 contract for the Courses service.

## Scope

* Add `apps/backend_api/internal/services/courses/docs/api/OpenApi.yaml`.
* Define health and readiness endpoints.
* Define `/v1/course-types`, `/v1/courses`, `/v1/activities`, `/v1/schedules`, and `/v1/sessions` endpoints.
* Define stable request/response models.
* Define shared error shape.
* Define pagination, filters, idempotency headers, and actor context headers.

## Acceptance Criteria

* Contract includes create/list/get/update/delete for course types and courses.
* Contract includes activity block management.
* Contract includes schedule management.
* Contract includes session list/get/update/cancel.
* Contract includes examples for Open Mat and non-Open-Mat course types.
* Contract can be used by RollFinders without needing service internals.
