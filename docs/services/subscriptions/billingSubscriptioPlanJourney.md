# PRD: Billing And Subscription Plan Journey

Product: RollFinders

Services: Subscription Service, Payment Service, Authorisation Service, API Gateway, Portal

Status: Draft

Last updated: 2026-06-25

---

## Objective

Create a complete subscription journey that allows an organisation to subscribe to a plan, upgrade to a higher plan, request or apply a downgrade to a lower plan, cancel a plan, and have the active plan enforce available product features across the platform.

The system must keep billing, subscription state, and access enforcement separate:

```text
Subscription Service owns plans, subscriptions, plan changes, and entitlements.
Payment Service owns checkout, payment status, refunds, provider events, and billing records.
Authorisation Service owns user role and permission decisions.
API Gateway combines entitlement and permission checks before forwarding protected requests.
Portal renders the plan journey and admin controls.
```

---

## Background

RollFinders now has subscription products, features, plans, and application entitlements. The next step is to define the customer journey from selecting a plan through payment, activation, plan changes, cancellation, and access enforcement.

This PRD intentionally excludes user limits, seat limits, usage metering, quotas, trials, tax, coupons, and invoice accounting. Those should be handled as later PRDs.

---

## Goals

* Let an eligible admin subscribe an organisation/application to a plan.
* Show the correct action for every plan:
  * no active plan: `Subscribe`;
  * higher-priced plan: `Upgrade`;
  * lower-priced plan: `Downgrade`;
  * same-price non-current plan: `Switch Plan`;
  * active plan: `Current Plan`.
* Activate free/manual plans without payment where policy allows.
* Use Payment Service checkout for paid plan activation and paid upgrades.
* Activate paid subscriptions only after payment confirmation.
* Schedule downgrades for the end of the current billing period unless an admin explicitly applies immediately.
* Publish active plan entitlements for Authorisation/API Gateway enforcement.
* Deny access when the active plan does not include the required feature.
* Record clear lifecycle and audit events for plan changes.

---

## Non-Goals

* User limits.
* Seat limits.
* Usage limits.
* Usage metering.
* Tax calculation.
* Coupon or promotion codes.
* Complex invoice accounting.
* Proration ledger beyond a clear placeholder field/model.
* Multi-provider billing abstraction beyond the existing Payment Service checkout contract.

---

## Core Concepts

### Plan

A commercial package that contains a price, billing cycle, status, and included products/features.

### Subscription

The active or historical relationship between an owner and a plan.

For RollFinders this should normally be scoped to:

```text
application_id
organisation_id
plan_id
```

### Plan Change

A requested change from one plan to another.

Plan changes can be:

```text
subscribe
upgrade
downgrade
switch
cancel
reactivate
```

### Entitlement

The runtime feature set produced by the active subscription plan.

Entitlements are not user permissions. They define what the organisation/application has commercially purchased.

---

## Customer Journey

### 1. View Plans

The portal displays available plans in price order.

Each plan must show:

* plan name;
* price;
* billing cycle;
* current-plan marker when applicable;
* feature comparison;
* plan action button.

Button rules:

| Current State | Compared Plan | Button |
| --- | --- | --- |
| No active subscription | Any available plan | Subscribe |
| Active plan exists | Same plan | Current Plan |
| Active plan exists | Higher price | Upgrade |
| Active plan exists | Lower price | Downgrade |
| Active plan exists | Same price, different plan | Switch Plan |

### 2. Subscribe

When the user selects `Subscribe`:

1. Portal sends subscription request to Subscription Service through API Gateway.
2. Subscription Service validates organisation/application/plan.
3. If the plan price is `0` or billing cycle is `free/manual`, Subscription Service activates the subscription directly.
4. If the plan is paid, Subscription Service creates a pending subscription and requests a Payment Service checkout.
5. Portal redirects the user to the checkout URL.
6. Payment Service confirms payment through callback/webhook.
7. Subscription Service activates the subscription.
8. Entitlements are published for the application/organisation.

### 3. Upgrade

When the user selects `Upgrade`:

1. Subscription Service creates an upgrade plan-change request.
2. If payment is required, Payment Service creates a checkout.
3. On successful payment, Subscription Service applies the upgrade immediately.
4. Entitlements are recalculated immediately.
5. API Gateway starts enforcing the upgraded feature set on the next request.

### 4. Downgrade

When the user selects `Downgrade`:

1. Subscription Service creates a downgrade request.
2. Default behaviour is scheduled downgrade at `current_period_end`.
3. The current plan remains active until the scheduled date.
4. At the scheduled date, Subscription Service applies the new plan.
5. Entitlements are recalculated.
6. Features removed by the lower plan become inaccessible.

Immediate downgrade can be added later as an admin-only operation if required.

### 5. Switch Plan

When the user selects `Switch Plan` for a same-price plan:

1. Subscription Service creates a switch request.
2. If no payment adjustment is required, apply immediately.
3. Entitlements are recalculated immediately.

