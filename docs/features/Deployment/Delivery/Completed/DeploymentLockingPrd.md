# Deployment Locking PRD

Status: Done

Implementation evidence: `scripts/cicd/deployment-lock.sh`, `scripts/cicd/deploy-environment.sh`, and Terraform remote state locking.

## Purpose

Prevent overlapping infrastructure and application deployments from corrupting state or racing service updates.

## Scope

- CI/CD concurrency.
- Terraform state locking.
- Environment-level deployment locks.
- Lock failure and cleanup behavior.

## Requirements

### Terraform Locking

IF Terraform apply runs, WHEN it opens remote state, THEN state locking must prevent another apply from modifying the same state file.

### Environment Lock

IF a deployment starts for an environment, WHEN another deployment for that same environment is already running, THEN the newer deployment must wait or fail according to the configured pipeline behavior.

### Cross-Environment Independence

IF deployments target different environments, WHEN they run at the same time, THEN they may proceed only when they do not share mutable state or deployment resources.

### Lock Timeout

IF a lock cannot be acquired, WHEN the timeout is reached, THEN the job must fail with the lock owner or lock target in the output.

### Manual Cleanup

IF a stale lock blocks deployment, WHEN an operator clears it, THEN the cleanup procedure must require confirmation of the affected environment and state key.

## Acceptance Criteria

- Two deployments cannot update the same environment concurrently.
- Terraform state locking is enabled for every remote state layer.
- Lock errors are actionable without requiring console inspection first.
- Stale lock cleanup is documented and environment-scoped.
