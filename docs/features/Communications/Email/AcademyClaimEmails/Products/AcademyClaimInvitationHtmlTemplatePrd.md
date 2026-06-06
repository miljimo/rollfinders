# PRD: Academy Claim Invitation HTML Template

Version: 1.0

Priority: High

Review date: 2026-06-06

---

# Objective

Define a reusable HTML email template for academy claim invitations and document the requirement to keep the deployable template under source control, then upload it automatically to S3 during deployment.

This PRD is documentation only. It does not implement S3 upload, template rendering, or email sending.

---

# Product Context

When RollFinders adds an academy listing, the platform should be able to invite the academy owner or authorized staff to claim the listing. The email needs to look trustworthy, be easy to scan, and explain that claiming is free and reviewed before access is granted.

The template should help product review the exact email structure before development wires it into the reliable email system.

---

# Ticket 1: Source-Controlled Template Deployment

This is the first development ticket for the academy claim invitation template because deployment traceability is required before the template can become operational email behavior.

## Requirement Summary

The deployable HTML template SHALL be stored in the application source tree, reviewed through normal pull requests, and uploaded automatically to S3 as part of production deployment.

## Canonical Source Location

The canonical deployable template SHALL live outside `docs/` because it is runtime product behavior, not only documentation.

Required source path:

`src/lib/email/templates/academy-claim-invitation/AcademyClaimInvitation.html`

The current PRD mockup MAY remain in `docs/features/Communications/Email/AcademyClaimEmails/Templates/AcademyClaimInvitation.html` as product documentation until implementation moves the deployable template into the canonical source path.

## S3 Deployment Target

Required bucket:

`rollfinders`

Required current object key:

`mails/invitations/academy-claim-invitation.html`

Required current object URI:

`s3://rollfinders/mails/invitations/academy-claim-invitation.html`

Optional immutable version object:

`s3://rollfinders/mails/invitations/academy-claim-invitation.v1.html`

## Deployment Requirements

IF the production deployment runs

WHEN the academy claim invitation template exists in the canonical source path

THEN the deployment pipeline SHALL upload it to `s3://rollfinders/mails/invitations/academy-claim-invitation.html` before the deployment is marked successful.

IF the template source file is missing, empty, invalid, or fails upload

WHEN the deployment pipeline validates template artifacts

THEN the deployment SHALL fail and SHALL NOT report the release as successfully deployed.

IF the template is uploaded to S3

WHEN the upload completes

THEN the object SHALL use `Content-Type: text/html; charset=utf-8`.

IF the template is uploaded to S3

WHEN deployment metadata is written

THEN the upload SHALL record the template name, git commit SHA, build ID, content SHA-256 checksum, and S3 object version ID in deployment logs or object metadata.

IF S3 versioning is available for the deployment bucket

WHEN the template object is updated

THEN previous template versions SHALL remain recoverable for rollback.

## Validation Requirements

Before upload, CI/CD SHALL validate that:

* The canonical HTML file exists.
* The file is not empty.
* Required placeholders are present.
* No local, staging-only, or development URLs are present in production artifacts.
* The file is email-client safe enough for the agreed template rules.
* The file size remains within email-safe limits.

After upload, CI/CD SHALL fetch the uploaded object and compare its SHA-256 checksum with the source file checksum.

## Review Requirements

Template changes SHALL be reviewed as product-facing UI copy and deployment behavior:

* Frontend review for mobile-first rendering, email-safe markup, and visual quality.
* Product review for copy, CTA wording, support wording, and claim-flow accuracy.
* Backend or platform review when placeholders, S3 paths, deployment upload behavior, or runtime rendering contracts change.

Pull requests changing the template SHOULD include a rendered preview or before-and-after screenshot for product review.

---

# Template Locations

Required storage target:

`s3://rollfinders/mails/invitations/academy-claim-invitation.html`

Repository requirement/mockup:

`docs/features/Communications/Email/AcademyClaimEmails/Templates/academy-claim-invitation.html`

Future deployable source:

`src/lib/email/templates/academy-claim-invitation/v1/academy-claim-invitation.html`

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

WHEN the template is prepared for development

THEN the deployable source SHALL live at `src/lib/email/templates/academy-claim-invitation/v1/academy-claim-invitation.html` and be tracked through git.

## ACADEMY-CLAIM-HTML-002: Documentation Mockup

IF product reviews the requirement

WHEN implementation has not yet moved the deployable source into the application tree

THEN a readable HTML requirement/mockup MAY exist at `docs/features/Communications/Email/AcademyClaimEmails/Templates/academy-claim-invitation.html`.

## ACADEMY-CLAIM-HTML-003: Automatic S3 Upload

IF the production deployment runs

WHEN the academy claim invitation template is included in the release

THEN deployment SHALL upload the reviewed source-controlled HTML file to `s3://rollfinders/mails/invitations/academy-claim-invitation.html`.

## ACADEMY-CLAIM-HTML-004: Deployment Traceability

IF the template is uploaded during deployment

WHEN the upload completes

THEN the deployment SHALL record the git SHA, build ID, SHA-256 checksum, and S3 object version ID so template changes can be audited and rolled back.

## ACADEMY-CLAIM-HTML-005: Deployment Failure On Template Error

IF the canonical template is missing, empty, invalid, or fails S3 upload

WHEN production deployment validates email template artifacts

THEN the deployment SHALL fail before release completion.

## ACADEMY-CLAIM-HTML-006: Server-Side Rendering

IF the application sends an academy claim invitation email

WHEN the email payload is generated

THEN the server SHALL render the HTML template with the academy and invitation placeholders.

## ACADEMY-CLAIM-HTML-007: Required Placeholders

IF the HTML template is rendered

WHEN any required placeholder is missing

THEN the system SHALL fail email generation and record a clear operational error instead of sending incomplete content.

## ACADEMY-CLAIM-HTML-008: Claim Call To Action

IF the recipient opens the email

WHEN the email renders

THEN the primary visible action SHALL link to `{{claimInvitationUrl}}`.

## ACADEMY-CLAIM-HTML-009: Public Profile Link

IF the email includes the academy listing context

WHEN the email renders

THEN it SHALL include a secondary link to `{{academyProfileUrl}}`.

## ACADEMY-CLAIM-HTML-010: Mobile Email Layout

IF the email is viewed on a mobile device

WHEN the HTML renders in common email clients

THEN the layout SHALL remain readable with a single-column structure and a tappable claim button.

## ACADEMY-CLAIM-HTML-011: Safe Email HTML

IF the template is implemented

WHEN the HTML is prepared for email clients

THEN it SHALL use email-safe markup, table-friendly structure, inline-friendly styles, no JavaScript, no external scripts, no external stylesheets, and no web-font dependency.

## ACADEMY-CLAIM-HTML-012: Product Tone

IF product reviews the template

WHEN the email copy is evaluated

THEN it SHALL be direct, professional, free-claiming focused, and avoid implying that the academy has already approved or partnered with RollFinders.

---

# Acceptance Criteria

* HTML requirement/mockup exists in the repository.
* First implementation ticket defines canonical source path, S3 upload target, deployment validation, and traceability requirements.
* S3 storage path is documented as `s3://rollfinders/mails/invitations/academy-claim-invitation.html`.
* Deployment requirement states that the template upload is automatic and fails deployment when validation or upload fails.
* Deployment metadata requirement includes git SHA, build ID, checksum, and S3 object version ID.
* Template includes academy name, claim button, public profile link, benefits, review reassurance, and support footer.
* Template uses only `support@rollfinders.com` for support contact.
* Template is mobile-first and email-client safe.
* Implementation remains out of scope until a development task is approved.
