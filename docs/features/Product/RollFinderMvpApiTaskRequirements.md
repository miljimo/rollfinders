# PRD: MVP API And Backend Task Requirements

Version: 1.0

Review date: 2026-06-05

Scope: API, server action, data model, authorization, background email, analytics, and verification tasks extracted from the MVP gap, academy claiming, analytics, and admin onboarding PRDs.

---

# Current Backend Reference

Current server/API surfaces:

* Admin user actions: `src/app/admin/users/actions.ts`
* Admin academy actions: `src/app/admin/academies/actions.ts`
* Admin open mat actions: `src/app/admin/open-mats/actions.ts`
* Admin API routes: `src/app/api/admin/*`
* Dashboard API routes: `src/app/api/dashboard/*`
* Auth route: `src/app/api/auth/[...nextauth]/route.ts`
* Email delivery route: `src/app/api/jobs/email-delivery/route.ts`
* Data queries: `src/lib/data.ts`
* Auth/admin helpers: `src/lib/auth.ts`, `src/lib/admin.ts`, `src/lib/academy-access.ts`
* Email helpers: `src/lib/reliable-email.ts`, `src/lib/password-reset.ts`
* Prisma schema: `prisma/schema.prisma`

Backend implementation must preserve existing authorization rules unless a requirement explicitly changes them.

---

# Branches

Use these branches for implementation:

* Academy claiming API/backend: `feature/mvp-academy-claiming-flow`
* Analytics API/backend: `feature/mvp-analytics-success-metrics`
* Data-driven map API/backend: `feature/mvp-data-driven-map`
* Open mat contact backend: `feature/open-mat-contact-info`
* Admin-created user onboarding backend: `feature/admin-created-user-onboarding-email`
* Search performance checks: `feature/search-performance-check`
* Platform decision docs: `docs/current-platform-decisions`

---

# Group 1: Academy Claiming API And Backend

Source PRD:

`docs/features/Product/RollFinderAcademyClaimingPrd.md`

## API-CLAIM-001: Claim Data Model

IF claim intake requires verification notes or evidence

WHEN the existing `ClaimRequest` model does not store that data

THEN the backend SHALL add the minimum required fields through Prisma migration.

## API-CLAIM-002: Claim Validation Schema

IF a claim request is submitted

WHEN the backend validates the payload

THEN the backend SHALL require academy ID, requester name, requester email, and verification notes/evidence.

## API-CLAIM-003: Create Pending Claim

IF a valid public claim request is submitted

WHEN the backend accepts the request

THEN the backend SHALL create a `ClaimRequest` with `PENDING` status.

## API-CLAIM-004: Duplicate Pending Claim Handling

IF the same requester submits a duplicate pending claim for the same academy

WHEN the backend checks existing claims

THEN the backend SHALL prevent, merge, or clearly reject the duplicate.

## API-CLAIM-005: Admin Claim List Query

IF an authorized platform-level admin requests claim management data

WHEN the backend receives the request

THEN the backend SHALL return claims filtered by requested status.

## API-CLAIM-006: Admin Claim Detail Query

IF an authorized platform-level admin requests a claim detail

WHEN the backend receives the request

THEN the backend SHALL return claim, academy, requester, verification, and status data needed for review.

## API-CLAIM-007: Approve Claim Authorization

IF a user attempts to approve a claim

WHEN the backend receives the request

THEN the backend SHALL verify platform-level claim approval permission.

## API-CLAIM-008: Approve Pending Claim

IF an authorized admin approves a pending claim

WHEN the approval transaction succeeds

THEN the backend SHALL set claim status to `APPROVED`.

## API-CLAIM-009: Approved Claim User Creation

IF an approved requester does not have a user account

WHEN the claim is approved

THEN the backend SHALL create a user account or start the existing account setup flow.

## API-CLAIM-010: Approved Claim User Linking

IF an approved requester already has a user account

WHEN the claim is approved

THEN the backend SHALL link that user to the claimed academy.

## API-CLAIM-011: Academy Membership Grant

IF a claim is approved

WHEN the requester account exists

