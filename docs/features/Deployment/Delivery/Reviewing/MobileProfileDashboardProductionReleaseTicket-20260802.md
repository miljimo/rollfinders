# Name: RELEASE-20260802 - Mobile Profile Dashboard Production Release

## Feature / Component

- Feature: Production release
- Component: Portal mobile dashboard, route proxy, Capacitor mobile shell
- Priority: P0
- Branch: `master`
- Developer owner: Platform team
- Test owner: Platform team
- Dependencies: Explicit production and migration approval, clean pushed source commit, production image build, Play production access, smoke-test access
- Source PRD: `docs/platform/mobile.md`
- Ticket status: Prepared; blocked on production approval and Google Play production access

## Goal

Release one practitioner-focused mobile profile experience for every authenticated role while preventing CRM, administrative, subscription, wallet, and platform-management pages from rendering inside the mobile app.

## Scope

The release agent must:

- Release the shared mobile profile dashboard for standard users and all administrative roles.
- Release the Courses/Events and My Bookings tab controls.
- Release the active-tab autocomplete search for academy courses and practitioner bookings.
- Keep mobile event links on `/mobile/events/{id}`.
- Redirect mobile management panel aliases and the Members panel to `/dashboard?surface=mobile`.
- Redirect native mobile requests for `/admin` and service-specific `/dashboard/*` routes to the mobile profile or mobile sign-in experience.
- Include the `RollFindersMobile` Capacitor user-agent marker in the next Android bundle.
- Preserve full administrative dashboards for authenticated users in desktop browsers.

The release agent must not:

- Expose administrative controls or navigation in the mobile app.
- Change role permissions or grant access through `surface=mobile`.
- Seed production data or run migrations outside the account-deletion migrations named in this ticket.
- Create or modify production infrastructure.
- Publish an Android production release without explicit Play Store production approval.
- Deploy an uncommitted or unpushed source revision.

## Specification

### Deployment Target

- App: `portal`
- Service: Next.js portal and mobile web surface
- Environment: `production`
- Type: frontend and mobile shell
- Runtime: Docker Compose on the existing production EC2 application host; Capacitor Android WebView

### Source

- Branch: `master`
- Base commit: `cda5e37c184f6e11a821ae374acbdc1a0144bde2`
- Application release commit: `eac03a493ecc5ac42cc8ceaa72a3a6709b9d2856`
- Prepared release commit: `7869e78b3f80bff9411de57bd0fe0603b71ba143`
- Current production promotion record: commit `1bd9e53` (capture all image URIs before rollout for rollback)
- Ticket: `RELEASE-20260802`
- PR: N/A

### Required Config

| Name | Required | Source | Description |
|---|---:|---|---|
| `NEXTAUTH_URL` | Yes | Existing production environment | Production authentication callback origin. |
| `NEXTAUTH_SECRET` | Yes | Existing production secret | Session signing secret. |
| `API_PUBLIC_BASE_URL` | Yes | Existing production environment | API gateway used by portal discovery and dashboard reads. |
| `ANDROID_KEYSTORE_PATH` and signing values | Android only | Existing CI secret environment | Signs the Android App Bundle. |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Android upload only | Existing protected secret | Authenticates the Google Play upload. |
| `GOOGLE_PLAY_UPLOAD_APPROVED` | Android upload only | Explicit release approval | Enables the guarded upload script. |
| `GOOGLE_PLAY_NON_INTERNAL_APPROVED` | Production track only | Explicit production approval | Enables non-internal Play Store tracks. |
| Existing email-delivery configuration | Yes | Existing production environment | Delivers account-deletion confirmation links. |

No new portal runtime environment variable is introduced by this release.

### Infrastructure

- Use the existing production EC2 single-host deployment because `enable_ec2_app_host = true` in production Terraform values.
- Use the existing production container registry, EC2 host, reverse proxy, RDS instance, and service containers.
- No Terraform resource change or apply is required for this application-only release.
- Do not recreate ECS services or provision another application runtime.

