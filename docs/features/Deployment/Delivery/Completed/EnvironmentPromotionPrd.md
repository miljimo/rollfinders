# Environment Promotion PRD

Status: Done

Implementation evidence: `scripts/cicd/promotion.sh`, `scripts/cicd/deploy-environment.sh`, and the production approval gate in `scripts/cicd/deploy.sh`.

## Purpose

Promote application changes through dev and production using repeatable rules and traceable artifacts.

## Scope

- Promotion order.
- Image reuse across environments.
- Environment-specific variables.
- CI/CD promotion gates.
- Staging environment retirement.

## Requirements

### Promotion Order

IF a change is promoted, WHEN it moves toward production, THEN the expected path must be dev to production unless an emergency override is documented.

### Supported Environments

IF deployment scripts or pipeline configuration enumerate supported environments, WHEN the environment list is rendered or validated, THEN only `dev` and `production` SHALL be accepted.

AND `staging` SHALL NOT be accepted as a deployable environment.

### Staging Retirement

IF an operator attempts to deploy or destroy `staging`, WHEN the deployment scripts validate the environment name, THEN the workflow SHALL fail before Terraform initialization.

AND Bitbucket Pipelines SHALL NOT expose a staging deployment branch or staging destroy custom pipeline.

### Artifact Reuse

IF a build is promoted between environments, WHEN deployment runs, THEN the same image digest should be reused instead of rebuilding different artifacts for each environment.

### Environment Configuration

IF the same image is deployed to multiple environments, WHEN the task starts, THEN environment-specific behavior must come from environment variables, secrets, and infrastructure outputs.

### Production Gate

IF production deployment is requested, WHEN the pipeline reaches the production step, THEN it must require the configured manual approval or protected branch condition.

### Promotion Record

IF a promotion completes, WHEN the workflow finishes, THEN the source environment, target environment, commit, image digest, and approver must be recorded where available.

## Acceptance Criteria

- Production deployment is gated.
- A promoted release can be traced back to the exact artifact tested in dev.
- Environment-specific configuration does not require source changes.
- Emergency promotion bypasses are visible in pipeline history.
- Staging cannot be selected by supported deployment, inventory, cost, or destroy scripts.
- Production promotion consumes the latest successful dev artifact instead of a staging artifact.
