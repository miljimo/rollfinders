# 040 - Implement Refund Allocation Awareness

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Refunds and allocation reversals
- Priority: P0
- Branch: `feature/payments-refund-allocation-awareness`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket019ImplementRefundEndpoint, Ticket020ImplementListRefundsEndpoint, Ticket036CommissionPolicyAndAllocationSchema
- Source PRD: `services/payments/docs/paymentService.md`

## Task

Ensure the Payment Service knows when any refund occurs for a payment and reverses allocations correctly.

## Implementation Notes

- Handle refunds created through the Payment Service API.
- Handle refunds created directly in provider dashboards through webhook events.
- Associate provider refunds with original payment, resource, payee allocations, platform commission, and settlement route.
- Reverse payee allocations proportionally for partial refunds.
- Reverse remaining payee allocations for full refunds.
- Record recovery ledger entries when a payee has already been settled.
- Update payment status to `partially_refunded` or `refunded`.

## Acceptance Criteria

- WHEN a full refund completes, THEN original allocation balances are reversed and payment status becomes `refunded`.
- WHEN a partial refund completes, THEN only the refunded portion of each affected allocation is reversed and payment status becomes `partially_refunded`.
- WHEN a provider webhook reports a refund created outside the Payment Service, THEN the service records it and reverses allocations.
- WHEN a settled payee payment is refunded, THEN recovery/negative-balance entries are visible in settlement reporting.

## Regression / Compatibility Tests

- Tina SHALL run existing refund endpoint tests.
- Tina SHALL add webhook-driven refund tests.
- Tina SHALL verify RollFinders payment history shows refunded and partially refunded statuses correctly.

## Out Of Scope

Manual accounting adjustments unrelated to refunds.