### Database

- Owning service: `users`
- Migration paths:
  - `apps/backend_api/internal/services/users/migrations/tables/007_account_deletion_requests.sql`
  - `apps/backend_api/internal/services/users/migrations/functions/013_account_deletion_requests.sql`
  - `apps/backend_api/internal/services/users/migrations/procedures/009_account_deletion_requests.sql`
- Migration required: Yes; run through the existing guarded production migration workflow.
- Seed data required: No.
- Backward compatible: Yes; the account-deletion schema is additive.
- Rollback: Leave the additive schema in place if the application is rolled back; no destructive down migration is required.

### Deployment Steps

1. Obtain explicit approval naming environment `production`, source commit `7869e78b3f80bff9411de57bd0fe0603b71ba143`, the three additive users-service migrations above, no config changes, and the rollback plan below.
2. Confirm the release commit is pushed to `origin/master` and the working tree is clean.
3. Export and preserve the current production promotion record and its complete image set as the rollback target before the workflow overwrites it.
4. Run the CI validation gates from the release commit.
5. Build immutable portal and service images through the existing GitHub Actions production workflow.
6. Review the production Terraform plan and confirm it contains no unrelated infrastructure changes.
7. Deploy the portal and users service to the existing production EC2 host through `scripts/cicd/deploy-environment.sh`; allow the guarded migration stage to apply the approved users-service migrations.
8. Run the portal production smoke checks below, including `/account-deletion`.
9. Use the prepared signed bundle `bin/android/rollfinders-1.0.3-4.aab` (version name `1.0.3`, version code `4`) only if its SHA-256 remains `04fc0f6acbc807ff474ad6583643a0403a107a19c8a4e7991b5181d32f309cab`.
10. Upload version code `4` to closed testing first and confirm the WebView carries the approved production portal behavior.
11. Complete the Google Play closed-test requirement and obtain production access.
12. After separate explicit Google Play production approval, replace the stale version-code `3` production draft with the approved version-code `4` bundle and submit it for review.

### Verification Steps

- WHEN `/api/health` is requested, THEN production returns HTTP 200 with `{"status":"ok"}`.
- WHEN `/account-deletion` is requested, THEN production returns HTTP 200 and permits an unauthenticated deletion request without account enumeration.
- WHEN `/privacy-policy` and `/terms` are requested, THEN production returns HTTP 200.
- WHEN a standard user opens Profile in the mobile app, THEN `/dashboard?surface=mobile` renders the practitioner profile dashboard.
- WHEN a super admin, platform admin, academy owner, or academy admin opens Profile in the mobile app, THEN the same practitioner profile dashboard renders without administrative navigation.
- WHEN Courses/Events is active, THEN the autocomplete suggestions and results are derived from academy courses.
- WHEN My Bookings is active, THEN the autocomplete suggestions and results are derived from the authenticated practitioner's bookings.
- WHEN a user switches tabs, THEN the previous tab's search query is cleared.
- WHEN a course or booking is selected, THEN its mobile event details route opens.
- WHEN a mobile request opens `/admin` or `/dashboard/courses`, THEN it returns to the mobile profile dashboard or mobile sign-in instead of rendering management UI.
- WHEN an admin opens the desktop dashboard without `surface=mobile`, THEN the existing administrative workspace remains available.
- WHEN the Android bundle is inspected, THEN its Capacitor configuration includes `appendUserAgent: RollFindersMobile`.

### Rollback Plan

- Method: Redeploy the previous known-good portal image and halt or roll back the Google Play release.
- Data rollback required: No; retain the additive users-service account-deletion schema.
- Manual action required: Yes
- Steps:
  1. Stop the portal rollout if health, authentication, mobile routing, or desktop admin access fails.
  2. Redeploy the complete image set captured from the production promotion record for commit `1bd9e53` on the production EC2 host.
  3. Re-run `/api/health`, `/mobile`, mobile Profile, and desktop admin smoke checks.
  4. If the Android release is still in testing, halt it and retain the previous active bundle.
  5. If Google Play production promotion has begun, use Play Console rollback/recovery controls and submit a corrected higher-version bundle if required.

