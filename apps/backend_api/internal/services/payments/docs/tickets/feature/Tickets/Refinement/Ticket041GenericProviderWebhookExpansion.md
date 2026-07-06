# 041 - Expand Provider Webhooks For Generic Allocation Events

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Provider webhook ingestion
- Priority: P0
- Branch: `feature/payments-generic-webhooks`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket021ImplementWebhookIngestionEndpoint, Ticket038StripeConnectProviderAdapter, Ticket040RefundAllocationAwareness
- Source PRD: `apps/backend_api/internal/services/payments/docs/prds/proposal.md`

## Task

Expand webhook ingestion so provider events update payments, refunds, payee accounts, allocations, settlements, transfers, disputes, and outbox events.

## Implementation Notes

- Continue verifying provider signatures.
- Continue deduplicating by provider event ID.
- Support payment succeeded, payment failed, refund created/updated/completed, dispute events, account updated, capability updated, transfer created/reversed, payout created/paid/failed.
- Map provider events to generic payment, payee account, allocation, and settlement records.
- Emit outbox events after durable state changes.

## Acceptance Criteria

- WHEN a duplicate provider webhook arrives, THEN no duplicate state transition or allocation reversal occurs.
- WHEN a payee account update arrives, THEN payee account status is refreshed.
- WHEN a refund webhook arrives, THEN allocation reversal logic runs.
- WHEN a payout/transfer webhook arrives, THEN settlement status is updated.

## Regression / Compatibility Tests

- Tina SHALL rerun existing webhook tests.
- Tina SHALL add duplicate and out-of-order webhook tests for refund and connected-account events.

## Out Of Scope

Webhook UI or manual replay console.
