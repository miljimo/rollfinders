# COURSES-SVC-004 Create Procedure-First Migration Framework

## Goal

Create the SQL migration skeleton for the service-owned `courses` schema.

## Scope

Add:

```text
services/courses/migrations/001_coreSchema.sql
services/courses/migrations/schema/
services/courses/migrations/types/
services/courses/migrations/tables/
services/courses/migrations/functions/
services/courses/migrations/procedures/
services/courses/migrations/backfills/
```

## Acceptance Criteria

* `001_coreSchema.sql` follows the users/payments include style and the Courses service camelCase filename convention.
* A `courses.schema_migrations` table exists.
* The migration can be run repeatedly without failing.
* `scripts/cicd/run-service-sql-migrations.sh` can include Courses migrations once the schema exists.
* No RollFinders public tables are modified in this ticket.
