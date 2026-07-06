# 045 - Implement Academy Payout Request APIs

## Feature / Component

- Feature: Academy Payout Requests
- Component: Legacy Payment Service payout request APIs and wallet/transfer boundary migration
- Priority: P0
- Branch: `feature/payments-academy-payout-requests`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Wallet reservation APIs, Transfer payout/withdrawal workflow APIs, Payment provider account APIs
- Source PRD: `apps/backend_api/internal/services/payments/docs/prds/proposal.md`

## Task

Replace Payment Service-owned payout balance and reservation requirements with wallet-first payout orchestration.

Payment Service payout request APIs are legacy compatibility only. New payout creation must use Wallet Service for balance/reservation/finalization and Transfer Service for payout/withdrawal request lifecycle.

## Implementation Notes

- Do not add new Payment Service ledger reservation behavior.
- Do not use Payment Service payment aggregation as canonical available balance.
- Mark existing Payment Service payee balance responses as legacy/non-canonical.
- New balance reads must come from Wallet Service balances and wallet transactions.
- New payout requests must be Transfer Service records that reference Wallet reservation ids.
- Provider payout execution, if needed, remains behind Payment Service provider adapters and is triggered by orchestration.
- Existing legacy endpoints may remain for compatibility:
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
- UI must not decide payout eligibility.
- Reject payout requests when Wallet Service reports insufficient available balance, the linked payout account is not connected, the amount is below minimum, or the Transfer workflow is not eligible for the requested transition.
- Emit outbox/events from the owning service: Transfer for payout workflow changes, Wallet for reservation/ledger changes, Payment for provider execution/provider status changes.

## Acceptance Criteria

- WHEN a payee has eligible wallet-credited funds, THEN Wallet Service balance returns the correct available and reserved amounts.
- WHEN a verified academy requests a valid payout amount, THEN Wallet Service creates an active reservation and Transfer Service creates a pending payout/withdrawal request.
- WHEN the academy payout account is not enabled, THEN payout request creation fails before reservation or releases any created reservation.
- WHEN a request is rejected or cancelled, THEN Wallet Service releases the reservation.
- WHEN a request is marked paid or provider execution succeeds, THEN Wallet Service finalizes the reservation to the external linked wallet/account and the amount is excluded from available balance.
- WHEN a duplicate idempotency key is replayed, THEN the same payout request result is returned.

## Regression / Compatibility Tests

- Tina SHALL test existing payment checkout, payment history, refund creation, and dashboard APIs still work.
- Tina SHALL test that two payout requests cannot reserve the same wallet funds.
- Tina SHALL test refund/dispute-held wallet ledger effects are excluded from payout eligibility.
- Tina SHALL test all invalid state transitions return stable API errors.

## Out Of Scope

RollFinders dashboard UI.

New Payment Service-owned payout ledger tables.
