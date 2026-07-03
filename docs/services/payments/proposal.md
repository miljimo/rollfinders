# PRD: Payment Service Proposal

**Product:** RollFinders

**Service:** Payment Service

**Status:** Proposal

**Last updated:** 2026-06-27

---

## Purpose

This proposal defines the Payment Service as the provider-orchestration service for checkout, payment, refund, billing, provider account, webhook, and provider event state.

The Payment Service is responsible for generic provider payment capabilities, including provider billing, recurring subscription payment records, invoices, payment lifecycle records, provider account onboarding, refund state, idempotency, provider webhook processing, and payment fact publication.

The service must remain generic. RollFinders-specific catalogue, entitlement, plan, academy, and dashboard decisions must stay outside the Payment Service.

Wallet Service is the financial ledger and balance source of truth. Transfer Service owns payout and withdrawal movement workflow records. Payment Service must not calculate spendable balances or own ledger settlement state.

---

## Service Boundary

Payment Service owns:

* Payment provider checkout records.
* Provider billing subscriptions.
* Recurring payment records.
* Invoices.
* Failed payments and retry records.
* Provider webhook state.
* Payment provider account onboarding and provider account status.
* Payment, refund, and provider audit history.
* Payment fact events such as `payment.succeeded`, `payment.refunded`, `payment.failed`, and provider-account status changes.

Payment Service does not own:

* RollFinders subscription products.
* Product features.
* Plan products.
* Plan visibility.
* Customer entitlements.
* Downgrade approval.
* Usage limits.
* Academy records.
* API access decisions.
* Service dashboard permissions.
* Wallet balances.
* Spendable, held, reserved, or paid payout balance calculations.
* Wallet ledger entries.
* Wallet reservations.
* Payout or withdrawal transfer workflow records.
* Payout approval, rejection, hold, release, or mark-paid state.

RollFinders Subscription Service owns product catalogue, plan catalogue, subscriber records, plan changes, and active entitlements. When a paid subscription action needs money movement, Subscription Service requests Payment Service billing checkout and stores the returned payment or checkout reference.

Wallet Service owns ledger posting for payment success, refund, commission, subscription, reward, and payout accounting. Payment Service emits provider-confirmed facts; the API/orchestration layer or event consumers call Wallet Service to credit, debit, reserve, release, or finalize wallet funds.

Transfer Service owns transfer request records and lifecycle for wallet-to-wallet movements and wallet-to-external-account payout/withdrawal movements. Payment Service may execute provider payout APIs behind an adapter when asked by orchestration, but Transfer Service remains the workflow source of truth and Wallet Service remains the ledger source of truth.

The public/gateway `/v1/subscriptions/...` route family is reserved for RollFinders Subscription Service subscription records and plan actions. Payment Service billing endpoints use `/v1/billing/subscriptions/...` to avoid duplicating or shadowing Subscription Service routes.

## Course Payment Wallet Posting

Course and event checkout remains a Payment Service responsibility until provider success is confirmed. After a successful provider callback, the orchestration layer must post wallet effects so the academy owner can see course payment activity in Wallet even when the provider settles money directly to an external account.

For Stripe Connect course payments:

* Payment Service owns the checkout, provider payment ID, payer identity, status, provider metadata, and callback result.
* The checkout metadata must include the booking id, course id, academy id, academy owner wallet owner id, course title, and provider account id where available.
* The orchestration layer marks the booking as paid after provider success.
* The orchestration layer records wallet effects through Wallet Service using idempotent commands.
* Wallet Service records the gross course payment into the academy owner receiving wallet as `BOOKING_PAYMENT`.
* Wallet Service records the platform fee as `COMMISSION` from the academy receiving wallet to a platform revenue wallet.
* Pricing Policy Service provides the provider-specific platform fee policy. Payment Service must not own fee policy configuration.

Internal-wallet course payments are a separate payment method option. They must still create a Payment Service payment record for the booking payment fact, but no external provider checkout is required. The orchestration layer must debit the payer internal wallet, credit the academy owner receiving wallet, post platform commission, and mark the booking paid atomically enough to be idempotently retried.

