# Academy Management UI PRD

## 1. Summary

Provide an admin UI for creating and editing academy profiles through a guided multi-step flow. The flow includes academy basics, location, media, settings, and review before publishing or saving changes.

## 2. Scope

This PRD covers the academy edit UI shown in the guided academy update flow. It does not define payment-provider orchestration, booking checkout, or member account billing.

## 3. Target Users

- Platform admins maintaining academy listings.
- Academy operators updating their own academy details after claim or verification.

## 4. Guided Update Flow

The edit flow is split into five steps:

- Basics
- Location
- Media
- Settings
- Review

Each step should show a next-step checklist so admins can understand whether the current academy profile is ready to review or publish.

## 5. Settings Requirements

The Settings step must allow admins to manage:

- Drop-in price.
- Verification status.
- Training availability flags, including Gi and No-Gi availability.
- Audience and positioning flags, including beginner friendly, competition focused, and featured academy.
- Claim invitation sending when the saved academy contact email is valid, usable, unclaimed, and outside reminder cooldown.

Public verified status is derived from the selected verification status.

## 6. Drop-In Pricing

The drop-in price field represents the public non-member drop-in fee unless the product explicitly labels a different audience.

Drop-in fees may be free for academy members. The UI and downstream copy must support this without treating a zero member fee as missing or invalid pricing.

Recommended data semantics:

- Store unset pricing separately from free pricing. `null` or an omitted value means price is unset; `0` means intentionally free.
- Store the pricing audience explicitly, for example `members_only` or `everyone`.
- If the product keeps one drop-in price field, the pricing audience is mandatory so external students do not inherit a member-only free price.
- If the product supports separate public and member pricing, store separate fields, for example `drop_in_price_minor` and `member_drop_in_price_minor`.

Requirements:

- The UI must allow a free member drop-in fee.
- The Settings step must include a pricing-audience control that makes clear who the entered drop-in price applies to.
- The pricing-audience control may be implemented as a checkbox, for example `Apply this drop-in price to everyone`.
- If the checkbox is unchecked, the price applies to internal academy students or members only.
- If the checkbox is checked, the price applies to everyone, including non-members and visiting drop-in students.
- If pricing is internal-students-only, internal students viewing academy rolls or class rolls must see the drop-in availability as free.
- External students and public visitors must not inherit the internal-students-only free price unless the academy explicitly applies the price to everyone.
- Any validation, review copy, or publishing checklist must distinguish between an intentionally free member fee and an unset price.
- If the same field is used for public drop-in price, `0` means the public drop-in is free and should be displayed as free, not blank.
- If member-specific pricing is represented separately, the member drop-in fee may be `0` while the public drop-in price remains paid.
- User-facing labels should make the audience clear, for example `Drop-in price` for public pricing and `Member drop-in price` for member-specific pricing.
- Review and roll UI copy should use explicit phrases such as `Free for academy members`, `Available to all visitors`, or `Price not set`.

## 7. Acceptance Criteria

- When an admin enters `0` for a member drop-in fee, the form accepts it as a valid free fee.
- When the admin leaves `Apply this drop-in price to everyone` unchecked, the review step shows the price as internal student/member pricing only.
- When the admin checks `Apply this drop-in price to everyone`, the review step shows the price as available to all drop-in visitors.
- When an internal academy student views rolls for an academy with internal-only drop-in pricing, the student-facing roll UI shows the drop-in as free.
- When an external student or public visitor views the same rolls, the UI does not show the internal-only free price as publicly available.
- When the review step displays a free drop-in fee, it uses clear copy such as `Free for academy members`.
- When pricing is unset, the UI displays an incomplete or missing-price state rather than showing `Free`.
- When a public drop-in price and member drop-in price differ, the UI preserves both values.
- When academy settings are saved, free member drop-in pricing is persisted and remains visible after reload.

## 8. Non-Goals

- Payment checkout implementation.
- Membership billing and entitlement rules.
- Provider fee calculation.
- Public marketplace ranking logic for featured academies.
