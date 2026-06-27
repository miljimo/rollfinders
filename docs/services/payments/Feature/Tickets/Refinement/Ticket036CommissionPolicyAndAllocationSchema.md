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

Create database-first support for commission policies, policy versions, and payment allocations.

## Implementation Notes

- Add tables such as `commission_policies`, `commission_policy_versions`, and `payment_allocations`.
- Allocation rows SHALL support payee allocations, platform commission allocations, provider fee allocations, and reversal allocations.
- Commission policy versions SHALL preserve historical fee calculations after a policy changes.
- Use stored procedures for writes and functions for reads.
- Use camelCase procedure/function names.

## Acceptance Criteria

- WHEN a commission policy changes, THEN existing payment allocations retain their original policy version.
- WHEN a payment has allocation lines, THEN gross amount reconciles to payee allocations plus platform commission and fees according to the policy.
- WHEN a future non-academy resource uses allocations, THEN no schema change is needed.

## Regression / Compatibility Tests

- Tina SHALL add unit tests for allocation math and policy versioning.
- Tina SHALL verify existing fixed-price and donation payment records still load without allocation rows where migration defaults apply.

## Out Of Scope

Provider transfer execution.
