# PRD: SMTP Fallback Email Delivery

## Status

Reviewing.

## Purpose

Allow RollFinders to temporarily send transactional emails through a mailbox SMTP server while SES production access approval is pending.

SES remains the preferred long-term provider. SMTP fallback exists to unblock password reset, academy claim invitation, academy invitation, and onboarding email delivery during the SES approval window.

## Requirements

### SMTP-FALLBACK-001: Provider Switch

IF SES production access is not yet approved

WHEN the operator sets `EMAIL_DELIVERY_PROVIDER=smtp`

THEN outbound email delivery SHALL use the configured SMTP server instead of AWS SES.

AND if `EMAIL_DELIVERY_PROVIDER` is absent or set to `ses`, SES SHALL remain the default delivery provider.

### SMTP-FALLBACK-002: SMTP Configuration

IF SMTP fallback is enabled

WHEN the ECS task starts

THEN it SHALL receive SMTP configuration from environment variables and secrets:

* `SMTP_HOST`
* `SMTP_PORT`
* `SMTP_USERNAME`
* `SMTP_PASSWORD`
* `EMAIL_FROM`
* `EMAIL_REPLY_TO`

AND SMTP credentials SHALL be stored in AWS Secrets Manager through Terraform variables or an equivalent secret injection mechanism.

AND `SMTP_HOST` SHALL be configurable independently from the SES SMTP alias so fallback can use the mailbox provider's SMTP server while SES remains in sandbox mode.

### SMTP-FALLBACK-003: Missing Credentials

IF SMTP fallback is enabled without `SMTP_USERNAME` or `SMTP_PASSWORD`

WHEN an email send is attempted

THEN the send SHALL fail as a provider readiness failure.

AND the recipient email SHALL NOT be marked invalid.

### SMTP-FALLBACK-004: Admin UI Safety

IF the admin views email operations

WHEN SMTP fallback or SES is active

THEN the UI SHALL NOT expose provider names, usernames, passwords, SMTP hosts, or stack traces.

### SMTP-FALLBACK-005: Return To SES

IF SES production access becomes approved

WHEN the operator sets `EMAIL_DELIVERY_PROVIDER=ses`

THEN the application SHALL return to SES delivery without code changes.

## Done When

* SMTP fallback can be enabled through ECS environment/secrets.
* SES remains the default provider.
* SMTP credentials are not hard-coded in source control.
* Missing SMTP credentials do not mark valid recipients invalid.
* Existing email queue, retry, and admin operations behavior is preserved.
