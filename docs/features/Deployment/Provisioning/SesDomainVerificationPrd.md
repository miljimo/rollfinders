# SES Domain Verification PRD

## Purpose

Verify the RollFinders sending domain in Amazon SES so the application can send transactional account emails from domain-based addresses without requiring a real mailbox for each sender address.

## Scope

- SES domain identity provisioning.
- Route 53 DNS verification records.
- DKIM, SPF, DMARC, and custom MAIL FROM records.
- Sender address behavior for `no-reply@rollfinders.com` and `support@rollfinders.com`.
- SES sandbox and production-access requirements.

## Requirements

### Domain Identity

IF email provisioning runs for `rollfinders.com`, WHEN Terraform applies, THEN it SHALL create or reuse an SES domain identity for `rollfinders.com`.

### DNS Verification

IF SES returns a domain verification token, WHEN Terraform applies, THEN it SHALL create the required Route 53 TXT record for SES domain verification.

### DKIM Records

IF SES returns DKIM tokens for the sending domain, WHEN Terraform applies, THEN it SHALL create all required Route 53 DKIM CNAME records.

### Custom MAIL FROM

IF custom MAIL FROM is enabled, WHEN Terraform applies, THEN it SHALL create the SES MAIL FROM domain and required Route 53 MX and SPF records.

### DMARC Record

IF email provisioning configures DMARC, WHEN Terraform applies, THEN it SHALL create a Route 53 DMARC TXT record for the sending domain.

### Sender Addresses

IF the domain identity is verified, WHEN the application sends email, THEN it SHALL be allowed to send from addresses under that domain, including `no-reply@rollfinders.com` and `support@rollfinders.com`, without verifying each mailbox address.

### Mailbox Requirement

IF a sender address is used only for outbound sending, WHEN the domain is verified, THEN a real inbox SHALL NOT be required for that sender address.

### Reply Handling

IF `support@rollfinders.com` is used as the reply-to address, WHEN users reply to transactional emails, THEN the product owner SHALL provide a mailbox or forwarding rule if replies need to be received.

### Sandbox Limitation

IF SES remains in sandbox mode, WHEN the application sends email to a user, THEN the recipient email address must still be verified in SES or the send will fail.

### Production Access

IF RollFinders must send password reset or onboarding emails to normal users, WHEN production readiness is reviewed, THEN SES production access SHALL be approved in the target AWS region.

## Acceptance Criteria

- Terraform provisions the SES domain identity and DNS records through Route 53.
- SES domain verification can complete without clicking an email verification link.
- DKIM, SPF, DMARC, and MAIL FROM records are documented as part of the provisioning requirement.
- `no-reply@rollfinders.com` can be used as the default sender after domain verification.
- `support@rollfinders.com` can be used as reply-to after domain verification, with mailbox setup treated as a receiving-email concern.
- The PRD clearly states that SES production access is required to send to unverified user recipients.

