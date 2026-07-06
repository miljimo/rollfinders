# Wallet Service Engineering PRD (MVP)

**Service Name:** Wallet Service

**Version:** 1.0

**Architecture:** Microservice

**Communication:**

* REST API
* JSON
* PostgreSQL
* Outbox Pattern

---

# Goal

The Wallet Service manages all digital wallets within the platform.

It is the **financial ledger** of the platform.

It owns wallet balances, ledger entries, active reservations, and wallet-to-wallet ledger movement.

It **does not** integrate directly with Stripe, banks, or payment providers.

Provider payment/refund state is handled by the Payment Service. Payout/withdrawal movement workflow records are handled by the Transfer Service. Wallet remains the canonical ledger and balance source of truth for both.

---

# Responsibilities

The service SHALL:

* Create wallets
* Maintain wallet balances
* Record immutable ledger entries
* Perform wallet-to-wallet transfers
* Reserve funds
* Release reserved funds
* Finalize reserved funds to a counter wallet
* Reverse transactions
* Expose wallet APIs
* Publish wallet events

The service SHALL NOT:

* Process card payments
* Store bank accounts
* Call Stripe
* Own payout approval workflow
* Own withdrawal workflow records
* Execute provider payouts
* Execute provider withdrawals
* Execute provider deposits
* Calculate FX

---

# Wallet Ownership

Supported owners:

* Platform
* Academy
* User
* Event
* Internal System Wallet

Each owner may have multiple wallets.

Example:

Platform
GBP Wallet
USD Wallet

Academy
GBP Wallet

User
Reward Wallet

---

# Wallet Model

Wallet fields

* Wallet ID
* Owner Type
* Owner ID
* Currency
* Status
* Created At
* Updated At

Status

* Active
* Frozen
* Suspended
* Closed

Balances MUST NOT be manually editable.

Balances are calculated from ledger entries and active reservations.

Available balance equals ledger balance minus active reservations.

Reserved balance equals the sum of active reservations.

Ledger balance equals immutable ledger credits minus debits.

Optional balance snapshots may be maintained for read performance.

---

# Ledger

Every financial movement MUST create ledger entries.

The ledger is immutable.

Updates are forbidden.

Deletes are forbidden.

Corrections MUST be performed using reversal entries.

The ledger is the single source of truth.

---

# Course Payment Ledger Effects

Wallet Service records the ledger effects for course payments after Payment Service confirms a payment succeeded.

Provider checkout state does not live in Wallet. Wallet receives idempotent ledger commands from the orchestration layer and records:

* `BOOKING_PAYMENT` from a provider clearing wallet to the academy owner receiving wallet.
* `COMMISSION` from the academy owner receiving wallet to the platform revenue wallet.

The provider clearing wallet is an internal system wallet and may carry a negative balance to represent provider-settled money entering the platform ledger. The platform revenue wallet is an internal system wallet used for platform fee credits.

The academy owner receiving wallet should be selected by default wallet policy:

* Prefer an active external wallet when the academy owner has a connected provider account.
* Fall back to an active internal wallet.
* Create an active internal wallet if no receiving wallet exists.

Wallet Service must not call Payment Service, Pricing Policy Service, Stripe, banks, or PayPal. It only validates wallets, currency, balance rules, idempotency, and immutable double-entry posting.

---

# Double Entry Accounting

Every transaction creates exactly two ledger entries.

Debit Wallet

Credit Wallet

Example

Platform Wallet     -£50

Academy Wallet      +£50

Total system balance must always equal zero.

---

# Transaction Types

TRANSFER

RESERVE

RELEASE

FINALIZE_RESERVATION

REVERSAL

MANUAL_CREDIT

MANUAL_DEBIT

REFUND

COMMISSION

SUBSCRIPTION

BOOKING_PAYMENT

REWARD

BONUS

SYSTEM_ADJUSTMENT

---

# Transaction Status

PENDING

PROCESSING

COMPLETED

FAILED

REVERSED

CANCELLED

---

# Wallet Transfer

Input

Source Wallet

Destination Wallet

Amount

Currency

Reference

Validation

* Wallet exists
* Wallet active
* Same currency
* Positive amount
* Sufficient balance
* Idempotency key

Process

Start database transaction

Create transaction

Create debit ledger entry

Create credit ledger entry

