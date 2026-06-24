# COURSES-SVC-004 Create Procedure-First Migration Framework

## Goal

Create the SQL migration skeleton for the service-owned `courses` schema.

## Scope

Add:

```text
apps/backend_api/migrations/courses/001_coreSchema.sql
apps/backend_api/migrations/courses/schema/
apps/backend_api/migrations/courses/types/
apps/backend_api/migrations/courses/tables/
apps/backend_api/migrations/courses/functions/
apps/backend_api/migrations/courses/procedures/
apps/backend_api/migrations/courses/backfills/
```

## Acceptance Criteria

* `001_coreSchema.sql` follows the users/payments include style and the Courses service camelCase filename convention.
* A `courses.schema_migrations` table exists.
* The migration can be run repeatedly without failing.
* `scripts/cicd/run-service-sql-migrations.sh` can include Courses migrations once the schema exists.
* No RollFinders public tables are modified in this ticket.
