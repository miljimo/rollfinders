# ticket-environment-promotion-and-redeploy.md

# Feature: Environment Promotion, Redeployment & Seed Data Management

## Type

Platform Engineering Feature

## Priority

High

## Objective

Implement a controlled deployment promotion workflow that ensures:

* Development is the default deployment environment.
* Only one environment deployment may execute at any given time.
* Development deployments always rebuild and reseed the environment.
* Staging deployments can only be promoted from a successfully deployed Development release.
* Production deployments can only be promoted from a successfully deployed Staging release.
* All AWS resources are scoped using `environment_name`.
* Terraform, ECS, RDS, CloudFront, Route53, and supporting infrastructure remain environment-isolated.
* Promotion history is traceable and auditable.

---

# Business Rules

## Rule 1

Development is the default environment.

All new deployments must first deploy to:

```text
environment_name=dev
```

Direct deployment to staging or production is prohibited.

---

## Rule 2

A release must successfully deploy to Development before promotion becomes available.

Promotion eligibility requires:

* Build successful
* Tests successful
* Infrastructure deployment successful
* ECS deployment successful
* Database migration successful
* Seed execution successful
* Smoke tests successful

---

## Rule 3

A release must successfully deploy to Staging before promotion to Production becomes available.

---

## Rule 4

Only one environment deployment may run at a time.

Concurrent deployments are prohibited.

Examples:

❌ Dev deploying while staging deploys.

❌ Staging deploying while production deploys.

❌ Two dev deployments executing simultaneously.

Allowed:

✅ Single deployment lock acquired.

---

# Environment Strategy

## Development

Purpose:

Rapid testing and validation.

Environment Name:

```text
environment_name=dev
```

Characteristics:

* Automatically deployed
* Database recreated when required
* Seed data always executed
* Frequent redeployments expected

---

## Staging

Purpose:

Pre-production validation.

Environment Name:

```text
environment_name=staging
```

Characteristics:

* Promotion only
* Stable environment
* Production-like testing

---

## Production

Purpose:

Live customer environment.

Environment Name:

```text
environment_name=production
```

Characteristics:

* Manual promotion only
* Database protected
* No automatic reseeding

---

# Resource Naming Requirements

All Terraform resources must be environment scoped.

Examples:

```text
rollfinder-dev-cluster
rollfinder-staging-cluster
rollfinder-production-cluster
```

---

## ECS

```text
rollfinder-${environment_name}-cluster

rollfinder-${environment_name}-service

rollfinder-${environment_name}-task
```

---

## ECR

```text
rollfinder-api
rollfinder-frontend
```

Repositories shared.

Tags environment specific.

---

## RDS

```text
rollfinder-${environment_name}-db
```

---

## ALB

```text
rollfinder-${environment_name}-alb
```

---

## CloudWatch

```text
/ecs/rollfinder/${environment_name}
```

---

## Secrets Manager

```text
rollfinder/${environment_name}/database
rollfinder/${environment_name}/application
```

---

## Route53

```text
dev.rollfinders.com

staging.rollfinders.com

rollfinders.com
```

---

# Development Seed Requirements

Development deployments must always execute seed data.

Mandatory sequence:

```text
Build

Deploy Infrastructure

Deploy Application

Run Migrations

Run Seeds

Smoke Test
```

---

# Seed Data Source

Seed data location:

```text
/seed-data
```

Examples:

```text
clubs.csv

users.csv

products.csv

settings.csv
```

---

# Development Seed Behaviour

Every successful deployment to Development shall execute:

```bash
npm run seed
```

or

```bash
pnpm seed
```

depending on project implementation.

---

# Seed Execution Rules

Development:

```text
Always Seed
```

Staging:

```text
Optional Seed
```

Production:

```text
Never Seed
```

unless manually approved.

---

# Deployment Locking

The deployment platform shall enforce global deployment locking.

Only one deployment may execute at a time.

---

# Lock Implementation

Preferred:

Terraform-backed deployment lock.

Options:

* DynamoDB lock table
* S3 lock file
* Dedicated deployment lock table

Required:

```text
Acquire Lock

Execute Deployment

Release Lock
```

Failure to acquire lock:

Deployment must fail immediately.

---

# Release Promotion Model

## Release Lifecycle

```text
Build

↓

Deploy Dev

↓

Promote To Staging

↓

Deploy Staging

↓

Promote To Production

↓

Deploy Production
```

---

# Artifact Promotion

The same tested Docker image must move through environments.

Example:

```text
rollfinder-api:commit-sha
```

Development:

```text
rollfinder-api:abc123
```

Promotion:

```text
rollfinder-api:abc123
```

must be reused.

Rebuilding for staging or production is prohibited.

---

# Bitbucket Pipeline Requirements

Use Bitbucket Deployments.

Deployment Environments:

```text
dev

staging

production
```

---

# Development Pipeline

Trigger:

```text
develop branch
```

Pipeline:

```text
Build

Test

Docker Build

Push ECR

Terraform Apply

Deploy ECS

Run Migration

Run Seed

Smoke Test

Display URLs
```

---

# Staging Promotion Pipeline

Trigger:

Manual Promotion

Requirements:

```text
Latest Dev Deployment Successful
```

Pipeline:

```text
Acquire Lock

Terraform Apply

Deploy ECS

Run Migration

Smoke Test

Display URLs

Release Lock
```

---

# Production Promotion Pipeline

Trigger:

Manual Promotion

Requirements:

```text
Latest Staging Deployment Successful
```

Pipeline:

```text
Acquire Lock

Terraform Apply

Deploy ECS

Manual Migration Approval

Run Migration

Smoke Test

Display URLs

Release Lock
```

---

# Deployment Outputs

Every deployment must output:

```text
================================================

Deployment Successful

Environment:
dev

Frontend:
https://dev.rollfinders.com

API:
https://api.dev.rollfinders.com

ECS Cluster:
rollfinder-dev-cluster

Service:
rollfinder-dev-service

Docker Image:
rollfinder-api:abc123

================================================
```

Equivalent outputs required for staging and production.

---

# Terraform Requirements

All modules must accept:

```hcl
environment_name
```

Example:

```hcl
module "ecs" {
  source = "../../modules/ecs"

  environment_name = var.environment_name
}
```

Hardcoded environment names are prohibited.

---

# Validation Requirements

The AI Agent must verify:

✓ Environment names are parameterized

✓ Development automatically seeds

✓ Staging requires promotion

✓ Production requires promotion

✓ Only one deployment runs at a time

✓ Same Docker image promoted across environments

✓ URLs displayed after deployment

✓ All AWS resources scoped using environment_name

✓ Deployment lock enforced

✓ Production cannot be seeded automatically

✓ Promotion history is traceable

---

# Acceptance Criteria

The feature is complete when:

1. A commit merged into `develop` automatically deploys Development.

2. Development deployment always runs seed data.

3. Staging deployment cannot occur until Development succeeds.

4. Production deployment cannot occur until Staging succeeds.

5. Only one deployment executes globally.

6. All Terraform resources use `environment_name`.

7. The same Docker image is promoted through environments.

8. Deployment URLs are displayed after successful deployment.

9. No manual AWS console actions are required.

10. The workflow is fully automated through Bitbucket Pipelines.
