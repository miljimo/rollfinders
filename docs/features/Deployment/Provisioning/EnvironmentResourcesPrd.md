# Environment Resources PRD

## Purpose

Provision each runtime environment consistently while preserving naming, networking, database, compute, and secrets boundaries.

## Scope

- Development, staging, and production infrastructure.
- Resource naming and tagging.
- Network, ECS, database, storage, and secrets provisioning.
- Environment-specific configuration outputs.

## Requirements

### Environment Naming

IF a resource is created for an environment, WHEN its name or tags are generated, THEN the environment identifier must be included consistently.

### Runtime Infrastructure

IF an environment is provisioned, WHEN Terraform applies, THEN it must create or update the required compute, networking, load balancer, database, storage, IAM, and logging resources for that environment.

### Secrets

IF an application secret is required, WHEN infrastructure is provisioned, THEN the secret reference must be created in the approved secret store and consumed by the runtime service without hardcoding the value in Terraform files.

### Database Protection

IF production database infrastructure is planned for deletion or replacement, WHEN Terraform generates the plan, THEN the workflow must block unless an explicit production override is supplied.

### Environment Outputs

IF provisioning succeeds, WHEN the run completes, THEN it must publish the service URL, load balancer DNS, database endpoint reference, ECS cluster, service name, and task definition details needed by deployment jobs.

## Acceptance Criteria

- Each environment can be provisioned from the same module pattern with environment-specific variables.
- Resource names and tags clearly identify ownership and environment.
- Runtime services receive configuration from environment variables and secret references.
- Production database deletion is protected by default.
