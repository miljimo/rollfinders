# deployment-platform.md

# RollFinder Deployment Platform

## AI Agent Functional Requirements

Version: 1.0

---

# Objective

Build a fully automated deployment platform for RollFinder.

The platform must:

1. Build the application.
2. Execute automated testing.
3. Build Docker images.
4. Provision AWS infrastructure using Terraform.
5. Deploy application containers to ECS Fargate.
6. Deploy frontend assets.
7. Execute database migrations safely.
8. Perform smoke testing.
9. Output deployment URLs.
10. Support rollback.
11. Support multiple environments.
12. Be production-ready.

The AI Agent is responsible for implementing all required functionality.

---

# Success Criteria

A developer should be able to execute:

```bash
git push
```

and the platform should:

```text
Validate
Build
Test
Provision Infrastructure
Deploy
Verify
Publish URLs
```

without manual intervention for non-production environments.

---

# Deployment Environments

Supported environments:

```text
dev
staging
production
```

Environment behaviour:

| Environment | Auto Deploy | Manual Approval |
| ----------- | ----------- | --------------- |
| dev         | Yes         | No              |
| staging     | Yes         | No              |
| production  | No          | Yes             |

---

# AWS Services

The deployment platform shall provision and manage:

```text
VPC
Subnets
Route Tables
Internet Gateway
NAT Gateway

Application Load Balancer

ECS Cluster
ECS Services
ECS Task Definitions

ECR Repositories

RDS PostgreSQL

CloudWatch

Secrets Manager

Route53

ACM Certificates

CloudFront

S3

IAM Roles
```

Terraform must manage all resources.

Manual AWS resource creation is prohibited.

---

# Terraform Requirements

Terraform shall be the single source of truth.

All resources must be managed through Terraform.

Requirements:

```text
terraform fmt
terraform validate
terraform plan
terraform apply
```

must execute successfully.

---

# Terraform State

Terraform state must be remote.

Backend:

```text
AWS S3
AWS DynamoDB Lock Table
```

Requirements:

* State locking enabled
* State versioning enabled
* Encryption enabled

State separation:

```text
dev
staging
production
```

Each environment must have isolated state.

---

# Existing Terraform Modules

The AI Agent shall inspect existing modules.

Validation requirements:

## Module Exists

Verify:

* Inputs
* Outputs
* Security
* Tagging
* Reusability

---

## Module Missing

If a module is missing:

Create it.

---

## Module Incomplete

If functionality is missing:

Enhance the module.

---

# Required Terraform Modules

Required modules:

```text
network
security-groups
ecs-cluster
ecs-service
ecr
alb
rds-postgres
iam
secrets-manager
cloudwatch
route53
acm
s3
cloudfront
```

---

# Build Requirements

The deployment system shall support:

```text
Node.js
Next.js
TypeScript
Docker
```

Build process:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All commands must pass before deployment.

---

# Docker Requirements

The AI Agent shall create:

```text
Dockerfile
.dockerignore
```

Requirements:

* Multi-stage builds
* Minimal image size
* Non-root user
* Health checks

Image tagging:

```text
latest
commit-sha
release-tag
```

---

# Container Registry

Use:

```text
Amazon ECR
```

The pipeline shall:

```text
Build image
Tag image
Push image
```

Image scanning must be enabled.

Lifecycle policies must exist.

---

# ECS Requirements

Application shall run on:

```text
ECS Fargate
```

Requirements:

* ECS Cluster
* Task Definition
* ECS Service
* Auto Scaling

Containers must:

* Receive secrets from Secrets Manager
* Publish logs to CloudWatch
* Support health checks

---

# Load Balancer Requirements

Use:

```text
Application Load Balancer
```

Requirements:

* HTTPS listener
* HTTP redirect
* Health checks
* TLS via ACM

Public traffic must only enter through ALB.

---

# Database Requirements

Use:

```text
RDS PostgreSQL
```

Requirements:

* Private subnet
* Encryption enabled
* Automated backups
* Final snapshot enabled
* Deletion protection enabled

Production:

```text
Multi-AZ
```

