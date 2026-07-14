# Name: RELEASE-20260713 - RDS Cost Optimization Production Infrastructure Release

## Feature / Component

- Feature: Production Infrastructure Cost Optimization
- Component: Terraform RDS module, production RDS configuration, Terraform remote state
- Priority: P0
- Branch: `master`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: Production approval, AWS production access, Terraform backend access
- Source PRD: `docs/guidelines/DEPLOYMENT.md`
- Ticket status: Reviewing, created on 2026-07-13

## Goal

Keep production RDS cost optimization under Terraform control by preserving Single-AZ RDS and 3-day automated backup retention on future redeploys.

## Scope

The release agent must:

- Release Terraform commit `bcec54c Persist RDS cost reduction settings` from `master`.
- Confirm the production RDS instance `rollfinder-production-postgres` remains `MultiAZ=false`.
- Confirm automated backup retention remains `3` days.
- Confirm Terraform code, production tfvars, and remote Terraform state match the live RDS cost-optimized values.
- Confirm one fresh manual recovery snapshot exists before any destructive snapshot cleanup.
- Record Terraform validation, state refresh, plan, and live AWS verification evidence.

The release agent must not:

- Resize the RDS instance class without separate approval.
- Disable deletion protection.
- Delete the retained recovery snapshot.
- Re-enable Multi-AZ as part of this release.
- Change ECS, ALB, NAT, DNS, security groups, service task shape, or application images.
- Apply unrelated Terraform changes shown in a broad production plan.

## Implementation Notes

- Source branch: `master`
- Source commit: `bcec54c Persist RDS cost reduction settings`
- Live production RDS instance: `rollfinder-production-postgres`
- Region: `eu-west-2`
- Current optimized RDS settings:
  - `db.t4g.small`
  - `allocated_storage = 20`
  - `storage_type = gp2`
  - `multi_az = false`
  - `backup_retention_period = 3`
  - `deletion_protection = true`
- Retained manual recovery snapshot:
  - `rollfinder-production-postgres-cost-reduction-20260713141416`
- Terraform files changed:
  - `infrastructure/terraform/modules/rds_postgres/main.tf`
  - `infrastructure/terraform/modules/rds_postgres/variables.tf`
  - `infrastructure/terraform/main.tf`
  - `infrastructure/terraform/variables.tf`
  - `infrastructure/terraform/environments/production/common.tfvars`
- Terraform production values:
  - `db_backup_retention_period = 3`
  - `db_multi_az = false`
- Database migration required: No.
- Seed data required: No.
- Config impact: Terraform variable values only; no application environment variable changes.
- Infrastructure impact: RDS configuration source of truth only; no new resources.

## Specification

### Deployment Target

- App: `rollfinder`
- Service: Production RDS PostgreSQL
- Environment: `production`
- Type: `infrastructure`
- Runtime: `Terraform`, `AWS RDS PostgreSQL`

### Source

- Branch: `master`
- Commit/Tag: `bcec54c Persist RDS cost reduction settings`
- Ticket: `RELEASE-20260713`
- PR: Not assigned in this ticket

### Required Config

| Name | Required | Source | Description |
|---|---:|---|---|
| `AWS_REGION` | Yes | `.env` / deployment environment | AWS region, expected `eu-west-2`. |
| `ENVIRONMENT_NAME=production` | Yes | deployment environment | Selects production Terraform tfvars and backend. |
| `db_backup_retention_period` | Yes | `infrastructure/terraform/environments/production/common.tfvars` | Must remain `3`. |
| `db_multi_az` | Yes | `infrastructure/terraform/environments/production/common.tfvars` | Must remain `false`. |

### Infrastructure

- Terraform module `rds_postgres` owns RDS `backup_retention_period` and `multi_az`.
- Production tfvars must set `db_backup_retention_period = 3` and `db_multi_az = false`.
- Terraform remote state must be refreshed so it records the live RDS values.
- Broad Terraform apply is not allowed from this ticket because the current production plan shows unrelated security group drift.

### Database

- Migration path: None.
- Migration required: No.
- Seed data required: No.
- Backward compatible: Yes.

### Deployment Steps

1. Confirm `master` contains commit `bcec54c`.
2. Confirm production approval explicitly names this infrastructure release and source commit.
3. Confirm Terraform source values:

   ```bash
   rg -n "db_backup_retention_period|db_multi_az|backup_retention_period|multi_az" \
     infrastructure/terraform/main.tf \
     infrastructure/terraform/variables.tf \
     infrastructure/terraform/modules/rds_postgres/main.tf \
     infrastructure/terraform/modules/rds_postgres/variables.tf \
     infrastructure/terraform/environments/production/common.tfvars
   ```

