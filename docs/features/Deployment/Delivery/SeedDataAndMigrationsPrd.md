# Seed Data and Migrations PRD

## Purpose

Run database migrations and environment seed data predictably during deployment without overwriting production data.

## Scope

- Prisma migration deployment.
- Required seed data.
- Environment-specific seed behavior.
- Migration failure handling.

## Requirements

### Migration Deploy

IF a deployment starts, WHEN database access is available, THEN pending migrations must be applied using the production-safe migration command.

### Seed Classification

IF seed data is required, WHEN seed jobs run, THEN the data must be classified as required system data, demo data, or test data.

### Production Seed Safety

IF production seed jobs run, WHEN seed data is applied, THEN only required idempotent system data may be inserted or updated by default.

### Lower Environment Seed Data

IF dev or staging is provisioned, WHEN seed jobs run, THEN demo data may be added only when the environment variable or pipeline option enables it.

### Failure Handling

IF a migration or seed step fails, WHEN deployment continues evaluating, THEN the application rollout must stop and the failure must be visible in the deployment output.

## Acceptance Criteria

- Migrations run before the application version that depends on them is considered healthy.
- Production seed operations are idempotent and do not create demo content.
- Lower environments can be reseeded without manual database changes.
- Migration and seed failures block deployment.

