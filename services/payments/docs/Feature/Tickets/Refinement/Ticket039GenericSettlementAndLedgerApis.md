# 039 - Implement Generic Settlement And Ledger APIs

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Settlements, allocations, and reporting APIs
- Priority: P1
- Branch: `feature/payments-settlement-ledger-apis`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket036CommissionPolicyAndAllocationSchema, Ticket037PaymentAllocationCreateFlow
- Source PRD: `services/payments/docs/paymentService.md`

## Task

Implement read APIs for allocations, settlements, and revenue reports.

## Implementation Notes

- Implement `GET /v1/payments/{payment_id}/allocations`.
- Implement `GET /v1/allocations`.
- Implement `GET /v1/settlements`.
- Implement `GET /v1/settlements/{settlement_id}`.
- Implement `GET /v1/reports/revenue`.
- Implement `GET /v1/reports/refunds`.
- Implement `GET /v1/reports/settlements`.
- Implement `GET /v1/reports/platform-revenue`.
- Support filters by `client_id`, `resource_type`, `resource_id`, `payee_id`, `status`, `settlement_route`, and date range.

## Acceptance Criteria

- WHEN a client queries allocations for a payment, THEN gross amount, payee share, platform commission, provider fee, and settlement route are returned.
- WHEN a client queries payee settlements, THEN only matching payee/resource/client records are returned.
- WHEN a platform revenue report is requested, THEN platform commission totals are returned by period and currency.

## Regression / Compatibility Tests

- Tina SHALL test payment history APIs still return existing records.
- Tina SHALL test allocation and settlement filters do not leak another client or payee when scoped.

## Out Of Scope

Dashboard UI.
