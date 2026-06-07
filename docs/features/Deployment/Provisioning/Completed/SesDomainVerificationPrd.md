# SES Domain Verification PRD

## Purpose

Verify the RollFinders sending domain in Amazon SES so the application can send transactional account emails from domain-based addresses without requiring a real mailbox for each sender address.

## Scope

- SES domain identity provisioning.
- Route 53 DNS verification records.
- DKIM, SPF, DMARC, and custom MAIL FROM records.
- Sender address behavior for `support@rollfinders.com` and `business@rollfinders.com`.
- Receiving mailbox DNS requirements for `support@rollfinders.com` and `business@rollfinders.com`.
- SES sandbox test recipient verification.
- SES production-access requirements for real user email delivery.
- Production readiness checks for email authentication and sandbox status.

## Requirements

### SES Domain Identity

#### SES-DOMAIN-001: Domain Identity

IF email provisioning runs for `rollfinders.com`, WHEN Terraform applies, THEN it SHALL create or reuse an SES domain identity for `rollfinders.com`.

#### SES-DOMAIN-002: DNS Verification Record

IF SES returns a domain verification token, WHEN Terraform applies, THEN it SHALL create the required Route 53 TXT record for SES domain verification.

#### SES-DOMAIN-003: Domain Verification Completion

IF Terraform creates the SES domain verification TXT record, WHEN AWS SES validates the DNS record, THEN the SES identity status SHALL become verified without requiring an email-address verification link.

### Email Authentication Records

#### SES-DOMAIN-004: DKIM Records

IF SES returns DKIM tokens for the sending domain, WHEN Terraform applies, THEN it SHALL create all required Route 53 DKIM CNAME records.

#### SES-DOMAIN-005: DKIM Signing Readiness

IF DKIM records have propagated, WHEN SES sends email from `rollfinders.com`, THEN outbound mail SHALL be DKIM-signable by SES for that domain.

#### SES-DOMAIN-006: Custom MAIL FROM

IF custom MAIL FROM is enabled, WHEN Terraform applies, THEN it SHALL create the SES MAIL FROM domain and required Route 53 MX and SPF records.

#### SES-DOMAIN-007: Custom MAIL FROM Readiness

IF custom MAIL FROM is enabled, WHEN the required MX or SPF records are missing or invalid, THEN the domain SHALL NOT be treated as production-ready for email sending.

#### SES-DOMAIN-008: DMARC Record

IF email provisioning configures DMARC, WHEN Terraform applies, THEN it SHALL create a Route 53 DMARC TXT record for the sending domain.

#### SES-DOMAIN-009: DMARC Rollout Policy

IF DMARC is first enabled for production email, WHEN production rollout begins, THEN the policy MAY start at `p=none` for monitoring before moving to stricter enforcement.

#### SES-DOMAIN-010: DMARC Authentication Alignment

IF email is sent through SES from `rollfinders.com`, WHEN DMARC is evaluated, THEN at least one aligned authentication mechanism SHALL pass through DKIM or SPF.

### Sender And Reply Behavior

#### SES-DOMAIN-011: Sender Addresses

IF the domain identity is verified, WHEN the application sends email, THEN it SHALL be allowed to send from addresses under that domain, including `support@rollfinders.com` and `business@rollfinders.com`, without verifying each mailbox address in SES.

#### SES-DOMAIN-012: Account Email Sender

IF the application sends password reset, onboarding, account, or operational email, WHEN the email payload is created, THEN the sender SHALL be `support@rollfinders.com`.

#### SES-DOMAIN-013: Account Email Reply-To

IF the application sends password reset, onboarding, account, or operational email, WHEN the email payload is created, THEN the reply-to address SHALL be `support@rollfinders.com`.

#### SES-DOMAIN-014: Business Email Address

IF RollFinders sends partnership, sales, or commercial workflow email, WHEN the message payload is created, THEN the sender and reply-to address SHOULD be `business@rollfinders.com`.

#### SES-DOMAIN-015: Configured Mailboxes

IF `support@rollfinders.com` or `business@rollfinders.com` is used in public pages, application email headers, or admin diagnostics, WHEN production readiness is reviewed, THEN both addresses SHALL exist as PrivateEmail mailboxes or forwarding targets.

#### SES-DOMAIN-016: Outbound-Only Sender Safety

IF an address is used only for outbound sending and does not have a mailbox, WHEN email headers are configured, THEN that address SHALL NOT be used as a reply-to address or advertised as a contact address.

### Receiving Mailbox DNS

#### SES-DOMAIN-017: Mailbox Provider Records

IF RollFinders must receive email at `support@rollfinders.com` and `business@rollfinders.com`, WHEN PrivateEmail is selected as the mailbox provider, THEN the provider's required DNS records SHALL be configured in Route 53 for `rollfinders.com`.

#### SES-DOMAIN-018: PrivateEmail MX Records

IF PrivateEmail is selected as the receiving mailbox provider, WHEN Route 53 records are configured, THEN `rollfinders.com` SHALL include MX records `10 mx1.privateemail.com` and `10 mx2.privateemail.com`.

#### SES-DOMAIN-019: PrivateEmail SPF Include

IF PrivateEmail is selected as the receiving mailbox provider, WHEN SPF is configured for `rollfinders.com`, THEN the SPF policy SHALL include `include:spf.privateemail.com`.

#### SES-DOMAIN-020: Combined SPF Record

IF both SES and PrivateEmail can send mail for `rollfinders.com`, WHEN SPF is configured, THEN Route 53 SHALL publish one combined SPF TXT record for `rollfinders.com` that includes both `include:amazonses.com` and `include:spf.privateemail.com`.

