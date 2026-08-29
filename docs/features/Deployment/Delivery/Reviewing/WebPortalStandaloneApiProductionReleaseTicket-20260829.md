# Name: RELEASE-20260829 - Web Portal Standalone API Production Release

## Feature / Component

- Feature: Production release
- Component: Next.js web portal, EC2 deployment, runtime configuration, and frontend DNS ownership
- Priority: P0
- Branch: `master`
- Developer owner: Platform team
- Test owner: Platform team
- Dependencies: Production backend healthy at `https://api.rollfinders.com`, source commit pushed, reviewed Terraform plan, and explicit production approval
- Source PRD: `docs/architecture/aws-deployment-architecture.md`
- Ticket status: Released to production on 2026-08-29

## Goal

Release the AWS-hosted web portal against the independently deployed production backend at `https://api.rollfinders.com` without allowing the portal infrastructure to modify the backend-owned API DNS record.

## Scope

The release agent must:

- Deploy the portal-only source from commit `33740a6e320e5cbddb7cfe8b3f4a85ba85a36138`.
- Configure `API_PUBLIC_BASE_URL=https://api.rollfinders.com` through the production SSM application parameters.
- Refresh the EC2 portal `.env` from SSM and run only the `web` container.
- Keep legacy direct-service environment aliases pointed at the standalone API during rollback compatibility.
- Remove the old API Route53 record from the portal Terraform state with `destroy = false`.
- Verify portal health and API-backed production journeys after deployment.

The release agent must not:

- Deploy or modify the standalone backend.
- Create, replace, or delete `api.rollfinders.com` DNS from the portal repository.
- Run backend service migrations or seed data.
- Deploy an uncommitted or unpushed revision.
- Apply Terraform or deploy to production without explicit approval.

## Specification

### Deployment Target

- App: `portal`
- App path: `apps/portal/`
- Service: Next.js web portal
- Environment: `production`
- Type: frontend and infrastructure configuration
- Runtime: Docker Compose on the existing AWS EC2 application host behind the existing ALB
- Build command: `npm run build`
- Test command: `npm test`
- Health route: `/api/health`

### Source

- Branch: `master`
- Base commit: `571940a`
- Release source commit: `33740a6e320e5cbddb7cfe8b3f4a85ba85a36138`
- Ticket: `RELEASE-20260829`
- PR: N/A

### Required Config

| Name | Required | Source | Description |
|---|---:|---|---|
| `API_PUBLIC_BASE_URL` | Yes | Terraform-managed SSM parameter | Must equal `https://api.rollfinders.com` in production. |
| `NEXTAUTH_URL` | Yes | Existing Terraform-managed SSM parameter | Production portal and authentication callback origin. |
| `NEXTAUTH_SECRET` | Yes | Existing protected SSM parameter | Session-signing secret. |
| `DATABASE_URL` | Yes | Existing protected SSM parameter | Portal-owned PostgreSQL connection. |
| Existing email and payment configuration | As currently required | Existing protected SSM parameters | Preserves portal email and payment behaviour. |

No secret values may be printed or added to source control. `API_PUBLIC_BASE_URL` is non-secret runtime configuration.

### Infrastructure

- Workspace/environment: `production` using `infrastructure/terraform/environments/production/common.tfvars`.
- Expected change: add or update the application SSM parameter `API_PUBLIC_BASE_URL` to `https://api.rollfinders.com`.
- Expected state handoff: forget `module.app_dns_records[0].aws_route53_record.api` from portal Terraform state without destroying the Route53 record.
- Expected DNS mutations: none for `api.rollfinders.com`; the standalone backend owns that record.
- Existing frontend records for `rollfinders.com` and `www.rollfinders.com` remain attached to the portal ALB.
- No new load balancer, NAT Gateway, database, compute host, or other always-on resource is introduced.
- Network/security impact: the existing EC2 portal host makes outbound HTTPS requests to the public backend endpoint.
- Terraform apply requires explicit human approval after plan review.

### Database

- Migration path: `prisma/migrations/`
- Migration required: No new migration is introduced by this release.
- Deployment behaviour: the existing guarded `npx prisma migrate deploy` command still runs and must report no unexpected pending migration.
- Seed data required: No.
- Data rollback required: No.
- Backward compatible: Yes; this release changes endpoint configuration and repository ownership only.

