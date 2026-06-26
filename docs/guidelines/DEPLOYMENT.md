# Deployment Guideline

Use this guide for deployment tickets, CI/CD changes, infra changes, releases, and rollback plans.

## Core Rule

Deployment must be safe, repeatable, testable, reversible, and human-approved.

One deployment ticket = one deployment goal.

---

## Deployment Ticket Must Define

* what is deployed
* target environment
* source branch, commit, tag, or PR
* required config
* infrastructure impact
* database impact
* deployment steps
* verification steps
* rollback steps
* risks
* out of scope

Do not mix unrelated deployments unless they must release together.

---

## Specification Template

Use inside the standard ticket `## Specification` section.

```md
## Specification

### Deployment Target

- App: `<app-name>`
- Service: `<service-name>`
- Environment: `<local | dev | staging | production>`
- Type: `<backend | frontend | mobile | worker | migration | infrastructure>`
- Runtime: `<Go | Next.js | Docker | Lambda | ECS | other>`

### Source

- Branch: `<branch-name>`
- Commit/Tag: `<commit-or-tag>`
- Ticket: `<ticket-number>`
- PR: `<pr-id>`

### Required Config

| Name | Required | Source | Description |
|---|---:|---|---|
| `<ENV_NAME>` | Yes/No | `<secret/env/default>` | `<description>` |

### Infrastructure

- <runtime/network/storage/queue/cache requirement>

### Database

- Migration path: `<path>`
- Migration required: `<Yes | No>`
- Seed data required: `<Yes | No>`
- Backward compatible: `<Yes | No>`

### Deployment Steps

1. <step>
2. <step>

### Verification Steps

- WHEN <check>, THEN <expected result>.

### Rollback Plan

- Method: `<redeploy previous | revert PR | restore config | rollback migration>`
- Data rollback required: `<Yes | No>`
- Manual action required: `<Yes | No>`
- Steps:
  1. <step>
  2. <step>

### Risks

- <risk>

### Out Of Scope

- <excluded work>
```

---

## Environment Rules

Allowed environments:

```txt
local
dev
staging
production
```

Shared environments require human approval:

```txt
dev
staging
production
```

Production approval must be explicit.

---

## Human Approval Rule

No shared-environment deployment may run without explicit human approval.

Good approval:

```txt
Approved to deploy subscriptions service to staging from PR #42.
```

Good approval:

```txt
Approved to deploy tag v1.4.2 to production.
```

Bad approval:

```txt
Looks good.
Ship it.
```

Approval must name:

* target environment
* source branch, commit, tag, or PR
* migration plan, if any
* config changes, if any
* rollback plan

The agent must stop if approval is missing.

---

## Secret Rules

Do not expose secrets in tickets, logs, PRs, docs, or examples.

Good:

```txt
STRIPE_SECRET_KEY must be configured in secret manager.
```

Bad:

```txt
STRIPE_SECRET_KEY=sk_live_xxx
```

---

## Migration Rules

Migration path:

```txt
apps/backend_api/migrations/<service_name>/
```

A migration must state:

* owning service
* changed tables
* rollback possibility
* backward compatibility
* seed data requirement

A service migration must not change another service’s owned tables.

---

## Verification Rules

Every deployment must verify:

* app/service starts
* health check passes
* logs show no startup errors
* smoke test passes
* migration state is correct, if applicable

---

## Rollback Rules

Staging and production deployments must include rollback.

Rollback must define:

* previous version restore method
* config rollback
* migration rollback, if needed
* manual cleanup, if needed

---

## CI/CD Rules

CI/CD changes must define:

* trigger
* branch pattern
* environment
* build command
* test command
* deploy command
* secrets used
* rollback behaviour

Example:

```txt
Trigger: merge to main
Checks: lint, test, build
Deploy: staging
```

---

## Docker Rules

Docker deployments must define:

* Dockerfile path
* build context
* image name
* tag strategy
* exposed port
* env vars
* health check
* startup command

Do not rely only on `latest`.

Good:

```txt
subscriptions:<commit-sha>
```

Bad:

```txt
subscriptions:latest
```

---

## Backend Rules

For Go backend deployments, define:

* service name
* service path
* build command
* runtime command
* port
* health endpoint
* env vars
* migration dependency
* service dependencies

Service path:

```txt
apps/backend_api/internal/services/<service_name>/
```

---

## Frontend Rules

For portal deployments, define:

* app path
* build command
* hosting target
* public env vars
* private env vars
* routes/pages affected
* smoke test pages

App path:

```txt
apps/portal/
```

Public frontend env vars must be safe to expose.

---

## Infrastructure Rules

Terraform or infra changes must define:

* workspace/environment
* plan review
* expected resources changed
* network/security impact
* secret impact
* rollback/destroy strategy

Terraform apply requires explicit human approval.

---

## Agent Allowed

* create deployment ticket
* create deployment PR
* prepare scripts
* update CI/CD config
* write release notes
* document deployment steps

## Agent Not Allowed Without Approval

* deploy to dev/staging/production
* apply Terraform
* run destructive migrations
* rotate secrets
* change production config

---

## Ticket Notes

Add to deployment tickets:

```md
## Implementation Notes

- Follow `docs/guidelines/DEPLOYMENT.md`.
- Deployment requires explicit human approval.
- Do not expose secrets.
- Define target environment and source version.
- Document config, migrations, verification, rollback, and risks.
- Do not deploy unless approval names environment and source version.
```

Add to acceptance criteria:

```md
- WHEN reviewed, THEN target environment and source version are clear.
- WHEN reviewed, THEN required config is documented without secrets.
- WHEN reviewed, THEN migration impact is clear.
- WHEN reviewed, THEN verification and rollback steps are defined.
- WHEN approval is missing, THEN the agent stops before deployment.
```

Add to out of scope:

```md
- Deployment without human approval.
- Production release without explicit approval.
- Secret value exposure.
- Terraform apply without approval.
- Destructive migration without approval.
- Unrelated service deployment.
```