### 6. Cancel

Cancellation should default to end-of-period cancellation.

1. User or admin requests cancellation.
2. Subscription Service sets `cancel_at_period_end = true`.
3. Entitlements remain active until period end.
4. At period end, subscription becomes `cancelled`.
5. Entitlements are removed or moved to the free/default plan if configured.

---

## Subscription Statuses

Required statuses:

```text
pending
checkout_pending
active
past_due
scheduled_downgrade
cancel_at_period_end
cancelled
suspended
failed
```

---

## Plan Change Statuses

Required statuses:

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

---

## Enforcement Rule

For every protected API request, access is allowed only when:

```text
Authenticated subject exists
AND active subscription includes required feature
AND role/permission allows required action
AND access key allows required action, if an access key is used
```

The plan is the commercial ceiling. Role and permission checks cannot grant access to a feature outside the active plan.

---

## Service Responsibilities

### Portal

* Display plan comparison.
* Display correct Subscribe/Upgrade/Downgrade/Switch labels.
* Display current plan.
* Start plan actions.
* Show pending changes and cancellation state.
* Redirect to checkout when required.

### API Gateway

* Protect subscription and billing routes.
* Call Authorisation Service before proxying protected subscription routes.
* For protected business routes, enforce both plan entitlement and permission decisions.
* Deny by default when no explicit allow is returned.

### Subscription Service

* Own product, feature, plan, subscription, plan-change, and entitlement data.
* Create pending subscriptions and plan changes.
* Decide whether a plan action requires payment.
* Request checkout creation from Payment Service.
* Apply successful plan changes.
* Publish active entitlements.
* Expose current subscription and plan-change state.

### Payment Service

* Create checkout sessions for paid plan actions.
* Record payment status.
* Receive provider callbacks/webhooks.
* Notify Subscription Service of successful or failed payment.
* Store payment references against generic subscription resources.

### Authorisation Service

* Continue owning roles, permissions, resources, and access decisions.
* Evaluate permission access.
* Include entitlement/plan checks in the final decision path either by calling Subscription Service or consuming published entitlement data.

---

## Proposed Data Additions

Exact schema can vary, but the domain needs these records.

### subscription_plan_changes

```text
id
subscription_id
application_id
organisation_id
from_plan_id
to_plan_id
change_type
status
effective_at
payment_id
checkout_id
requested_by
approved_by
created_at
updated_at
```

### subscription_billing_events

```text
id
subscription_id
plan_change_id
payment_id
event_type
status
amount_minor
currency
provider
provider_reference
metadata
created_at
```

---

## API Requirements

### Subscription Service

Required endpoints:

```http
GET /v1/applications/{applicationId}/subscriptions/current
GET /v1/applications/{applicationId}/subscriptions
POST /v1/applications/{applicationId}/subscriptions
POST /v1/subscriptions/{subscriptionId}/plan-changes
GET /v1/subscriptions/{subscriptionId}/plan-changes
POST /v1/subscriptions/{subscriptionId}/cancel
POST /v1/subscriptions/{subscriptionId}/reactivate
GET /v1/applications/{applicationId}/entitlements
```

### Payment Service

Payment Service should support a generic checkout request for subscription resources:

```json
{
  "client_id": "rollfinders",
  "resource_type": "subscription_plan_change",
  "resource_id": "plan_change_123",
  "resource_label": "Academy Pro monthly subscription",
  "amount": 6900,
  "currency": "GBP",
  "provider": "stripe",
  "payment_method_type": "card",
  "metadata": {
    "application_id": "app_rollfinders",
    "organisation_id": "org_123",
    "subscription_id": "sub_123",
    "plan_change_id": "plan_change_123",
    "to_plan_id": "plan_academy_pro"
  }
}
```

---

## Acceptance Criteria

* User can see all active/selectable plans.
* User sees `Subscribe` when there is no current plan.
* User sees `Upgrade` for plans higher than the current plan.
* User sees `Downgrade` for plans lower than the current plan.
* User sees `Current Plan` for the active plan.
* Free/manual plans can be activated without checkout.
* Paid plans create a checkout before activation.
* Successful payment activates the subscription or plan change.
* Failed payment leaves the subscription or plan change pending/failed and does not grant entitlements.
* Downgrades are scheduled by default.
* Active entitlements match the active plan.
* API Gateway denies access to features outside the active plan.
* Role/permission access cannot bypass plan entitlements.
* Lifecycle events are auditable.

---

## Tickets

### Ticket 1: Define Subscription Lifecycle Model

Owner: Backend

Scope:

* Add or confirm subscription statuses.
* Add plan-change statuses.
* Add domain rules for subscribe, upgrade, downgrade, switch, cancel, and reactivate.

Acceptance:

* Subscription Service has a documented state transition model.
* Invalid state transitions are rejected.

### Ticket 2: Add Plan Change Storage

Owner: Database

Scope:

