# PRD: New Academy Multi-Step Experience

Version: 1.1

Status: Done

Priority: High

Review date: 2026-06-05

Implementation evidence: `src/app/admin/academies/AcademyForm.tsx` implements the guided steps, review step, live preview, validation feedback, and sticky action controls.

Pending requirement update: Location coordinates SHOULD be automatically resolved from the academy postcode or address when possible, while still allowing manual latitude and longitude entry.

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

Location automation:

* The system SHOULD automatically populate `latitude` and `longitude` from the academy postcode or full address when a geocoding result is available.
* Manual `latitude` and `longitude` input SHALL remain available.
* Manually entered coordinates SHALL be treated as an explicit override and SHALL NOT be replaced without an admin action.
* If automatic lookup fails, the admin SHALL be able to continue by entering coordinates manually.

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
* Latitude and longitude fields remain visible and editable.
* Default coordinates remain available only as a fallback when no coordinates have been entered or resolved.

---

## NAM-006A: Automatic Coordinate Lookup

IF the admin enters or updates the academy postcode or address

WHEN enough location information is available to run a lookup

THEN the system SHOULD automatically resolve and populate `latitude` and `longitude`.

Done when:

* Lookup can use postcode alone when supported by the selected provider.
* Lookup can use the combined address, city, postcode, and country when postcode alone is not enough.
* Automatically populated coordinates are shown in the latitude and longitude fields.
* The UI indicates whether coordinates were auto-filled, manually edited, or still required.
* Lookup failures show non-blocking feedback and do not erase existing coordinates.
* The admin can trigger or retry lookup through an explicit action if automatic lookup does not run or fails.
* Manual edits to either coordinate mark the coordinate pair as manually overridden.
* Once manually overridden, automatic lookup SHALL NOT replace coordinates unless the admin explicitly chooses to refresh or use suggested coordinates.

---

## NAM-006B: Coordinate Validation And Source

IF coordinates are auto-filled or manually entered

WHEN the form validates the `Location` step

THEN the system SHALL validate the coordinate values before review or submit.

Done when:

* `latitude` accepts numeric values from `-90` to `90`.
* `longitude` accepts numeric values from `-180` to `180`.
* Empty coordinates remain invalid unless the backend schema is changed to support missing coordinates.
* Invalid manual coordinates show inline errors.
* The review step identifies coordinates as `Auto-filled` or `Manual` when the source is known.
* Coordinate source tracking MAY be UI-only unless product analytics or audit requirements require persistence.

---

## NAM-007: Location Preview

IF location fields have values

WHEN the admin updates address, city, postcode, country, latitude, or longitude

THEN the preview panel SHOULD reflect the latest location summary.

Done when:

* Preview shows city and country.
* Preview reflects the current latitude and longitude values after auto-fill or manual edits.
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
* Latitude and longitude can be auto-filled from postcode or address when lookup succeeds.
* Admin can manually enter or override latitude and longitude.
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
4. Add coordinate lookup from postcode or address using the configured geocoding provider.
5. Preserve manual latitude and longitude editing with explicit override behavior.
6. Add live preview panel.
7. Add review step and edit-step links.
8. Submit through existing `createAcademy`.
9. Remove or hide independent `Legacy verified flag` from the UI.
10. Add tests or manual QA for required fields, coordinate lookup, manual coordinate override, step navigation, verification derivation, and responsive layout.

---

# QA Checklist

* Create academy with minimum required fields.
* Create academy with all optional fields.
* Verify postcode or address lookup auto-fills latitude and longitude when a valid result exists.
* Verify failed coordinate lookup keeps the user on the Location step with non-blocking feedback and allows manual entry.
* Verify manually edited latitude and longitude are not overwritten by automatic lookup unless the admin explicitly refreshes or accepts suggested coordinates.
* Verify invalid latitude and longitude values show inline errors.
* Verify duplicate slug error appears on Basics step.
* Verify duplicate academy error appears with Basics and Location field hints.
* Verify `Pending` creates `verified = false`.
* Verify `Verified` creates `verified = true`.
* Verify `Rejected` creates `verified = false`.
* Verify mobile layout has no overlapping controls.
* Verify keyboard navigation can complete the flow.
