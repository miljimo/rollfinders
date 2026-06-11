# PRD: Academy Management Guided Update And Drop-In Pricing

Version: 1.0

Status: Reviewing

Priority: High

Review date: 2026-06-11

Implementation evidence: academy create/edit guided form, verification status, training flags, featured state, and claim invitation controls exist. Drop-in pricing audience semantics, member-only free pricing behavior, and roll visibility rules still need implementation verification.

Branch:

`feature/academy-management-guided-update-drop-in-pricing`

---

# Objective

Provide an admin UI for creating and editing academy profiles through a guided multi-step flow.

The flow covers academy basics, location, media, settings, and review before publishing or saving changes. It also defines explicit drop-in pricing semantics so a free member drop-in fee is not confused with unset public pricing.

---

# User Story

As a platform admin or academy operator, I want to update academy details through a guided flow so that academy listings can be reviewed, published, and priced accurately for the right audience.

---

# Scope

In scope:

* Academy edit guided update UI.
* Basics, location, media, settings, and review steps.
* Next-step checklist for review and publish readiness.
* Drop-in price management.
* Drop-in pricing audience management.
* Verification status management.
* Gi and No-Gi availability flags.
* Beginner friendly, competition focused, and featured academy flags.
* Claim invitation sending eligibility from saved academy contact email state.
* Review copy and checklist states for unset, free, member-only, and public drop-in pricing.
* Internal and external roll UI behavior for internal-only free drop-in pricing.

Out of scope:

* Payment checkout implementation.
* Membership billing and entitlement rules.
* Payment provider orchestration.
* Provider fee calculation.
* Public marketplace ranking logic for featured academies.
* Member account billing.

---

# Guided Update Flow

The academy update flow SHALL be split into five steps:

* `Basics`
* `Location`
* `Media`
* `Settings`
* `Review`

Each step SHALL show a next-step checklist so admins understand whether the current academy profile is ready to review or publish.

---

# Settings Requirements

The `Settings` step SHALL allow admins to manage:

* Drop-in price.
* Pricing audience for the entered drop-in price.
* Verification status.
* Training availability flags, including Gi and No-Gi availability.
* Audience and positioning flags, including beginner friendly, competition focused, and featured academy.
* Claim invitation sending when the saved academy contact email is valid, usable, unclaimed, and outside reminder cooldown.

Public verified status SHALL be derived from the selected verification status.

---

# Drop-In Pricing Semantics

The drop-in price field represents the public non-member drop-in fee unless the product explicitly labels a different audience.

Drop-in fees may be free for academy members. The UI and downstream copy SHALL support this without treating a zero member fee as missing or invalid pricing.

Recommended data semantics:

* Store unset pricing separately from free pricing. `null` or an omitted value means price is unset. `0` means intentionally free.
* Store the pricing audience explicitly, for example `members_only` or `everyone`.
* If the product keeps one drop-in price field, the pricing audience is mandatory so external students do not inherit a member-only free price.
* If the product supports separate public and member pricing, store separate fields, for example `drop_in_price_minor` and `member_drop_in_price_minor`.

---

# IF/WHEN/THEN Requirements

## AMG-001: Display Guided Update Steps

IF an authorized admin or academy operator edits an academy

WHEN the academy edit UI renders

THEN the UI SHALL show the `Basics`, `Location`, `Media`, `Settings`, and `Review` steps.

Done when:

* Current step is visually active.
* Completed steps are distinguishable.
* The admin can move through the flow without losing entered data.

---

## AMG-002: Show Next-Step Checklist

IF the admin is on any academy update step

WHEN the step renders

THEN the UI SHALL show a next-step checklist for review or publish readiness.

Done when:

* The checklist distinguishes complete and incomplete requirements.
* Pricing checklist states distinguish unset pricing from intentionally free pricing.
* The review step summarizes all unresolved checklist items before publishing or saving.

---

## AMG-003: Manage Academy Settings

IF the admin is on the `Settings` step

WHEN the form renders

THEN the UI SHALL allow management of drop-in price, pricing audience, verification status, training availability, audience flags, and featured state.

Done when:

* Gi availability can be saved.
* No-Gi availability can be saved.
* Beginner friendly can be saved.
* Competition focused can be saved.
* Featured academy can be saved.
* `verified` is derived from `verificationStatus === VERIFIED`.

---

## AMG-004: Send Eligible Claim Invitation

IF the admin is on the `Settings` step

