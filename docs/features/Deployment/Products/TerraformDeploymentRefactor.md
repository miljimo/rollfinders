# Feature: Terraform Deployment Refactor

## Bootstrap Infrastructure vs Runtime Infrastructure

Type: Platform Engineering Refactor

Priority: High

---

# Objective

Refactor the Terraform deployment architecture to separate:

1. Bootstrap Infrastructure
2. Shared Infrastructure
3. Runtime Infrastructure
4. Application Infrastructure

The goal is to reduce deployment time, reduce Terraform risk, improve maintainability, and avoid unnecessary resource updates during application deployments.

---

# Current Problem

The existing deployment architecture deploys infrastructure and applications together.

Example:

```text id="y2evl3"
Frontend Deployment

↓

Terraform Apply

↓

VPC Evaluation

↓

Route53 Evaluation

↓

NAT Gateway Evaluation

↓

Certificate Evaluation

↓

ECS Evaluation

↓

Frontend Deployment
```

This increases:

* Deployment duration
* Terraform complexity
* Risk of infrastructure changes
* AWS costs
* Deployment failures

---

# Desired State

Infrastructure must be divided into layers.

```text id="1q7cf0"
Bootstrap Layer

↓

Shared Layer

↓

Environment Layer

↓

Application Layer
```

Only the required layer should be deployed.

---

# Layer 1 - Bootstrap Infrastructure

Purpose:

Provision long-lived AWS resources.

Frequency:

Rare.

Expected lifecycle:

Months or years.

---

## Bootstrap Resources

Move the following resources into:

```text id="gfep5u"
/infrastructure/bootstrap
```

Resources:

```text id="r0q5g4"
Terraform Backend

S3 State Bucket

DynamoDB Lock Table

Route53 Hosted Zone

ACM Certificates

VPC

Internet Gateway

NAT Gateway

Public Subnets

Private Subnets

Route Tables

Base Security Groups

CloudWatch Log Groups

Shared IAM Roles

OIDC Provider

Bitbucket OIDC Configuration
```

---

## Bootstrap Rules

Bootstrap infrastructure shall:

```text id="5mocaa"
Deploy Once

Rarely Change

Not Run During Application Deployments
```

---

## Bootstrap Execution

Command:

```bash id="rbm5fg"
./scripts/bootstrap.sh
```

Expected:

```text id="h7o7rh"
Provision foundational AWS infrastructure.
```

---

# Layer 2 - Shared Infrastructure

Purpose:

Resources shared across environments.

Directory:

```text id="g9iqhi"
/infrastructure/shared
```

---

## Shared Resources

Examples:

```text id="xg3vxv"
ECR Repositories

Shared CloudWatch Resources

Shared Monitoring

Shared SNS Topics

Shared Dashboards

Shared Alarms

Shared IAM Policies
```

---

## Shared Deployment

Command:

```bash id="h6s7w4"
./scripts/deploy-shared.sh
```

---

# Layer 3 - Environment Infrastructure

Purpose:

Provision environment-specific infrastructure.

Directory:

```text id="ph7f8h"
/infrastructure/environments
```

---

## Environment Resources

Development:

```text id="p3w9r0"
dev ECS Cluster

dev ALB

dev RDS

dev Secrets
```

---

Staging:

```text id="g0rqfi"
staging ECS Cluster

staging ALB

staging RDS

staging Secrets
```

---

Production:

```text id="nttqf5"
production ECS Cluster

production ALB

production RDS

production Secrets
```

---

## Environment Scope

All resources must use:

```hcl id="87j4mq"
environment_name
```

Example:

```text id="bhp87x"
rollfinder-dev-alb

rollfinder-staging-alb

rollfinder-production-alb
```

---

# Layer 4 - Application Infrastructure

Purpose:

Application deployment.

Directory:

```text id="8mklm6"
/deployment
```

---

## Application Resources

Examples:

```text id="h1ykqz"
ECS Task Definitions

ECS Service Updates

Container Versions

CloudFront Invalidations

Database Migrations

Seed Data
```

---

## Application Deployment

Command:

```bash id="b8u6ec"
./scripts/deploy.sh
```

Must not:

```text id="n52mpz"
Create VPC

Create Route53 Zone

Create NAT Gateway

Create Certificates

Create Terraform Backend
```

---

# Terraform State Separation

Separate state files.

---

## Bootstrap State

```text id="9k7i04"
terraform-bootstrap.tfstate
```

---

## Shared State

```text id="s4h6up"
terraform-shared.tfstate
```

---

## Development State

```text id="oajm1l"
terraform-dev.tfstate
```

---

## Staging State

```text id="xubqjq"
terraform-staging.tfstate
```

---

## Production State

```text id="crhyl0"
terraform-production.tfstate
```

---

# Terraform Dependency Management

Environment layers must consume outputs from Bootstrap.

Examples:

```text id="g7qj8n"
VPC ID

Subnet IDs

Certificate ARN

Hosted Zone ID
```

through:

```hcl id="zk8m54"
terraform_remote_state
```

---

# Deployment Optimization

Frontend deployment should execute:

```text id="35i0zn"
Build

Test

Upload Assets

CloudFront Invalidation
```

Only.

---

The following resources must never be touched:

```text id="zdxdh8"
VPC

Route53

NAT Gateway

Hosted Zone

Certificate

Subnets
```

---

# Runtime Infrastructure Refactor

The AI Agent shall identify resources that are immutable.

Examples:

```text id="e2dzbk"
VPC

Hosted Zone

Certificate

Terraform Backend
```

and move them into Bootstrap.

---

The AI Agent shall identify resources that change regularly.

Examples:

```text id="pjlwmc"
Task Definitions

Container Images

Deployments

Seed Data
```

and move them into Runtime.

---

# CI/CD Refactor

Current deployment:

```text id="1kg61j"
Build

Terraform Apply Everything

Deploy Everything
```

---

Target deployment:

```text id="aqop7r"
Build

Test

Deploy Application Only
```

---

Infrastructure changes:

```text id="lwr4z9"
Bootstrap

Shared

Environment
```

must only execute when infrastructure code changes.

---

# Required Scripts

The AI Agent shall create:

```text id="odf65k"
scripts/bootstrap.sh

scripts/deploy-shared.sh

scripts/deploy-environment.sh

scripts/deploy.sh

scripts/validate-terraform.sh
```

---

# Validation Requirements

The AI Agent must verify:

✓ VPC moved to Bootstrap

✓ Route53 moved to Bootstrap

✓ ACM moved to Bootstrap

✓ Terraform Backend moved to Bootstrap

✓ Shared resources isolated

✓ Environment resources isolated

✓ Application deployment isolated

✓ Terraform state separated

✓ Runtime deployments no longer touch foundational infrastructure

✓ Existing deployments continue functioning

---

# Acceptance Criteria

The refactor is complete when:

1. Frontend deployments do not evaluate VPC resources.

2. Frontend deployments do not evaluate Route53 resources.

3. Frontend deployments do not evaluate ACM resources.

4. Application deployments complete significantly faster.

5. Bootstrap infrastructure can be provisioned independently.

6. Environment infrastructure can be provisioned independently.

7. Runtime deployments only deploy application changes.

8. Terraform states are separated by responsibility.

9. Existing environments continue operating without downtime.

10. Infrastructure ownership is clearly separated into Bootstrap, Shared, Environment, and Runtime layers.