### Risks

- Installed Android versions do not send `RollFindersMobile` until users receive the new bundle; existing `surface=mobile` navigation remains the immediate portal safeguard.
- The public account-deletion URL currently returns HTTP 404 and blocks Play submission until the portal and users-service migration are deployed successfully.
- Google Play production remains unavailable until the required closed test is completed and Google grants production access.
- Version code `3` is a stale production draft built before the mobile profile changes and must not be promoted.
- Incorrect proxy matching could block desktop administrators, so desktop `/dashboard` smoke testing is a release gate.
- Booking-service degradation can show a temporary mobile booking error while course discovery remains available.
- Google Play review and propagation are asynchronous and must not be treated as immediate deployment completion.

### Out Of Scope

- iOS App Store publication.
- New admin or CRM functionality.
- Role, permission, academy-membership, booking, or payment data changes.
- Database migrations other than the three approved additive users-service account-deletion migrations.
- Seed execution or manual production data edits.
- Production infrastructure creation, replacement, resizing, or destruction.

## Acceptance Criteria

- WHEN any authenticated role uses the mobile Profile entry, THEN only the shared practitioner profile dashboard and self-service account panels are available.
- WHEN the same administrator uses a desktop browser, THEN their existing administrative dashboard remains unchanged.
- WHEN a mobile management URL is requested, THEN management UI does not render inside the WebView.
- WHEN the active dashboard tab changes, THEN its autocomplete searches only that tab's data.
- WHEN the production release is complete, THEN portal and Android release evidence is recorded in this ticket.

## Regression / Compatibility Tests

- Confirm mobile login, registration, forgot-password, logout, and fixed bottom navigation still work.
- Confirm mobile course details and booking/payment handoff still work.
- Confirm desktop dashboard role dispatch and admin management routes remain available.
- Confirm `surface=mobile` changes presentation only and grants no additional access.
- Confirm no migration, seed, infrastructure, or production-data mutation is included.

## Release Readiness Evidence

Collected locally on 2026-08-09 from clean, pushed `master` commit `7869e78b3f80bff9411de57bd0fe0603b71ba143`:

- `npm run typecheck`: passed.
- Targeted account-deletion and mobile platform contracts: 6 tests passed.
- `npm run build`: passed; 51 static pages generated and `/account-deletion`, `/privacy-policy`, `/terms`, and `/mobile` are present in the route manifest.
- Android release unit tests and `lintRelease`: passed; lint reported zero issues.
- Mobile and Android release doctor checks: passed, including signing and Google Play credential presence.
- Signed Android App Bundle: `bin/android/rollfinders-1.0.3-4.aab`.
- Bundle SHA-256: `04fc0f6acbc807ff474ad6583643a0403a107a19c8a4e7991b5181d32f309cab`.
- Upload certificate SHA-256: `94:E6:CE:C2:A6:98:51:CF:4E:AC:32:F4:83:07:AA:D0:2D:E7:E8:D2:63:67:84:E5:79:E3:DF:FE:F8:C4:B1:02`.
- Live endpoint checks before deployment: `/mobile`, `/privacy-policy`, `/terms`, and `/contact` return HTTP 200; `/account-deletion` returns HTTP 404.
- Google Play inventory before deployment: version code `2` is active on internal and closed (`alpha`) testing; version code `3` is a stale production draft; version code `4` has not been uploaded.

## Approval Gate

Production deployment has not been approved by creating this ticket. Approval must explicitly name:

- Environment: `production`.
- Source commit: `7869e78b3f80bff9411de57bd0fe0603b71ba143`.
- Migration plan: apply only the three named additive users-service account-deletion migrations; no seed data.
- Config plan: no new portal runtime configuration; existing protected Android signing and Play credentials only.
- Rollback plan: restore the complete image set captured from production commit `1bd9e53`, retain the additive schema, and halt/replace the Android release.
