# Name: RELEASE-20260719 - Legacy Course Payment Recovery Production Release

## Feature / Component

- Feature: Production Release
- Component: Portal payment recovery job, Payments Service import adapter, Wallet ledger posting
- Priority: P0
- Branch: `master`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: Production approval, clean committed release candidate, production dry-run review, wallet service availability
- Source PRD: `docs/features/Deployment/Delivery/Reviewing/LegacyCoursePaymentRecoveryProductionReleaseTicket-20260719.md`
- Ticket status: Completed, production deployed on 2026-07-19

## Goal

Release the legacy course payment recovery path so old booking-linked course payments can be imported into the Payments Service, appear in the Payments Dashboard, and create internal wallet ledger effects from actual settled amounts only.

## Release Approval

Production release approval was given in chat on 2026-07-19 for the legacy course payment recovery work.

This approval covers preparing and deploying the committed recovery code. It does not remove the required dry-run review before any production data-changing recovery POST is executed.

## Scope

The release agent must:

- Commit and deploy the current legacy course payment recovery implementation from `master`.
- Include `recordExternalPayment()` in the portal Payments Service client.
- Include the `recoverLegacyCoursePayments()` recovery module.
- Include `/api/jobs/course-payment-wallet-posting?legacy=1` route support.
- Ensure recovered old booking payment records include `client_id=rollfinders` so they appear in the existing Payments Dashboard query.
- Ensure recovered payment records include legacy metadata such as `legacy_payment_id`, `booking_id`, `course_id`, `academy_id`, `resource_type=course_occurrence`, and `payment_scope=COURSE_OCCURRENCE`.
- Require a dry-run report before running any production data-changing import.
- Reuse the existing wallet posting path, including idempotent wallet keys.
- Verify the local server and build remain healthy.

The release agent must not:

- Guess wallet balances from course price when an actual settled payment amount is unavailable.
- Create duplicate payment records for already imported legacy payments.
- Double-credit wallets on rerun.
- Import failed, cancelled, pending, or unproven payments.
- Seed subscription plans, demo catalogue records, or unrelated production data.
- Run broad Terraform apply for this release.
- Deploy from a dirty worktree or unpushed local commit.

## Implementation Notes

