# 039 - Implement Generic Payment Fact Reporting APIs

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Payment fact, allocation intent, and reporting APIs
- Priority: P1
- Branch: `feature/payments-fact-reporting-apis`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket036CommissionPolicyAndAllocationSchema, Ticket037PaymentAllocationCreateFlow
- Source PRD: `docs/services/payments/proposal.md`

## Task

Implement read APIs for payment allocation intent, provider settlement facts, and payment revenue reports.

Payment Service must not expose canonical wallet ledger APIs. Wallet Service owns financial ledger entries, balances, reservations, and payout availability.

## Implementation Notes

- Implement `GET /v1/payments/{payment_id}/allocations`.
- Implement `GET /v1/allocations`.
- Implement provider settlement fact reads only when they reflect provider/payment records, not wallet balances.
- Implement `GET /v1/reports/revenue`.
- Implement `GET /v1/reports/refunds`.
- Implement `GET /v1/reports/platform-revenue`.
- Support filters by `client_id`, `resource_type`, `resource_id`, `payee_id`, `status`, `settlement_route`, and date range.
- Direct callers that need spendable balance, reserved balance, payout availability, or ledger entries to Wallet Service.

## Acceptance Criteria

- WHEN a client queries allocations for a payment, THEN gross amount, payee share, platform commission, provider fee, and settlement route are returned.
- WHEN a client queries provider settlement facts, THEN only matching payee/resource/client payment records are returned.
- WHEN a platform revenue report is requested, THEN platform commission totals are returned by period and currency.
- WHEN a client needs canonical payee balance, THEN this API does not calculate it and the caller uses Wallet Service.

## Regression / Compatibility Tests

- Tina SHALL test payment history APIs still return existing records.
- Tina SHALL test allocation and settlement filters do not leak another client or payee when scoped.

## Out Of Scope

Dashboard UI.

Wallet ledger APIs, wallet reservations, and payout/withdrawal workflow APIs.
