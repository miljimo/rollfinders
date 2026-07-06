# 005 - Email Provider Abstraction

## Feature / Component

- Feature: Notification Service
- Component: Provider interface and SMTP implementation
- Priority: P0
- Status: Implemented
- Branch: `feature/notification-email-provider`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket002NotificationApiContract
- Source PRD: `apps/backend_api/internal/services/notification/docs/product.md`

## Task

Create the provider abstraction and implement SMTP email delivery for v1.

## Implementation Notes

- Define a `NotificationProvider` interface with a send function that returns provider name, provider message ID where available, response metadata, and retryability.
- Implement an SMTP provider using configuration for host, port, username, password, TLS mode, default sender, and timeout.
- Support HTML and text email bodies.
- Use `contentText` with `isContentHtml` to choose the outgoing Email MIME content type.
- Support `to`, `cc`, and `bcc` recipients.
- Support attachment references by resolving `storageUrl` only through approved storage clients; do not accept raw file content in v1 unless explicitly required by the API contract.
- Classify provider failures as retryable or permanent.
- Keep provider selection configurable but default to SMTP.
- Avoid leaking secrets in logs, provider responses, or error envelopes.

## Acceptance Criteria

- WHEN SMTP configuration is valid, THEN the provider can send a test email through a fake/local SMTP server.
- WHEN a provider returns a temporary failure, THEN the result is marked retryable.
- WHEN a provider returns an invalid recipient or message format failure, THEN the result is marked permanent.
- WHEN attachments are present, THEN supported attachment references are included in the outgoing email.
- WHEN provider errors are logged, THEN credentials and recipient BCC data are not exposed.

## Regression / Compatibility Tests

- Tina SHALL add provider tests using a fake SMTP server for success, retryable failure, permanent failure, recipients, HTML/text bodies, and attachments.

## Current State

Implemented. SMTP provider, fake sender tests, retryable/permanent classification, cc/bcc handling, and attachment reference handling through a storage interface exist. A concrete production storage client for attachment retrieval is still not wired.

## Out Of Scope

AWS SES, SendGrid, Mailgun, Postmark, and provider failover.