must be enabled.

---

# Database Migration Requirements

Migration execution must be separate from deployment.

Environment behaviour:

## Dev

Automatic migrations allowed.

## Staging

Automatic migrations allowed.

## Production

Manual approval required.

---

# Production Database Protection

The AI Agent must prevent:

```text
terraform destroy
database drop
schema reset
force migrations
```

Production requirements:

```hcl
deletion_protection = true
skip_final_snapshot = false
```

---

# AWS Secrets Manager

All secrets must be stored in:

```text
AWS Secrets Manager
```

Examples:

```text
DATABASE_URL
JWT_SECRET
API_KEYS
THIRD_PARTY_SECRETS
```

Secrets must never be committed to source control.

---

# Bitbucket Pipelines

Use:

```text
Bitbucket Pipelines
```

The AI Agent shall create:

```text
bitbucket-pipelines.yml
```

---

# Pipeline Stages

## Validate

Execute:

```bash
npm ci
npm run lint
npm run typecheck
npm run test

terraform fmt
terraform validate
```

---

## Build

Execute:

```bash
docker build
```

---

## Push

Execute:

```bash
docker push
```

---

## Provision

Execute:

```bash
terraform plan
terraform apply
```

---

## Deploy

Deploy containers to ECS.

Wait for service stabilisation.

---

## Migrate

Execute migrations.

Environment specific behaviour applies.

---

## Smoke Test

Validate:

```text
Health Endpoint
API Endpoint
Database Connectivity
```

---

# AWS Authentication

The deployment system shall use:

```text
Bitbucket OIDC
```

Variable:

```text
AWS_CICD_ROLE_ARN
```

The role shall be injected by Bitbucket Deployment Environments.

The deployment code must never contain hardcoded IAM role ARNs.

---

# Deployment Variables

Required variables:

```text
ENVIRONMENT

AWS_REGION

AWS_CICD_ROLE_ARN

TF_STATE_BUCKET

TF_STATE_KEY

APP_NAME
```

---

# Deployment Scripts

The AI Agent shall implement:

```text
scripts/

build.sh
test.sh
docker-build.sh
docker-push.sh

terraform-init.sh
terraform-plan.sh
terraform-apply.sh

deploy.sh

migrate.sh

smoke-test.sh

rollback.sh
```

Scripts must be reusable across environments.

Environment-specific scripts are prohibited.

---

# Deployment Outputs

After successful deployment the pipeline must display:

## Frontend URL

Example:

```text
Frontend URL:
https://rollfinder.com
```

---

## API URL

Example:

```text
API URL:
https://api.rollfinder.com
```

---

## ALB URL

Example:

```text
Load Balancer:
https://rollfinder-prod-alb.amazonaws.com
```

---

## CloudFront URL

Example:

```text
CloudFront:
https://d123456.cloudfront.net
```

---

## ECS Information

Example:

```text
Cluster:
rollfinder-production

Service:
rollfinder-api
```

---

## Database Endpoint

Production:

Only display:

```text
Database deployed successfully.
```

Database hostname must not be printed.

---

# Rollback Requirements

The AI Agent shall implement:

```bash
scripts/rollback.sh
```

Capabilities:

* Previous ECS task definition
* Previous container image
* Previous application version

Rollback must complete without Terraform changes.

---

# Monitoring Requirements

CloudWatch must capture:

```text
Application Logs
Container Logs
Deployment Logs
Migration Logs
```

---

# Alarm Requirements

Create alarms for:

```text
ECS Task Failure

ALB 5xx

High CPU

High Memory

RDS CPU

RDS Storage
```

---

# Acceptance Criteria

Deployment platform is complete when:

✓ Infrastructure provisions successfully

✓ ECS service starts successfully

✓ Database provisions successfully

✓ Application passes health checks

✓ Frontend accessible

✓ API accessible

✓ Terraform state remote

✓ Bitbucket OIDC authentication working

✓ Production database protected

✓ Deployment URLs displayed automatically

✓ Rollback operational

✓ Smoke tests pass

✓ No manual AWS resource creation required