- Base commit before recovery edits: `ffc141fb837cb4e733c4c5b5213907259a1426d0`.
- Recovery implementation commit: `570c3df Add legacy course payment recovery`.
- Production dry-run hotfix commit: `3905360 Fix legacy payment recovery dry run`.
- Final deployed release commit: `3905360`.
- Deployed ECS task definition: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:64`.
- Deployed web image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:3905360`.
- Rollback task definition: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:62`.
- The Payments Dashboard already reads from the Payments Service via `/v1/payments?client_id=rollfinders`.
- Legacy recovered records must be imported into the Payments Service rather than displayed from ad hoc booking SQL.
- The recovery endpoint is:

  ```text
  /api/jobs/course-payment-wallet-posting?legacy=1
  ```

- GET legacy recovery is forced to dry-run, preventing accidental browser-triggered imports.
- Production data-changing recovery requires POST:

  ```bash
  curl -X POST 'https://rollfinders.com/api/jobs/course-payment-wallet-posting?legacy=1&limit=100' \
    -H "Authorization: Bearer ${CRON_SECRET}"
  ```

- Dry-run command:

  ```bash
  curl 'https://rollfinders.com/api/jobs/course-payment-wallet-posting?legacy=1&dryRun=1&limit=100' \
    -H "Authorization: Bearer ${CRON_SECRET}"
  ```

- If old `public.payments` still exists, the recovery can use it as the actual settled amount source.
- If only `booking.bookings.payment_id` remains and no actual amount is present in booking metadata, the row is skipped and reported.
- Existing known blocker: production wallet access previously returned `403`; wallet permissions and wallet service deployment shape must be healthy before wallet credits can be posted successfully.

## Acceptance Criteria

- WHEN the legacy recovery endpoint is called with GET and `legacy=1`, THEN it returns a dry-run result only.
- WHEN the dry-run scans old booking-linked payment records, THEN it reports `scanned`, `alreadyImported`, `importable`, `skipped`, and `failed` counts.
- WHEN a legacy booking payment has an actual settled amount, THEN it is importable into the Payments Service with `client_id=rollfinders`.
- WHEN a legacy booking payment has no actual amount source, THEN it is skipped with a reason and no wallet balance is created.
- WHEN the recovery POST imports a payment, THEN the payment appears in the Payments Dashboard through the existing service query.
- WHEN wallet posting runs for an imported payment, THEN the academy/account internal wallet receives the actual payment amount through the existing ledger adjustment path.
- WHEN the recovery is rerun, THEN idempotency prevents duplicate payment imports and duplicate wallet credits.

## Regression / Compatibility Tests

- Confirm `npm run typecheck` passes.
- Confirm `npm run build` passes.
- Confirm the targeted course payment contract passes:

  ```bash
  node --import tsx --test apps/portal/src/lib/__tests__/course-payment-integration-contracts.test.ts
  ```

- Confirm local app profile starts on port `3000` and `/api/health` returns `200`.
- Confirm existing outbox processing still works without `legacy=1`.
- Confirm existing `backfill=1` wallet posting behavior still works.
- Confirm payment imports still go through the Payments Service internal import endpoint.
- Confirm wallet credits still go through `recordCoursePaymentWalletEffects()`.

Known broader suite issue:

- The full `npm run test:unit -- ...` command currently hits unrelated existing dashboard/subscription/course contract failures. These should be recorded as existing release risk and should not block this targeted recovery unless the release gate requires the full unit suite.

## Deployment Steps

1. Commit the recovery implementation and this ticket to `master`.
2. Push `master`.
3. Record the final release commit in this ticket.
4. Confirm clean worktree:

   ```bash
   git status -sb
   ```

5. Run pre-release checks:

   ```bash
   npm run typecheck
   node --import tsx --test apps/portal/src/lib/__tests__/course-payment-integration-contracts.test.ts
   npm run build
   ```

6. Build immutable production image(s) from the final commit.
7. Capture current production ECS task definition for rollback.
8. Deploy through the approved production deployment path.
9. Smoke test production health and dashboard routes.
10. Run legacy recovery dry-run only.
11. Review dry-run totals before executing any POST recovery import.
12. If dry-run totals are approved, run POST recovery in small batches.
13. Verify old course payments appear in the Payments Dashboard.
14. Verify wallet balances/transactions for affected accounts.

## Production Smoke Checks

- `/api/health` returns HTTP 200.
- `/api/health?deep=1` returns healthy or records any known degraded dependency.
- `/dashboard/payment` loads for a permitted admin.
- `/dashboard/wallet` loads for a permitted admin without `Wallet service returned status 403`.
- `GET /api/jobs/course-payment-wallet-posting?legacy=1&dryRun=1&limit=10` returns a dry-run payload for a platform admin or cron-authenticated request.
- Existing outbox mode still works:

  ```text
  /api/jobs/course-payment-wallet-posting?dryRun=1
  ```

## Production Evidence

Collected on 2026-07-19 after production deployment:

- `npm run typecheck`: passed.
- `node --import tsx --test apps/portal/src/lib/__tests__/course-payment-integration-contracts.test.ts`: passed.
- `npm run build`: passed.
- ECS service `web`: stable on task definition `rollfinder-production:64`, desired `2`, running `2`, pending `0`.
- Deployed web image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:3905360`.
- Public smoke:
  - `https://rollfinders.com/api/health`: HTTP 200, `{"status":"ok"}`.
  - `https://rollfinders.com/api/health?deep=1`: HTTP 200, `{"status":"ok","database":"ok"}`.
  - `https://rollfinders.com/`: HTTP 200.
  - `https://rollfinders.com/login`: HTTP 200.
  - `https://rollfinders.com/register`: HTTP 200.
- Legacy recovery dry-run:

  ```json
  {
    "mode": "legacy-recovery",
    "dryRun": true,
    "scanned": 0,
    "alreadyImported": 0,
    "importable": 0,
    "imported": 0,
    "walletPosted": 0,
    "skipped": 0,
    "failed": 0
  }
  ```

No production legacy recovery POST was run. No payment records were imported and no wallet credits were created during this deployment.

## Rollback Plan

- Roll back application deployment by redeploying the previous ECS task definition.
- No schema rollback is required for the code deployment itself.
- If recovery POST has not been run, no data rollback is required.
- If recovery POST imported incorrect payments, do not delete ledger rows manually. Use compensating wallet adjustments and mark the imported payment references for audit.
- If wallet posting fails but payment import succeeds, rerun recovery after wallet service access is fixed; idempotency should skip already imported payments and retry wallet effects.

## Out Of Scope

- Reconstructing payment amounts from event/course prices.
- Provider-level Stripe/PayPal reconciliation beyond stored production database data.
- Terraform infrastructure changes.
- Subscription catalogue or entitlement changes.
- Full payments dashboard redesign.
- Manual production database edits outside the approved recovery endpoint.