#### SES-DOMAIN-021: No Duplicate SPF Records

IF an SPF TXT record already exists for `rollfinders.com`, WHEN mailbox provider DNS is added, THEN Terraform SHALL update the existing SPF policy instead of creating a second SPF TXT record for the same name.

#### SES-DOMAIN-022: PrivateEmail DKIM Record

IF PrivateEmail provides DKIM for mailbox sending, WHEN Route 53 records are configured, THEN Terraform SHALL create the provider-supplied TXT record at `privateemail._domainkey.rollfinders.com`.

#### SES-DOMAIN-023: DKIM Public Key Handling

IF a PrivateEmail DKIM public key is configured, WHEN infrastructure secrets are reviewed, THEN the DKIM public key SHALL be treated as public DNS configuration and SHALL NOT require KMS encryption.

#### SES-DOMAIN-024: Credential Secret Handling

IF mailbox passwords, SMTP credentials, SES SMTP credentials, API keys, provider tokens, or app secrets are configured, WHEN infrastructure or admin diagnostics handle those values, THEN they SHALL be stored and exposed only through approved secret mechanisms.

#### SES-DOMAIN-025: Non-Secret Provisioning Data

IF DNS record names, DNS record values, mailbox addresses, SES identity ARNs, hosted zone IDs, sender addresses, reply-to addresses, or verification statuses are displayed in outputs or admin diagnostics, WHEN those values are returned, THEN they MAY be exposed because they are not secret credentials.

### Sandbox Testing

#### SES-DOMAIN-026: Sandbox Limitation

IF SES remains in sandbox mode, WHEN the application sends email to a user, THEN the recipient email address must still be verified in SES or the send will fail.

#### SES-DOMAIN-027: Sandbox Test Recipient

IF SES remains in sandbox mode, WHEN email delivery is tested, THEN the configured non-public test recipient SHALL be registered and verified in SES before test email is sent.

#### SES-DOMAIN-028: Sandbox Test Email

IF the SES domain identity and sandbox test recipient are both verified, WHEN the deployment operator sends a test email, THEN SES SHALL accept a test message from `support@rollfinders.com` to the configured non-public test recipient.

#### SES-DOMAIN-029: Sandbox Test Subject

IF a sandbox test email is sent to the configured non-public test recipient, WHEN the message is created, THEN the subject SHALL include `rollfinders.com`.

### Production Access

#### SES-DOMAIN-030: Production Access

IF RollFinders must send password reset or onboarding emails to normal users, WHEN production readiness is reviewed, THEN SES production access SHALL be approved in the target AWS region.

#### SES-DOMAIN-031: Production Recipient Behavior

IF SES production access is approved, WHEN the application sends password reset or onboarding email to a valid user email address, THEN the recipient SHALL NOT need to be individually verified in SES.

#### SES-DOMAIN-031A: Sandbox Failure Classification

IF SES rejects a send because the account is in sandbox mode, the recipient identity is not verified, or the selected SES region lacks production access, WHEN the reliable email system records the result, THEN the failure SHALL be treated as provider readiness failure and SHALL NOT mark the recipient email address invalid.

#### SES-DOMAIN-031B: Provider Readiness Region Match

IF production email readiness is reviewed, WHEN the application uses `EMAIL_REGION`, THEN SES production access, sending quota, sender identity verification, DKIM, custom MAIL FROM, SPF, and DMARC SHALL be verified in that exact AWS account and region.

#### SES-DOMAIN-032: Mailbox Receipt Test

IF `support@rollfinders.com` or `business@rollfinders.com` is configured for production, WHEN release readiness is reviewed, THEN both mailboxes SHALL be tested for inbound receipt.

#### SES-DOMAIN-033: Production Readiness Check

IF production email sending is enabled, WHEN release readiness is reviewed, THEN domain identity, SES DKIM, PrivateEmail DKIM, SPF, DMARC, custom MAIL FROM when enabled, PrivateEmail MX records, sandbox status, SES production access, and mailbox receipt for `support@rollfinders.com` and `business@rollfinders.com` SHALL be verified in the target AWS region.

## Acceptance Criteria

- Terraform provisions the SES domain identity and DNS records through Route 53.
- SES domain verification can complete without clicking an email verification link.
- DKIM, SPF, DMARC, and MAIL FROM records are provisioned and documented as part of the requirement.
- `support@rollfinders.com` is used for account, password reset, onboarding, and operational email.
- `business@rollfinders.com` is available for business, sales, partnership, and commercial email.
- Receiving replies at `support@rollfinders.com` and `business@rollfinders.com` requires PrivateEmail mailbox records for `rollfinders.com`.
- SPF is managed as one combined TXT record for `rollfinders.com` when SES and a mailbox provider both send email.
- PrivateEmail DKIM is represented as provider-supplied public DNS configuration.
- DNS records and mailbox addresses are not treated as secrets; credentials and provider tokens are treated as secrets.
- Sandbox test sends use a configured non-public verified recipient address.
- Sandbox test email subjects include `rollfinders.com`.
- The PRD clearly states that SES production access is required to send to unverified user recipients.
- After SES production access is approved, password reset and onboarding emails can be sent to normal user email addresses without verifying every recipient.
- SES sandbox, missing production access, and unverified recipient identity failures are treated as provider readiness failures, not invalid recipient addresses.
- Production readiness includes domain identity, SES DKIM, PrivateEmail DKIM, SPF, DMARC, custom MAIL FROM when enabled, PrivateEmail MX records, sandbox status, SES production access, and mailbox receipt checks.
