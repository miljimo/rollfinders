# 015 - Implement PayPal Orders Adapter

## Feature / Component

- Feature: Provider Integrations
- Component: PayPal
- Priority: P0
- Suggested owner: Payments Engineer
- Dependencies: Ticket011ImplementIdempotencyLayer, Ticket012DefineProviderAdapterInterface

## Task

Implement PayPal Orders create, approval-action extraction, capture, status mapping, and safe error normalization.

## Implementation Notes

- Use PayPal direct Orders approval/capture flow.
- Do not use Braintree in v1.
- Persist PayPal order and capture IDs.

## Acceptance Criteria

- WHEN a PayPal payment is created, THEN a PayPal Order is created with amount and currency.
- WHEN PayPal returns approval links, THEN the adapter returns client action data.
- IF the buyer has not approved the order, THEN capture is not attempted.
- WHEN a PayPal order is captured, THEN the resulting capture ID and status are returned to the domain layer.
- IF PayPal returns an error, THEN the adapter returns a normalized provider error.

## Out Of Scope

PayPal subscriptions, payouts, disputes, Braintree card processing.
