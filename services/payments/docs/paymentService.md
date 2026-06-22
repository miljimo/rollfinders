# PRD: Generic Payment Allocation Service API

Product: RollFinders

Service: Payment Service

Version: 1.0

Status: Reviewing

Last updated: 2026-06-21

---

## Purpose

Provide a generic payment, allocation, and settlement service that can be reused by RollFinders and future applications without embedding RollFinders-specific business concepts in the service domain model.

The service SHALL support:

* Payment creation and status tracking.
* Hosted checkout orchestration.
* Revenue allocation across one or more payees.
* Commission and platform fee policy application.
* Payee onboarding and connected provider accounts.
* Refund tracking and refund allocation reversal.
* Settlement and payout visibility.
* Provider webhook ingestion.
* Payment and settlement reporting.

The service SHALL NOT contain domain-specific concepts such as:

* Academy
* Coach
* Seminar
* Open Mat
* Course
* Membership
* Booking

Those concepts belong to consuming applications and SHALL be passed to the Payment Service only as generic `client_id`, `resource_type`, `resource_id`, `resource_label`, and metadata.

---

## Design Principle

The Payment Service is a reusable financial orchestration service.

It understands:

* Clients
* Payments
* Payees
* Payee accounts
* Allocations
* Commission policies
* Refunds
* Settlements
* Provider events

It does not understand the business meaning of a resource.

Example RollFinders mapping:

```text
RollFinders academy -> Payment Service payee
RollFinders course occurrence -> Payment Service resource
RollFinders platform fee -> Payment Service commission allocation
RollFinders payment dashboard -> Payment Service payment history APIs
```

Future examples:

```text
Marketplace seller -> payee
Event organizer -> payee
Instructor -> payee
Venue -> payee
Partner business -> payee
Subscription product -> resource
Ticket purchase -> resource
Invoice -> resource
Donation campaign -> resource
```

---

## Goals

* Keep payment processing reusable across multiple RollFinders and non-RollFinders domains.
* Keep provider-specific logic behind adapters.
* Keep the service as the system of record for payment and settlement history.
* Support payments that settle to the platform account.
* Support payments that settle directly to connected payee accounts.
* Support platform fees and commission policies.
* Support refund and dispute awareness for all settlement routes.
* Provide APIs that consuming applications can use without calling Stripe, PayPal, or another provider directly.
* Preserve low PCI scope by never accepting raw PAN, CVV, or bank account details.

---

## Non-Goals

The Payment Service SHALL NOT:

* Own consuming application RBAC.
* Own product catalog, course, event, academy, membership, or booking data.
* Store card numbers, CVV, bank account numbers, or identity documents.
* Make business-specific permission decisions beyond validating client/payee/resource ownership passed by trusted callers.
* Render user interface.
* Replace accounting or tax advice.

---

## Core Resources

### Clients

A client is an application or service that integrates with the Payment Service.

Examples:

* `rollfinders`
* `partner_marketplace`
* `events_service`
* `membership_service`

Clients own their business domain. The Payment Service owns payment state for client-submitted resources.

### Resources

A resource is the thing being paid for.

Resource fields:

* `resource_type`
* `resource_id`
* `resource_label`
* `resource_metadata`

The Payment Service treats these as opaque identifiers.

### Payees

A payee is any party that can receive allocated revenue.

Payee examples:

* A business.
* A venue.
* An instructor.
* An academy.
* A partner organization.

The Payment Service SHALL use generic payee records and SHALL NOT encode domain-specific payee types in core logic.

### Payee Accounts

A payee account links a payee to a provider account, for example a Stripe connected account.

### Payments

A payment records the customer payment intent, provider state, canonical status, payment method, amount, currency, resource reference, and settlement route.

### Allocations

An allocation describes how a payment amount is split between payees and the platform.

Allocation examples:

```text
Customer paid: GBP 100.00
Payee A: GBP 70.00
Payee B: GBP 20.00
Platform commission: GBP 10.00
```

### Commission Policies

A commission policy defines how platform fees or payee shares are calculated.

Policies SHALL be versioned so historical allocations remain explainable after fee changes.

For Stripe Connect destination charges, the `application_fee_amount` sent to Stripe SHALL include:

* RollFinders platform commission.
* Configured estimated Stripe card processing fee.

This ensures Stripe processing fees do not reduce RollFinders net commission. The Payment Service SHALL store both components separately in payment metadata for reporting and reconciliation, while sending their total as the Stripe application fee.

Stripe does not provide the exact final processing fee before a charge is created. The Payment Service SHALL use configured processing fee rates before checkout and SHALL reconcile the exact provider fee after payment from Stripe balance transaction data.

