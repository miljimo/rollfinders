# Deployment Flow

This artifact shows how code moves from Bitbucket into AWS.

## CI/CD Overview

```mermaid
flowchart LR
  commit[Git Commit or Branch Event]
  validate[Validate<br/>npm ci, Prisma generate,<br/>lint, typecheck, test, build,<br/>terraform fmt and validate]
  build[Build Docker Image<br/>scripts/cicd/build.sh]
  ecr[ECR<br/>rollfinder/env/app]
  artifact[image.env<br/>IMAGE_URI tag]
  lock[S3 Deployment Lock<br/>deployment-lock/global.lock]
  deploy_env[Deploy Production<br/>deployment lock and approval checks]
  tf[Terraform Plan and Apply]
  ecs[ECS Force New Deployment<br/>wait services-stable]
  migrate[ECS One-Off Migration Task<br/>npx prisma migrate deploy]
  seed[Dev Seed Data<br/>scripts/cicd/seed.sh]
  smoke[Smoke Test<br/>scripts/cicd/smoke.sh]
  marker[S3 Success Promotion Marker<br/>promotion_write env success]

  commit --> validate
  validate --> build
  build --> ecr
  build --> artifact
  lock --> deploy_env
  artifact --> deploy_env
  deploy_env --> tf
  tf --> ecs
  ecs --> migrate
  migrate --> seed
  migrate --> smoke
  seed --> smoke
  smoke --> marker
```

## Branch and Environment Rules

| Source | Pipeline Behavior | Environment |
| --- | --- | --- |
| Any branch/default pipeline | Static validation only | None |
| `feature/*` | Static validation only | None |
| `develop` | Static validation only | None |
| `main` | Validate, build production images, manual production deploy | production |

## Promotion Controls

```mermaid
flowchart TD
  ready[Validated Main Build]
  prod_check{Deploy production?}
  prod[Production Deploy Success]

  ready --> prod_check
  prod_check -->|requires manual step<br/>PRODUCTION_APPROVED=true<br/>PRODUCTION_MIGRATION_APPROVED=true| prod
```

Controls implemented by the deployment scripts:

- `scripts/cicd/deploy-environment.sh` validates environment names.
- Production deploys require `PRODUCTION_APPROVED=true`.
- Production migrations require `PRODUCTION_MIGRATION_APPROVED=true`.
- Deployments must hold the global deployment lock before `scripts/cicd/deploy.sh` runs.
- The deployment lock is an S3 object at `deployment-lock/global.lock` by default.
- Production deploys use the built `image.env` artifact directly; dev promotion markers are not required while the dev environment is destroyed for cost control.
- Promotion markers are S3 objects under `deployment-promotions/<env>.json` by default and are retained only as deployment evidence.

## Production Availability Rules

Production deployments must keep `rollfinders.com` reachable.

- The active healthy production task definition must continue serving traffic until the replacement task definition is healthy and smoke checks pass.
- ECS production rollout settings must preserve healthy capacity during deployment; do not use a normal production deploy path that lowers desired healthy tasks to zero.
- Migrations must be backward compatible with the currently running production app until the new app is serving successfully.
- DNS records, ALB listeners, target groups, and public certificates must not be removed or disabled before the replacement production route is validated.
- A production deploy must run a public health check before deployment and after deployment.
- If public DNS is already unhealthy before deployment, the deployment is blocked unless the release is explicitly a DNS recovery and an ALB-bypassed smoke check is recorded.

If an approved operation cannot guarantee uninterrupted service, users must see a controlled deployment admin or maintenance page instead of a browser network error. That page must be served by infrastructure outside the changing application task, give a clear temporary maintenance message and expected return window, and be removed as soon as production health checks pass.

## Runtime Deployment Steps

```mermaid
sequenceDiagram
  participant Pipeline as Bitbucket Pipeline
  participant AWS as AWS OIDC / STS
  participant ECR as ECR
  participant TF as Terraform
  participant ECS as ECS
  participant Mig as One-Off Fargate Task
  participant DB as RDS
  participant App as RollFinder App
  participant S3 as S3 State/Control Bucket

  Pipeline->>AWS: Assume AWS role through OIDC
  Pipeline->>ECR: Ensure repository exists and login
  Pipeline->>Pipeline: Build runner Docker image
  Pipeline->>App: Local container health check /api/health
  Pipeline->>ECR: Push commit, latest, and environment tags
  Pipeline->>S3: Acquire deployment lock
  Pipeline->>TF: terraform init with environment backend
  Pipeline->>TF: terraform plan with image_uri
  Pipeline->>TF: terraform apply
  Pipeline->>ECS: force-new-deployment
  Pipeline->>ECS: wait services-stable
  Pipeline->>ECS: run-task with migration command
  ECS->>Mig: Start task in private subnets with ECS SG
  Mig->>DB: npx prisma migrate deploy
  Pipeline->>App: Smoke test deployed URL
  Pipeline->>S3: Write success promotion marker and release lock
```

## Deployment Outputs

After Terraform apply and ECS stabilization, the deployment script prints:

- Environment name
- Frontend URL
- WWW URL, production only
- API URL
- ECS cluster name
- ECS service name
- Docker image URI
- ACM certificate ARN

## Environment Separation

Each environment uses:

- Shared Terraform artefact bucket named `rollfinder-<account-id>-terraform-artefact`
- Separate Terraform state keys under `dev/` and `production/`
- Separate environment config under `infrastructure/terraform/environments/<env>/common.tfvars`
- Separate ECR repository path: `rollfinder/<env>/app`
- Separate Terraform-created resource names prefixed as `rollfinder-<env>`
- Separate database instance and Secrets Manager secret
- Shared deployment-control defaults in the dev Terraform state bucket unless `DEPLOYMENT_LOCK_BUCKET` or `PROMOTION_BUCKET` is overridden
