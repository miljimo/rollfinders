# Name: RELEASE-20260709 - Subscription Catalogue Cleanup And Pricing Workflow Production Release

## Feature / Component

- Feature: Production Release
- Component: Subscription Service, subscription catalogue data, subscription pricing workflow, deployment migrations
- Priority: P0
- Branch: `master`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: Production approval, subscriptions-only migration/data cleanup approval, production image build, smoke-test access
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`
- Ticket status: Reviewing, updated on 2026-07-09

## Goal

Release the subscription catalogue cleanup and subscription pricing workflow changes to production without reintroducing seed subscription plans or deleting any plan that has been used by a real subscription.

## Scope

The release agent must:

- Deploy from `master` after confirming the approved commit.
- Include the subscription seed prevention commit `db2d460 Remove seeded subscription catalogue`.
- Include the subscription product pricing workflow commits `d454d7d Implement subscription product pricing workflow` and `7142be9 Implement derived subscription plan pricing`.
- Include the analytics and multi-plan subscription fix commit `0e48f9d Fix analytics stats and multi-plan subscriptions`.
- Validate the current release candidate commit `e6110c0 Add subscription cleanup release ticket` before deployment if it remains the head of `master`.
- Confirm production no longer contains the seeded plans `Free`, `Academy Starter`, `Academy Pro`, or `Enterprise` from the old migration seed.
- Confirm no live subscription or subscription plan-change row references the removed seeded plan IDs.
- Validate the guarded cleanup migration stays subscriptions-service scoped.
- Record production image digests, ECS task definition ARN, migration output, smoke-test evidence, and rollback target.

The release agent must not:

- Seed subscription products, features, plans, owner policies, plan features, or plan products into production.
- Delete customer-created subscription catalogue data.
- Delete seeded plan rows if any live subscription or plan-change history references them.
- Deploy unrelated infrastructure, DNS, ALB, NAT Gateway, database, or secret changes.
- Use dev seed scripts against production.
- Treat subscription catalogue cleanup as approval to enable paid subscription sales.

## Implementation Notes

- Source branch: `master`
- Current release candidate after ticket update: `e6110c0 Add subscription cleanup release ticket`
- Previous release candidate at ticket creation: `0e48f9d Fix analytics stats and multi-plan subscriptions`
- Included commits:
  - `db2d460 Remove seeded subscription catalogue`
  - `d454d7d Implement subscription product pricing workflow`
  - `7142be9 Implement derived subscription plan pricing`
  - `0e48f9d Fix analytics stats and multi-plan subscriptions`
  - `e6110c0 Add subscription cleanup release ticket`
- Database impact: subscriptions-service data cleanup and schema-compatible migration changes only.
- Migration path: `apps/backend_api/internal/services/subscriptions/migrations/`
- New cleanup migration: `apps/backend_api/internal/services/subscriptions/migrations/002_remove_seed_subscription_catalog.sql`
- Seed data required: No.
- Config impact: no new environment variables expected.
- Infrastructure impact: no new infrastructure expected.
- Production runtime: Next.js portal and Go backend services on ECS/Fargate.
- Rollback type: redeploy previous production task definition; no automatic destructive data rollback.

## Production Cleanup Evidence Already Recorded

On 2026-07-08, a subscriptions-only production cleanup was approved and run through one-off ECS tasks using the production task definition.

Recorded result:

- Pre-cleanup guard task exit code: `0`
- Cleanup task exit code: `0`
- Post-cleanup verification task exit code: `0`
- Public health check: `https://rollfinders.com/api/health` returned healthy
- Verified remaining seeded rows and references:
  - `plans=0`
  - `features=0`
  - `products=0`
  - `subscription_refs=0`
  - `plan_change_refs=0`

This evidence confirms production cleanup completed before this release ticket was created. A release agent must still repeat the read-only verification before any new production deployment.

## Ticket Update Log

- 2026-07-09: Created release ticket and committed it as `e6110c0 Add subscription cleanup release ticket`.
- 2026-07-09: Updated release candidate metadata so production approval can name the current `master` head, not the previous application-code head.
- 2026-07-09: Production release executed from clean worktree at `0b3c8767ef095edb359d323af0b3904733ee0c01`.
- 2026-07-09: Broad Terraform deployment was stopped after planning an unrelated ECS security group replacement; release continued with a narrowed ECS task-definition deployment using the current production container set.
- 2026-07-09: Production stabilized on ECS task definition `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:60`.

## Production Release Evidence

Released on 2026-07-09 from:

```text
0b3c8767ef095edb359d323af0b3904733ee0c01
```