### Refunds

A refund records money returned to the payer and how that refund reverses allocations.

### Settlements

A settlement records payout, transfer, or balance movement status for a payee or platform account.

---

## Settlement Routes

The service SHALL support multiple settlement routes.

### Platform Settlement

Funds settle to the platform provider account.

Use this when:

* The platform is the payee.
* No connected payee account applies.
* The client explicitly requests platform settlement.

The Payment Service SHALL still record allocations if the client wants later reporting or manual settlement.

### Connected Payee Settlement

Funds are routed to a connected payee account while the platform receives a commission/application fee.

Use this when:

* A payee has an enabled provider account.
* The client requests direct settlement to that payee.
* Provider rules allow the selected funds flow.

The Payment Service SHALL record:

* Provider payment ID.
* Provider charge/session/payment intent ID.
* Provider connected account ID.
* Provider application fee ID or transfer ID when available.
* Gross amount.
* Platform commission.
* Payee net allocation.
* Provider fees when known.
* Settlement route.

### Multi-Payee Allocation

The service SHOULD support multiple allocation lines per payment.

Initial provider settlement MAY route to a primary payee while additional allocations are represented in the ledger until provider support is implemented.

---

## Provider Model

The first connected-account provider SHALL be Stripe Connect or an equivalent provider model.

Provider adapters SHALL support:

* Create hosted checkout.
* Create payment.
* Retrieve payment.
* Cancel payment.
* Create refund.
* Retrieve refund.
* Create payee connected account.
* Retrieve payee connected account.
* Create onboarding or account-update link.
* Retrieve account capability and requirements state.
* Create connected-account payment with platform fee.
* Track payouts, transfers, application fees, and balance transactions.
* Parse provider webhooks.

Provider-specific status SHALL be stored separately from canonical status.

---

## Canonical Statuses

### Payment Status

* `created`
* `requires_action`
* `processing`
* `authorized`
* `succeeded`
* `failed`
* `cancelled`
* `partially_refunded`
* `refunded`
* `disputed`

### Payee Account Status

* `not_started`
* `onboarding`
* `pending_verification`
* `enabled`
* `restricted`
* `disabled`
* `rejected`

### Settlement Status

* `created`
* `pending`
* `in_transit`
* `completed`
* `failed`
* `cancelled`
* `reversed`
* `held`

### Allocation Status

* `pending`
* `available`
* `settled`
* `reversed`
* `held`

---

## API Requirements

All APIs SHALL use JSON and versioned `/v1` routes.

Service-to-service authentication and authorization SHALL be enforced by the orchestration layer before requests reach the Payment Service.

All write operations SHALL require:

```text
Idempotency-Key: <stable key>
```

### Clients

`POST /v1/clients`

Creates a client integration record.

`GET /v1/clients/{client_id}`

Retrieves a client integration record.

`PATCH /v1/clients/{client_id}`

Updates callback URLs, allowed origins, or client display metadata.

### Payments

`POST /v1/payments`

Creates a payment.

Request fields SHOULD include:

* `client_id`
* `amount`
* `currency`
* `provider`
* `payment_method_type`
* `settlement_route`
* `resource_type`
* `resource_id`
* `resource_label`
* `payee_id`
* `commission_policy_id`
* `allocations`
* `payer_email`
* `metadata`

`GET /v1/payments/{payment_id}`

Retrieves payment state.

`GET /v1/payments`

Lists payments with filters:

* `client_id`
* `resource_type`
* `resource_id`
* `payee_id`
* `payer_email`
* `status`
* `settlement_route`
* `from`
* `to`
* `limit`

`POST /v1/payments/{payment_id}/cancel`

Cancels an eligible payment.

### Hosted Checkouts

`POST /v1/checkouts`

Creates a provider-hosted checkout for a client resource.

The Payment Service SHALL own provider callback URLs and redirect back to the registered client callback URL with canonical payment state.

### Allocations

`GET /v1/payments/{payment_id}/allocations`

Returns allocation breakdown for a payment.

`GET /v1/allocations`

Lists allocations with filters:

* `client_id`
* `payment_id`
* `payee_id`
* `resource_type`
* `resource_id`
* `status`

### Payees

`POST /v1/payees`

Creates a generic payee.

`GET /v1/payees/{payee_id}`

Retrieves a payee.

`GET /v1/payees`

Lists payees.

`PATCH /v1/payees/{payee_id}`

Updates payee display metadata.

`DELETE /v1/payees/{payee_id}`

Deactivates a payee.

### Payee Accounts

`POST /v1/payees/{payee_id}/accounts`

Creates a provider account for a payee.