* Add `subscription_plan_changes`.
* Add indexes for subscription/application/organisation/status.
* Add migration and rollback notes.

Acceptance:

* Plan change records can be created, listed, and updated.
* Migration runs locally.

### Ticket 3: Add Billing Event Storage

Owner: Database

Scope:

* Add `subscription_billing_events`.
* Store payment/checkout references.
* Store provider metadata as generic JSON.

Acceptance:

* Billing events can be attached to subscriptions and plan changes.

### Ticket 4: Subscription Service Plan Action API

Owner: Backend

Scope:

* Implement `POST /v1/subscriptions/{subscriptionId}/plan-changes`.
* Implement subscribe/upgrade/downgrade/switch action handling.
* Return checkout requirement when payment is needed.

Acceptance:

* Free plan changes apply directly.
* Paid plan changes return checkout details or checkout intent.
* Downgrades are scheduled by default.

### Ticket 5: Payment Checkout Integration

Owner: Backend

Scope:

* Use Payment Service checkout for paid subscription actions.
* Use generic `resource_type = subscription_plan_change`.
* Store checkout/payment references in Subscription Service.

Acceptance:

* Paid subscription action creates a Payment Service checkout.
* Subscription is not activated until payment success.

### Ticket 6: Payment Success Callback Handling

Owner: Backend

Scope:

* Add internal callback or event consumer for payment success/failure.
* Mark plan change as `payment_confirmed` or `failed`.
* Apply successful plan changes.

Acceptance:

* Successful payment activates the target plan.
* Failed payment does not grant entitlements.

### Ticket 7: Current Subscription API

Owner: Backend

Scope:

* Implement `GET /v1/applications/{applicationId}/subscriptions/current`.
* Return active subscription, current plan, pending change, and cancellation state.

Acceptance:

* Portal can render current plan state from one API call.

### Ticket 8: Entitlement Publication

Owner: Backend

Scope:

* Ensure active plan features produce application entitlements.
* Recalculate entitlements when subscription changes.

Acceptance:

* Entitlements always match the active plan.
* Pending downgrades do not remove current entitlements until effective date.

### Ticket 9: API Gateway Plan Enforcement

Owner: Backend

Scope:

* Add entitlement check into protected route authorisation flow.
* Deny when required feature is not in active plan.
* Preserve existing role/permission checks.

Acceptance:

* Plan excluded feature returns not authorised before downstream service call.
* Role/permission cannot bypass plan.

### Ticket 10: Authorisation Decision Contract Update

Owner: Backend

Scope:

* Extend access decision request/response to include required feature and plan denial reason.
* Add audit reasons:
  * `PLAN_NOT_ACTIVE`
  * `PLAN_FEATURE_NOT_INCLUDED`
  * `ROLE_PERMISSION_MISSING`
  * `USER_PERMISSION_MISSING`
  * `ACCESS_KEY_PERMISSION_MISSING`

Acceptance:

* Denied plan requests include a clear denial reason.
* Denials are auditable.

### Ticket 11: Portal Plan Action UI

Owner: Frontend

Scope:

* Show current plan.
* Show Subscribe/Upgrade/Downgrade/Switch labels.
* Add pending downgrade/cancellation notices.
* Redirect to checkout when backend returns checkout URL.

Acceptance:

* Plan comparison presents correct action labels.
* Paid plan action starts checkout.
* Free plan action activates without checkout.

### Ticket 12: Portal Current Subscription State

Owner: Frontend

Scope:

* Load current subscription from Subscription Service.
* Replace application entitlement-only current-plan detection where needed.
* Display pending plan changes.

Acceptance:

* UI reflects active plan and pending plan changes after refresh.

### Ticket 13: Downgrade Scheduler

Owner: Backend

Scope:

* Add worker/job to apply scheduled downgrades at `effective_at`.
* Recalculate entitlements.
* Record billing/lifecycle event.

Acceptance:

* Scheduled downgrade applies automatically at effective date.

### Ticket 14: Cancellation And Reactivation

Owner: Backend

Scope:

* Implement cancel at period end.
* Implement reactivation before cancellation takes effect.
* Expose status in current subscription API.

Acceptance:

* Cancelled subscriptions stop granting paid entitlements after period end.
* Reactivated subscriptions remain active.

### Ticket 15: End-To-End Tests

Owner: QA / Backend / Frontend

Scope:

* Test subscribe to free plan.
* Test subscribe to paid plan through mocked checkout.
* Test upgrade.
* Test scheduled downgrade.
* Test cancelled subscription entitlement removal.
* Test API denial for excluded feature.

Acceptance:

* E2E tests cover happy path and denial path.
* Tests pass in local CI.

### Ticket 16: Operational Runbook

Owner: Platform

Scope:

* Document how to inspect subscription state.
* Document how to inspect payment references.
* Document how to recover failed checkout/plan change.
* Document how to manually apply or cancel pending plan changes.

Acceptance:

* Operators can debug billing/subscription issues without reading code.
