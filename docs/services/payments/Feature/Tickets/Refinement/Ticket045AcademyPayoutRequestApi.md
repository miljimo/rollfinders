# 045 - Implement Academy Payout Request APIs

## Feature / Component

- Feature: Academy Payout Requests
- Component: Payment Service payout request APIs, balance calculation, and ledger reservation
- Priority: P0
- Branch: `feature/payments-academy-payout-requests`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket036CommissionPolicyAndAllocationSchema, Ticket039GenericSettlementAndLedgerApis
- Source PRD: `docs/services/payments/proposal.md`

## Task

Implement Payment Service APIs that allow a verified payee, such as a RollFinders academy, to request payout of eligible earnings collected into the RollFinders platform account.

## Implementation Notes

- Add payout request tables, entry reservation tables, status history, and audit event tables.
- Keep one SQL file per table, function, and procedure.
- Use camelCase for SQL procedure/function names and routine filenames.
- Implement read functions for payee balance and payout request lists.
- Implement write procedures for create, approve, reject, hold, release, cancel, and mark-paid transitions.
- Add endpoints:
  - `GET /v1/payees/{payee_id}/balances`
  - `POST /v1/payees/{payee_id}/payout-requests`
  - `GET /v1/payees/{payee_id}/payout-requests`
  - `GET /v1/payout-requests`
  - `GET /v1/payout-requests/{payout_request_id}`
  - `POST /v1/payout-requests/{payout_request_id}/approve`
  - `POST /v1/payout-requests/{payout_request_id}/reject`
  - `POST /v1/payout-requests/{payout_request_id}/hold`
  - `POST /v1/payout-requests/{payout_request_id}/release`
  - `POST /v1/payout-requests/{payout_request_id}/mark-paid`
  - `POST /v1/payout-requests/{payout_request_id}/cancel`
- Payment Service must calculate payout eligibility. The UI must not decide eligibility.
- Reject payout requests when the payee account is not enabled, funds are held, amount is below minimum, amount exceeds available balance, or allocations are already reserved/paid.
- Emit outbox events for payout request state changes.

## Acceptance Criteria

- WHEN a payee has eligible succeeded platform-settled payments, THEN `GET /v1/payees/{payee_id}/balances` returns the correct available payout amount.
- WHEN a verified academy requests a valid payout amount, THEN the service creates a `pending_review` payout request and reserves eligible entries.
- WHEN the academy payout account is not enabled, THEN payout request creation fails with `payee_account_not_enabled`.
- WHEN a request is rejected or cancelled, THEN reserved entries are released.
- WHEN a request is marked paid, THEN reserved entries become settled and are excluded from available payout balance.
- WHEN a duplicate idempotency key is replayed, THEN the same payout request result is returned.

## Regression / Compatibility Tests

- Tina SHALL test existing payment checkout, payment history, refund creation, and dashboard APIs still work.
- Tina SHALL test that two payout requests cannot reserve the same payment allocation.
- Tina SHALL test refund/dispute-held payments are excluded from payout eligibility.
- Tina SHALL test all invalid state transitions return stable API errors.

## Out Of Scope

RollFinders dashboard UI.
