# Release Ticket: SMTP Fallback Email Delivery To Production

## Status

Completed. Production deployment completed on 2026-06-09 UTC.

## Release Candidate

* Source branch: `master`
* Target environment: `production`
* Deployed master commit: `f20b074c1ec9bf4eb8f9c6b9a58f6a0e654e6f7e`
* Production URL: `https://rollfinders.com`
* Production release tag: `production-2026-06-09-02`
* Change scope: SMTP fallback email delivery while SES production access approval is pending.

## Purpose

Enable transactional email delivery through a mailbox SMTP server when `EMAIL_DELIVERY_PROVIDER=smtp` is configured in ECS secrets.

SES remains the default provider when SMTP fallback is not explicitly enabled.

## Deployment Evidence

* Approved by: Product owner.
* Approval time: 2026-06-09T00:16:39Z.
* Deployed commit: `f20b074c1ec9bf4eb8f9c6b9a58f6a0e654e6f7e`.
* Production image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:f20b074`.
* Production image digest: `sha256:b711d53140c6daa2f54d66dcfd7d80657b1f743dd1db481131ed214dec769a40`.
* Production release tag: `production-2026-06-09-02`.
* Production task definition: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:27`.
* Terraform change result: app Secrets Manager version replaced with SMTP fallback keys and ECS task definition replaced to include SMTP provider secrets and image `f20b074`.
* Migration result: production migration task completed successfully with `PRODUCTION_MIGRATION_APPROVED=true`.
* Health check result: production shallow health returned `{"status":"ok"}` and deep health returned `{"status":"ok","database":"ok"}` after deployment.
* Public page smoke result: `/`, `/open-mats`, `/academies`, and `/login` returned `200`.
* ECS result: production service `rollfinder-production/web` is `ACTIVE`, rollout `COMPLETED`, desired `2`, running `2`, pending `0`.
* Academy claim invitation template upload: `s3://rollfinders/mails/invitations/academy-claim-invitation.html`, SHA-256 `e2283eadb1265f74aa668063e32cf793086bb9452da2a62f6c0b542c7c8088ad`, version `589Vre1mcmEj57TG8y8wpMPdIOU6MA5t`.
* Direct deploy override: used `ALLOW_DIRECT_ENV_DEPLOY=true` because dev environment is not available as the promotion source and the production image was built directly from the approved `master` commit.
* Rollback decision: rollback not required.

## Validation

* `npm run test` passed with 100 tests.
* `npm run build` passed with Next.js 16.2.7.
* `terraform -chdir=terraform validate` passed.
* SMTP credentials were supplied from local `.env` into Terraform variables and were not committed to source control.

## Acceptance Criteria

* Production can select SMTP delivery with `EMAIL_DELIVERY_PROVIDER=smtp`.
* SMTP host, port, username, and password are injected through ECS secrets.
* Existing health, migration, dashboard, and public routes remain operational.
* SES can be restored by setting `EMAIL_DELIVERY_PROVIDER=ses` and redeploying.
