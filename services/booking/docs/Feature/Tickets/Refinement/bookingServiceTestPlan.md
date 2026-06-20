# Booking Service Test Plan

Owner: Tina Ugbekile, Test Engineer

Scope: first quality slice for tickets 001 through 003.

## Source Tickets

- `ticket001BookingServiceSkeleton.md`
- `ticket002BookingOpenApiContract.md`
- `ticket003BookingDatabaseSchema.md`
- `services/booking/docs/proposal.md`

## Quality Goals

- Keep the Booking Service startup and auth behavior aligned with the existing Courses and Payments service patterns.
- Add an early regression gate for the OpenAPI contract before endpoint implementation begins.
- Add a database migration contract gate for the core booking schema before Go data access lands.
- Make duplicate active booking protection and text-compatible IDs visible in tests from the first schema slice.
- Enforce camelCase naming for service database functions and procedures.

## Test Layers

### Static Contract Tests

Location: `services/booking/tests/test_static_contract.py`

Run with:

```sh
python -m unittest discover services/booking/tests
```

Coverage:

- Required skeleton artifacts exist: Go module, API command, internal package roots, Dockerfile, compose file.
- Health and readiness route strings are present once the server package exists.
- Protected `/v1` routes use a stable unauthorized error envelope once handlers exist.
- OpenAPI artifact exists and contains generic booking terminology.
- OpenAPI mutation operations specify idempotency requirements.
- OpenAPI error codes include duplicate booking, invalid status transition, invalid payment link, unauthorized, and unavailable dependency cases.
- OpenAPI schemas do not expose user profile, course detail, academy profile, Stripe, or PayPal provider objects.
- Migration directories follow `schema`, `tables`, `types`, `functions`, and `procedures`.
- Required tables are isolated into table migration files.
- Required indexes or constraints cover customer, organisation, bookable instance, payment, and status filters.
- Booking IDs and related IDs are text-compatible instead of UUID-only.
- Duplicate active registered-customer booking protection exists for the same bookable resource instance.
- Function and procedure files, plus database routine declarations, use camelCase names.

### Go Unit / Integration Tests

Add after ticket 001 implementation exists.

Expected placement, following Courses and Payments service style:

- `services/booking/internal/server/server_test.go`
- `services/booking/internal/config/config_test.go`
- `services/booking/internal/handlers/handler_test.go` if shared handler helpers are implemented.

Minimum cases:

- `GET /healthz` returns `200` without auth or database.
- `GET /readyz` returns `503` when database config is missing or unreachable.
- Protected `/v1` endpoint without credentials returns `401`.
- Protected `/v1` endpoint with `Authorization: Bearer <api key>` or the selected internal key header passes auth and reaches the next validation/database failure.
- Unauthorized responses use the stable JSON error envelope.
- Request IDs are included or propagated in responses according to the skeleton contract.

### Migration Execution Tests

Add after ticket 003 migration files exist and a local PostgreSQL harness is selected.

Minimum cases:

- Apply all booking migrations on a clean PostgreSQL database.
- Verify `booking.bookings`, `booking.booking_participants`, `booking.booking_status_history`, `booking.idempotency_keys`, and `booking.outbox_events` exist.
- Verify customer, organisation, bookable instance, payment, and status indexes exist.
- Insert one active registered-user booking, then verify a second active booking for the same `customer_id`, `bookable_type`, `bookable_id`, and `bookable_instance_id` is rejected.
- Verify a cancelled historical booking does not block a new active booking for the same registered customer and bookable instance.
- Verify ID columns are text-compatible.

## Regression Gates

- Static contract tests should run in CI as soon as `services/booking` is added to the build.
- Go tests should run with `cd services/booking && go test ./...` once `go.mod` exists.
- Migration execution tests should run against an isolated PostgreSQL database before schema PRs merge.
- App-profile smoke testing should include app, users, courses, payments, and booking service startup after compose integration lands.

## Current Known Gaps

- `services/booking` currently has docs only, so API behavior cannot be exercised yet.
- OpenAPI contract validation is static until the OpenAPI artifact path and format are finalized.
- Migration checks are static until PostgreSQL migrations exist; runtime duplicate constraint validation is planned for the next database test slice.
