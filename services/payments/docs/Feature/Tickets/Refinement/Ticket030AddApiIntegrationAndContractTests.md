# 030 - Add API Integration And Contract Tests

## Feature / Component

- Feature: Quality
- Component: API tests
- Priority: P1
- Suggested owner: QA-minded Backend Engineer
- Dependencies: Ticket016ImplementCreatePaymentEndpoint, Ticket017ImplementGetPaymentEndpoint, Ticket019ImplementRefundEndpoint, Ticket021ImplementWebhookIngestionEndpoint

## Task

Add integration tests against PostgreSQL and mocked provider adapters, including OpenAPI response validation.

## Implementation Notes

- Cover success, validation failure, provider failure, idempotent retry, and duplicate webhook paths.
- Validate successful and error responses against OpenAPI.

## Acceptance Criteria

- WHEN payment create tests run, THEN success, validation failure, provider failure, and idempotent retry are covered.
- WHEN refund tests run, THEN full refund, partial refund, over-refund, and idempotent retry are covered.
- WHEN webhook tests run, THEN valid, invalid signature, duplicate event, and state update cases are covered.
- IF implementation responses drift from OpenAPI, THEN contract tests fail.
- WHEN tests complete, THEN database state is isolated per test or cleaned reliably.

## Out Of Scope

Full live provider E2E suite, load testing, chaos testing.