`GET /v1/payees/{payee_id}/accounts`

Lists provider accounts for a payee.

`GET /v1/payees/{payee_id}/accounts/{account_id}`

Retrieves a provider account.

`POST /v1/payees/{payee_id}/accounts/onboarding-link`

Generates a provider-hosted onboarding or account update link.

`POST /v1/payees/{payee_id}/accounts/{account_id}/refresh`

Refreshes provider account state.

### Commission Policies

`POST /v1/commission-policies`

Creates a commission policy.

`GET /v1/commission-policies`

Lists commission policies.

`GET /v1/commission-policies/{policy_id}`

Retrieves one policy.

`PATCH /v1/commission-policies/{policy_id}`

Creates a new policy version or updates future-effective policy metadata.

`DELETE /v1/commission-policies/{policy_id}`

Deactivates a policy for future payments.

Historical allocations SHALL keep their original policy version.

### Refunds

`POST /v1/payments/{payment_id}/refunds`

Creates a full or partial refund.

`GET /v1/payments/{payment_id}/refunds`

Lists refunds for a payment.

`GET /v1/refunds/{refund_id}`

Retrieves one refund.

The Payment Service SHALL know when a refund is created, updated, completed, failed, or reversed for any payment.

Refunds SHALL reverse allocation ledger entries according to the original payment allocation and refund amount.

### Settlements

`GET /v1/settlements`

Lists settlements with filters:

* `client_id`
* `payee_id`
* `status`
* `settlement_route`
* `from`
* `to`

`GET /v1/settlements/{settlement_id}`

Retrieves a settlement.

`POST /v1/settlements/{settlement_id}/hold`

Places a settlement hold.

`POST /v1/settlements/{settlement_id}/release`

Releases a settlement hold.

### Payout Requests

Payout requests support the current RollFinders production model where payments may be collected into the platform account and academies request payout after funds become eligible.

`GET /v1/payees/{payee_id}/balances`

Returns payee balance, including gross paid, platform fees, refunds, held amount, pending payout requests, paid payouts, and available payout amount.

`POST /v1/payees/{payee_id}/payout-requests`

Creates a payout request for eligible payee funds.

The Payment Service SHALL calculate payout eligibility server-side and SHALL reject requests when:

* The payee account is not verified and enabled.
* The requested amount exceeds available balance.
* The requested amount is below the configured minimum.
* Eligible payment allocations are already reserved or paid.
* The funds are held because of refund, dispute, reserve, or operational rules.

`GET /v1/payees/{payee_id}/payout-requests`

Lists payout requests for a payee.

`GET /v1/payout-requests`

Lists payout requests across payees for platform operators.

`GET /v1/payout-requests/{payout_request_id}`

Retrieves one payout request.

`POST /v1/payout-requests/{payout_request_id}/approve`

Approves a pending payout request.

`POST /v1/payout-requests/{payout_request_id}/reject`

Rejects a pending or held payout request and releases reserved entries.

`POST /v1/payout-requests/{payout_request_id}/hold`

Places a payout request on operational hold.

`POST /v1/payout-requests/{payout_request_id}/release`

Releases a payout request hold.

`POST /v1/payout-requests/{payout_request_id}/mark-paid`

Marks an approved payout request as paid after provider payout or manual bank transfer is complete.

`POST /v1/payout-requests/{payout_request_id}/cancel`

Cancels a payee-owned pending payout request.

### Reports

`GET /v1/reports/revenue`

Returns revenue summaries by client, resource, payee, settlement route, and period.

`GET /v1/reports/refunds`

Returns refund summaries.

`GET /v1/reports/settlements`

Returns settlement summaries.

`GET /v1/reports/platform-revenue`

Returns platform commission summaries.

---

## Payment Record Requirements

The Payment Service SHALL record every payment regardless of where funds settle.

This includes:

* Payments settled to the platform account.
* Payments settled directly to connected payee accounts.
* Payments with one allocation.
* Payments with multiple allocations.
* Payments that fail.
* Payments that are refunded.
* Payments that enter dispute.

Payment history APIs SHALL expose normalized fields:

* Gross amount.
* Currency.
* Provider.
* Payment method.
* Canonical status.
* Provider status.
* Settlement route.
* Resource reference.
* Payer reference.
* Payee allocation.
* Platform commission.
* Provider fee when known.
* Refund status.
* Dispute status.

---

## Refund Requirements

The Payment Service SHALL track refunds created by:

* Payment Service API calls.
* Provider dashboard actions.
* Provider webhook events.
* Provider-side dispute or chargeback flows.

When a refund is detected, the Payment Service SHALL:

