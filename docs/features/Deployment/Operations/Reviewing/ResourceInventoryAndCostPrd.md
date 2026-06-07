# Resource Inventory and Cost PRD

## Purpose

Give operators a clear view of deployed AWS resources, ownership, environment, and cost-sensitive resources.

## Scope

- Resource inventory.
- Environment discovery.
- Required tags.
- Cost management checks.
- Retired environment cleanup checks.

## Requirements

### Resource Inventory

IF an operator requests an inventory, WHEN the command runs, THEN it must list the key resources for each environment, including compute, load balancers, databases, storage, DNS, certificates, and logs.

### Environment Discovery

IF environments are discovered automatically, WHEN resources are scanned, THEN the workflow must group resources by tags, naming convention, or Terraform state output.

AND supported environment commands SHALL enumerate only `dev` and `production`.

### Required Tags

IF infrastructure creates a resource, WHEN the resource is provisioned, THEN it must include tags for environment, application, owner, and managed-by.

### Cost Flags

IF inventory includes cost-sensitive resources, WHEN results are displayed, THEN databases, NAT gateways, load balancers, large log groups, and retained storage must be highlighted.

### Orphan Detection

IF a resource does not match a known environment or state output, WHEN inventory runs, THEN it must be marked as unknown or orphaned for operator review.

### Retired Staging Residue

IF a resource still has `Environment=staging` after staging retirement, WHEN inventory or AWS tag scans are reviewed, THEN the resource SHALL be treated as retired residue.

AND operators SHALL verify whether the resource is inactive, deleted, or pending deletion before considering the cleanup complete.

## Acceptance Criteria

- Operators can identify all major resources for dev and production.
- Cost-sensitive resources are visible without opening AWS billing first.
- Untagged or orphaned resources are easy to spot.
- Inventory output can support cleanup and audit decisions.
- Staging is not listed by supported environment inventory commands.
- Remaining `Environment=staging` tagged resources are documented as deleted, inactive, or pending deletion.
