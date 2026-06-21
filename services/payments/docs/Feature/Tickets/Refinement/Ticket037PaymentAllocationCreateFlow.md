# 037 - Extend Payment Creation With Generic Allocations

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: POST /v1/payments and POST /v1/checkouts
- Priority: P0
- Branch: `feature/payments-create-with-allocations`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket016ImplementCreatePaymentEndpoint, Ticket036CommissionPolicyAndAllocationSchema
- Source PRD: `services/payments/docs/paymentService.md`

## Task

Extend payment and checkout creation so clients can submit generic resource/payee metadata, settlement route, commission policy, and allocation intent.

## Implementation Notes

- Accept `client_id`, `resource_type`, `resource_id`, `resource_label`, `settlement_route`, `payee_id`, `commission_policy_id`, and explicit allocation lines.
- Preserve existing request compatibility for clients that do not send allocation fields.
- Support platform settlement and connected payee settlement.
- Store normalized payment allocation records before or during provider payment creation.
- Reject connected payee settlement when the payee account is missing or not enabled.

## Acceptance Criteria

- WHEN an existing checkout request omits allocation fields, THEN the payment still works as it does today.
- WHEN a connected payee settlement request is valid, THEN payment, allocation, payee account reference, and platform commission are recorded.
- WHEN a connected payee account is not enabled, THEN the API returns `payee_account_not_enabled`.
- WHEN payment creation fails at the provider, THEN partial local records are handled consistently and safely.

## Regression / Compatibility Tests

- Tina SHALL rerun existing Stripe sandbox checkout e2e.
- Tina SHALL test old RollFinders course/event checkout payloads.
- Tina SHALL test connected-payee create payment with a deterministic fake provider or Stripe sandbox where available.

## Out Of Scope

RollFinders UI changes.
