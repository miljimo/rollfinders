# PRD: New Academy Multi-Step Experience

Version: 1.0

Priority: High

Review date: 2026-06-05

Branch:

`feature/new-academy-multi-step-experience`

---

# Objective

Redesign the current `New Academy` admin form into a guided multi-step creation experience that is easier to complete, validate, review, and publish.

The experience should keep the current admin dashboard flow and existing academy fields, but reorganize the UI into clear sections with progressive completion, draft-friendly navigation, validation feedback, and a live public preview.

---

# Design Direction

Use the generated mockup as the visual reference:

![New Academy multi-step mockup](../../assets/new-academy-multistep-mockup.png)

Target UI pattern:

* Large admin modal or drawer launched from Academy Management.
* Five-step flow: `Basics`, `Location`, `Media`, `Settings`, `Review`.
* Desktop layout uses a two-column work area: form fields on the left, live public preview and next-step checklist on the right.
* Mobile layout becomes a single-column full-screen flow with a collapsed progress indicator.
* Bottom action bar remains visible with `Cancel`, `Back`, `Save draft`, and `Next` or `Create Academy`.

---

# Current Source Context

Existing UI:

* `src/app/admin/academies/form.tsx`
* `src/app/admin/academies/new/page.tsx`
* `src/app/admin/academies/actions.ts`
* `src/app/admin/academies/page.tsx`

Existing validation:

* `src/lib/validators.ts`
* `academySchema`

Existing persistence:

* `createAcademy`
* `Academy.verificationStatus`
* `Academy.verified`
* `Academy.featured`

---

# User Story

As a platform admin, I want to create an academy through a guided multi-step experience so that I can enter accurate academy information without scanning one long form.

---

# Scope

In scope:

* New Academy multi-step UI.
* Current academy field coverage.
* Field validation and inline errors.
* Step navigation.
* Live public preview.
* Review step before save.
* Create academy submission.
* Optional save draft behavior if supported by implementation.

Out of scope:

* Public academy claiming.
* Automated external verification checks.
* Bulk academy import.
* Image upload infrastructure unless already supported.
* Major database schema changes unless save draft requires them.

---

# Field Inventory

## Basics

Required:

* `name`
* `slug`
* `description`

Optional:

* `affiliation`
* `website`
* `email`
* `phone`

## Location

Required:

* `address`
* `city`
* `postcode`
* `country`
* `latitude`
* `longitude`

Optional:

* `borough`

## Media And Social

Optional:

* `logoUrl`
* `coverImageUrl`
* `categories`
* `facebookUrl`
* `instagramUrl`
* `xUrl`

## Training And Commercial Settings

Optional or boolean:

* `dropInPrice`
* `giAvailable`
* `nogiAvailable`
* `beginnerFriendly`
* `competitionFocused`
* `featured`

## Verification

Required:

* `verificationStatus`

System-derived:

* `verified`

Rule:

* `verified` SHALL be derived from `verificationStatus === VERIFIED`.
* The redesigned UI SHOULD NOT expose `Legacy verified flag` as an independent admin checkbox.

---

# IF/WHEN/THEN Requirements

## NAM-001: Launch New Academy Experience

IF an authorized platform admin is on Academy Management

WHEN they select `New Academy`

THEN the system SHALL open the redesigned New Academy experience.

Done when:

* The admin does not lose the Academy Management context.
* The UI can be implemented as a modal, drawer, or dedicated route.
* The close action returns the admin to Academy Management without saving invalid partial data.

---

## NAM-002: Display Multi-Step Progress

IF the New Academy experience is open

WHEN the form renders

THEN the UI SHALL show progress across `Basics`, `Location`, `Media`, `Settings`, and `Review`.

Done when:

* Current step is visually active.
* Completed steps are distinguishable.
* Mobile uses a compact progress bar or step counter.

---

## NAM-003: Basics Step Fields

IF the admin is on the `Basics` step

WHEN the form renders

THEN the UI SHALL show `name`, `slug`, `description`, `affiliation`, `website`, `email`, and `phone`.

Done when:

* Required fields are marked.
* `name`, `slug`, and `description` validate before moving to the next step.
* Optional fields can remain empty.

---

## NAM-004: Slug Generation

IF the admin enters an academy name

WHEN they activate `Auto-generate slug`

THEN the system SHOULD generate a URL-safe slug from the academy name.

Done when:

* Slug uses lowercase letters, numbers, and hyphens.
* Generated slug remains editable.
* Duplicate slug errors still come from backend validation on submit.

---

## NAM-005: Description Character Feedback

IF the admin enters a description

WHEN the description changes

THEN the UI SHOULD show helpful length feedback.

Done when:

* Minimum length guidance is visible.
* Overly short descriptions block progression.
* Character count does not cause layout shift.

---

## NAM-006: Location Step Fields

IF the admin is on the `Location` step

WHEN the form renders

THEN the UI SHALL show `address`, `city`, `postcode`, `borough`, `country`, `latitude`, and `longitude`.

Done when:

* Required location fields validate before review or submit.
* Default city remains `London`.
* Default country remains `United Kingdom`.
* Default coordinates remain available when no coordinates are entered.

---

## NAM-007: Location Preview

IF location fields have values

WHEN the admin updates address, city, postcode, country, latitude, or longitude

THEN the preview panel SHOULD reflect the latest location summary.

Done when:

* Preview shows city and country.
* Invalid coordinates show inline validation before submit.
* No map provider dependency is required for MVP unless already available.

---

## NAM-008: Media And Social Step Fields

