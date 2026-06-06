# Deployment Validation PRD

## Purpose

Define the checks required before and after deployment so broken images, infrastructure drift, migrations, or health failures are caught before users are affected.

## Scope

- Docker image validation.
- Terraform plan validation.
- Application smoke tests.
- Deep health checks.
- Post-deployment verification.

## Requirements

### Build Validation

IF a deployment image is built, WHEN the build completes, THEN the image must be tagged with the commit SHA and pass the configured build checks before it can be promoted.

### Infrastructure Validation

IF Terraform changes are included, WHEN a deployment pipeline runs, THEN it must run formatting, validation, and plan checks before apply.

### Migration Validation

IF database migrations are pending, WHEN deployment runs, THEN migrations must be applied before traffic is shifted to code that depends on them.

### Health Check

IF a service is updated, WHEN the new task is running, THEN the deployment must verify the basic health endpoint and the deep health endpoint.

### Rollout Evidence

IF deployment succeeds, WHEN the workflow finishes, THEN it must record the deployed commit, image tag, service revision, and validation result.

## Acceptance Criteria

- A failed build, plan, migration, or health check blocks promotion.
- The deployed image can be traced to a commit SHA.
- Post-deployment health checks cover both shallow and dependency-aware health.
- Deployment output gives enough detail to audit what changed.