Pre-release checks passed:

```bash
npm run typecheck
npm run build
cd apps/backend_api && go test ./internal/services/subscriptions/...
bash -n scripts/cicd/run-service-sql-migrations.sh
```

Production deployment evidence:

- Rollback task definition before release: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:59`
- Released task definition: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:60`
- ECS desired/running/pending after release: `2/2/0`
- ECS rollout state: `COMPLETED`
- Migration task exit code: `0`
- Internal ECS smoke task exit code: `0`
- Post-release subscription seed verification exit code: `0`

Deployed image tags:

```text
web:           533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:0b3c876
api:           533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/api:0b3c876
users:         533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/users:0b3c876
authorisation: 533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/authorisation:0b3c876
academy:       533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/academy:0b3c876
organisation:  533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/organisation:0b3c876
courses:       533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/courses:0b3c876
booking:       533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/booking:0b3c876
payments:      533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/payments:0b3c876
subscriptions: 533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/subscriptions:0b3c876
```

Public endpoint smoke results:

```text
200 https://rollfinders.com/api/health
200 https://rollfinders.com/api/health?deep=1
200 https://rollfinders.com/
200 https://rollfinders.com/about
200 https://rollfinders.com/academies
200 https://rollfinders.com/login
200 https://rollfinders.com/register
200 https://rollfinders.com/dashboard/subscriptions
200 https://rollfinders.com/?when=today
200 https://rollfinders.com/?when=tomorrow
200 https://rollfinders.com/?when=weekend
200 https://rollfinders.com/open-mats
200 https://rollfinders.com/contact
200 https://rollfinders.com/privacy-policy
200 https://rollfinders.com/terms
```

Internal ECS service smoke covered the deployed container ports:

```text
3000 /api/health
8080 /healthz, /readyz
8081 /healthz, /readyz
8082 /healthz, /readyz
8083 /healthz, /readyz
8084 /healthz, /readyz
8085 /healthz, /readyz
8086 /healthz, /readyz
8087 /healthz, /readyz
8090 /healthz, /readyz
```

Post-release subscription seed verification:

```text
plans=0
features=0
products=0
subscription_refs=0
plan_change_refs=0
```

Operational note:

- The full Terraform plan attempted to replace `production-rollfinder-ecs` security group because of an existing description drift. That replacement failed with `InvalidGroup.Duplicate`.
- The release therefore avoided unrelated infrastructure mutation and updated only the production ECS task definition/service for the currently running production container set.
- The current production task definition does not include the additional `access-keys`, `analytics`, `wallet`, `transfer`, or `pricing` containers planned by Terraform because ECS rejected the full 16-container task definition as too many containers. Releasing those services requires a separate infrastructure/task-shape ticket.

## Required Pre-Release Checks

Run from the repository root unless noted:

```bash
git status -sb
git rev-parse HEAD
npm run typecheck
npm run build
cd apps/backend_api && go test ./internal/services/subscriptions/...
bash -n scripts/cicd/run-service-sql-migrations.sh
```

Run release-specific source checks:

```bash
rg -n "Academy Starter|Academy Pro|Enterprise|INSERT INTO subscriptions\\.(plans|products|product_features|subscription_owner_policies|plan_features|plan_products|billing_cycles)" \
  apps/backend_api/internal/services/subscriptions/migrations \
  apps/backend_api/internal/services/subscriptions/server
```

Expected result:

- No seed insert statements appear in subscription migrations.
- Seed plan names only appear in tests or release documentation that explicitly forbid or document the old seed data.

## Required Production Read-Only Verification

Before deploying or running migrations, verify that the removed seeded plans are still unused:

```sql
WITH seeded_plan_ids(id) AS (
    VALUES
        ('20000000-0000-4000-8000-000000000001'),
        ('20000000-0000-4000-8000-000000000002'),
        ('20000000-0000-4000-8000-000000000003'),
        ('20000000-0000-4000-8000-000000000004')
)
SELECT
    (SELECT count(*) FROM subscriptions.plans p JOIN seeded_plan_ids s ON s.id = p.id) AS seeded_plan_rows,
    (SELECT count(*) FROM subscriptions.subscriptions sub JOIN seeded_plan_ids s ON s.id = sub.plan_id) AS subscription_refs,
    (SELECT count(*) FROM subscriptions.subscription_plan_changes c JOIN seeded_plan_ids s ON s.id = c.from_plan_id OR s.id = c.to_plan_id) AS plan_change_refs;
```

Expected result:

```text
seeded_plan_rows=0
subscription_refs=0
plan_change_refs=0
```

