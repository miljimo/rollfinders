# 025 - Implement Sensitive Data Redaction

## Feature / Component

- Feature: Security
- Component: Logging and diagnostics
- Priority: P0
- Suggested owner: Security-minded Backend Engineer
- Dependencies: Ticket024ImplementStructuredLoggingAndRequestIds

## Task

Redact secrets, signatures, authorization headers, provider credentials, card-like values, and client secrets from logs and errors.

## Implementation Notes

- Mask startup config output.
- Sanitize provider error details before exposing or logging.
- Add tests with known fake secrets.

## Acceptance Criteria

- WHEN request logs are emitted, THEN authorization and signature headers are not logged.
- IF provider errors include sensitive fields, THEN they are redacted before logging.
- WHEN configuration is logged at startup, THEN secrets are masked.
- IF a test injects known secret values, THEN logs do not contain the raw secret.
- WHEN API errors are returned, THEN raw provider payloads are not exposed.

## Out Of Scope

Full DLP tooling and external SIEM integration.
