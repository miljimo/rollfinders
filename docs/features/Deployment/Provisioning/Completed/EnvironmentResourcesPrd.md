# Environment Resources PRD

Status: Done

Implementation evidence: `terraform/main.tf`, `terraform/environments/*/common.tfvars`, shared modules, environment outputs, and runtime secret wiring.

## Purpose

Provision each runtime environment consistently while preserving naming, networking, database, compute, and secrets boundaries.

## Scope

- Development and production infrastructure.
- Resource naming and tagging.
- Network, ECS, database, storage, and secrets provisioning.
- Environment-specific configuration outputs.
- Staging infrastructure retirement and prevention.

## Requirements

### Environment Naming

IF a resource is created for an environment, WHEN its name or tags are generated, THEN the environment identifier must be included consistently.

### Runtime Infrastructure

IF an environment is provisioned, WHEN Terraform applies, THEN it must create or update the required compute, networking, load balancer, database, storage, IAM, and logging resources for that environment.

### Supported Runtime Environments

IF Terraform receives an `environment_name`, WHEN variable validation runs, THEN only `dev` and `production` SHALL be valid values.

AND `staging` SHALL be rejected.

### Staging Resource Retirement

IF staging is no longer used, WHEN Terraform and AWS cleanup is performed, THEN staging-specific runtime resources SHALL be destroyed.

AND the repository SHALL NOT keep `terraform/environments/staging` configuration files.

AND pipeline configuration SHALL NOT recreate staging infrastructure.

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
- Staging environment files are absent.
- Staging cannot be provisioned through the supported Terraform variable validation path.
