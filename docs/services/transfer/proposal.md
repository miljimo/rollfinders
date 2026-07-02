# Transfer Service Engineering PRD

## Service Name

Transfer Service

## Version

1.0

## Purpose

The Transfer Service owns transfer workflow records and state transitions for requested value movement, including wallet-to-wallet transfers and payout/withdrawal movements from an internal wallet to an external linked wallet/account.

It is intentionally small. It does not own balances, ledger entries, payment provider state, bank details, or Stripe operations. Wallet Service remains the ledger, balance, linked-account, and reservation owner. Payment Service remains the Stripe and payment-provider owner.

## Boundary Decision

### Wallet Service

Wallet Service owns:

* Wallets.
* Balances.
* Ledger entries.
* Double-entry accounting.
* Validation that wallets exist, are active, use the same currency, and have sufficient funds.
* Idempotent wallet-to-wallet transaction creation.
* Wallet reservation creation, release, and finalization.
* Linked external wallets/accounts used as payout destinations.

Wallet Service does not own transfer workflow records. It applies wallet ledger movement and reservation state requested by the API/orchestration layer.

### Payment Service

Payment Service owns:

* Stripe payment operations.
* Checkout, payment, refund, subscription payment, and provider webhook state.
* Stripe Connect account and payout-provider concerns.
* Provider payout execution adapters, when orchestration asks for provider execution.

Payment Service must not own wallet ledger records, wallet reservations, spendable balance calculations, or transfer workflow state.

### Transfer Service

Transfer Service owns:

* The transfer initiation API.
* Request normalization.
* Request-level validation for required source wallet, destination wallet, amount, currency, and idempotency key.
* Transfer request records.
* Transfer status transitions: pending, processing, completed, failed, and cancelled.
* Payout/withdrawal request lifecycle for movement from an internal wallet to an external linked wallet/account.
* Wallet reservation references used to hold funds while payout/withdrawal requests are pending.
* The wallet transaction reference returned by finalized wallet ledger movement.

Transfer Service does not own transfer balances, wallet reservations, or ledger tables.

Transfer Service must not call Wallet Service directly and must not import Wallet Service internals. Cross-service workflow is orchestrated by the API layer.

## Minimum Scope

The minimum Transfer Service provides one operation:

```txt
POST /v1/transfers
```

Request:

```json
{
  "source_wallet_id": "wal_source",
  "destination_wallet_id": "wal_destination",
  "amount": 2500,
  "currency": "GBP",
  "reference_type": "booking",
  "reference_id": "booking_123",
  "description": "Booking settlement"
}
```

Required header:

```txt
Idempotency-Key: <stable-request-key>
```

Response:

```json
{
  "transfer": {
    "id": "trf_123",
    "status": "COMPLETED",
    "amount": 2500,
    "currency": "GBP",
    "source_wallet_id": "wal_source",
    "destination_wallet_id": "wal_destination",
    "reference_type": "booking",
    "reference_id": "booking_123",
    "wallet_transaction_id": "txn_123",
    "created_at": "2026-06-27T00:00:00Z",
    "updated_at": "2026-06-27T00:00:01Z"
  }
}
```

## Flow

1. Caller sends `POST /v1/transfers` with an idempotency key.
2. Transfer Service validates required request fields.
3. Transfer Service normalizes currency to uppercase.
4. Transfer Service stores or returns the idempotent transfer request record.
5. API marks the transfer request as processing.
6. API calls Wallet Service `POST /v1/wallets/transfer` to apply the ledger movement.
7. Wallet Service performs ledger validation and creates the double-entry transaction.
8. API marks the transfer request as completed with the wallet transaction id, or failed with a failure reason.
9. API returns the transfer record and wallet transaction result.

## Service Dependency Rule

Transfer Service does not call Wallet Service.

Wallet Service does not call Transfer Service.

The API layer may orchestrate the workflow because it is the application boundary responsible for combining service capabilities into a user-facing operation.

## Out Of Scope

The minimum Transfer Service explicitly excludes:

* Stripe payout orchestration.
* Bank transfer orchestration.
* Payment provider calls.
* Approval workflows.
* Reserve and release workflows.
* Balance calculation.
* Ledger ownership.
* Wallet transaction reversal.
* User-facing frontend dashboard work.

Future work may add approval records and payout-specific status metadata in Transfer Service. Provider execution details must remain in Payment Service, and balance/reservation details must remain in Wallet Service.

## Payout / Withdrawal Flow

1. Caller requests payout/withdrawal for a payee wallet and linked external wallet/account.
2. API/orchestration validates caller permissions and linked-account readiness.
3. API/orchestration asks Wallet Service to reserve the requested funds.
4. Transfer Service stores the payout/withdrawal request with the wallet reservation id.
5. Approval or hold status changes are stored on the Transfer request.
6. If the payout is rejected, cancelled, or fails before provider completion, API/orchestration asks Wallet Service to release the reservation.
7. If provider execution is required, API/orchestration asks Payment Service provider adapter to execute the payout.
8. On provider/manual success, API/orchestration asks Wallet Service to finalize the reservation to the external linked wallet/account and marks the Transfer request completed.

Transfer Service must never calculate payout balance from Payment Service payment totals.
