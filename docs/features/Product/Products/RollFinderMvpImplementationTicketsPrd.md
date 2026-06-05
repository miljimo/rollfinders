# PRD: RollFinder MVP Implementation Tickets

Version: 1.0

Review date: 2026-06-05

Purpose: Convert the current product/admin requirements and source-code gaps into small, taskable UI and functionality tickets.

Audience: Human engineers and AI coding agents.

Sizing rule: Each ticket should be implementable by one human engineer within 2 days, and small enough for an AI agent to complete in a focused run.

---

# Source Review

Requirements reviewed:

* `docs/features/Product/Products/RollFinderMvpPrd.md`
* `docs/features/Users/Products/AdminUserManagement.md`
* `docs/features/Platform/Products/PublicBusinessInformation.md`
* Current user role PRDs under `docs/features/Users/Products/`

Source code reviewed:

* Public pages: `src/app/page.tsx`, `src/app/academies/page.tsx`, `src/app/academies/[slug]/page.tsx`, `src/app/open-mats/page.tsx`, `src/app/open-mats/[id]/page.tsx`, `src/app/map/page.tsx`
* Admin pages: `src/app/admin/page.tsx`, `src/app/admin/academies/*`, `src/app/admin/open-mats/*`, `src/app/admin/users/*`
* API/server actions: `src/app/admin/users/actions.ts`, `src/app/admin/academies/actions.ts`, `src/app/admin/open-mats/actions.ts`, `src/app/api/admin/*`
* Data/auth/email: `src/lib/data.ts`, `src/lib/admin.ts`, `src/lib/academy-access.ts`, `src/lib/password-reset.ts`, `src/lib/reliable-email.ts`, `src/lib/validators.ts`
* Data model: `prisma/schema.prisma`

---

# Current State Summary

Mostly implemented:

* Public academy directory and academy profiles.
* Open Mat Radar with today, tomorrow, weekend, gi/no-gi, location-aware sorting.
* Admin dashboard, academy management, open mat management, user management.
* Role-based access for platform, super, academy admin, and standard users.
* Password reset email infrastructure and reliable outbound email queue.
* Public legal/business pages.

Missing or incomplete:

* Academy claiming public intake and admin review.
* Admin-created user onboarding email with login credential instructions.
* Product analytics for MVP success metrics.
* Data-driven map markers.
* Open mat contact information on detail page.
* Search performance acceptance check.
* Technical decision documentation for implemented auth/hosting.

---

# Implementation Branches

* `feature/mvp-academy-claiming-flow`
* `feature/admin-created-user-onboarding-email`
* `feature/mvp-analytics-success-metrics`
* `feature/mvp-data-driven-map`
* `feature/open-mat-contact-info`
* `feature/search-performance-check`
* `docs/current-platform-decisions`

---

# Ticket Group 1: Academy Claiming

Priority: Critical

Recommended order:

1. RF-MVP-001
2. RF-MVP-002
3. RF-MVP-003
4. RF-MVP-004
5. RF-MVP-005

---

## RF-MVP-001: Add Public Claim Profile Entry Point

Branch: `feature/mvp-academy-claiming-flow`

Type: UI

Likely files:

* `src/app/academies/[slug]/page.tsx`
* New claim form/page under `src/app/academies/[slug]/claim` or equivalent
* `src/lib/validators.ts`

IF a public user views an academy profile

WHEN the profile renders

THEN the page SHALL show a "Claim Profile" action that does not obscure academy details, directions, or upcoming open mats.

Done when:

* Academy profile includes the action.
* Action opens a claim form or claim page.
* Academy is preselected from the profile being viewed.
* Existing academy profile layout still works on desktop and mobile.

---

## RF-MVP-002: Store Pending Claim Requests

Branch: `feature/mvp-academy-claiming-flow`

Type: Backend/API

Likely files:

* `prisma/schema.prisma`
* New Prisma migration
* `src/lib/validators.ts`
* New server action or route for claim submission