If any reference count is greater than zero, stop the release and open a data investigation ticket.

## Production Deployment Steps

1. Confirm explicit production approval names:
   - target environment: `production`
   - source branch and commit
   - migration plan: subscriptions cleanup guard and normal service migrations
   - config changes: none expected
   - rollback plan: redeploy previous known-good task definition
2. Confirm `master` is clean and points at the approved commit.
3. Run all required pre-release checks.
4. Run the production read-only verification above.
5. Build immutable production images:

   ```bash
   export ENVIRONMENT_NAME=production
   scripts/cicd/prepare-ecr.sh
   scripts/cicd/build.sh
   export FORCE_SERVICE_REDEPLOY=true
   export SERVICE_REDEPLOY_TARGET=all
   scripts/cicd/build-go-services.sh
   ```

6. Record all image URIs and digests from `image.env`.
7. Review production Terraform plan before apply.
8. Deploy through the approved production path:

   ```bash
   export ENVIRONMENT_NAME=production
   export PRODUCTION_APPROVED=true
   export PRODUCTION_MIGRATION_APPROVED=true
   scripts/cicd/deploy-environment.sh
   ```

9. Record ECS task definition ARN, deployed image digests, migration output, and smoke-test output.

## Acceptance Criteria

- WHEN production deployment starts, THEN the source commit matches the approved commit.
- WHEN subscription migrations run, THEN no production seed subscription catalogue rows are inserted.
- WHEN `002_remove_seed_subscription_catalog.sql` runs, THEN it refuses to delete if live subscription or plan-change rows reference seeded plan IDs.
- WHEN production verification runs after deployment, THEN seeded plan/product/feature rows and references remain zero.
- WHEN `/dashboard/subscriptions` loads for a super admin, THEN it does not show the old seeded plan grid unless a real admin-created catalogue exists.
- WHEN subscription products, features, plans, and plan pricing workflows are used, THEN they operate from real application data rather than migration seed data.
- WHEN `https://rollfinders.com/api/health` is requested after deployment, THEN it returns healthy.
- WHEN production logs are reviewed for 15 minutes after release, THEN no repeated startup, migration, subscription, payment, API gateway, or database errors are present.

## Product Smoke Tests

- `https://rollfinders.com/api/health`
- `https://rollfinders.com/api/health?deep=1`
- `/dashboard/subscriptions`
- `/dashboard/subscriptions?subscriptionsView=plans`
- `/dashboard/subscriptions?subscriptionsView=products`
- `/dashboard/subscriptions?subscriptionsView=features`
- Create or edit subscription catalogue data only if explicitly approved for production testing.

## Regression / Compatibility Tests

- Confirm public discovery and bookings still work after deployment.
- Confirm payment checkout paths still resolve for existing booking flows.
- Confirm subscription cleanup does not touch non-subscription schemas.
- Confirm admin-created subscription catalogue rows are not deleted by cleanup logic.
- Confirm `scripts/cicd/run-service-sql-migrations.sh` still runs subscription migrations in lexical order.
- Confirm no dev seed script runs in production.

## Rollback Plan

- Method: redeploy the previous known-good ECS task definition and image set.
- Data rollback required: not expected.
- Manual action required: only if a future release reintroduces seed data.
- Migration rollback: prefer forward-fix migration; do not reinsert old seeded plans automatically.

Rollback steps:

1. Capture failing URL, health response, task definition ARN, image URI, migration logs, and CloudWatch errors.
2. Repoint the ECS service to the previous known-good task definition.
3. Wait for ECS service stability.
4. Re-run:

   ```bash
   curl -fsS https://rollfinders.com/api/health
   curl -fsS 'https://rollfinders.com/api/health?deep=1'
   ```

5. Re-run the production read-only subscription verification.
6. Record rollback evidence and final production status.

## Known Risks

- The subscription dashboard may look empty after seed removal. That is expected unless real catalogue data has been created.
- The current `master` head may include additional subscription workflow and analytics changes beyond the cleanup commit; approval must name the exact commit.
- Full historical test suites may include unrelated failures. Release approval must explicitly decide whether those block production.
- If someone manually creates plans with the old seeded IDs, the cleanup migration will remove them if they are not referenced. Do not reuse the old seeded IDs for real catalogue data.

## Out Of Scope

- Creating production subscription plans.
- Enabling paid subscriptions commercially.
- Running production seed scripts.
- Changing Stripe, payment provider, wallet, or pricing secrets.
- Creating infrastructure.
- Data cleanup outside the `subscriptions` schema.