THEN the backend SHALL grant academy access through the existing role and `AcademyMember` model.

## API-CLAIM-012: Approval Notification

IF a claim is approved

WHEN the transaction completes

THEN the backend SHALL queue an approval email through the reliable email system.

## API-CLAIM-013: Reject Claim Authorization

IF a user attempts to reject a claim

WHEN the backend receives the request

THEN the backend SHALL verify platform-level claim rejection permission.

## API-CLAIM-014: Reject Pending Claim

IF an authorized admin rejects a pending claim

WHEN the rejection transaction succeeds

THEN the backend SHALL set claim status to `REJECTED` and SHALL NOT grant academy access.

## API-CLAIM-015: Rejection Reason

IF the admin provides a rejection reason

WHEN the backend rejects the claim

THEN the backend SHALL store the reason according to the claim data model.

## API-CLAIM-016: Rejection Notification

IF a claim is rejected

WHEN the transaction completes

THEN the backend SHALL queue a rejection email through the reliable email system.

## API-CLAIM-017: Claim Audit Log

IF a claim is approved or rejected

WHEN the decision is saved

THEN the backend SHALL write an admin audit log with actor, claim, academy, requester, action, and timestamp.

## API-CLAIM-018: Unauthorized Claim Access

IF a user without claim review permission requests claim list, detail, approval, or rejection

WHEN the backend receives the request

THEN the backend SHALL reject the request.

---

# Group 2: Analytics API And Backend

Source PRD:

`docs/features/Product/RollFinderMvpAnalyticsIfWhenThenRequirements.md`

## API-ANALYTICS-001: Provider Configuration

IF the application runs in production

WHEN analytics environment variables are configured

THEN the backend/application config SHALL expose the selected analytics provider configuration safely.

## API-ANALYTICS-002: Provider Missing Safety

IF analytics configuration is missing

WHEN public or admin pages render

THEN the backend SHALL NOT throw an application error.

## API-ANALYTICS-003: Shared Event Contract

IF analytics events are implemented

WHEN UI or server code tracks an event

THEN the backend/shared code SHALL enforce stable event names and privacy-safe payloads.

## API-ANALYTICS-004: Search Result Count Support

IF search tracking includes result counts

WHEN academy or open mat search results are returned

THEN the backend SHALL make result count available to the tracking layer when practical.

## API-ANALYTICS-005: Object ID Support

IF profile/detail/map events are tracked

WHEN the relevant page data is loaded

THEN the backend SHALL provide academy IDs and open mat IDs required by event payloads.

## API-ANALYTICS-006: Privacy-Safe Payloads

IF analytics payloads are generated

WHEN payloads include user, claim, or location context

THEN the backend/shared code SHALL exclude raw email addresses, phone numbers, exact user latitude/longitude, claim notes, and verification evidence.

## API-ANALYTICS-007: Reporting Path Documentation

IF production analytics is configured

WHEN launch readiness is reviewed

THEN the implementation SHALL document where monthly visitors, weekly active users, returning users, monthly searches, and claim funnel metrics are reviewed.

---

# Group 3: Data-Driven Map API And Backend

Source PRD:

`docs/features/Product/RollFinderMissingMvpRequirementsPrd.md` MR-002

## API-MAP-001: Map Data Query

IF `/map` requests map data

WHEN academies have latitude and longitude

THEN the backend SHALL return academy records with location, profile slug, borough/postcode, and upcoming open mat summary.

## API-MAP-002: Active Open Mat State

IF an academy has active upcoming open mats

WHEN map data is queried

THEN the backend SHALL include enough open mat data to display upcoming open mat state.

## API-MAP-003: Map Data Excludes Inactive Events

IF map data includes open mats

WHEN events are queried

THEN the backend SHALL exclude inactive or past open mats.

## API-MAP-004: Directions Data

IF map marker details include directions

WHEN the backend returns marker data

THEN the backend SHALL include sufficient address or coordinate data to build directions links.

---

# Group 4: Open Mat Contact API And Backend

Source PRD:

`docs/features/Product/RollFinderMissingMvpRequirementsPrd.md` MR-004