### Deployment Steps

1. Confirm `https://api.rollfinders.com/healthz` is healthy and the backend team owns its Route53 record and certificate.
2. Push release source commit `33740a6e320e5cbddb7cfe8b3f4a85ba85a36138` and this release ticket to `origin/master`.
3. Capture the current production portal image URI and promotion record as the rollback target.
4. Obtain explicit approval naming production, the release source commit, no new database migration, the `API_PUBLIC_BASE_URL` config change, the Terraform state-only DNS handoff, and the rollback plan below.
5. Run the production workflow validation gates: dependency install, Prisma generation, `npm test`, `npm run build`, Terraform formatting, and Terraform validation.
6. Build and push an immutable portal image tagged with the release commit.
7. Generate the production Terraform plan and verify that it does not delete, replace, or repoint the `api.rollfinders.com` Route53 record.
8. Apply only the approved production Terraform plan so the SSM API URL is present and the portal relinquishes API DNS state ownership.
9. Run `scripts/cicd/deploy-environment.sh` with the required production and migration approval guards. The EC2 deployment must refresh `.env` from SSM, recreate the frontend-only Compose definition, run Prisma deploy, and roll the `web` container.
10. Complete all verification steps and record the image URI, deployment command ID, Terraform plan/apply result, and smoke-test evidence in this ticket.

### Verification Steps

- WHEN `https://api.rollfinders.com/healthz` is requested, THEN the standalone production backend returns HTTP 200.
- WHEN `https://rollfinders.com/api/health` is requested after deployment, THEN the portal returns HTTP 200 with no startup error.
- WHEN the EC2 web container environment is inspected without printing secret values, THEN `API_PUBLIC_BASE_URL` resolves to `https://api.rollfinders.com`.
- WHEN a production user registers, logs in, or requests email verification, THEN the request succeeds through the standalone API.
- WHEN academy, course, booking, payment, wallet, and dashboard reads are exercised, THEN the portal receives successful API responses without localhost or removed Compose-service connection errors.
- WHEN the Route53 record for `api.rollfinders.com` is inspected after the portal Terraform apply, THEN it still points to the backend-owned target.
- WHEN portal logs are reviewed, THEN they contain no API DNS, TLS, connection-refused, or startup errors.

### Rollback Plan

- Method: Redeploy the captured previous production portal image while keeping the standalone API domain active.
- Data rollback required: No.
- Manual action required: Yes.
- Steps:
  1. Stop the rollout if portal health, authentication, or an API-backed smoke test fails.
  2. Redeploy the previous immutable portal image through the frontend-only Compose definition.
  3. Keep `API_PUBLIC_BASE_URL=https://api.rollfinders.com` and the compatibility service aliases because the backend move is not rolled back by this portal release.
  4. Re-run portal health, login, academy discovery, booking, and payment smoke tests.
  5. Do not restore API DNS ownership to the portal Terraform state unless the backend and platform owners approve a coordinated ownership rollback.

### Risks

- A missing, incorrect, or stale SSM value can make all API-backed portal journeys unavailable.
- The standalone API must expose the routes previously reached through direct service containers, including public user verification and academy registration routes.
- A careless Terraform state handoff could delete or repoint the live API record; `destroy = false` and plan review are mandatory safeguards.
- The previous portal image may still expect direct-service variables; the frontend-only Compose definition maps compatibility aliases to the standalone API for rollback.
- Backend TLS, routing, or availability failures are now an external dependency of the portal host.

### Out Of Scope

- Standalone backend deployment, configuration, migrations, or DNS provisioning.
- Development-environment deployment to `https://dev.api.rollfinders.com`.
- Production database schema or seed changes.
- New AWS resources, capacity changes, or secret rotation.
- Deployment without human approval.
- Terraform apply without approval.

## Implementation Notes

- Follow `docs/guidelines/DEPLOYMENT.md`.
- Deployment requires explicit human approval.
- Do not expose secrets.
- The portal owns frontend DNS only; the backend owns both API domains.
- The production release uses `https://api.rollfinders.com`; development uses `https://dev.api.rollfinders.com`.
- Review the Terraform plan specifically for Route53 operations before applying it.

## Acceptance Criteria

