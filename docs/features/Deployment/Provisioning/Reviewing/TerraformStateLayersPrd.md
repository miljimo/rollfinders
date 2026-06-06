# Terraform State Layers PRD

## Purpose

Separate infrastructure state into clear layers so shared resources, environment resources, and application resources can be provisioned independently without unsafe coupling.

## Scope

- Bootstrap state backend resources.
- Shared account resources used across environments.
- Environment-specific infrastructure for dev, staging, and production.
- Application-level resources that change more frequently than base infrastructure.

## Requirements

### Backend Bootstrap

IF an operator provisions Terraform for the first time, WHEN the bootstrap step runs, THEN it must create the remote state backend, locking table, and encryption configuration before any environment state is applied.

### Layer Separation

IF infrastructure is applied, WHEN Terraform plans are generated, THEN bootstrap, shared, environment, and application layers must use separate state files.

### Explicit Dependencies

IF a layer needs outputs from another layer, WHEN Terraform runs, THEN it must consume explicit remote state outputs instead of duplicating resource names or IDs in multiple places.

### Production Isolation

IF production infrastructure is changed, WHEN Terraform state is selected, THEN production must use its own workspace or backend key and must not share mutable state with lower environments.

### Safe Outputs

IF a layer publishes outputs, WHEN those outputs are consumed by another layer or CI job, THEN only non-secret values should be exposed unless a secure secret store is used.

## Acceptance Criteria

- Terraform state is split by layer and environment.
- Production state cannot be modified by applying a lower-environment plan.
- Required layer outputs are documented and consumed through remote state.
- The bootstrap process can be run from a clean AWS account without manual state edits.

