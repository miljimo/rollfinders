# 027 - Implement Reconciliation Job

## Feature / Component

- Feature: Operations
- Component: Provider reconciliation
- Priority: P1
- Suggested owner: Payments Engineer
- Dependencies: Ticket014ImplementStripePaymentintentsAdapter, Ticket015ImplementPaypalOrdersAdapter, Ticket021ImplementWebhookIngestionEndpoint

## Task

Add a background reconciliation job for pending or uncertain Stripe and PayPal payment/refund states.

## Implementation Notes

- Poll only records that are pending, processing, requires action, or recently changed.
- Use provider retrieve APIs through adapters.
- Use state machines and row-level locks for updates.

## Acceptance Criteria

- WHEN a payment remains in a non-terminal provider-dependent state, THEN the reconciliation job can refresh it from the provider.
- IF provider state differs from local state, THEN the service updates local state through the state machine.
- WHEN reconciliation updates state, THEN status history and outbox events are created.
- IF provider lookup fails temporarily, THEN the job records retry metadata without corrupting state.
- WHEN multiple instances run reconciliation, THEN row-level locking prevents duplicate active work on the same payment.

## Out Of Scope

Accounting ledger reconciliation and settlement reporting.
