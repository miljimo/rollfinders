# COURSES-SVC-003 Bootstrap Go API Service

## Goal

Create the runnable Go service skeleton using the same practical shape as users and payments.

## Scope

* Add `services/courses/cmd/api`.
* Add internal packages for config, environments, databases, handlers, server, and data access.
* Add `GET /healthz` and `GET /readyz`.
* Add request ID middleware.
* Add API-key middleware.
* Add Dockerfile and `services/courses/compose.yml`.
* Include the service in root compose only after it can start cleanly.

## Acceptance Criteria

* `go test ./...` passes under `services/courses`.
* Local Docker compose can start the service.
* Health and ready endpoints return JSON.
* No course business behavior is stubbed as fake success.
* Config follows users/payments environment conventions.