Commit

Publish WalletTransferred event

Return transaction id

Atomicity is mandatory.

---

# Reserve Funds

Reserve money without moving ownership.

Reservation reduces available balance.

Reservation increases reserved balance.

Reservations may expire.

Reservation states

ACTIVE

RELEASED

FINALIZED

EXPIRED

Reservation rules:

* Creating a reservation reduces available balance and increases reserved balance.
* Releasing a reservation restores available balance.
* Finalizing a reservation creates immutable double-entry ledger movement from the reserved wallet to a counter wallet.
* Finalized and released reservations are closed.
* Repeated release of an already released reservation must be retry-safe.
* Payment, transfer, booking, and refund workflows may reference reservations by id, but Wallet owns reservation state.

---

# Reverse Transaction

Create opposite ledger entries.

Original entries remain unchanged.

Maintain audit trail.

---

# Manual Adjustment

Administrator only.

Required fields

Reason

Administrator

Reference

Approval

Audit log

---

# Events Published

WalletCreated

WalletTransferred

WalletReserved

WalletReleased

WalletReservationFinalized

WalletReversed

WalletAdjusted

WalletFrozen

WalletClosed

---

# Events Consumed

PaymentSucceeded

PaymentRefunded

WithdrawalCompleted

WithdrawalFailed

BookingCancelled

SubscriptionPaid

Wallet consumes payment facts only as accounting inputs. Payment Service remains the provider/payment state owner. Transfer Service remains the payout/withdrawal workflow owner.

---

# REST API

POST /wallets

GET /wallets/{id}

GET /wallets/{id}/balance

GET /wallets/{id}/transactions

POST /wallets/transfer

POST /wallets/reservations

POST /wallets/reservations/{id}/release

POST /wallets/reservations/{id}/finalize

POST /wallets/reverse

POST /wallets/adjustment

GET /transactions/{id}

---

# Database Schema

wallets

* id
* owner_type
* owner_id
* currency
* status
* created_at
* updated_at

wallet_transactions

* id
* type
* status
* amount
* currency
* source_wallet_id
* destination_wallet_id
* reference_type
* reference_id
* idempotency_key
* created_at

wallet_ledger_entries

* id
* transaction_id
* wallet_id
* debit_amount
* credit_amount
* currency
* description
* created_at

wallet_reservations

* id
* wallet_id
* amount
* currency
* status
* reference_type
* reference_id
* idempotency_key
* description
* created_at
* updated_at

balance_snapshots (optional)

* wallet_id
* available_balance
* reserved_balance
* pending_balance
* updated_at

---

# Business Rules

* No negative transfers.
* Currency must match.
* Frozen wallets cannot transfer.
* Closed wallets are read-only.
* Every transfer creates two ledger entries.
* Ledger entries are immutable.
* Every API supports idempotency.
* Every operation generates an audit log.
* Financial operations must be ACID compliant.
* Wallet Service must not derive available balance from Payment Service payment totals.
* Payment success, refund, commission, subscription, and payout effects must become Wallet ledger entries or reservations before they affect spendable balance.

---

# Non-Functional Requirements

* PostgreSQL
* Serializable database transactions for financial operations
* Optimistic locking where appropriate
* Event-driven architecture
* Horizontal scalability
* OpenTelemetry tracing
* Structured logging
* Health endpoint
* Metrics endpoint
* Outbox pattern for event publishing
* 100% auditability
* Unit and integration test coverage for financial logic

---

# Dependencies

Consumes

* Identity Service
* Academy Service
* Booking Service
* Payment Service payment/refund/provider-account facts
* Transfer Service payout/withdrawal workflow facts

Publishes

* Notification Service
* Analytics Service
* Reporting Service

---

# Future Extensions

The design must support, without breaking changes:

* Multi-currency wallets
* FX conversions
* Cross-platform wallet transfers
* Merchant wallets
* Escrow wallets
* Cashback wallets
* Crypto-backed wallets
* External payment providers (Stripe, Adyen, PayPal)
* International settlement services

The Wallet Service must remain independent of any payment provider. It manages ownership and accounting of value within the platform. Payment provider state is delegated to Payment Service, and payout/withdrawal workflow state is delegated to Transfer Service, ensuring the Wallet Service can be reused regardless of how money enters or leaves the ecosystem.
