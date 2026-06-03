# Deployment Platform Enhancement

## Resource Validation & Environment Destruction

### Objective

Ensure deployment quality through automated validation and provide controlled destruction capabilities for all environments.

The platform must support safe infrastructure cleanup while preventing accidental production outages.

---

# Pre-Deployment Validation Requirements

Before any deployment occurs, the platform must validate:

## Application Validation

Execute:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All steps must succeed.

Deployment must fail immediately if any validation fails.

---

## Terraform Validation

Execute:

```bash
terraform fmt -check

terraform validate

terraform plan
```

Requirements:

* No syntax errors
* No provider errors
* No module validation errors
* No missing variables

Deployment must stop if validation fails.

---

## Docker Validation

Execute:

```bash
docker build

docker run
```

Validate:

* Container starts successfully
* Health endpoint responds
* Required environment variables exist

---

## Infrastructure Validation

Verify:

* ECR repository exists
* ECS cluster exists
* Secrets Manager secrets exist
* Route53 zones exist
* Required IAM permissions exist

---

# Post Deployment Validation

After deployment:

Validate:

```text
Health Endpoint
API Endpoint
Database Connectivity
ECS Service Stability
ALB Health Checks
```

Deployment is successful only if all checks pass.

---

# Environment Destruction Support

The platform must provide controlled destruction capabilities.

Supported environments:

```text
dev
staging
production
```

---

# Destruction Scripts

Implement:

```text
scripts/

destroy.sh
destroy-env.sh
```

Usage:

```bash
./scripts/destroy-env.sh dev

./scripts/destroy-env.sh staging

./scripts/destroy-env.sh production
```

---

# Development Environment Destruction

Allowed:

```text
Terraform Destroy
Database Destroy
ECS Destroy
ECR Destroy
S3 Destroy
```

Execution:

```bash
terraform destroy
```

No approval required.

---

# Staging Environment Destruction

Allowed:

```text
Terraform Destroy
Database Destroy
ECS Destroy
ECR Destroy
S3 Destroy
```

Requirements:

* Manual confirmation
* Environment validation

---

# Production Environment Destruction

Production must be protected.

Default Behaviour:

```text
Destroy Disabled
```

---

# Production Protection Requirements

The platform must prevent:

```text
Accidental Destroy

Pipeline Destroy

Automated Destroy

Single-Step Destroy
```

---

# Production Destroy Process

Production destruction requires:

## Step 1

Explicit flag:

```bash
ALLOW_PRODUCTION_DESTROY=true
```

---

## Step 2

Environment confirmation:

```bash
I_UNDERSTAND_THIS_WILL_DESTROY_PRODUCTION
```

---

## Step 3

Database Snapshot

Create snapshot:

```text
Production Backup Snapshot
```

before destruction.

---

## Step 4

Manual Approval

Deployment platform approval required.

---

## Step 5

Terraform Destroy

Execute:

```bash
terraform destroy
```

---

# Database Protection

Production RDS configuration:

```hcl
deletion_protection = true

skip_final_snapshot = false
```

Destroy script must temporarily disable protection before destroy.

---

# Environment Discovery

The platform must support:

```bash
./scripts/list-environments.sh
```

Output:

```text
dev
staging
production
```

---

# Resource Inventory

The platform must support:

```bash
./scripts/inventory.sh production
```

Output:

```text
ECS Cluster

ECS Services

ECR Repositories

RDS Instances

ALBs

Route53 Records

CloudFront Distributions

S3 Buckets

Secrets
```

---

# Cost Management

The platform must support:

```bash
./scripts/cost-summary.sh
```

Purpose:

Identify active resources and estimated monthly costs.

---

# Acceptance Criteria

Feature is complete when:

✓ Deployment validation executes successfully

✓ Terraform validation executes successfully

✓ Docker validation executes successfully

✓ Smoke tests execute successfully

✓ Development environment can be destroyed

✓ Staging environment can be destroyed

✓ Production destruction is protected

✓ Database snapshots created before production destruction

✓ Resource inventory available

✓ Environment listing available

✓ Cost reporting available

✓ No accidental production destruction possible