* Associate it with the original payment.
* Associate it with original allocations.
* Store provider refund ID and status.
* Store amount, currency, reason, and timestamps.
* Reverse payee allocations proportionally for partial refunds.
* Reverse remaining payee allocations for full refunds.
* Reverse platform commission when policy requires it.
* Create negative or recovery ledger entries if a payee has already been settled.
* Update payment status to `partially_refunded` or `refunded`.
* Emit refund events.

---

## Webhook Requirements

The Payment Service SHALL process provider webhooks idempotently.

Webhook processing SHALL:

* Verify provider signatures.
* Store provider event ID.
* Return success for duplicate events.
* Tolerate out-of-order delivery.
* Use transactions and status-transition checks.
* Emit outbox events after durable state changes.

The service SHALL support provider events for:

* Payment succeeded.
* Payment failed.
* Payment cancelled.
* Refund created.
* Refund updated.
* Refund completed.
* Dispute created.
* Dispute updated.
* Payee account updated.
* Capability updated.
* Transfer created.
* Transfer reversed.
* Payout created.
* Payout paid.
* Payout failed.

---

## Events

The Payment Service SHOULD emit or store outbox events:

* `payment.created`
* `payment.succeeded`
* `payment.failed`
* `payment.cancelled`
* `allocation.created`
* `allocation.reversed`
* `refund.created`
* `refund.completed`
* `refund.failed`
* `settlement.created`
* `settlement.completed`
* `settlement.failed`
* `settlement.held`
* `settlement.released`
* `payout_request.created`
* `payout_request.approved`
* `payout_request.rejected`
* `payout_request.held`
* `payout_request.released`
* `payout_request.cancelled`
* `payout_request.paid`
* `payout_request.failed`
* `payee.created`
* `payee.updated`
* `payee.account.updated`
* `payee.account.requirements_due`
* `commission.policy.created`
* `commission.policy.updated`

---

## Error Codes

The API SHALL use the existing error envelope and stable error codes:

* `validation_error`
* `authentication_error`
* `authorization_error`
* `resource_not_found`
* `idempotency_conflict`
* `payment_not_found`
* `payment_invalid_state`
* `provider_error`
* `provider_unavailable`
* `allocation_error`
* `commission_policy_not_found`
* `payee_not_found`
* `payee_account_not_found`
* `payee_account_not_enabled`
* `settlement_not_found`
* `settlement_invalid_state`
* `payout_request_not_found`
* `payout_request_invalid_state`
* `payout_balance_unavailable`
* `refund_failed`
* `internal_error`

---

## Database Requirements

Payment Service database changes SHALL follow the existing database-first structure:

* Tables in `services/payments/migrations/tables`
* Types in `services/payments/migrations/types`
* Functions in `services/payments/migrations/functions`
* Procedures in `services/payments/migrations/procedures`
* Schema changes in `services/payments/migrations/schema`

Application writes SHALL use stored procedures.

Application reads SHALL use functions.

Procedure and function names SHALL use camelCase.

Core tables SHOULD include:

* `clients`
* `payments`
* `payment_allocations`
* `payees`
* `payee_accounts`
* `commission_policies`
* `commission_policy_versions`
* `refunds`
* `settlements`
* `settlement_entries`
* `payout_requests`
* `payout_request_entries`
* `payout_request_status_history`
* `payout_request_audit_events`
* `provider_events`
* `idempotency_keys`
* `outbox_events`

---

## RollFinders Integration Mapping

RollFinders SHALL integrate without changing the generic service model.

RollFinders examples:

* Academy is stored as a generic `payee`.
* Academy Stripe connected account is stored as a generic `payee_account`.
* Course payment is stored as `resource_type: "course_occurrence"`.
* Event payment is stored as `resource_type: "event"`.
* Membership payment is stored as `resource_type: "membership"`.
* RollFinders platform fee is stored as platform commission allocation.

For academy-owned course/event payments:

* Payment may settle directly to the academy payee account.
* RollFinders receives the configured platform commission.
* Stripe application fee SHALL include RollFinders platform commission plus estimated Stripe processing fee.
* Payment Service records the payment regardless of settlement destination.
* Payment Service records refunds against the original payment and academy allocation.

For the current production platform-settlement model:

* Payment may settle to the RollFinders platform account.
* Academy earnings SHALL still be represented as payee allocations.
* Academy Admin users MAY request payout of eligible allocations.
* Platform Admin and Super Admin users SHALL approve, reject, hold, release, or mark payout requests as paid.
* The Payment Service SHALL be the source of truth for payout eligibility and payout request state.
* RollFinders UI SHALL not calculate payout eligibility independently.

---

## Acceptance Criteria

### Generic Domain

