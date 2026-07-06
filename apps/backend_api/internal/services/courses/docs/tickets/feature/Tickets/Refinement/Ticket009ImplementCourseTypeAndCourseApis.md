# COURSES-SVC-009 Implement Course Type And Course APIs

## Goal

Expose the core course type and course management APIs.

## Scope

* `POST /v1/course-types`
* `GET /v1/course-types`
* `GET /v1/course-types/{id}`
* `PUT /v1/course-types/{id}`
* `DELETE /v1/course-types/{id}`
* `POST /v1/courses`
* `GET /v1/courses`
* `GET /v1/courses/{id}`
* `PUT /v1/courses/{id}`
* `DELETE /v1/courses/{id}`

## Acceptance Criteria

* APIs are organisation-scoped.
* API-key auth is required.
* Actor context is accepted from RollFinders.
* Mutating endpoints validate payloads and use procedures.
* Duplicate create calls can be idempotent where an idempotency key is supplied.
* OpenAPI examples match implemented responses.
* Contract tests cover core success and error paths.