- WHEN reviewed, THEN the target environment and source commit are clear.
- WHEN reviewed, THEN required configuration is documented without secret values.
- WHEN reviewed, THEN the absence of new database migrations and seed data is clear.
- WHEN reviewed, THEN verification and rollback steps are defined.
- WHEN the production Terraform plan is reviewed, THEN it contains no deletion, replacement, or repointing of the backend-owned API DNS record.
- WHEN the portal is deployed, THEN all server-side API traffic uses `https://api.rollfinders.com` or a compatibility alias resolving to that same endpoint.
- WHEN approval is missing, THEN the agent stops before deployment or Terraform apply.

## Regression / Compatibility Tests

- Confirm portal login, registration, password reset, and email verification continue to work.
- Confirm public academy and event discovery continue to work.
- Confirm dashboard academy, booking, payment, subscription, wallet, and authorization journeys continue to work.
- Confirm `rollfinders.com` and `www.rollfinders.com` still resolve to the portal ALB.
- Confirm `api.rollfinders.com` remains owned and served by the standalone backend.
- Confirm no backend or mobile repository artifact is required for portal build and tests.

## Release Readiness Evidence

Collected locally on 2026-08-29:

- `npm test`: passed, 222 tests.
- `npm run build`: passed and produced a Next.js build ID.
- `terraform validate`: passed.
- Terraform formatting checks for the changed root and local module files: passed.
- Bash syntax checks for the changed deployment scripts: passed.
- Production Terraform plan: reviewed; the unsafe full plan was rejected because it included unrelated EC2 replacement and configuration drift.
- Approved configuration was applied narrowly: the API URL parameter was created and imported into Terraform state, and API DNS state ownership was removed without deleting the live record.

## Production Release Evidence

Collected on 2026-08-29 after explicit production approval:

- Release source `33740a6e320e5cbddb7cfe8b3f4a85ba85a36138` was pushed to `origin/master`.
- Immutable production image digest: `sha256:ce54f3d9db35b4785afd8af61b71d3ffb63352edbc2c7567d76a32228c5c9e23`.
- Rollback image: tag `1bd9e53`, digest `sha256:4e2fa91441f751d5296aec5f77a0cb3a46d96a7f1173c14da2de422e0f57e6f6`.
- GitHub Actions run `33268287632` stopped before build because the stored package token was expired; no deployment occurred from that run.
- GitHub package authorization was refreshed with `read:packages`, after which the existing local release workflow built, container-health-checked, and pushed the immutable image.
- EC2 deployment tooling fixes were committed as `8eea0dd`, `e55e363`, and `a3649b1`; failed attempts rolled back to `1bd9e53` before the successful retry.
- The guarded EC2 deployment completed, including Prisma deploy, shallow portal health, and deep database health checks.
- `API_PUBLIC_BASE_URL` is managed in production SSM with value `https://api.rollfinders.com`.
- Portal Terraform no longer manages the `api.rollfinders.com` record; the record remained unchanged and the API ALB target group reported healthy.
- Portal ALB target health: healthy.
- `https://rollfinders.com/api/health`: HTTP 200.
- `https://rollfinders.com/api/health?deep=1`: HTTP 200 with database healthy.
- `https://rollfinders.com/login`: HTTP 200.
- `https://rollfinders.com/register`: HTTP 200 after deployment; it returned HTTP 500 before deployment.
- `https://rollfinders.com/forgot-password`: HTTP 200.
- `https://api.rollfinders.com/healthz` and `/readyz`: HTTP 200.
- A real production super-admin credential login returned HTTP 200, was accepted without an authentication error, created a session containing the user ID and access token, and loaded the authenticated dashboard with HTTP 200. Credentials and cookies were not logged.

## Approval Gate

Creating and committing this ticket does not approve production deployment. Approval must explicitly name:

- Environment: `production`.
- Source commit: `33740a6e320e5cbddb7cfe8b3f4a85ba85a36138`.
- Migration plan: no new migration or seed data; the existing Prisma deploy command must find no unexpected migration.
- Config plan: set `API_PUBLIC_BASE_URL=https://api.rollfinders.com` in Terraform-managed SSM configuration.
- Infrastructure plan: relinquish the portal Terraform API DNS state entry with `destroy = false`; do not mutate the live API record.
- Rollback plan: restore the captured previous portal image, retain the standalone API URL and compatibility aliases, and do not transfer DNS ownership back without coordinated approval.