IF a future product integrates with the Payment Service
WHEN it creates payments with its own resource type
THEN the Payment Service SHALL store and report those payments without requiring code changes for that business domain.

### Platform Settlement

IF a payment uses platform settlement
WHEN the provider confirms payment success
THEN the Payment Service SHALL record the payment as platform-settled.

### Connected Payee Settlement

IF a payment uses connected payee settlement
WHEN the provider confirms payment success
THEN the Payment Service SHALL record the payee account, allocation, commission, provider references, and canonical payment status.

### Allocation Reporting

IF a payment has allocations
WHEN a client requests allocation detail
THEN the API SHALL return gross amount, payee allocations, platform commission, provider fee when known, and settlement route.

### Academy Payout Requests

IF an academy has platform-settled eligible earnings
WHEN the Academy Admin requests payout
THEN the Payment Service SHALL create a payout request, reserve eligible allocation entries, and return a pending review status.

IF an academy does not have an enabled payout account
WHEN a payout request is created
THEN the Payment Service SHALL reject the request with `payee_account_not_enabled`.

IF a payout request is approved and marked paid
WHEN payee balance is requested
THEN the paid amount SHALL no longer be available for payout.

### Refund Awareness

IF a refund is performed in the provider dashboard
WHEN the provider sends the refund webhook
THEN the Payment Service SHALL associate the refund with the original payment
AND reverse allocation ledger entries according to refund amount.

### Future Reuse

IF a non-academy product uses the service
WHEN it creates payees, resources, payments, and allocations
THEN the API SHALL not require academy, course, event, or RollFinders-specific fields.

---

## Implementation Status

### Done

The current codebase has implemented:

* Standalone `services/payments` Go API container running from the shared compose stack.
* Shared PostgreSQL database server and RollFinders database configuration.
* Payment Service health/readiness endpoints.
* API key authentication for service-to-service calls.
* Database-first payment schema for core payments, checkouts, refunds, provider events, idempotency, status history, and outbox.
* One SQL file per table, function, and procedure in the payment service migration structure.
* CamelCase SQL function/procedure names and camelCase routine filenames for payment stored routines.
* Go data access through stored procedures for writes and SQL functions for reads.
* Hosted checkout creation for RollFinders course/open-mat occurrences.
* Generic payment history records so RollFinders can show payment history without calling Stripe directly.
* Checkout callback proxying through the Payment Service.
* Payment dashboard overview, transactions, earnings, refunds, payouts, and settings surfaces in RollFinders.
* Stripe sandbox checkout support through the configured server-side Stripe key.
* RollFinders dashboard Stripe Connect setup flow for platform and academy account records.
* RollFinders-side storage of connected account details against platform or academy ownership.
* Removal of dashboard-managed Stripe API key storage.
* RollFinders paid/donation checkout guard that prevents collection unless the academy Stripe Connect account is connected, verified, charges-enabled, and payouts-enabled.
* Regression tests covering payment dashboard contracts, no dashboard-managed Stripe keys, connected account ownership, and academy payment readiness gating.

### Partial

The current implementation is intentionally partial for the generic allocation roadmap:

* Connected account setup exists in RollFinders, but the generic Payment Service payee/payee-account APIs are not fully implemented.
* RollFinders stores connected account details in its Prisma model today; the generic `payees` and `payee_accounts` payment-service tables remain a planned migration.
* Course/open-mat checkout integration exists, but payment creation does not yet route direct connected-account settlement with platform commission through the Payment Service.
* Refund records and refund listing exist, but provider-dashboard refund webhook reconciliation and allocation reversal are not complete.
* Payout dashboard UI exists, but provider payout/settlement ledger APIs are not complete.
* Academy payout request workflow is documented but not implemented.
* Webhook endpoint scaffolding exists, but full Stripe Connect account, payout, transfer, application-fee, dispute, and refund event handling remains to be completed.

### Not Done

The following requirements remain to be implemented:

* Generic client registration and client callback URI management.
* Generic payee and payee account APIs in the Payment Service.
* Stripe Connect adapter support for creating/retrieving connected accounts inside the Payment Service boundary.
* Connected-account checkout/payment creation with platform application fees.
* Commission policy tables, versioning, and allocation calculation.
* Payment allocation ledger and settlement ledger APIs.
* Academy payout request APIs, status workflow, reservation ledger, and approval dashboard.
* Provider payout, transfer, application fee, and balance transaction tracking.
* Refund allocation reversal, including provider-dashboard refund detection.
* Reconciliation jobs for provider/payment mismatches.
* Generic non-RollFinders integration contract tests.
* Production-grade webhook signature verification and retry processing.
