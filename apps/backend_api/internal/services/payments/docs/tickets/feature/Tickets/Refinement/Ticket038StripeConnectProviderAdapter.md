# 038 - Implement Stripe Connect Provider Adapter

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Provider adapter
- Priority: P0
- Branch: `feature/payments-stripe-connect-adapter`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket014ImplementStripePaymentintentsAdapter, Ticket035PayeeAccountApiEndpoints, Ticket037PaymentAllocationCreateFlow
- Source PRD: `apps/backend_api/internal/services/payments/docs/prds/proposal.md`

## Task

Implement Stripe Connect support behind the Payment Service provider adapter boundary.

## Implementation Notes

- Create connected accounts for payees.
- Retrieve connected account state.
- Create onboarding/account update links.
- Refresh capability and requirement state.
- Create connected-account payments with RollFinders/platform application fees.
- Store provider account IDs, application fee IDs, transfer IDs, and provider raw statuses where returned.
- Do not leak Stripe-specific fields into generic API schemas except safe provider references.

## Acceptance Criteria

- WHEN a payee account is created with Stripe, THEN the provider account ID is stored.
- WHEN onboarding link is requested, THEN Stripe returns a usable hosted onboarding URL.
- WHEN a connected payee payment succeeds, THEN platform commission and payee settlement references are recorded.
- WHEN Stripe returns a provider error, THEN the API returns a normalized error.

## Regression / Compatibility Tests

- Tina SHALL add Stripe sandbox tests for connected account onboarding where sandbox support is available.
- Tina SHALL verify ordinary Stripe checkout/card payments still work without connected account fields.

## Out Of Scope

PayPal connected seller support.
