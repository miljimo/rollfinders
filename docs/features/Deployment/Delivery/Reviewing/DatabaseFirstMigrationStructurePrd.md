# Database-First Migration Structure PRD

## Status

Reviewing

## Owner

Platform Engineering

## Problem

RollFinders is moving toward a database-first model for service persistence. Services may share the same PostgreSQL server and database, but each service needs clear ownership of its schema, tables, functions, procedures, migrations, and data-access contract.

Without a standard migration structure, database changes become hard to review, stored routines get bundled into large files, and application code can drift back into direct table CRUD. This increases the risk of data corruption, inconsistent status transitions, and unclear service boundaries.

## Goal

Define the required folder and file structure for all database migrations where reads are exposed through functions and writes are performed through procedures. Each database object must be isolated enough for review, ownership, testing, and rollback planning.

## Scope

This PRD applies to all RollFinders service-owned PostgreSQL schemas, including the payment service schema in the shared `rollfinder` database.

It covers:

- Migration folder layout.
- Service schema ownership.
- One file per function or procedure.
- Table, type, function, and procedure naming conventions.
- Database-first application access.
- Migration verification expectations.

It does not cover:

- Production migration tooling selection.
- Data retention policy.
- Backup and restore operations.

## Database Ownership Model

All services should use the shared PostgreSQL server and the configured application database unless there is a clear operational reason to isolate the database.

Each service must own a dedicated PostgreSQL schema:

- Payment service: `payments`.
- Future service schemas should use a short plural domain name, for example `analytics`, `courses`, or `notifications`.

Tables, types, functions, procedures, and indexes must live inside the owning schema. Cross-service access must happen through service APIs unless a read-only reporting function is explicitly approved.

## Required Migration Layout

Every service with database migrations must use this structure:

```text
migrations/
  001_core_schema.sql
  schema/
  types/
  tables/
  functions/
  procedures/
```

The root migration file must be an orchestrator. It should only:

- Include child migration files with `\ir`.
- Create or select the service schema.
- Set the search path.
- Record the migration version.

It must not contain inline table, type, function, or procedure definitions.

## File Granularity

Each persistent database object must live in its own file unless the object is only meaningful as part of a table definition, such as an inline table constraint.

Required granularity:

- One schema bootstrap file per schema concern.
- One type file per type or tightly coupled type family.
- One table file per table.
- One function file per function.
- One procedure file per procedure.

Function and procedure files must never bundle multiple routines.

## Naming Convention

Files must use a deterministic numeric prefix followed by the database object name.

Examples:

```text
tables/001_payments.sql
functions/001_paymentGet.sql
functions/004_paymentHistoryList.sql
procedures/002_paymentInsert.sql
procedures/004_paymentTransition.sql
```

Rules:

- Use three-digit prefixes for ordering.
- Use snake_case database object names for schemas, tables, types, and functions.
- Use lower camelCase database object names for procedures, quoted in SQL so PostgreSQL preserves the casing.
- The file name after the numeric prefix must match the function, procedure, table, or type name exactly.
- For procedures, the file basename and quoted procedure name must match exactly after removing the numeric prefix, for example `002_paymentInsert.sql` must define `"paymentInsert"`.
- Do not rename existing migration files after they have been deployed unless a controlled migration reset has been approved.

## Function Standard

Functions are the read API for application code.

Requirements:

- Functions must use `CREATE OR REPLACE FUNCTION`.
- Read functions should be marked `STABLE` when they do not mutate data.
- Functions must set the service search path explicitly.
- Function names should describe the query contract, not the table implementation.
- Filtering, pagination limits, and access-safe projections should live inside the function when they are part of the domain contract.

Application code must not directly read service tables when a function contract exists for that query.

## Procedure Standard

Procedures are the write API for application code.

Requirements:

- Procedures must use `CREATE OR REPLACE PROCEDURE`.
- Procedures must be named in lower camelCase, for example `"paymentInsert"` or `"paymentTransition"`.
- Procedure filenames must use the same lower camelCase routine name after the numeric prefix, for example `004_paymentTransition.sql`.
- Procedures must set the service search path explicitly.
- Procedures must own domain side effects such as status history, outbox events, audit rows, and idempotency records.
- Procedures must lock rows when state transitions require concurrency protection.
- Procedures should raise explicit exceptions for missing or invalid domain records.

Application code must not directly insert, update, or delete service-owned tables outside migration or administrative repair scripts.

## Data Integrity Rules

Database routines must protect the domain invariants that cannot safely live only in application code.

Required protections include:

- Primary keys and foreign keys for service-owned relationships.
- Check constraints for bounded status and amount values.
- Unique constraints for idempotency, external provider event IDs, and natural service keys.
- Transactional status history where state changes occur.
- Outbox event creation inside the same write procedure when external systems need notification.

## Shared Database Configuration

Services should receive database connection settings as separate environment variables:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

Connection strings may be built inside service configuration code, but compose files should pass the individual variables so services can share the same database server and database while owning separate schemas.

## Review Requirements

Every database change must be reviewed with:

- The owning schema and object names.
- The migration include order.
- The function or procedure contract.
- The application call site that will use the database routine.
- Backward compatibility for deployed clients.
- Data migration and rollback implications.

PRs must make routine changes easy to review by keeping one function or procedure per file.

## Acceptance Criteria

- A new service migration follows the required folder structure.
- The root migration file includes child files in deterministic order.
- Every function lives in its own file under `migrations/functions`.
- Every procedure lives in its own file under `migrations/procedures`.
- Application reads call functions instead of direct table queries.
- Application writes call procedures instead of direct table mutations.
- Migration verification runs successfully against a local PostgreSQL container.
- Routine smoke tests prove at least one read function and one write procedure execute successfully.

## Payment Service Baseline

The payment service is the first implementation of this structure.

The payment service must:

- Use the shared `rollfinder` database.
- Own the `payments` schema.
- Keep payment transaction records locally so payment history does not require Stripe API calls.
- Use functions for payment, checkout, refund, client, idempotency, and history reads.
- Use procedures for client registration, checkout creation, payment creation, payment transitions, refund creation, provider event recording, and idempotency response storage.

## Open Questions

- Which migration runner will replace direct `psql` execution for production releases?
- Should service schemas expose read-only reporting views for analytics, or should analytics ingest outbox events only?
- How will routine contract versioning be represented when a breaking function signature change is required?