## API-CONTACT-001: Contact Source Decision

IF open mats need contact information

WHEN implementation begins

THEN the team SHALL decide whether contact data is event-specific, academy-derived, or both.

## API-CONTACT-002: Event Contact Fields

IF event-specific contact data is required

WHEN the existing event model does not store it

THEN the backend SHALL add the minimum required event contact fields through Prisma migration.

## API-CONTACT-003: Academy Contact Fallback

IF an open mat has no event-specific contact data

WHEN open mat detail data is queried

THEN the backend SHALL provide academy email and/or phone when available.

## API-CONTACT-004: Contact Data Safety

IF contact information is returned publicly

WHEN the backend serializes open mat detail data

THEN the backend SHALL expose only contact fields intended for public display.

---

# Group 5: Admin-Created User Onboarding API And Backend

Source PRD:

`docs/features/Administration/AdminCreatedUserOnboardingEmailPrd.md`

## API-USEREMAIL-001: Queue Email After User Creation

IF an authorized admin creates a user

WHEN the user record is created successfully

THEN the backend SHALL queue an onboarding email to the created user's email address.

## API-USEREMAIL-002: Credential Approach Decision

IF implementation begins

WHEN the engineer starts the branch

THEN the team SHALL document whether onboarding uses raw temporary passwords or first-login setup links.

## API-USEREMAIL-003: Temporary Password Hashing

IF a temporary password is used

WHEN the backend stores the user

THEN the backend SHALL store only the hashed password.

## API-USEREMAIL-004: Plaintext Password Protection

IF a temporary password is used

WHEN logs, audit records, API responses, or database records are written

THEN the backend SHALL NOT include the plaintext temporary password.

## API-USEREMAIL-005: Onboarding Email Content

IF an onboarding email is queued

WHEN the backend builds the email body

THEN the email SHALL include login URL, username/login email, temporary password or setup link, password change/setup instruction, and support guidance.

## API-USEREMAIL-006: Outbound Email Record

IF the onboarding email is accepted by the reliable email system

WHEN the email is queued

THEN the backend SHALL create an outbound email record.

## API-USEREMAIL-007: Email Queue Failure Result

IF user creation succeeds but onboarding email queueing fails

WHEN the server action returns

THEN the backend SHALL return or expose enough state for the UI to communicate the email failure.

## API-USEREMAIL-008: User Creation Audit

IF an admin creates a user

WHEN the user record is saved

THEN the backend SHALL audit the user creation action.

## API-USEREMAIL-009: Email Queue Audit

IF an onboarding email is queued

WHEN the queue record is created

THEN the backend SHALL audit or include metadata that onboarding email was queued.

## API-USEREMAIL-010: Password Reset Preservation

IF onboarding email functionality is implemented

WHEN an admin later sends a password reset email

THEN the existing password reset backend action SHALL still work.

---

# Group 6: Search Performance Backend Checks

Source PRD:

`docs/features/Product/RollFinderMissingMvpRequirementsPrd.md` MR-005

## API-PERF-001: Academy Search Performance Check

IF academy search is tested against seeded data

WHEN the performance check runs

THEN the check SHALL verify academy search response time against a 2 second target.

## API-PERF-002: Open Mat Search Performance Check

IF open mat search is tested against seeded data

WHEN the performance check runs

THEN the check SHALL verify open mat search response time against a 2 second target.

## API-PERF-003: CI Or Local Execution

IF search performance checks are added

WHEN an engineer runs the documented command locally or in CI

THEN the checks SHALL report pass/fail status for academy search and open mat search separately.

---

# Group 7: Platform Decision Documentation

Source PRD:

`docs/features/Product/RollFinderMissingMvpRequirementsPrd.md` MR-006

## API-DOCS-001: Auth Decision

IF MVP technical requirements mention authentication

WHEN docs are updated

THEN the docs SHALL identify NextAuth credentials as the current implemented auth provider.

## API-DOCS-002: Hosting Decision

IF MVP technical requirements mention hosting

WHEN docs are updated

THEN the docs SHALL identify AWS ECS/Terraform as the current implemented hosting/deployment platform.