IF a requester submits a valid academy claim form

WHEN the backend accepts the request

THEN the system SHALL store a `ClaimRequest` with `PENDING` status.

Done when:

* Requester name, requester email, academy, and verification notes/evidence are validated.
* Existing `ClaimRequest` model is reused and extended only if required.
* Duplicate pending claims for the same academy/requester are prevented or clearly rejected.
* Successful submission shows a confirmation state.

---

## RF-MVP-003: Add Admin Claim Review List And Detail

Branch: `feature/mvp-academy-claiming-flow`

Type: UI + Backend

Likely files:

* `src/app/admin/page.tsx`
* New `src/app/admin/claims/page.tsx`
* New `src/app/admin/claims/[id]/page.tsx`
* `src/lib/admin.ts`

IF a platform-level admin opens claim management

WHEN pending claims exist

THEN the admin UI SHALL show claim rows and claim details needed for review.

Done when:

* Claim list shows academy, requester name, requester email, created date, and status.
* Claims can be filtered by status.
* Claim detail shows academy details and verification notes/evidence.
* Non-authorized users cannot access claim review pages.

---

## RF-MVP-004: Approve Claim And Grant Academy Access

Branch: `feature/mvp-academy-claiming-flow`

Type: Backend/API

Likely files:

* New claim server actions or API routes
* `src/lib/admin.ts`
* `src/lib/academy-access.ts`
* `prisma/schema.prisma`

IF an authorized platform-level admin approves a pending claim

WHEN approval succeeds

THEN the system SHALL approve the claim, create or link the requester user, and grant academy access.

Done when:

* Claim status becomes `APPROVED`.
* Requester user is created or linked by email.
* Approved user receives academy access through existing role and/or `AcademyMember`.
* Approved owner can use existing academy/open mat admin flows.
* Action writes an admin audit log.

---

## RF-MVP-005: Reject Claim And Notify Requester

Branch: `feature/mvp-academy-claiming-flow`

Type: UI + Backend

Likely files:

* Claim detail page/actions
* `src/lib/reliable-email.ts`
* `src/lib/admin.ts`

IF an authorized platform-level admin rejects a pending claim

WHEN rejection succeeds

THEN the system SHALL mark the claim rejected, avoid granting access, notify the requester, and audit the action.

Done when:

* Claim status becomes `REJECTED`.
* Optional rejection reason can be recorded if implemented.
* Requester receives or queues an email notification.
* No academy access is granted.
* Action writes an admin audit log.

---

# Ticket Group 2: Admin-Created User Onboarding Email

Priority: High

Recommended order:

1. RF-MVP-006
2. RF-MVP-007
3. RF-MVP-008

---

## RF-MVP-006: Queue Onboarding Email After Admin Creates User

Branch: `feature/admin-created-user-onboarding-email`

Type: Backend/API

Likely files:

* `src/app/admin/users/actions.ts`
* `src/lib/reliable-email.ts`
* Optional new helper in `src/lib/password-reset.ts` or `src/lib/user-onboarding-email.ts`

IF an authorized admin creates a user

WHEN the user record is created successfully

THEN the system SHALL queue an onboarding email to the created user's email address.

Done when:

* Email is queued only after user creation succeeds.
* Email includes login email/username and login URL.
* Email includes temporary password or first-login setup link.
* Plaintext temporary password is not written to audit logs, app logs, API responses, or database fields.
* User creation audit still works.

---

## RF-MVP-007: Show Admin Feedback For Onboarding Email

Branch: `feature/admin-created-user-onboarding-email`

Type: UI

Likely files:

* `src/app/admin/users/CreateUserForm.tsx`
* `src/app/admin/users/page.tsx`
* `src/app/admin/users/actions.ts`

IF user creation succeeds and onboarding email is queued

WHEN the admin returns to `/admin/users`

THEN the UI SHOULD show confirmation that the user was created and email was queued.

