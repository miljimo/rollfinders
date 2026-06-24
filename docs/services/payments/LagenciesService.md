# PRD: Academy Payout Request Service

Product: RollFinders

Service: Payment Service

Status: Draft

Last updated: 2026-06-22

## Purpose

Production currently allows course, event, booking, and donation payments to be collected into the RollFinders platform account. RollFinders needs a controlled way for academies to request payout of eligible funds without giving academies direct access to the platform Stripe account.

This PRD defines the academy payout request workflow for the current platform-settlement model. It is compatible with the longer-term generic Payment Service model where an academy is a payee and future payments may settle directly to an academy Stripe Connect account.

## Goals

* Allow verified academies to request payout of eligible earnings.
* Keep RollFinders as the financial system of record for payments, payout requests, approvals, and settlement status.
* Allow Platform Admin and Super Admin users to approve, reject, hold, or mark payout requests as paid.
* Prevent payout requests when an academy has no verified payout destination.
* Prevent double payout of the same payment allocation.
* Preserve an audit trail for every state change.
* Keep business rules in the Payment Service, not the frontend.

## Non-Goals

* Direct marketplace split payment implementation.
* Raw bank-account collection in RollFinders.
* Manual editing of Stripe balances.
* Replacing provider reconciliation.
* Giving academy users access to RollFinders Stripe dashboard.

## Roles

### Academy Admin

Can:

* View available payout balance for their academy.
* View pending, approved, paid, rejected, cancelled, and failed payout requests.
* Create a payout request for eligible available funds.
* Cancel a payout request only while it is still pending review.

Cannot:

* Approve their own payout request.
* Mark a payout as paid.
* Request payout for another academy.
* Request payout when the academy payout account is not verified.

### Platform Admin / Super Admin

Can:

* View payout requests across academies.
* Approve payout requests.
* Reject payout requests with a reason.
* Put payout requests on hold.
* Release held requests.
* Mark approved requests as paid after provider transfer or bank payment is completed.
* Attach provider references, notes, and audit metadata.

## Payout Eligibility

The Payment Service SHALL calculate available payout balance using payment records and ledger entries, not frontend totals.

Eligible funds must satisfy all of the following:

* Payment canonical status is `succeeded`.
* Payment belongs to the requesting academy/payee.
* Payment is not refunded, disputed, cancelled, or already fully allocated to a paid payout.
* Refund windows, reserve periods, or configurable hold periods have passed when configured.
* Academy payout destination is verified and enabled.
* The requested amount is greater than or equal to the minimum payout amount.
* The requested amount is less than or equal to available payout balance.

## Payout Request Statuses

* `draft`
* `pending_review`
* `approved`
* `held`
* `processing`
* `paid`
* `rejected`
* `cancelled`
* `failed`

Status transitions SHALL be enforced by the Payment Service.

## Functional Requirements

### Academy Balance

The Payment Service SHALL expose academy/payee balance data:

* Gross paid.
* Platform fees.
* Refunds.
* Disputes.
* Held amount.
* Pending payout requests.
* Paid payouts.
* Available payout amount.

### Create Payout Request

Academy Admin can create a payout request for an amount up to the available payout balance.

The service SHALL:

* Validate academy ownership or trusted caller scope.
* Validate payout destination readiness.
* Calculate available balance server-side.
* Reserve eligible ledger entries for the request.
* Persist the request as `pending_review`.
* Return the canonical payout request record.
* Emit a payout request event.

### Approve Payout Request

Platform Admin or Super Admin can approve a pending request.

The service SHALL:

* Validate the request is still pending.
* Recalculate the available reserved amount.
* Move the request to `approved`.
* Store approver, timestamp, and notes.
* Emit a payout approved event.

### Reject Payout Request

Platform Admin or Super Admin can reject a pending or held request.

The service SHALL:

* Require a rejection reason.
* Release reserved ledger entries.
* Move the request to `rejected`.
* Store actor, timestamp, and notes.
* Emit a payout rejected event.

### Hold And Release

Platform Admin or Super Admin can place a request on hold for fraud, dispute, verification, or operational review.

The service SHALL:

* Store hold reason and actor.
* Prevent payment execution while held.
* Allow release back to `pending_review` or `approved` depending on previous state.

### Mark Paid

Platform Admin or Super Admin can mark an approved payout request as paid when payout has been completed through Stripe, bank transfer, or another provider process.

The service SHALL:

