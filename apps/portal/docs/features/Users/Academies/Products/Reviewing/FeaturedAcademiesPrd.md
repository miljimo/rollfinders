# PRD: Featured Academies

## Status

Reviewing

## Source Context

Current implementation references:

* `prisma/schema.prisma`
* `src/app/admin/academies/AcademyForm.tsx`
* `src/app/admin/academies/[id]/page.tsx`
* `src/app/api/admin/academies/route.ts`
* `src/app/dashboard/AdminDashboardWorkspace.tsx`
* `src/lib/data.ts`
* `src/components/AcademyCard.tsx`

The home page previously contained a `Featured Academies` section shell, but the academy cards were commented out and no academy rows rendered. That home-page surface is removed pending this PRD review.

## Purpose

Define what `Featured Academies` means before the platform uses it as a public placement, ranking signal, paid promotion, or editorial surface.

## Current Behavior

The current system has a durable `Academy.featured` boolean field.

Admins can set or clear the field through academy create and edit flows:

* The guided academy form includes a `Featured academy` toggle.
* The admin academy detail page displays whether featured placement is active.
* The dashboard academy table displays a Featured column.
* The admin academy API can filter by `featured` or `not-featured`.

Public academy cards do not currently display a dedicated featured badge.

The admin academy API can filter by featured state. Current public academy cards, academy profile pages, and the home page do not present featured status as a visible public claim.

Before removal, the home page fetched a top candidate set for academies through `getFeaturedData`, but the actual `AcademyCard` render call was commented out. The visible home page showed only a `Featured Academies` heading, Browse Academies link, and an empty card grid. The home page no longer renders that section and no longer fetches academy candidates for that surface.

## Problem

The `featured` field exists before the product rules are clear.

Without requirements, users and admins cannot tell whether a featured academy is:

* editorially selected by RollFinders;
* paid placement;
* verified or trusted;
* temporarily promoted;
* simply boosted in ranking.

This creates trust, fairness, and operational ambiguity.

## In Scope For Review

* Definition of Featured Academy.
* Admin rules for setting and removing featured status.
* Public display rules.
* Ranking and ordering rules.
* Empty-state behavior.
* Audit, analytics, and reporting expectations.
* Whether featured status is free/editorial or commercial.

## Out Of Scope Until Approved

* Payments or billing for featured placement.
* Public home-page Featured Academies section.
* Automatic featuring based on analytics.
* Sponsored placement labels.
* Multi-market inventory limits.

## Requirements

### FA-001: Definition

IF an academy is marked as featured

WHEN any admin or public surface uses that state

THEN the product SHALL define whether featured means editorial promotion, paid placement, trust boost, or operational highlighting.

Done when:

* The selected meaning is documented.
* The meaning is consistent across admin, public listing, search, and analytics surfaces.
* Public copy does not imply verification, sponsorship, or endorsement unless that is explicitly approved.

### FA-002: Admin Control

IF a platform-level admin edits an academy

WHEN the admin changes featured status

THEN the system MAY allow the change only under the approved Featured Academy rules.

Done when:

* Allowed roles are documented.
* Required fields or checks are documented.
* The admin UI explains the consequence of enabling featured status.
* Featured changes are auditable if featured status affects public ranking or paid/commercial placement.

### FA-003: Public Display

IF featured status is approved for public display

WHEN an academy card, academy profile, or public module renders

THEN the system SHALL display featured status only with approved labels and visual treatment.

Done when:

* The approved label is documented.
* Public display does not conflict with verified or claimed indicators.
* Featured status is not shown as a trust indicator unless approved.

### FA-004: Home Page Surface

IF Featured Academies are reintroduced on the home page

WHEN the home page renders

THEN the section SHALL render real academy cards or be hidden entirely.

Done when:

* The home page does not show an empty Featured Academies shell.
* The section has a reviewed title, link target, and empty-state rule.
* The section uses `AcademyCard` or an approved replacement.
* The section is responsive on mobile and desktop.

### FA-005: Ranking

IF featured academies are included in search, listing, or recommendation ranking

WHEN results are selected or ordered

THEN the system SHALL define how featured status interacts with distance, verification, managed/claimed status, and search relevance.

Done when:

* Featured status cannot silently override distance-sensitive ordering unless that is explicitly approved.
* Managed/claimed and verified trust rules remain distinguishable from featured promotion rules.
* Tie-breakers are deterministic.

### FA-006: Analytics

IF featured status affects public placement

WHEN users view or click featured academy surfaces

THEN analytics SHOULD record impressions and clicks in a way that can distinguish featured placement from ordinary academy discovery.

Done when:

* Impression and click events are defined if analytics are enabled.
* Events include academy id and surface name.
* Commercial or sponsored use cases can be reported without exposing private admin data.

## Acceptance Criteria

* The home page does not render Featured Academies until the PRD is approved.
* Admin featured controls remain documented as current behavior.
* Public display rules are explicit before any visible featured academy badge or module ships.
* Ranking behavior is explicit before featured status is used as a public boost.
* Empty home-page shells are not allowed.

## Open Questions

* Is Featured Academy an editorial choice, a paid placement, or a temporary product experiment?
* Should featured status require academy verification or approved ownership claim?
* Should users see a `Featured`, `Promoted`, or `Sponsored` label?
* Should there be a maximum number of featured academies per city or region?
* Should featured status have start and end dates instead of a permanent boolean?
