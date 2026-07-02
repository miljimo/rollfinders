# 036 - Create Commission Policy And Allocation Schema

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Commission policy and allocation persistence
- Priority: P0
- Branch: `feature/payments-allocation-schema`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket034GenericPayeeAndAccountSchema
- Source PRD: `docs/services/payments/proposal.md`

## Task

Create database-first support for commission policies, policy versions, and payment allocation intent recorded with payment facts.

Payment Service allocation data is not the financial ledger. Wallet Service owns canonical balance, ledger entries, reservations, and spendable amount.

## Implementation Notes

- Add tables such as `commission_policies`, `commission_policy_versions`, and payment allocation/fact records needed to explain how a payment should be credited.
- Allocation rows SHALL support payee shares, platform commission amounts, provider fee metadata, and reversal/refund references as payment facts.
- Commission policy versions SHALL preserve historical fee calculations after a policy changes.
- Use stored procedures for writes and functions for reads.
- Use camelCase procedure/function names.
- Wallet Service SHALL receive or derive wallet ledger postings from these payment facts before any amount becomes spendable.

## Acceptance Criteria

- WHEN a commission policy changes, THEN existing payment allocations retain their original policy version.
- WHEN a payment has allocation lines, THEN gross amount reconciles to payee shares plus platform commission and provider fee metadata according to the policy.
- WHEN a future non-academy resource uses allocations, THEN no schema change is needed.

## Regression / Compatibility Tests

- Tina SHALL add unit tests for allocation math and policy versioning.
- Tina SHALL verify existing fixed-price and donation payment records still load without allocation rows where migration defaults apply.

## Out Of Scope

Provider transfer execution.

Wallet ledger ownership, wallet reservations, and payout workflow state.
