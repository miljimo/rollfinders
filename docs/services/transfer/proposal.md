# Transfer Service Engineering PRD

## Service Name

Transfer Service

## Version

1.0

## Purpose

The Transfer Service initiates cash movement from one internal wallet to another internal wallet.

It is intentionally small. It does not own balances, ledger entries, payment provider state, payout approvals, bank details, or Stripe operations. Wallet Service remains the ledger and balance owner. Payment Service remains the Stripe and payment-provider owner.

## Boundary Decision

### Wallet Service

Wallet Service owns:

* Wallets.
* Balances.
* Ledger entries.
* Double-entry accounting.
* Validation that wallets exist, are active, use the same currency, and have sufficient funds.
* Idempotent wallet-to-wallet transaction creation.

### Payment Service

Payment Service owns:

* Stripe payment operations.
* Checkout, payment, refund, subscription payment, and provider webhook state.
* Stripe Connect account and payout-provider concerns.

Payment Service must not own wallet ledger records or execute wallet-to-wallet balance movement.

### Transfer Service

Transfer Service owns:

* The transfer initiation API.
* Request normalization.
* Request-level validation for required source wallet, destination wallet, amount, currency, and idempotency key.
* Delegation to Wallet Service to create the actual wallet transfer.
* Returning Wallet Service's canonical transaction result.

Transfer Service does not own transfer balances or ledger tables.

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
    "id": "txn_123",
    "type": "TRANSFER",
    "status": "COMPLETED",
    "amount": 2500,
    "currency": "GBP",
    "source_wallet_id": "wal_source",
    "destination_wallet_id": "wal_destination",
    "reference_type": "booking",
    "reference_id": "booking_123",
    "created_at": "2026-06-27T00:00:00Z"
  }
}
```

## Flow

1. Caller sends `POST /v1/transfers` with an idempotency key.
2. Transfer Service validates required request fields.
3. Transfer Service normalizes currency to uppercase.
4. Transfer Service calls Wallet Service `POST /v1/wallets/transfer`.
5. Wallet Service performs ledger validation and creates the double-entry transaction.
6. Transfer Service returns the canonical Wallet Service transaction.

## Out Of Scope

The minimum Transfer Service explicitly excludes:

* Stripe payout orchestration.
* Bank transfer orchestration.
* Payment provider calls.
* Approval workflows.
* Reserve and release workflows.
* Transfer audit tables.
* Balance calculation.
* Ledger ownership.
* Wallet transaction reversal.
* User-facing frontend dashboard work.

Future work may add workflow state and approval records, but only after a boundary decision confirms that the feature is not better owned by Payment Service or Wallet Service.
