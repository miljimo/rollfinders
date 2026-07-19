# Name: RELEASE-20260717 - Public Registration And Dashboard Recovery Production Release

## Feature / Component

- Feature: Production Release
- Component: Portal public registration, user dashboard dialogs, academy claim template deployment
- Priority: P0
- Branch: `master`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: Production approval, production image build, ECS smoke-test access
- Source PRD: `docs/features/Deployment/Delivery/Reviewing/PublicRegistrationAndDashboardRecoveryReleaseTicket-20260717.md`
- Ticket status: Ready for production approval, updated on 2026-07-19

## Goal

Release the current public registration and dashboard recovery fixes to production so user registration does not create unusable accounts and the admin user edit dialog no longer crashes when academy read permissions are unavailable.

## Release Reason

Production currently has a user-management failure mode where `/dashboard/users?dialog=edit-user&userId=...` can render the Next.js server error page after an academy-service `403 Not authorised` response during user academy enrichment. The release also includes public registration hardening so verification-email delivery failures do not leave a user thinking they can sign in before verification is possible.

This is a recovery/hardening release, not a broad product relaunch.

## Scope

The release agent must:

- Deploy `master` commit `405686849a7fb5ffa6e4387e57a6aae763ba8d47`.
- Include `4c20bd8 Prevent user dashboard academy read crash`.
- Include `6894f95 Add public academy registration selector`.
- Include `4056868 Handle registration verification email failures`.
- Include the package manifest update that pins `typescript` to `^5.9.3` in `package.json` and `package-lock.json`.
- Verify `/dashboard/users?dialog=edit-user&userId=<known-user>` no longer returns the production server error page for permitted admins.
- Verify practitioner registration still requires academy selection and email verification.
- Verify academy registration entry points still render.
- Verify health checks and public routes after deployment.

The release agent must not:

- Run database migrations; no migration is required for this release.
- Run broad Terraform apply.
- Seed subscription plans, demo data, or other production catalogue data.
- Include uncommitted local changes in the deployed artifact.
- Change production infrastructure shape.

## Implementation Notes

- Source branch: `master`
- Release candidate: `405686849a7fb5ffa6e4387e57a6aae763ba8d47`
- Current production task definition before this release should be recorded before deployment.
- Expected deployment type: application-only ECS task definition update using existing deployment scripts and health checks.
- Database impact: none.
- Config impact: no new environment variables.
- Dependency impact: TypeScript dev dependency is pinned from `^5` to `^5.9.3` for repeatable local/CI type checking.
- Infrastructure impact: none.
- Rollback target: previous known-good ECS task definition captured immediately before deployment.

## Specification

### Deployment Target

- App: `rollfinder`
- Service: Portal app and currently configured ECS sidecar services
- Environment: `production`
- Type: frontend/backend container deployment
- Runtime: Next.js, Docker, ECS/Fargate

### Source

- Branch: `master`
- Commit/Tag: `405686849a7fb5ffa6e4387e57a6aae763ba8d47`
- Ticket: `RELEASE-20260717`
- PR: Not assigned in this ticket

### Required Config

| Name | Required | Source | Description |
|---|---:|---|---|
| `ENVIRONMENT_NAME=production` | Yes | deployment environment | Selects production deployment configuration. |
| `PRODUCTION_APPROVED=true` | Yes | explicit human approval | Required guard for production deployment. |
| `IMAGE_URI` | Yes | build artifact | Immutable portal/web Docker image URI. |
| service image URI variables | Existing only | build artifact | Existing ECS task containers should receive matching image tags where built. |

No new runtime environment variables are required.

### Infrastructure

- Reuse existing ECS/Fargate service, ALB, DNS, RDS, and networking.
- Do not run Terraform apply for this release.
- Do not modify RDS cost settings or retained recovery snapshots.

### Database

- Migration path: none.
- Migration required: No.
- Seed data required: No.
- Backward compatible: Yes.

### Dependencies

- Runtime dependencies: unchanged.
- Development/build dependencies: `typescript` is pinned to `^5.9.3`.
- Lockfile impact: `package-lock.json` records the TypeScript range update only.

### Deployment Steps

1. Confirm clean worktree:

   ```bash
   git status -sb
   ```

2. Confirm `master` is pushed and points to the release candidate:

   ```bash
   git log --oneline -5
   git ls-remote origin refs/heads/master
   ```

