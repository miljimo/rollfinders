# Courses Service Focused Test Plan

This plan covers the first test files to add once `services/courses` contains the generic Go service implementation. Keep these in new, non-overlapping files so they can land beside developer implementation without editing existing tests.

## Existing Service Patterns Observed

* Service tests use `httptest` and local `testServer(databaseURL string)` helpers.
* `/healthz` must not require a database. `/readyz` should fail without a configured database URL.
* Request validation tests assert HTTP status codes and decode JSON response bodies only where response contracts matter.
* Migration entry points follow the service include style with the Courses camelCase file name `apps/backend_api/migrations/courses/001_coreSchema.sql`: schema include first, `SET search_path`, ordered `\ir` includes for schema/types/tables/functions/procedures, then idempotent `INSERT INTO schema_migrations(version) ... ON CONFLICT DO NOTHING`.

## Add These Tests

### `services/courses/internal/server/server_contract_test.go`

Create helpers equivalent to payments:

```go
func testServer(databaseURL string) http.Handler
```

Test cases:

* `TestHealthDoesNotRequireDatabase`: `GET /healthz` returns `200`, JSON content type, and a JSON status field.
* `TestReadyFailsWithoutDatabaseURL`: `GET /readyz` returns `503` when the database URL is empty.
* `TestProtectedEndpointsDoNotRequireSharedServiceKey`: table test for `POST /v1/courses`, `GET /v1/courses`, `GET /v1/courses/course_123`, `PUT /v1/courses/course_123`, `POST /v1/courses/course_123/activities`, and `GET /v1/courses/course_123/activities`; no internal shared key should reach route/database validation.
* `TestCourseCreateRequiresJSON`: `POST /v1/courses` without `Content-Type: application/json` returns `415`.
* `TestCourseCreateRejectsInvalidPayload`: JSON body missing `organisation_id`, `course_type_id`, or `title` returns `400`.
* `TestCourseCreateListGetUpdateRoundTrip`: with the service's no-database fake success rule respected, run only when an in-memory/test repository or test database is configured. Create a course, assert `201`, list by `organisation_id`, get by id, update title/status, and assert scoped data remains stable.
* `TestActivityCreateRejectsOutOfRangeTimes`: activity create with end before start or outside session/course time range returns `400`.
* `TestActivityCreateListChronological`: create two activity blocks out of order, list them, and assert response order is chronological.

### `services/courses/internal/data/procedure_contract_test.go`

Use a fake data context or sqlmock-style adapter around the data-access layer rather than HTTP handlers.

Test cases:

* `TestCreateCourseCallsCourseUpsertProcedure`: course create must call the named stored procedure, not inline `INSERT`.
* `TestUpdateCourseCallsCourseUpsertOrUpdateProcedure`: update must call a stored procedure and map domain errors to typed API errors.
* `TestListCoursesCallsCourseListFunction`: list must use a SQL function/read query dedicated to list semantics.
* `TestGetCourseCallsCourseGetFunction`: get must use the course get function and preserve nullable/time fields.
* `TestCreateActivityCallsActivityProcedure`: activity create must call the activity mutation procedure and pass actor/organisation scope.
* `TestListActivitiesCallsActivityListFunction`: activity list must call the activity list function and preserve chronological ordering from SQL.

### `apps/backend_api/migrations/courses/migration_contract_test.go`

These can be plain file-content tests using `os.ReadFile`; they do not need a database.

Test cases:

* `TestCoreMigrationIncludesExpectedShape`: assert `001_coreSchema.sql` contains:
  * `\ir schema/001_course_schema.sql`
  * `SET search_path TO courses, public;`
  * `\ir schema/002_schema_migrations.sql`
  * includes for `types/`, `tables/`, `functions/`, and `procedures/`
  * `INSERT INTO schema_migrations(version) VALUES ('001_coreSchema')`
  * `ON CONFLICT (version) DO NOTHING`
* `TestSchemaMigrationsTableIsServiceOwned`: assert the schema migration SQL creates `courses.schema_migrations` or runs under `courses` search path and creates `schema_migrations`.
* `TestCoreMigrationDoesNotModifyPublicRollfindersTables`: assert the core migration and schema/table files do not contain `ALTER TABLE public.`, `DROP TABLE public.`, `CREATE TABLE public.`, or `INSERT INTO public.`.
* `TestMutationSqlLivesOnlyInProcedures`: scan `migrations/functions` and fail on business writes: `INSERT INTO courses.`, `UPDATE courses.`, `DELETE FROM courses.` except allowed read-only/temp constructs if explicitly documented.

### `services/courses/internal/server/no_inline_sql_writes_test.go`

Static guard that keeps handlers thin:

* Walk `services/courses/internal/server` and `services/courses/internal/handlers`.
* For non-test `.go` files, fail if a handler/server file contains write SQL tokens such as `INSERT INTO`, `UPDATE courses.`, `DELETE FROM`, `CALL `, or `db.Exec`.
* Allow routing/configuration files only if the implementation keeps all persistence in `internal/data` or `internal/databases`.

## Integration Tests To Add When Database Harness Exists

Add `services/courses/internal/data/database_integration_test.go` behind a build tag such as `//go:build integration`.

Required cases:

* Run `migrations/001_coreSchema.sql` twice and assert both runs succeed.
* Course create procedure writes course row, status history when applicable, and outbox event in the same transaction.
* Course update rejects cross-organisation mutation.
* Activity create rejects invalid time ranges and writes outbox event.
* Activity list returns chronological blocks.
* Idempotent create with the same idempotency key returns the original course.

## Gaps Until Implementation Lands

* Exact package names, config struct names, route paths for activities, and procedure/function names are not present yet.
* The create/list/get/update round-trip needs either a real test database or an explicit in-memory repository seam; it should not be faked in HTTP handlers.
* SQL integration assertions should wait for the migration runner or compose database harness to exist.
