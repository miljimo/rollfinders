# Subscription Service Runbook

## Purpose

Use this runbook to inspect subscription state, diagnose entitlement denials, and recover failed subscription plan changes.

Source PRD: `docs/services/subscriptions/product.md`

## Ownership Boundaries

Subscription Service owns:

* products
* product features
* plans
* owner subscriptions
* plan changes
* subscription billing event summaries
* entitlement checks

Subscription Service does not own:

* card payments
* provider refunds
* invoices
* user roles or permissions
* route permission policy

Payment state must be checked through Payment Service. IAM decisions must be checked through Authorisation Service.

## Inspect Current Owner Subscription

Use the owner-scoped current subscription endpoint:

```http
GET /v1/owners/{owner_type}/{owner_id}/subscriptions/current
```

Expected owner types:

```text
academy
organisation
practitioner
application
partner
platform
user
```

If `subscription` is `null`, inspect owner policy and plan requirements before assuming a defect.

## Inspect Owner Entitlements

Use:

```http
GET /v1/owners/{owner_type}/{owner_id}/entitlements
POST /v1/entitlements/check
```

For a denied request, collect:

```text
owner_type
owner_id
application_id
organisation_id
feature_key
permission
route
request_id
```

Common denial reasons:

```text
SUBSCRIPTION_REQUIRED
NO_ACTIVE_SUBSCRIPTION
PLAN_NOT_ACTIVE
PLAN_FEATURE_NOT_INCLUDED
PLAN_LIMIT_EXCEEDED
IAM_PERMISSION_MISSING
ROLE_PERMISSION_MISSING
USER_PERMISSION_MISSING
ACCESS_KEY_PERMISSION_MISSING
OWNER_TYPE_NOT_SUBSCRIPTION_TARGET
FEATURE_NOT_SUBSCRIPTION_CONTROLLED
OWNER_CONTEXT_MISSING
SUBSCRIPTION_OWNER_MISMATCH
```

`PLAN_LIMIT_EXCEEDED` is future-safe for MVP and should not be treated as active usage-metering enforcement unless a later implementation ticket enables it.

## Inspect Plan Changes

Use:

```http
GET /v1/subscriptions/{subscription_id}/plan-changes
GET /v1/subscriptions/{subscription_id}/billing-events
```

Important plan-change statuses:

```text
requested
checkout_pending
payment_confirmed
scheduled
applied
rejected
cancelled
failed
```

For paid plan actions, verify:

* the plan change exists
* a checkout or payment reference exists
* Payment Service has the matching payment status
* the subscription was not activated before payment success

## Recover Failed Checkout

1. Read the subscription.
2. Read plan changes for the subscription.
3. Find the latest `checkout_pending` or `failed` plan change.
4. Confirm the Payment Service checkout or payment state.
5. If payment failed, leave the target plan unapplied and record or verify a failed billing event.
6. If payment succeeded but the plan change was not applied, apply the plan change through the approved Subscription Service recovery path, not by editing Payment Service data.

Do not write directly to Payment Service-owned tables from Subscription Service recovery steps.

## Record Payment Result

Payment Service or an approved recovery operator can notify Subscription Service of the payment result for a plan change:

```http
POST /v1/subscriptions/plan-changes/{plan_change_id}/payment-result
```

Success example:

```json
{
  "status": "success",
  "payment_id": "payment_123",
  "provider": "stripe",
  "provider_reference": "cs_test_123"
}
```

Failure example:

```json
{
  "status": "failed",
  "payment_id": "payment_123",
  "provider": "stripe",
  "provider_reference": "cs_test_123"
}
```

Expected success result:

* the plan change is marked `applied`
* the subscription moves to the target plan
* a `plan_change_applied` billing event is recorded

Expected failure result:

* the plan change is marked `failed`
* the subscription remains on the current plan
* a `payment_failed` billing event is recorded

## Apply Due Scheduled Downgrades

Scheduled downgrades apply at `effective_at`.

Use the internal apply-due operation:

```http
POST /v1/subscriptions/plan-changes/apply-due
```

Optional request:

```json
{
  "now": "2026-06-27T12:00:00Z",
  "limit": 100
}
```

Expected result:

* due `scheduled` downgrade plan changes become `applied`
* the subscription moves to the target plan
* removed features disappear from entitlement responses
* a `scheduled_downgrade_applied` billing event is recorded

The operation is idempotent. Re-running it must not reapply already-applied changes.

The subscriptions API also runs the same downgrade application logic as a background scheduler. The runtime interval is controlled by:

```text
SUBSCRIPTION_DOWNGRADE_SCHEDULER_INTERVAL
```

The default runtime interval is `5m`. Set it to `0` only for local diagnostics or when another approved scheduler is responsible for calling the apply-due operation.

## Cancel And Reactivate

Cancel at period end:

```http
POST /v1/subscriptions/{subscription_id}/cancel
```

Expected result:

* status becomes `cancel_at_period_end`
* `cancel_at` is set to the current billing period end
* entitlements remain active until cancellation is effective

Reactivate before cancellation takes effect:

```http
POST /v1/subscriptions/{subscription_id}/reactivate
```

Expected result:

* status returns to `active`
* `cancel_at` is cleared
* entitlements continue from the active plan

## Safety Checks Before Manual Recovery

Before any mutating recovery:

* confirm the owner context is correct
* confirm the active subscription ID
* confirm the target plan ID
* confirm Payment Service status for paid actions
* confirm the plan change has not already been applied
* confirm the action stays within Subscription Service-owned data

Do not log:

```text
Bearer tokens
Payment card data
Secrets
Raw provider payloads containing sensitive data
```

## Migration And Rollback Notes

Subscription schema changes live under:

```text
apps/backend_api/migrations/subscriptions/
```

The core schema migration creates or updates only Subscription Service-owned objects in the `subscriptions` schema:

```text
products
product_features
plans
plan_features
plan_products
subscriptions
subscription_owner_policies
subscription_plan_changes
subscription_billing_events
subscription_audit_events
subscription_plan_audit_events
```

Before rolling back a subscription migration:

* confirm no active checkout, payment callback, or downgrade scheduler operation is running
* export affected subscription, plan-change, billing-event, and audit rows for the impacted owners
* verify Payment Service references separately instead of deleting Payment Service data
* prefer forward-fix migrations for production data corrections
* never drop non-Subscription Service schemas as part of subscription rollback

For local development only, the migration may recreate the `subscriptions` schema when the legacy shape is detected. Do not use local reset behavior as a production rollback plan.

## Verification After Recovery

After recovery, verify:

```http
GET /v1/owners/{owner_type}/{owner_id}/subscriptions/current
GET /v1/owners/{owner_type}/{owner_id}/entitlements
GET /v1/subscriptions/{subscription_id}/plan-changes
GET /v1/subscriptions/{subscription_id}/billing-events
```

The final access decision still requires both:

```text
owner plan entitlement
user IAM permission
```