3. Run pre-release checks:

   ```bash
   node --import tsx --test \
     apps/portal/src/lib/__tests__/practitioner-registration-contracts.test.ts \
     apps/portal/src/lib/__tests__/public-academy-registration-login-contracts.test.ts \
     apps/portal/src/lib/__tests__/rollfinder-user-profiles-contracts.test.ts
   npm run typecheck
   npm run build
   ```

4. Build immutable production images for commit `4056868`.
5. Capture the current production ECS task definition ARN for rollback.
6. Deploy through the locked application-only ECS deployment path.
7. Run the existing production smoke script.
8. Record deployed image URI, ECS task definition ARN, smoke output, and rollback target.

### Verification Steps

- WHEN `/api/health` is requested, THEN it returns HTTP 200 and `{"status":"ok"}`.
- WHEN `/api/health?deep=1` is requested, THEN database health returns `ok`.
- WHEN `/` loads, THEN public discovery renders.
- WHEN `/login` loads, THEN login and registration entry points render.
- WHEN `/register` loads, THEN users can search/select an academy before public practitioner registration.
- WHEN `/register/academy` loads, THEN academy registration renders.
- WHEN a practitioner registration cannot send a verification email, THEN the UI explains that support/admin verification is required before login.
- WHEN an admin opens `/dashboard/users?dialog=edit-user&userId=<known-user>`, THEN the page does not crash if academy-service read enrichment returns 401/403.
- WHEN a permitted admin verifies a public user's email from the dashboard, THEN the user can proceed with login after verification.

### Rollback Plan

- Method: redeploy the previous ECS task definition.
- Data rollback required: No.
- Manual action required: Yes.

Steps:

1. Capture CloudWatch errors, failing URL, current task definition, and image URI.
2. Update ECS service back to the previous task definition.
3. Wait for ECS service stability.
4. Run:

   ```bash
   curl -fsS https://rollfinders.com/api/health
   curl -fsS 'https://rollfinders.com/api/health?deep=1'
   ```

5. If only the dashboard dialog remains broken, keep production online and prepare a targeted portal hotfix.

### Risks

- The public registration flow depends on outbound email delivery; users still need support/admin verification if email delivery fails.
- The dashboard fix intentionally treats academy-service read 401/403 as missing academy data, so an affected user row may show no academy name until permissions/service configuration are corrected.
- Authenticated dashboard smoke requires a valid admin session and may need browser/manual verification.

### Out Of Scope

- Database migrations.
- Terraform apply or infrastructure changes.
- Subscription catalogue data cleanup or seeding.
- Wallet task-shape changes.
- Redesigning the full registration journey.

## Release Readiness Checklist

- [x] Public registration contracts passed.
- [x] Public academy registration/login contracts passed.
- [x] Dashboard academy-read crash contract passed.
- [x] `npm run typecheck` passed.
- [x] `npm run build` passed for the final release candidate.
- [ ] Production approval names commit `405686849a7fb5ffa6e4387e57a6aae763ba8d47`, no migrations, no config changes, and rollback by previous ECS task definition.
- [ ] Production image built.
- [ ] ECS deployment completed.
- [ ] Production smoke checks passed.
- [ ] Dashboard edit-user route manually verified.

## Pre-Release Evidence

Collected on 2026-07-19 before production deployment:

- Release candidate: `405686849a7fb5ffa6e4387e57a6aae763ba8d47`.
- Additional uncommitted release-support change at ticket update time: `package.json` and `package-lock.json` pin `typescript` to `^5.9.3`. Commit this with the release ticket before production image build if approved.
- Focused portal tests passed:

  ```bash
  node --import tsx --test \
    apps/portal/src/lib/__tests__/practitioner-registration-contracts.test.ts \
    apps/portal/src/lib/__tests__/public-academy-registration-login-contracts.test.ts \
    apps/portal/src/lib/__tests__/rollfinder-user-profiles-contracts.test.ts
  ```

- TypeScript check passed:

  ```bash
  npm run typecheck
  ```

- Production build passed:

  ```bash
  npm run build
  ```

  Build warning recorded: Next.js inferred `/home/leo62/projects/package-lock.json` as the workspace root because multiple lockfiles exist. The build still completed successfully. This warning should be handled separately by setting `turbopack.root` or removing the unrelated parent lockfile; it should not block this recovery release unless CI treats the warning as fatal.