### Course Payment Acceptance Criteria

* A successful Stripe course payment creates a booking payment confirmation.
* A successful Stripe course payment creates a wallet `BOOKING_PAYMENT` transaction showing the payer and payment reference.
* The academy receiving wallet owner is the academy owner user id when known.
* The platform fee is calculated from Pricing Policy Service for the provider id and posted as a wallet `COMMISSION`.
* Replayed callbacks do not duplicate wallet transactions.
* Internal-wallet payment is available only to logged-in users with an eligible active internal wallet and sufficient funds.
* Guests continue to use external provider checkout.

---

## Subscription Billing

### Goals

Support:

* Monthly subscriptions.
* Annual subscriptions.
* Free trials.
* Introductory pricing.
* Subscription upgrades.
* Subscription downgrades.
* Subscription cancellation.
* Subscription reactivation.
* Payment retries.
* Grace periods.

### Core Resources

#### Subscription

Represents an agreement between a customer and a billing plan.

Fields:

* `subscription_id`
* `client_id`
* `owner_type`
* `owner_id`
* `customer_id`
* `provider`
* `provider_customer_id`
* `provider_subscription_id`
* `plan_id`
* `plan_name`
* `currency`
* `amount`
* `interval`
* `status`
* `trial_start`
* `trial_end`
* `current_period_start`
* `current_period_end`
* `cancel_at_period_end`
* `cancelled_at`
* `metadata`

#### Subscription Invoice

Stores every invoice generated by the provider.

Fields:

* `invoice_id`
* `subscription_id`
* `provider_invoice_id`
* `payment_id`
* `amount`
* `currency`
* `status`
* `due_date`
* `paid_date`
* `hosted_invoice_url`

#### Subscription Payment

Every recurring payment must also create a Payment record inside the Payment Service.

Subscription payments must not bypass the normal payment ledger.

### Subscription Status

* `trialing`
* `active`
* `past_due`
* `unpaid`
* `cancelled`
* `paused`
* `incomplete`
* `incomplete_expired`

### Stripe Webhooks

The service must process:

* `customer.subscription.created`
* `customer.subscription.updated`
* `customer.subscription.deleted`
* `invoice.created`
* `invoice.finalized`
* `invoice.paid`
* `invoice.payment_failed`
* `invoice.payment_succeeded`
* `customer.subscription.trial_will_end`

Every webhook must be idempotent.

### Billing APIs

| Route | Permission | Requirement |
| --- | --- | --- |
| `POST /v1/billing/subscriptions` | `payment.subscription.create` | Creates a provider billing subscription checkout for a paid subscription action. The request must include client, owner, plan, amount, currency, interval, provider, and redirect metadata from the caller. |
| `GET /v1/billing/subscriptions` | `payment.subscription.read` | Lists provider billing subscriptions with filters such as client, owner, and status. |
| `GET /v1/billing/subscriptions/{id}` | `payment.subscription.read` | Returns one provider billing subscription. |
| `POST /v1/billing/subscriptions/{id}/cancel` | `payment.subscription.manage` | Cancels a provider billing subscription or marks it cancel-at-period-end according to provider support. |
| `POST /v1/billing/subscriptions/{id}/resume` | `payment.subscription.manage` | Resumes a paused or cancel-at-period-end provider billing subscription where provider state allows it. |
| `GET /v1/billing/subscriptions/{id}/payments` | `payment.subscription.read` | Returns recurring Payment records linked to the billing subscription. |
| `GET /v1/billing/subscriptions/{id}/invoices` | `payment.subscription.read` | Returns provider invoices linked to the billing subscription. |

### Billing Events

* `subscription.created`
* `subscription.updated`
* `subscription.cancelled`
* `subscription.renewed`
* `subscription.payment_succeeded`
* `subscription.payment_failed`
* `subscription.expired`

### Billing Acceptance Criteria

Every recurring payment must generate a Payment record.

Every invoice must be stored.

Every subscription must have complete payment history.

RollFinders must never call Stripe Billing directly.

