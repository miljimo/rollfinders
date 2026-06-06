# PRD: Academy Claim Invitation HTML Template

Version: 1.0

Priority: High

Review date: 2026-06-06

---

# Objective

Define a reusable HTML email template for academy claim invitations and document the requirement to store the rendered template asset in S3 under `rollfinders/mails/invitations`.

This PRD is documentation only. It does not implement S3 upload, template rendering, or email sending.

---

# Product Context

When RollFinders adds an academy listing, the platform should be able to invite the academy owner or authorized staff to claim the listing. The email needs to look trustworthy, be easy to scan, and explain that claiming is free and reviewed before access is granted.

The template should help product review the exact email structure before development wires it into the reliable email system.

---

# S3 Template Location

Required storage target:

`s3://rollfinders/mails/invitations/academy-claim-invitation.html`

Repository requirement/mockup:

`docs/features/Communications/Email/AcademyClaimEmails/Templates/academy-claim-invitation.html`

---

# Template Variables

The HTML template must support these placeholders:

* `{{academyName}}`
* `{{academyProfileUrl}}`
* `{{claimInvitationUrl}}`
* `{{recipientEmail}}`
* `{{supportEmail}}`
* `{{currentYear}}`

Default product values:

* `{{supportEmail}}`: `support@rollfinders.com`
* Sender: `support@rollfinders.com`
* Reply-to: `support@rollfinders.com`

---

# Email Content Requirements

Subject:

`Claim your academy listing on RollFinders`

Preheader:

`Review your listing, claim it for free, and keep your training details accurate.`

Required sections:

* RollFinders header.
* Clear opening line naming the academy.
* Explanation that RollFinders added the academy listing to help practitioners find places to train.
* Primary claim button.
* Secondary public profile link.
* Benefits of claiming:
  * update academy details
  * manage open mats
  * keep contact and location information accurate
* Review reassurance: claim submissions are reviewed before management access is granted.
* Support footer using `support@rollfinders.com`.

---

# IF/WHEN/THEN Requirements

## ACADEMY-CLAIM-HTML-001: Template Asset

IF the academy claim invitation email template is defined

WHEN product reviews the requirement

THEN a readable HTML requirement/mockup SHALL exist in the repository.

## ACADEMY-CLAIM-HTML-002: S3 Storage Path

IF the HTML template is promoted for server-side use

WHEN the template asset is uploaded

THEN it SHALL be stored at `s3://rollfinders/mails/invitations/academy-claim-invitation.html`.

## ACADEMY-CLAIM-HTML-003: Server-Side Rendering

IF the application sends an academy claim invitation email

WHEN the email payload is generated

THEN the server SHALL render the HTML template with the academy and invitation placeholders.

## ACADEMY-CLAIM-HTML-004: Required Placeholders

IF the HTML template is rendered

WHEN any required placeholder is missing

THEN the system SHALL fail email generation and record a clear operational error instead of sending incomplete content.

## ACADEMY-CLAIM-HTML-005: Claim Call To Action

IF the recipient opens the email

WHEN the email renders

THEN the primary visible action SHALL link to `{{claimInvitationUrl}}`.

## ACADEMY-CLAIM-HTML-006: Public Profile Link

IF the email includes the academy listing context

WHEN the email renders

THEN it SHALL include a secondary link to `{{academyProfileUrl}}`.

## ACADEMY-CLAIM-HTML-007: Mobile Email Layout

IF the email is viewed on a mobile device

WHEN the HTML renders in common email clients

THEN the layout SHALL remain readable with a single-column structure and a tappable claim button.

## ACADEMY-CLAIM-HTML-008: Safe Email HTML

IF the template is implemented

WHEN the HTML is prepared for email clients

THEN it SHALL use email-safe markup, inline-friendly styles, no JavaScript, and no external scripts.

## ACADEMY-CLAIM-HTML-009: Product Tone

IF product reviews the template

WHEN the email copy is evaluated

THEN it SHALL be direct, professional, free-claiming focused, and avoid implying that the academy has already approved or partnered with RollFinders.

---

# Acceptance Criteria

* HTML requirement/mockup exists in the repository.
* S3 storage path is documented as `s3://rollfinders/mails/invitations/academy-claim-invitation.html`.
* Template includes academy name, claim button, public profile link, benefits, review reassurance, and support footer.
* Template uses only `support@rollfinders.com` for support contact.
* Template is mobile-first and email-client safe.
* Implementation remains out of scope until a development task is approved.
