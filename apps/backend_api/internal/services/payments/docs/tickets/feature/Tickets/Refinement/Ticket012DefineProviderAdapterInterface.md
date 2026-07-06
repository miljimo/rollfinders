# 012 - Define Provider Adapter Interface

## Feature / Component

- Feature: Provider Integrations
- Component: Provider abstraction
- Priority: P0
- Suggested owner: Technical Architect
- Dependencies: Ticket009ImplementPaymentStateMachine, Ticket010ImplementRefundStateMachine

## Task

Define the provider adapter contract used by Stripe and PayPal without leaking provider DTOs into the domain layer.

## Implementation Notes

- Support create payment, capture/confirm, cancel, refund, parse webhook, and normalize provider errors.
- Keep provider-specific metadata at the adapter edge.
- Allow provider selection by configured provider name.

## Acceptance Criteria

- WHEN a provider adapter is registered, THEN it can be selected by provider name.
- IF an unknown provider is requested, THEN the service returns a typed unsupported-provider error.
- WHEN domain code calls providers, THEN it depends only on the adapter interface.
- IF provider-specific errors occur, THEN they are normalized into domain errors.
- WHEN provider responses include raw statuses, THEN canonical and raw provider statuses are both available to the service layer.

## Out Of Scope

Concrete Stripe and PayPal implementation details.