---

## Legacy Academy Payout Request APIs

### Purpose

Production has legacy Payment Service payout request APIs for academy payout workflows. These APIs are transitional and must not be expanded as the canonical balance or payout workflow.

The target model is wallet-first:

* Wallet Service calculates payee balance from ledger entries and active reservations.
* Wallet Service reserves, releases, and finalizes funds.
* Transfer Service records payout or withdrawal transfer requests and lifecycle.
* Payment Service records provider state and may execute provider payout/refund APIs through provider adapters when orchestrated.

### Goals

* Preserve existing Payment Service payout endpoints while callers migrate.
* Mark Payment Service payee balance data as legacy.
* Move new balance reads and payout eligibility checks to Wallet Service.
* Move new payout/withdrawal workflow records to Transfer Service.
* Keep provider-specific execution behind Payment Service provider adapters where needed.

### Non-Goals

* Raw bank-account collection in RollFinders.
* Manual editing of Stripe balances.
* Replacing provider reconciliation.
* Giving academy users access to RollFinders Stripe dashboard.
* Adding new payments-owned payout balance, settlement ledger, or approval workflow behavior.

### Roles

#### Academy Admin

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

#### Platform Admin / Super Admin

Can:

* View payout requests across academies.
* Approve payout requests.
* Reject payout requests with a reason.
* Put payout requests on hold.
* Release held requests.
* Mark approved requests as paid after provider transfer or bank payment is completed.
* Attach provider references, notes, and audit metadata.

### Payout Eligibility

Wallet Service must calculate available payout balance using wallet ledger entries and active reservations, not frontend totals and not Payment Service payment aggregation.

Eligible funds must satisfy all of the following:

* Wallet ledger reflects provider-confirmed payment success for the requesting academy/payee.
* Wallet ledger reflects any platform commission, refund, reversal, dispute, or adjustment.
* Funds are not already reserved by an active wallet reservation.
* Refund windows, reserve periods, or configurable hold periods have passed when configured.
* Academy payout destination is linked and enabled on the relevant wallet.
* The requested amount is greater than or equal to the minimum payout amount.
* The requested amount is less than or equal to Wallet Service available balance.

### Payout Request Statuses

* `draft`
* `pending_review`
* `approved`
* `held`
* `processing`
* `paid`
* `rejected`
* `cancelled`
* `failed`

New payout/withdrawal status transitions must be enforced by Transfer Service. Existing Payment Service payout statuses are legacy compatibility only.

### Functional Requirements

#### Academy Balance

Wallet Service must expose academy/payee wallet balance data:

* Available balance.
* Reserved balance.
* Ledger balance.
* Wallet transaction history.
* Linked payout accounts.

Payment Service `GET /v1/payees/{payee_id}/balances` is legacy compatibility. Its response must identify that it is not the canonical wallet balance.

#### Create Payout Request

Academy Admin can create a payout request for an amount up to the available payout balance.

New payout creation must:

* Validate academy ownership or trusted caller scope.
* Validate Wallet linked payout destination readiness.
* Ask Wallet Service to reserve funds.
* Persist the payout/withdrawal transfer request in Transfer Service.
* Return the canonical transfer request record and wallet reservation reference.
* Emit a transfer/payout request event.

#### Approve Payout Request

Platform Admin or Super Admin can approve a pending request.

The workflow must:

* Validate the request is still pending.
* Keep the Wallet reservation active.
* Move the request to `approved`.
* Store approver, timestamp, and notes.
* Emit a payout approved event.

#### Reject Payout Request

Platform Admin or Super Admin can reject a pending or held request.

The workflow must:

* Require a rejection reason.
* Ask Wallet Service to release the reservation.
* Move the request to `rejected`.
* Store actor, timestamp, and notes.
* Emit a payout rejected event.

#### Hold And Release

Platform Admin or Super Admin can place a request on hold for fraud, dispute, verification, or operational review.

The service must:

* Store hold reason and actor.
* Prevent payment execution while held.
* Allow release back to `pending_review` or `approved` depending on previous state.

