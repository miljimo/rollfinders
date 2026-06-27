# Transfer Orchestration Service Engineering PRD

## Service Name

Transfer Service

Make sure this service is not duplicated with Payment Service or the wallet service , if so please remove the duplication from them and allow payment service to handle stripe payments , wallet related stuff


This document defines clear responsibilities between the Payment, Wallet Service and the Transfer Service to avoid duplication.

The Payment Service handles all Stripe payment operations.

The Transfer Service handles wallet withdrawal workflow, approval, audit records, and orchestration.

## Version

1.0

## Purpose

The Transfer Service is responsible for managing and recording wallet withdrawal requests , its only backend related.

The service DOES NOT move money.

The service DOES NOT communicate directly with banks.

The service DOES NOT own wallet balances.

The service orchestrates transfers between the Wallet to Wallet Service and the existing Payment Service.

Stripe remains responsible for moving money from wallet to stripe account.

---

# Responsibilities

The service SHALL:

* Create transfer requests.
* Validate withdrawal requests.
* Record every transfer.
* Support approval workflows.
* Call the Payment Service after approval.
* Receive transfer completion events.
* Update transfer status.
* Notify Wallet Service to finalize the wallet debit.
* Maintain a complete audit history.

The service SHALL NOT:

* Hold money.
* Own wallet balances.
* Calculate balances.
* Process card payments.
* Store bank account details.
* Call Stripe directly.

---

# Supported Transfer Types

Wallet → Stripe Connected Account

Future

Wallet → Bank

Wallet → PayPal

Wallet → Another Provider

---

# Preconditions

A transfer request can only be created when:

* User is authenticated.
* User owns the wallet.
* Wallet is Active.
* Wallet has sufficient available balance.
* User has a verified Stripe Connected Account.
* Transfer amount is greater than zero.

---

# Workflow

## Step 1

User logs into RollFinders.

↓

Select Withdraw.

↓

Enter amount.

↓

Submit request.

---

## Step 2

Transfer Service validates:

* Wallet ownership
* Wallet status
* Available balance
* Stripe account connected
* Transfer limits

If validation fails

Return error.

---

## Step 3

Transfer Service requests Wallet Service to reserve the funds.

Wallet status

Reserved

No money is debited yet.

---

## Step 4

Create Transfer Request.

Status

PENDING_APPROVAL

---

## Step 5

Administrator reviews request.

Possible actions

Approve

Reject

Cancel

---

## Step 6

If approved

Call existing Payment Service.

Example

POST

/payment/payout

Payment Service already knows how to create Stripe transfers.

---

## Step 7

Payment Service communicates with Stripe.

Stripe performs payout.

---

## Step 8

Payment Service publishes:

TransferSucceeded

or

TransferFailed

---

## Step 9

Transfer Service updates status.

If successful

Notify Wallet Service

Finalize debit.

If failed

Notify Wallet Service

Release reservation.

---

# Transfer Status

CREATED

VALIDATING

PENDING_APPROVAL

APPROVED

PROCESSING

COMPLETED

FAILED

REJECTED

CANCELLED

---

# Approval Rules

Approval may be:

Manual

Automatic

Automatic approval rules may include:

Amount below configured threshold

Trusted academy

Verified Stripe account

No compliance flags

---

# Transfer Record

Each transfer stores:

Transfer ID

Wallet ID

Wallet Owner

Stripe Account ID

Amount

Currency

Reference

Status

Reason

Requested By

Approved By

Approved At

Completed At

Failure Reason

Payment Service Reference

Stripe Transfer Reference

Created At

Updated At

---

# REST API

POST /transfers

GET /transfers/{id}

GET /transfers

POST /transfers/{id}/approve

POST /transfers/{id}/reject

POST /transfers/{id}/cancel

GET /transfers/pending

---

# Events Published

TransferRequested

TransferApproved

TransferRejected

TransferCompleted

TransferFailed

TransferCancelled

---

# Events Consumed

WalletReserved

WalletReleased

PaymentTransferSucceeded

PaymentTransferFailed

---

# Database

transfers

* id
* wallet_id
* owner_id
* stripe_account_id
* amount
* currency
* status
* payment_reference
* stripe_reference
* requested_by
* approved_by
* approved_at
* completed_at
* failure_reason
* created_at
* updated_at

transfer_history

* id
* transfer_id
* action
* performed_by
* previous_status
* new_status
* metadata
* created_at

---

# Security

JWT authentication required.

Users may only create transfers for wallets they own.

Administrators approve or reject transfers.

Every request must use an Idempotency-Key.

Every action must be audited.

---

# Business Rules

Funds must be reserved before approval.

Funds remain reserved until Stripe confirms success.

Rejected or failed transfers release reserved funds.

Wallet balances are updated only by the Wallet Service.

Stripe remains the payment processor.

The Transfer Service is an orchestration and audit service only.

---

# Dependencies

Consumes

Wallet Service

Identity Service

Existing Payment Service

Notification Service

Publishes

Wallet Service

Reporting Service

Analytics Service

Notification Service

---

# Future Extensions

The architecture must support replacing the Payment Service with another provider without modifying the Transfer Service.

Future provider implementations include:

* Stripe
* Adyen
* PayPal
* Wise
* Bank APIs

The Transfer Service must always remain provider-agnostic and focused on orchestration, approvals, auditability, and workflow management rather than payment execution.
