# 021 - Implement Webhook Ingestion Endpoint

## Feature / Component

- Feature: Webhooks
- Component: POST /v1/webhooks/{provider}
- Priority: P0
- Suggested owner: Payments Engineer
- Dependencies: Ticket014ImplementStripePaymentintentsAdapter, Ticket015ImplementPaypalOrdersAdapter, Ticket019ImplementRefundEndpoint

## Task

Receive, verify, persist, deduplicate, and process Stripe and PayPal webhook events.

## Implementation Notes

- Verify provider signatures before trusting payloads.
- Persist raw provider payloads for audit according to retention policy.
- Use row-level locking and state machines for updates.

## Acceptance Criteria

- WHEN a valid Stripe webhook arrives, THEN it is verified, stored, and processed.
- WHEN a valid PayPal webhook arrives, THEN it is verified, stored, and processed.
- IF signature verification fails, THEN the API returns `400` or `401` and no state changes occur.
- IF the same provider event arrives twice, THEN it is not processed twice.
- WHEN an event changes payment or refund state, THEN the state machine and status history are used.

## Out Of Scope

User-configured outbound merchant webhooks and webhook replay UI.