* Require a provider or manual settlement reference.
* Mark reserved ledger entries as settled.
* Move payout request to `paid`.
* Store paid timestamp, actor, provider reference, and notes.
* Emit a payout paid event.

### Cancel Payout Request

Academy Admin can cancel only their own `pending_review` request.

The service SHALL:

* Release reserved ledger entries.
* Move the request to `cancelled`.
* Emit a payout cancelled event.

## API Requirements

All routes SHALL be versioned under `/v1`.

### Balances

`GET /v1/payees/{payee_id}/balances`

Returns balance summary for a payee.

Filters:

* `client_id`
* `currency`
* `from`
* `to`

### Payout Requests

`POST /v1/payees/{payee_id}/payout-requests`

Creates a payout request.

Request:

```json
{
  "client_id": "rollfinders",
  "amount": 10000,
  "currency": "GBP",
  "destination_account_id": "acct_...",
  "requested_by": "user_...",
  "notes": "June academy payout"
}
```

`GET /v1/payees/{payee_id}/payout-requests`

Lists payout requests for a payee.

`GET /v1/payout-requests`

Lists payout requests across payees for Platform Admin and Super Admin users.

Filters:

* `client_id`
* `payee_id`
* `status`
* `currency`
* `from`
* `to`

`GET /v1/payout-requests/{payout_request_id}`

Retrieves one payout request.

`POST /v1/payout-requests/{payout_request_id}/approve`

Approves a payout request.

`POST /v1/payout-requests/{payout_request_id}/reject`

Rejects a payout request.

`POST /v1/payout-requests/{payout_request_id}/hold`

Places a payout request on hold.

`POST /v1/payout-requests/{payout_request_id}/release`

Releases a payout request hold.

`POST /v1/payout-requests/{payout_request_id}/mark-paid`

Marks an approved payout request as paid.

`POST /v1/payout-requests/{payout_request_id}/cancel`

Cancels a pending payout request.

## Database Requirements

Payment Service database changes SHALL follow the existing database-first structure:

* Tables in `apps/backend_api/migrations/payments/tables`
* Types in `apps/backend_api/migrations/payments/types`
* Functions in `apps/backend_api/migrations/payments/functions`
* Procedures in `apps/backend_api/migrations/payments/procedures`
* Schema changes in `apps/backend_api/migrations/payments/schema`

Application writes SHALL use stored procedures.

Application reads SHALL use SQL functions.

Procedure and function names SHALL use camelCase.

New tables SHOULD include:

* `payout_requests`
* `payout_request_entries`
* `payout_request_status_history`
* `payout_request_audit_events`

`payout_request_entries` SHALL link each payout request to the payment allocation or settlement ledger entries being paid out.

## RollFinders Integration

RollFinders SHALL map:

* Academy to Payment Service payee.
* Academy Stripe Connect account to payee payout destination.
* Course/event/donation payments to payment resources.
* Academy admin payout dashboard to payout request APIs.

The UI SHALL:

* Show available payout balance.
* Show payout request history.
* Let Academy Admin request payout only when the Payment Service says the account and balance are eligible.
* Let Platform Admin and Super Admin approve, reject, hold, release, and mark paid.
* Display clear reasons when payout is unavailable.

The UI SHALL NOT:

* Calculate available balance independently.
* Decide payout eligibility independently.
* Mark payout as paid without calling the Payment Service.

## Acceptance Criteria

IF an academy has succeeded platform-settled payments
AND those payments are eligible for payout
WHEN the Academy Admin requests payout
THEN the Payment Service creates a `pending_review` payout request and reserves the eligible ledger entries.

IF an academy has no verified payout destination
WHEN it attempts to request payout
THEN the Payment Service rejects the request with `payee_account_not_enabled`.

IF a payout request is approved and marked paid
WHEN the academy balance is queried
THEN the paid amount is no longer available for payout.

IF a payment is refunded or disputed before payout approval
WHEN available balance is recalculated
THEN that payment is excluded from payout eligibility.

IF a payout request is rejected or cancelled
WHEN the academy balance is queried
THEN the reserved amount is released back to available balance if still eligible.

## Implementation Status

### Done

* RollFinders can currently collect payments into the platform Stripe account.
* RollFinders stores payment history records for dashboard reporting.
* RollFinders has academy Stripe Connect account setup UI and account status records.

### Not Done

* Academy payout request API.
* Payment Service payout eligibility calculation.
* Payout request reservation ledger.
* Platform approval workflow.
* Mark-paid workflow.
* Academy payout request dashboard.
* Provider payout reconciliation for requested payouts.