4. Validate Terraform:

   ```bash
   terraform -chdir=infrastructure/terraform validate
   ```

5. Confirm live RDS settings:

   ```bash
   aws rds describe-db-instances \
     --region eu-west-2 \
     --db-instance-identifier rollfinder-production-postgres \
     --query 'DBInstances[0].{Identifier:DBInstanceIdentifier,Class:DBInstanceClass,Status:DBInstanceStatus,MultiAZ:MultiAZ,BackupRetention:BackupRetentionPeriod,StorageType:StorageType,AllocatedStorage:AllocatedStorage,DeletionProtection:DeletionProtection}' \
     --output table
   ```

6. Refresh Terraform state if state does not match live RDS:

   ```bash
   terraform -chdir=infrastructure/terraform apply \
     -refresh-only \
     -target=module.database \
     -var-file=environments/production/common.tfvars \
     -var='image_uri=terraform-rds-refresh-placeholder' \
     -auto-approve \
     -no-color
   ```

7. Confirm Terraform state now records:

   ```text
   backup_retention_period = 3
   multi_az = false
   instance_class = "db.t4g.small"
   allocated_storage = 20
   storage_type = "gp2"
   deletion_protection = true
   ```

8. Run a targeted database plan for evidence:

   ```bash
   terraform -chdir=infrastructure/terraform plan \
     -target=module.database \
     -var-file=environments/production/common.tfvars \
     -var='image_uri=terraform-rds-check-placeholder' \
     -detailed-exitcode \
     -no-color
   ```

9. Do not apply unrelated Terraform changes from the targeted or broad plan.

### Verification Steps

- WHEN Terraform is validated, THEN `terraform validate` succeeds.
- WHEN production tfvars are inspected, THEN `db_backup_retention_period = 3` and `db_multi_az = false`.
- WHEN live RDS is inspected, THEN `BackupRetention=3` and `MultiAZ=False`.
- WHEN Terraform state is inspected after refresh, THEN it records `backup_retention_period = 3` and `multi_az = false`.
- WHEN a Terraform plan includes RDS, THEN it does not propose changing RDS back to `MultiAZ=true` or `backup_retention_period=14`.
- WHEN manual snapshots are listed, THEN the retained recovery snapshot `rollfinder-production-postgres-cost-reduction-20260713141416` is available.

### Rollback Plan

- Method: restore previous RDS high-availability configuration through Terraform or AWS RDS modify.
- Data rollback required: No.
- Manual action required: Yes.

Steps:

1. Confirm the business decision to restore higher RDS availability and cost.
2. Set production Terraform values:

   ```hcl
   db_backup_retention_period = 14
   db_multi_az                = true
   ```

3. Run `terraform validate`.
4. Run a targeted `terraform plan -target=module.database`.
5. Apply only the approved RDS change.
6. Wait for RDS status to return to `available`.
7. Confirm live RDS reports `MultiAZ=True` and `BackupRetention=14`.

### Risks

- Single-AZ RDS reduces availability during an AZ-level outage.
- Shorter backup retention reduces automated point-in-time recovery window from 14 days to 3 days.
- Broad Terraform plans currently show unrelated security group drift/replacement; applying those changes from this ticket is unsafe.
- Manual snapshots still carry storage cost; retain only approved recovery snapshots.

### Out Of Scope

- RDS instance downsizing to `db.t4g.micro`.
- Switching storage from `gp2` to `gp3`.
- Production ECS service/task deployment.
- Security group drift repair.
- Deleting the retained recovery snapshot.
- Application code release.

## Evidence Recorded

- Terraform commit pushed to `master`: `bcec54c Persist RDS cost reduction settings`.
- `master` confirmed up to date with `origin/master`.
- Terraform validation passed.
- Live RDS confirmed:
  - `BackupRetention: 3`
  - `MultiAZ: False`
  - `Status: available`
  - `Class: db.t4g.small`
  - `StorageType: gp2`
  - `AllocatedStorage: 20`
  - `DeletionProtection: True`
- Terraform remote state was refreshed with `terraform apply -refresh-only -target=module.database`.
- Terraform state confirmed:
  - `backup_retention_period = 3`
  - `multi_az = false`
  - `instance_class = "db.t4g.small"`
  - `allocated_storage = 20`
  - `storage_type = "gp2"`
  - `deletion_protection = true`
- Targeted Terraform plan showed no RDS revert, but did show unrelated security group drift/replacement. Broad apply must remain blocked until that drift is separately reviewed.
