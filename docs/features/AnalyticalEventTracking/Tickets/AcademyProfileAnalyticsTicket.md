# Ticket: Academy Profile Analytics

Status: Done

Branch: `feature/academy-profile-analytics`

## Purpose

Track which academy profiles attract attention and whether profile views lead to claim or commercial actions.

## Source Review

Current code reviewed:

* `src/app/academies/[slug]/page.tsx`
* `src/components/AcademyCard.tsx`
* `src/app/academies/[slug]/claim/page.tsx`

## Requirements

IF a public user opens an academy profile

WHEN the academy is found and rendered

THEN the system SHALL record an `academy_profile_viewed` event with `academyId`.

AND metadata SHOULD include slug, city, borough, verification status, featured flag, and whether upcoming open mats are present.

IF the academy does not exist

WHEN the page returns not-found behavior

THEN the system SHALL NOT create a profile-view event.

## Likely Files

* `src/app/academies/[slug]/page.tsx`
* `src/lib/analytics/service.ts`

## Done When

* Valid profile views are tracked once per page render.
* Missing academies are not counted as profile views.
* Existing profile UI and claim entry points still work.