IF the admin is on the `Media` step

WHEN the form renders

THEN the UI SHALL show `logoUrl`, `coverImageUrl`, `categories`, `facebookUrl`, `instagramUrl`, and `xUrl`.

Done when:

* URL fields validate as URLs or accept empty values.
* Preview uses entered logo and cover image URLs when valid.
* Empty media fields show neutral placeholders.

---

## NAM-009: Settings Step Fields

IF the admin is on the `Settings` step

WHEN the form renders

THEN the UI SHALL show training, commercial, feature, and verification controls.

Done when:

* `dropInPrice` accepts empty or non-negative numeric values.
* `giAvailable`, `nogiAvailable`, `beginnerFriendly`, and `competitionFocused` render as clear toggles or checkboxes.
* `featured` renders as an admin-only toggle.
* `verificationStatus` renders as a segmented control or select with `Pending`, `Verified`, and `Rejected`.

---

## NAM-010: Verification Status Derives Public Verified Flag

IF the admin sets verification status

WHEN the academy is submitted

THEN the system SHALL derive the public `verified` value from `verificationStatus`.

Done when:

* `VERIFIED` saves `verified = true`.
* `PENDING` saves `verified = false`.
* `REJECTED` saves `verified = false`.
* The UI does not allow conflicting `verificationStatus` and `verified` values.

---

## NAM-011: Live Public Preview

IF the admin edits any academy field

WHEN the value changes

THEN the preview panel SHOULD update to show how the public academy card/profile summary may appear.

Done when:

* Preview shows academy name.
* Preview shows location summary.
* Preview shows verified or not verified state.
* Preview shows logo or cover image when provided.
* Preview has a clear placeholder state when fields are empty.

---

## NAM-012: Step Navigation

IF the admin is using the multi-step form

WHEN they select `Next`, `Back`, or a completed step

THEN the system SHALL navigate without losing entered values.

Done when:

* `Next` validates the current step before advancing.
* `Back` returns to the previous step with values preserved.
* Completed step navigation is available on desktop.
* Mobile navigation remains usable on small screens.

---

## NAM-013: Save Draft

IF save draft is included in the implementation

WHEN the admin selects `Save draft`

THEN the system SHALL persist enough information for the admin to continue later.

Done when:

* Draft behavior is explicitly implemented or hidden.
* If drafts require schema work, create a separate implementation task before exposing the button.
* The UI does not show a non-functional `Save draft` action.

---

## NAM-014: Review Step

IF the admin reaches the `Review` step

WHEN the page renders

THEN the UI SHALL show a grouped summary of all academy fields before creation.

Done when:

* Summary is grouped by Basics, Location, Media, Settings, and Verification.
* Each group has an `Edit` action that returns to the relevant step.
* Missing optional fields are shown as `Not provided`.
* Required field errors are listed clearly.

---

## NAM-015: Create Academy Submission

IF all required fields are valid

WHEN the admin selects `Create Academy`

THEN the system SHALL submit the academy through the existing create academy action or equivalent endpoint.

Done when:

* Backend validation still uses `academySchema`.
* Duplicate academy and duplicate slug errors are shown in the correct step.
* Successful creation redirects or returns to Academy Management.
* `/admin`, `/admin/academies`, and relevant academy paths are revalidated as needed.

---

## NAM-016: Inline Validation

IF backend or client validation fails

WHEN the form displays errors

THEN each error SHALL appear near the related field and the step containing the error SHALL be marked.

Done when:

* Field-level errors are visible.
* Stepper indicates the step with errors.
* The first invalid field receives focus after failed validation.

---

## NAM-017: Responsive Layout

IF the admin uses the experience on mobile or tablet

WHEN the form renders

THEN the UI SHALL adapt to a single-column full-screen flow.

Done when:

* No field text overlaps.
* Sticky footer actions remain reachable.
* Preview is collapsible or moved below the form.
* Step labels do not overflow.

---

## NAM-018: Accessibility

IF the New Academy experience is open

WHEN the admin navigates by keyboard or screen reader

THEN the UI SHALL remain operable and understandable.

Done when:

* Modal or drawer has correct focus management.
* Close, Back, Next, Save draft, and Create Academy are keyboard accessible.
* Inputs have labels.
* Error messages are associated with fields.
* Step changes are announced or clearly represented.

---

# Acceptance Criteria

* New Academy no longer appears as one long ungrouped form.
* Admin can create an academy using a guided multi-step experience.
* All existing academy fields remain supported.
* Verification status remains part of academy creation.
* Public `verified` state is derived from verification status.
* Admin can review all values before creating the academy.
* Validation errors guide the admin to the correct step and field.
* Layout works on desktop and mobile.

---

# Suggested Implementation Breakdown

1. Create multi-step form shell and stepper.
2. Move existing fields into step components.
3. Add client-side step validation while keeping backend validation.
4. Add live preview panel.
5. Add review step and edit-step links.
6. Submit through existing `createAcademy`.
7. Remove or hide independent `Legacy verified flag` from the UI.
8. Add tests or manual QA for required fields, step navigation, verification derivation, and responsive layout.

---

# QA Checklist

* Create academy with minimum required fields.
* Create academy with all optional fields.
* Verify duplicate slug error appears on Basics step.
* Verify duplicate academy error appears with Basics and Location field hints.
* Verify `Pending` creates `verified = false`.
* Verify `Verified` creates `verified = true`.
* Verify `Rejected` creates `verified = false`.
* Verify mobile layout has no overlapping controls.
* Verify keyboard navigation can complete the flow.
