# Name: RELEASE-20260719 - Mobile Web Release Readiness Production Ticket

## Feature / Component

- Feature: Production Release
- Component: Mobile web app, public discovery, mobile navigation
- Priority: P1
- Branch: `master`
- Developer owner: Codex
- Test owner: Codex
- Dependencies: Production approval, final commit, production image build, smoke-test access
- Source PRD: `docs/platform/mobile.md`

## Goal

Release the corrected `/mobile` web app surface so mobile users get stable app navigation, public discovery, and web-page handoff for non-mobile areas.

## Scope

The agent must:
- Release the `/mobile` route and `MobileNavigation` fixes.
- Release embedded mobile sign-in and practitioner registration from the Profile tab.
- Release the initial Capacitor native shell project for Android APK/AAB and iOS/macOS project generation.
- Keep mobile navigation inside `/mobile` tabs for Home, Search, Map, E-Bookings, and Profile.
- Open non-mobile destinations, such as academies, support, policy pages, terms, and dashboard, as normal web pages instead of rendering them as mobile tabs.
- Preserve public browsing without requiring login.
- Ensure service discovery failures render mobile empty states rather than a 500 page.
- Verify `/mobile`, `/mobile?tab=profile`, and `/mobile?tab=map`.

The agent must not:
- Deploy CRM, admin, subscription, wallet, access-key, or platform-management features inside the mobile shell.
- Add migrations, seed data, or new environment variables.
- Change desktop public navigation or dashboard behavior.

## Specification

### Deployment Target

- App: `portal`
- Service: Next.js web portal
- Environment: `production`
- Type: `mobile`
- Runtime: Next.js on ECS/Fargate

### Source

- Branch: `master`
- Base commit before mobile patch: `fed93b6949304f4ae5acb829a8701866a6a25980`
- Final release commit: To be recorded after commit
- Ticket: `RELEASE-20260719`
- PR: N/A

### Required Config

| Name | Required | Source | Description |
|---|---:|---|---|
| `API_PUBLIC_BASE_URL` | Yes | Existing production env | Public API gateway for academy/course discovery. |
| `NEXTAUTH_URL` | Yes | Existing production env | Auth callback origin. |
| `NEXTAUTH_SECRET` | Yes | Existing production secret | Auth session signing. |

### Infrastructure

- No new infrastructure.
- No Terraform change required.
- Existing production ECS/Fargate portal deployment path is used.

### Database

- Migration path: N/A
- Migration required: No
- Seed data required: No
- Backward compatible: Yes

### Deployment Steps

1. Commit the mobile release patch to `master`.
2. Push `master`.
3. Build the production image from the final pushed commit.
4. Deploy through the existing production portal/ECS path after explicit approval.
5. Keep prior production task definition available for rollback.

### Verification Steps

- WHEN `/api/health` is requested, THEN production returns healthy.
- WHEN `/mobile` is opened on a phone viewport, THEN the mobile shell loads without the desktop header/footer.
- WHEN the bottom navigation renders, THEN the active tab remains fixed height and does not expand into oversized buttons.
- WHEN Home, Search, Map, E-Bookings, and Profile are tapped, THEN they remain in `/mobile` tab routes.
- WHEN a signed-out user opens Profile, THEN Sign In and Register Account are available inside the mobile shell.
- WHEN `/mobile?tab=profile&auth=sign-in` is requested, THEN the mobile sign-in form renders and returns users to `/mobile`.
- WHEN `/mobile?tab=profile&auth=register` is requested, THEN the practitioner registration form renders with academy search and submits through the existing registration action.
- WHEN native Android output is needed, THEN `npm run mobile:android:apk` targets `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
- WHEN Play Store bundle output is needed, THEN `npm run mobile:android:aab` targets `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.
- WHEN macOS/iOS project work is needed, THEN `npm run mobile:ios:sync` and `npm run mobile:ios:open` are available for Xcode.
- WHEN academy, support, privacy, terms, or dashboard links are tapped from mobile profile/auth surfaces, THEN they open as normal web pages and not as mobile tabs.
- WHEN public discovery data is unavailable, THEN the mobile route shows empty mobile states rather than a 500 error.
- WHEN `/mobile?tab=profile` and `/mobile?tab=map` are requested, THEN both return 200.

### Rollback Plan

- Method: Redeploy previous known-good production image/task definition or revert the final mobile release commit and redeploy.
- Data rollback required: No
- Manual action required: Yes, production redeploy
- Steps:
  1. Stop rollout if `/mobile` or `/api/health` fails.
  2. Redeploy the previous healthy portal task definition.
  3. Re-run `/api/health`, `/mobile`, `/mobile?tab=profile`, and `/mobile?tab=map`.
  4. Record rollback evidence in this ticket.

### Risks

- Visual browser automation could not run locally because Playwright Chromium is missing `libnspr4.so`; manual mobile viewport verification is still required before production approval.
- Empty-state fallback avoids 500s but can temporarily hide unavailable discovery data if the API gateway or downstream services are unhealthy.

### Out Of Scope

- Native iOS/Android shell release.
- Payment-provider WebView handoff changes.
- Dashboard, wallet, subscription, or admin release work.
- Production deployment without explicit approval.

## Release Readiness Evidence

Collected on 2026-07-19:

- Mobile contract tests passed:
  - `node --import tsx --test apps/portal/src/lib/__tests__/mobile-platform-contracts.test.ts`
  - Result: 3/3 passing.
- TypeScript passed:
  - `npm run typecheck`
- Production build passed:
  - `npm run build`
- Mobile auth checks passed:
  - `curl -I "http://localhost:3000/mobile?tab=profile&auth=sign-in"` returned 200.
  - `curl -I "http://localhost:3000/mobile?tab=profile&auth=register"` returned 200.
  - Response body for sign-in contains `Sign in`, `Email`, `Password`, and `Register Account`.
  - Response body for registration contains `Register account`, `Find your academy`, `First name`, and `Create account`.
- Local service gateway passed:
  - `curl http://localhost:3007/healthz`
  - Result: all gateway services ready.
- Local HTTP smoke checks passed:
  - `curl -I http://localhost:3000/mobile` returned 200.
  - `curl -I "http://localhost:3000/mobile?tab=profile"` returned 200.
  - `curl -I "http://localhost:3000/mobile?tab=map"` returned 200.
- Browser-level Playwright smoke could not run:
  - Blocker: Chromium runtime missing `libnspr4.so`.
- Native shell setup:
  - `npm install` installed Capacitor workspace dependencies.
  - `npm --workspace @rollfinders/mobile exec cap add android` generated the Android project.
  - `npm --workspace @rollfinders/mobile exec cap add ios` generated the iOS project.
  - `npm run mobile:android:apk` synced Android and reached Gradle, then stopped because this WSL host has no Java/JDK.
  - `npm run mobile:doctor` reports missing `java`, `adb`, and `ANDROID_HOME` on this host.

## Acceptance Criteria

- WHEN the release patch is committed and pushed, THEN this ticket records the final release commit.
- WHEN production approval is given, THEN deployment uses the final pushed commit.
- WHEN production smoke checks pass, THEN `/mobile` is considered release-ready for mobile web traffic.

## Regression / Compatibility Tests

- Confirm desktop homepage and public academy pages still route outside the mobile shell.
- Confirm dashboard routes remain web/dashboard pages, not mobile tabs.
- Confirm no migrations or seed data are included.
