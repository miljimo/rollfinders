# Ticket: Claim Funnel Analytics

Status: Done

Branch: `feature/claim-funnel-analytics`

## Purpose

Measure the academy claim lifecycle from public claim start through admin approval or rejection.

## Source Review

Current code reviewed:

* `src/app/academies/[slug]/claim/page.tsx`
* `src/app/academies/[slug]/claim/AcademyClaimForm.tsx`
* `src/app/api/academy-claims/route.ts`
* `src/app/api/admin/academy-claims/[id]/approve/route.ts`
* `src/app/api/admin/academy-claims/[id]/reject/route.ts`
* `src/lib/claim-requests.ts`

## Requirements

IF a user starts a public academy claim

WHEN the claim form renders

THEN the system SHALL record `claim_profile_started`.

IF a claim request is accepted by the backend

WHEN `ClaimRequest` is created

THEN the system SHALL record `claim_profile_submitted` with `academyId` and claim id in metadata.

IF an admin approves or rejects a claim

WHEN the existing admin API completes successfully

THEN the system SHALL record `claim_approved` or `claim_rejected`.

## Likely Files

* `src/app/academies/[slug]/claim/page.tsx`
* `src/app/api/academy-claims/route.ts`
* Admin approve/reject API routes
* `src/lib/claim-requests.ts`

## Done When

* Claim start, submit, approve, and reject steps are tracked.
* Duplicate/failed submissions are not counted as successful submits.
* Existing claim emails and approval behavior remain unchanged.
