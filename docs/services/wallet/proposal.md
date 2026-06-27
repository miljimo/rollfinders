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

It owns wallet balances, ledger entries, and internal wallet-to-wallet transfers.

It **does not** integrate directly with Stripe, banks, or payment providers.

Money entering or leaving the platform is handled by the Transfer Service.

---

# Responsibilities

The service SHALL:

* Create wallets
* Maintain wallet balances
* Record immutable ledger entries
* Perform wallet-to-wallet transfers
* Reserve funds
* Release reserved funds
* Reverse transactions
* Expose wallet APIs
* Publish wallet events

The service SHALL NOT:

* Process card payments
* Store bank accounts
* Call Stripe
* Execute payouts
* Execute withdrawals
* Execute deposits
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

Balances are calculated from ledger entries.

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

CAPTURED

EXPIRED

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

---

# REST API

POST /wallets

GET /wallets/{id}

GET /wallets/{id}/balance

GET /wallets/{id}/transactions

POST /wallets/transfer

POST /wallets/reserve

POST /wallets/release

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
* transaction_id
* amount
* status
* expires_at

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

Publishes

* Transfer Service
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

The Wallet Service must remain independent of any payment provider. It manages ownership and accounting of value within the platform. External movement of funds is delegated to the Transfer Service, ensuring the Wallet Service can be reused regardless of how money enters or leaves the ecosystem.