Done when:

* Success feedback exists.
* Failure feedback exists when user is created but email queueing fails.
* Existing create-user form fields and role/academy assignment behavior remain intact.
* Existing "Send Password Email" row action still works.

---

## RF-MVP-008: Decide Credential Approach

Branch: `feature/admin-created-user-onboarding-email`

Type: Documentation + Backend constraint

Likely files:

* Implementation PR/notes
* `src/app/admin/users/actions.ts`
* `src/lib/password-reset.ts`

IF implementation starts

WHEN the engineer chooses onboarding credential behavior

THEN the team SHALL document whether onboarding emails use raw temporary passwords or single-use setup links.

Done when:

* Decision is written in the implementation notes or PR.
* If setup links are chosen, existing password reset token flow is reused where possible.
* If raw temporary passwords are chosen, user is instructed to change password after login.

---

# Ticket Group 3: MVP Analytics

Priority: High

Recommended order:

1. RF-MVP-009
2. RF-MVP-010
3. RF-MVP-011

---

## RF-MVP-009: Select And Configure Analytics Provider

Branch: `feature/mvp-analytics-success-metrics`

Type: Configuration + Documentation

Likely files:

* `src/app/layout.tsx`
* New analytics helper under `src/lib/analytics.ts` or `src/components/*`
* Environment documentation

IF the application is deployed to production

WHEN analytics environment variables are configured

THEN the app SHALL load the selected analytics provider without breaking page rendering.

Done when:

* Provider decision is documented: Google Analytics, PostHog, or approved alternative.
* Analytics can be disabled locally.
* Missing configuration does not break public pages.
* Privacy policy remains accurate.

---

## RF-MVP-010: Track Core Discovery Events

Branch: `feature/mvp-analytics-success-metrics`

Type: UI + Backend

Likely files:

* `src/app/academies/page.tsx`
* `src/app/open-mats/page.tsx`
* `src/app/academies/[slug]/page.tsx`
* `src/app/open-mats/[id]/page.tsx`
* `src/app/map/page.tsx`
* Shared analytics helper

IF users search, view profiles/details, click directions, or view the map

WHEN analytics is enabled

THEN the app SHALL track safe MVP discovery events.

Events:

* `academy_search_submitted`
* `open_mat_search_submitted`
* `academy_profile_viewed`
* `open_mat_detail_viewed`
* `directions_clicked`
* `map_viewed`
* `map_marker_clicked` once map markers exist

Done when:

* Events do not include raw email, phone, exact user latitude/longitude, claim notes, or verification evidence.
* Analytics failures do not block user flows.
* Directions navigation still works.

---

## RF-MVP-011: Document MVP Reporting Path

Branch: `feature/mvp-analytics-success-metrics`

Type: Documentation

Likely files:

* New or existing docs under `docs/features/Product/Products/`

IF MVP launch readiness is reviewed

WHEN the founder needs traction metrics

THEN documentation SHALL explain where to review monthly visitors, weekly active users, returning users, monthly searches, and claim funnel metrics.

Done when:

* Reporting path exists.
* Monthly visitors are measurable.
* Weekly active users are measurable.
* Returning users are measurable.
* Monthly searches are measurable.
* Claim starts/submissions are measurable once claim flow ships.

---

# Ticket Group 4: Data-Driven Map

Priority: High

Recommended order:

1. RF-MVP-012
2. RF-MVP-013

---

## RF-MVP-012: Replace Generic Map Embed With RollFinder Map Data

Branch: `feature/mvp-data-driven-map`

Type: UI + Backend

Likely files:

* `src/app/map/page.tsx`
* `src/lib/data.ts`
* Optional map client component

IF `/map` renders

WHEN academy records have latitude and longitude

THEN the map SHALL display RollFinder academy markers from application data.

Done when:

* Markers use stored academy coordinates.
* Academies with upcoming open mats expose upcoming session state.
* Marker detail includes academy name, borough/postcode, upcoming open mat summary, "View details", and "Directions."
* Sidebar list matches map data.

---

## RF-MVP-013: Keep Map Useful Without Provider Key

Branch: `feature/mvp-data-driven-map`

Type: UI

Likely files:

* `src/app/map/page.tsx`

IF the map provider key is missing

WHEN `/map` renders

THEN the page SHALL show a useful academy/open mat location list with directions links instead of a dead map.

Done when:

* Fallback shows real academy data.
* Directions links work.
* Mobile layout remains usable.

---

# Ticket Group 5: Open Mat Contact Information

Priority: Medium

Recommended order:

1. RF-MVP-014

---

## RF-MVP-014: Show Contact Information On Open Mat Detail

Branch: `feature/open-mat-contact-info`

Type: UI + Backend

Likely files:

* `src/app/open-mats/[id]/page.tsx`
* Optional Prisma migration if event-specific contact is required

IF a user views an open mat detail page

WHEN academy or event contact information exists

THEN the page SHALL show contact email and/or phone without requiring navigation to the academy page.

Done when:

* Academy contact email/phone is shown as fallback.
* If event-specific contact is added, it takes precedence.
* If no contact exists, page shows "Check with academy" or equivalent.
* Existing date/time/location/price/directions layout still works.

---

# Ticket Group 6: Search Performance Check

Priority: Medium

Recommended order:

1. RF-MVP-015

---

## RF-MVP-015: Add Search Performance Acceptance Check

Branch: `feature/search-performance-check`

Type: Test/Tooling

Likely files:

* New script under `scripts/`
* Existing local CI script if appropriate
* `src/lib/data.ts`

IF academy and open mat search are tested against seeded data

WHEN the performance check runs

THEN each search path SHALL be checked against a 2 second target.

Done when:

* Academy search check reports pass/fail.
* Open mat search check reports pass/fail.
* Failure output identifies which path exceeded 2 seconds.
* Command is documented for local or CI use.

---

# Ticket Group 7: Product/Technical Decision Docs

Priority: Low

Recommended order:

1. RF-MVP-016

---

## RF-MVP-016: Document Current Auth And Hosting Decisions

Branch: `docs/current-platform-decisions`

Type: Documentation

Likely files:

* `docs/features/Product/Products/RollFinderMvpPrd.md` or separate technical decision record
* Deployment docs under `docs/features/Deployment/Products/` or `docs/architecture/`

IF MVP technical requirements are reviewed

WHEN authentication and hosting are documented

THEN the docs SHALL identify NextAuth credentials and AWS ECS/Terraform as the current implemented platform choices.

Done when:

* Current auth provider is documented.
* Current hosting/deployment platform is documented.
* Original Clerk/Auth0/Supabase/Vercel references are clearly marked as original options or superseded decisions.

---

# Recommended Implementation Sequence

1. RF-MVP-006: Queue onboarding email after admin creates user.
2. RF-MVP-007: Show admin feedback for onboarding email.
3. RF-MVP-001 and RF-MVP-002: Add public academy claim intake and pending storage.
4. RF-MVP-003 through RF-MVP-005: Add admin claim review/decision flow.
5. RF-MVP-009 through RF-MVP-011: Add analytics provider, events, and reporting docs.
6. RF-MVP-014: Show contact information on open mat details.
7. RF-MVP-012 and RF-MVP-013: Add data-driven map.
8. RF-MVP-015: Add search performance check.
9. RF-MVP-016: Document platform decisions.

---

# Global Acceptance Criteria

The MVP implementation backlog is ready when:

* Each ticket maps to one branch and a small file set.
* Each ticket has IF/WHEN/THEN behavior.
* Each ticket has a clear "Done when" checklist.
* Existing public discovery flows continue to work.
* Existing admin academy, open mat, and user management flows continue to work.
* TypeScript, lint, and production build checks pass for implementation branches.