#### Mark Paid

Platform Admin or Super Admin can mark an approved payout request as paid when payout has been completed through Stripe, bank transfer, or another provider process.

The workflow must:

* Require a provider or manual settlement reference.
* Ask Wallet Service to finalize the reservation to the external linked wallet.
* Move payout request to `paid`.
* Store paid timestamp, actor, provider reference, and notes.
* Emit a payout paid event.

#### Cancel Payout Request

Academy Admin can cancel only their own `pending_review` request.

The workflow must:

* Ask Wallet Service to release the reservation.
* Move the request to `cancelled`.
* Emit a payout cancelled event.

### Payout APIs

All routes must be versioned under `/v1`.

#### Balances

`GET /v1/payees/{payee_id}/balances`

Legacy compatibility endpoint. New callers must read Wallet Service balances instead.

Filters:

* `client_id`
* `currency`
* `from`
* `to`

#### Payout Requests

`POST /v1/payees/{payee_id}/payout-requests`

Legacy compatibility endpoint. New callers must create payout or withdrawal transfer requests through Transfer Service and Wallet Service reservation APIs.

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

### Database Requirements

Payment Service database changes must follow the existing database-first structure:

* Tables in `apps/backend_api/migrations/payments/tables`
* Types in `apps/backend_api/migrations/payments/types`
* Functions in `apps/backend_api/migrations/payments/functions`
* Procedures in `apps/backend_api/migrations/payments/procedures`
* Schema changes in `apps/backend_api/migrations/payments/schema`

Application writes must use stored procedures.

Application reads must use SQL functions.

Procedure and function names must use camelCase.

Legacy tables may exist for compatibility:

* `payout_requests`
* `payout_request_entries`
* `payout_request_status_history`
* `payout_request_audit_events`

These tables must not be extended as the canonical ledger or balance model. Canonical balance state belongs in `wallet` schema tables, including wallet ledger entries and wallet reservations.

### RollFinders Integration

RollFinders must map:

* Academy to Wallet owner/payee wallet.
* Academy Stripe Connect account to Wallet linked payout account, with provider onboarding handled by Payment Service.
* Course/event/donation payments to payment resources.
* Academy admin payout dashboard balance reads to Wallet Service.
* Academy admin payout and withdrawal requests to Transfer Service plus Wallet reservation APIs.

The UI must:

* Show available payout balance.
* Show payout request history.
* Let Academy Admin request payout only when Wallet Service and Transfer Service say the account and balance are eligible.
* Let Platform Admin and Super Admin approve, reject, hold, release, and mark paid.
* Display clear reasons when payout is unavailable.

The UI must not:

* Calculate available balance independently.
* Decide payout eligibility independently.
* Mark payout as paid without finalizing the Wallet reservation and updating the Transfer Service workflow.

### Payout Acceptance Criteria

If an academy has wallet-credited funds eligible for payout, when the Academy Admin requests payout, then Transfer Service creates the payout/withdrawal request and Wallet Service reserves the eligible funds.

If an academy has no verified payout destination, when it attempts to request payout, then the workflow rejects the request with `payee_account_not_enabled` or the wallet-linked-account equivalent.

If a payout request is approved and marked paid, when the academy balance is queried, then the paid amount is no longer available for payout.

If a payment is refunded or disputed before payout approval, when available balance is recalculated, then Wallet Service ledger entries and reservations exclude those funds from payout eligibility.

If a payout request is rejected or cancelled, when the academy balance is queried, then the reserved amount is released back to available balance if still eligible.

### Implementation Status

#### Done

* RollFinders can currently collect payments into the platform Stripe account.
* RollFinders stores payment history records for dashboard reporting.
* RollFinders has academy Stripe Connect account setup UI and account status records.

#### Not Done

* Wallet-first payout request workflow through Transfer Service.
* Wallet canonical payee balance endpoint selection in the UI.
* Wallet reservation integration for payout approval/rejection/mark-paid.
* Academy payout request dashboard.
* Provider payout reconciliation for requested payouts through Payment Service provider adapters.