WHEN the saved academy contact email is valid, usable, unclaimed, and outside reminder cooldown

THEN the UI SHALL allow the admin to send a claim invitation.

Done when:

* The send action is unavailable for invalid, missing, unusable, claimed, or cooldown-blocked contact emails.
* The UI explains why sending is unavailable.
* Sending an invitation preserves the academy settings form state.

---

## AMG-005: Accept Free Member Drop-In Fee

IF an admin enters `0` for a member or internal-student drop-in fee

WHEN the form validates and saves

THEN the system SHALL treat the value as an intentionally free fee, not as missing pricing.

Done when:

* Validation accepts `0`.
* Persistence preserves `0` after reload.
* Review copy displays a free-fee state rather than an incomplete state.

---

## AMG-006: Capture Pricing Audience

IF the Settings step includes a drop-in price field

WHEN the form renders

THEN the UI SHALL include a pricing-audience control that makes clear who the entered price applies to.

Done when:

* The control may be implemented as `Apply this drop-in price to everyone`.
* If checked, the entered price applies to everyone, including non-members and visiting drop-in students.
* If unchecked, the entered price applies only to internal academy students or members.
* The selected audience is persisted with the academy settings.

---

## AMG-007: Review Internal-Only Drop-In Pricing

IF the admin leaves `Apply this drop-in price to everyone` unchecked

WHEN the admin reaches the review step

THEN the review step SHALL show the price as internal student or member pricing only.

Done when:

* Review copy uses an explicit phrase such as `Free for academy members` when the value is `0`.
* Review copy does not imply public visitor availability.
* Publishing checklist does not mark intentionally free internal pricing as missing.

---

## AMG-008: Review Public Drop-In Pricing

IF the admin checks `Apply this drop-in price to everyone`

WHEN the admin reaches the review step

THEN the review step SHALL show the price as available to all drop-in visitors.

Done when:

* Review copy uses an explicit phrase such as `Available to all visitors`.
* If the price is `0`, the public drop-in is displayed as free, not blank.
* Public pricing remains distinguishable from member-only pricing.

---

## AMG-009: Show Internal-Only Free Drop-In To Internal Students

IF an internal academy student views academy rolls or class rolls for an academy with internal-only drop-in pricing

WHEN the internal-only drop-in price is `0`

THEN the student-facing roll UI SHALL show the drop-in availability as free for academy members or students.

Done when:

* Internal users see clear copy such as `Free for academy members`.
* The UI does not treat `0` as an unset price.
* Internal-only availability is based on the student's relationship to the academy.

---

## AMG-010: Hide Internal-Only Free Drop-In From External Visitors

IF an external student or public visitor views academy rolls or class rolls for an academy with internal-only drop-in pricing

WHEN the internal-only drop-in price is `0`

THEN the UI SHALL NOT show that internal-only free price as publicly available.

Done when:

* External visitors do not inherit member-only free pricing.
* Public copy shows `Price not set`, public paid pricing, or no public drop-in price according to available public pricing data.
* Public visitors only see free public drop-in pricing when the academy explicitly applies the price to everyone.

---

## AMG-011: Preserve Separate Public And Member Pricing

IF the product stores separate public and member drop-in pricing

WHEN the public drop-in price and member drop-in price differ

THEN the UI and persistence layer SHALL preserve both values.

Done when:

* The member drop-in fee may be `0` while public drop-in remains paid.
* User-facing labels make the audience clear, for example `Drop-in price` and `Member drop-in price`.
* Review copy distinguishes public and member pricing.

---

# Acceptance Criteria

* When an admin enters `0` for a member drop-in fee, the form accepts it as a valid free fee.
* When the admin leaves `Apply this drop-in price to everyone` unchecked, the review step shows the price as internal student/member pricing only.
* When the admin checks `Apply this drop-in price to everyone`, the review step shows the price as available to all drop-in visitors.
* When an internal academy student views rolls for an academy with internal-only drop-in pricing, the student-facing roll UI shows the drop-in as free.
* When an external student or public visitor views the same rolls, the UI does not show the internal-only free price as publicly available.
* When the review step displays a free drop-in fee, it uses clear copy such as `Free for academy members`.
* When pricing is unset, the UI displays an incomplete or missing-price state rather than showing `Free`.
* When a public drop-in price and member drop-in price differ, the UI preserves both values.
* When academy settings are saved, free member drop-in pricing is persisted and remains visible after reload.
