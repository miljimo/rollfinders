# PRD: RollFinders Subscription Proposal

## Product

RollFinders

## Services Involved

* Subscription Service
* Payment Service
* Authorisation Service
* API Gateway / Orchestrator
* Organisation Service
* Portal / Dashboard

## Status

Draft for MVP implementation

## Last Updated

2026-06-26

---

# 1. Overview

RollFinders needs a dedicated Subscription Service that manages commercial products, product features, plans, subscriptions, plan changes, and entitlements.

The Subscription Service must answer:

```text
What has this owner purchased?
Which product features are included in the active plan?
Which product features are not available to this plan?
```

The Subscription Service must not process payments and must not decide user permissions.

Clear ownership:

```text
Subscription Service answers:
What plan and features does this owner have?

Payment Service answers:
Was the customer charged?

Authorisation Service answers:
Can this user perform this action on this resource?

API Gateway answers:
Should this request be allowed after combining IAM and subscription checks?
```

This separation keeps commercial packaging, billing, and access control independent.

---

# 2. Core Subscription Rule

Subscriptions are not automatically assigned to users.

A subscription belongs to a subscription owner, such as:

```text
academy
organisation
practitioner
```

Users only receive access to subscription-controlled features when they are operating inside the scope of a subscribed owner and their IAM permissions also allow the action.

Example:

```text
Academy A has Academy Pro.

User John is an academy owner for Academy A.

John can access Academy Pro features only when acting under Academy A,
and only if IAM allows the action.
```

The subscription is not copied to John’s personal user account.

If John also belongs to Academy B, and Academy B has no active subscription, John cannot use Academy Pro features under Academy B.

Final principle:

```text
Subscription belongs to the owner.

IAM belongs to the user.

Final access requires both owner entitlement and user permission.
```

---

# 3. Objectives

The MVP must:

* Define RollFinders products as purchasable capability areas.
* Define stable product feature keys under each product.
* Define plans as explicit bundles of product features.
* Support owner-based subscriptions for academies, organisations, and practitioners.
* Prevent automatic subscription assignment to normal user accounts.
* Support IAM-only access for platform users and non-subscription-controlled features.
* Publish active subscription entitlements.
* Enforce plan access through the API Gateway before requests reach downstream services.
* Support subscribing, upgrading, downgrading, switching, cancelling, and reactivating plans.
* Integrate with the Payment Service for paid plans.
* Activate paid subscriptions only after payment confirmation.
* Keep audit records for subscription and access-denial decisions.

---

# 4. Non-Goals For MVP

The MVP does not include:

* Seat limits.
* User limits.
* Usage metering.
* Usage-based billing.
* Tax calculation.
* Coupon codes.
* Promotion codes.
* Complex invoice accounting.
* Automatic refunds.
* Full proration ledger.
* Multi-payment-provider abstraction beyond the Payment Service contract.
* Automatically assigning subscriptions to all users under an organisation or academy.

Usage limit denial reasons may exist as future-safe constants, but actual usage-limit enforcement should not be implemented in this MVP.

---

# 5. Service Responsibilities

## 5.1 Subscription Service Owns

The Subscription Service owns:

* Product catalogue.
* Product feature catalogue.
* Plan catalogue.
* Plan pricing metadata.
* Plan feature allowlists.
* Subscription owner policies.
* Owner subscription lifecycle state.
* Plan changes.
* Trials, where later supported.
* Renewals.
* Upgrades.
* Downgrades.
* Plan switches.
* Cancellations.
* Reactivations.
* Checkout handoff requests.
* Billing event summaries.
* Entitlement publication.
* Entitlement decision checks.

## 5.2 Subscription Service Does Not Own

The Subscription Service must not own:

* Card payments.
* Stripe accounts.
* Payment provider accounts.
* Refund processing.
* Invoice payment collection.
* Payment ledger.
* User roles.
* User permissions.
* API route permissions.
* Resource-level access decisions.
* Automatic user-level subscription assignment.

---

# 6. Service Boundaries

## 6.1 Organisation Service

Organisation Service owns:

* Organisations.
* Applications.
* Application lifecycle status.
* Application-service enablement.
* Tenant-level service availability.

Subscription Service should use Organisation Service to know which platform services are available for an application before creating or editing plans.

Example endpoint:

```http
GET /v1/applications/{application_id}/services
```

Example response:

```json
{
  "services": [
    { "service_key": "academy", "enabled": true },
    { "service_key": "booking", "enabled": true },
    { "service_key": "analytics", "enabled": false },
    { "service_key": "payment", "enabled": true }
  ]
}
```

If a service is disabled for an application, Subscription Service must not offer products or features that depend on that service during plan creation.

## 6.2 Payment Service

Payment Service owns:

* Checkout sessions.
* Payment methods.
* Payment providers.
* Payment status.
* Refunds.
* Invoices.
* Transaction history.
* Provider webhooks.
* Payout and connected-account state.

Payment Service must not know what a subscription includes.

Subscription Service must not call Stripe or any payment provider directly.

For paid subscription actions:

```text
Subscription Service creates the pending subscription or plan change.
Subscription Service asks Payment Service to create checkout.
Payment Service processes payment.
Payment Service notifies Subscription Service of success or failure.
Subscription Service activates or fails the subscription change.
```

Payment Service billing routes must not reuse the Subscription Service route family.

Subscription Service route family:

```http
/v1/subscriptions/...
```

Payment Service billing route family:

```http
/v1/billing/subscriptions/...
/v1/billing/checkout/...
/v1/billing/invoices/...
```

Subscription Service may store Payment Service IDs, checkout IDs, provider references, and billing event summaries, but it must not duplicate payment accounting.

## 6.3 Authorisation Service

Authorisation Service owns:

* Roles.
* Permissions.
* Resources.
* Permission assignments.
* Effective permission resolution.
* IAM access decisions.

Authorisation Service must not own:

* Commercial plans.
* Subscription definitions.
* Payment logic.
* Product packaging.

Protected Subscription Service routes must be authorised through the API Gateway and Authorisation Service.

Only infrastructure routes may be public:

```http
GET /healthz
GET /readyz
```

All product, feature, plan, subscription, and entitlement routes require authorisation.

## 6.4 API Gateway / Orchestrator

The API Gateway must combine IAM and subscription checks before forwarding protected requests.

Example:

```text
1. Check Subscription Service:
   Does this owner have `booking.create_event`?

2. Check Authorisation Service:
   Can this user create bookings for this academy?

3. Allow request only when both checks allow.
```

Browser and mobile clients must not call Subscription Service directly. They must use the API Gateway or Orchestrator.

---

# 7. Core Concepts

## 7.1 Product

A product is a purchasable capability area.

Examples:

```text
Academy Management
Bookings
Courses
Analytics
Payments
API Access
Notifications
```

A product does not grant access by itself. Access is granted through product features included in a plan.

## 7.2 Product Feature

A product feature is a stable commercial capability key.

Examples:

```text
academy.profile.manage
academy.team.manage
academy.featured_listing
booking.create_event
booking.unlimited_events
course.create
course.update
course.delete
analytics.dashboard.view
analytics.export
payment.accept_online
api.access.basic
api.access.partner
notification.email.send
```

Product features are not IAM permissions.

They describe what the owner has purchased, not what a specific user can do.

## 7.3 Plan

A plan is a commercial package with:

* Name.
* Price.
* Billing cycle.
* Status.
* Included product features.
* Optional limits.
* Optional metadata.

Examples:

```text
Free
Academy Starter
Academy Pro
Enterprise
Practitioner Plus
```

## 7.4 Subscription

A subscription is the relationship between an owner and a plan.

Supported subscription owner types:

```text
academy
organisation
practitioner
partner
```

Priority for MVP:

```text
academy
organisation
practitioner
```

A subscription must not be automatically created or assigned to every user.

## 7.5 Entitlement

An entitlement is the runtime grant produced from an active owner subscription.

If an academy subscribes to `Academy Pro`, the Subscription Service publishes the active product features for that academy as entitlements.

Consumers must treat missing features as unavailable.

---

# 8. Subscription Target Owners

Subscriptions are supported for:

```text
academy
organisation
practitioner
partner
```

For MVP, implement:

```text
academy
organisation
practitioner
```

Recommended persisted values:

```text
academy
organisation
practitioner
partner
platform
application
user
```

Do not persist uppercase enum values. Use lowercase persisted values and map display labels in the UI.

---

# 9. User Access Through Subscription Owner Context

A user can benefit from a subscription only when all conditions are true:

```text
The request has a subscription owner context.
The owner has an active subscription.
The active plan includes the requested feature.
The user has the required IAM role or permission for that owner/resource.
```

If the request has no subscription owner context, the system must not assume the user has subscription access.

For academy and organisation subscriptions, the API Gateway must check:

```text
owner_type
owner_id
active subscription for owner
required feature key
IAM permission for the user in that owner/resource scope
```

Example request context:

```text
owner_type = academy
owner_id = academy_123
user_id = user_456
feature_key = booking.create_event
permission = course.create
```

The access decision is:

```text
Does academy_123 have a plan that includes booking.create_event?

AND

Does user_456 have permission to create courses for academy_123?
```

---

# 10. Practitioner Exception

Practitioner subscriptions are the only case where a subscription may be tied directly to an individual person.

Even then, the commercial owner should be:

```text
owner_type = practitioner
owner_id = user_id
```

This is different from saying every user automatically has a subscription.

A normal user account does not receive subscription entitlements unless they deliberately initialise or are assigned a practitioner subscription.

Recommended rule:

```text
Practitioner subscriptions are supported only when explicitly initialised for a practitioner owner.

User accounts must not receive subscriptions automatically.
```

---

# 11. Non-Subscription Platform Users

The following platform-level users do not require customer subscriptions by default:

```text
super_admin
platform_admin
platform_engineer
support_operator
```

These users are controlled by IAM roles and permissions.

They are not treated as customers purchasing plans unless an internal platform billing model is introduced later.

---

# 12. Access Modes

## 12.1 IAM-Only Mode

IAM-only mode applies when:

```text
Owner type is not subscription-targeted
OR feature is not subscription-controlled
OR platform is in bootstrap mode
OR no subscription policy is enabled for that owner type.
```

In IAM-only mode, access is controlled by:

```text
Authentication
Role
Permission
Resource ownership
Resource scope
```

Example:

```text
Platform Admin manages system settings.

No customer subscription is required.

IAM decides access.
```

## 12.2 Subscription-Enforced Mode

Subscription-enforced mode applies when:

```text
Owner type is subscription-targeted
AND requested feature is subscription-controlled
AND subscription policy requires or enforces a subscription for that owner.
```

Access requires:

```text
Active owner subscription
Plan includes requested feature
User role allows action
User permission allows action
Access key allows action, if used
Usage limit has not been exceeded, if usage limits exist later
```

---

# 13. Rule When There Is No Subscription

Recommended policy:

```text
No subscription = IAM-only access to free, public, or basic features.
No subscription = deny paid or subscription-controlled features.
```

Example:

Academy has no subscription.

Allowed:

```text
View own basic academy profile
View public plans
Request subscription setup
Start free plan
Contact support
```

Denied:

```text
Create paid courses
Create bookable events
Use analytics
Use featured listing
Use API access
Accept online payments
```

---

# 14. Subscription Owner Policy

Add a policy table to define which owner types support or require subscriptions.

```sql
CREATE TABLE IF NOT EXISTS subscription_owner_policies (
    id text PRIMARY KEY,
    owner_type text NOT NULL UNIQUE,
    subscription_supported boolean NOT NULL DEFAULT false,
    subscription_required boolean NOT NULL DEFAULT false,
    default_plan_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

Example seed data:

```text
academy        supported=true   required=true
organisation  supported=true   required=true
practitioner  supported=true   required=false
partner       supported=true   required=false
platform      supported=false  required=false
application   supported=false  required=false
user          supported=false  required=false
```

Default should be safe:

```text
unsupported
not required
```

unless explicitly configured.

---

# 15. Product Catalogue

Each product must declare the service it depends on.

Example:

| Service Key  | Product Key        | Product            |
| ------------ | ------------------ | ------------------ |
| academy      | academy_management | Academy Management |
| booking      | bookings           | Bookings           |
| course       | courses            | Courses            |
| analytics    | analytics          | Analytics          |
| payment      | payments           | Payments           |
| notification | notifications      | Notifications      |
| api          | api_access         | API Access         |

Product fields:

```text
id
product_key
service_key
display_name
description
status
plan_selectable
created_at
updated_at
```

Example:

```json
{
  "product_key": "bookings",
  "service_key": "booking",
  "display_name": "Bookings",
  "status": "active",
  "plan_selectable": true
}
```

---

# 16. Product Feature Catalogue

Each product feature must have a stable machine key.

Feature fields:

```text
id
product_id
product_key
feature_key
display_name
description
status
subscription_controlled
plan_selectable
limits
created_at
updated_at
```

Example:

```json
{
  "feature_key": "booking.create_event",
  "product_key": "bookings",
  "display_name": "Create bookable events",
  "status": "active",
  "subscription_controlled": true,
  "plan_selectable": true,
  "limits": {
    "active_events_per_month": "optional"
  }
}
```

Feature keys must remain stable.

Display names may change without breaking enforcement.

---

# 17. Subscription-Controlled Features

Not every feature must require a subscription.

Add:

```text
subscription_controlled boolean
```

Examples:

| Feature Key                   | Subscription Controlled |
| ----------------------------- | ----------------------: |
| academy.public.view           |                   false |
| academy.profile.manage        |                    true |
| course.create                 |                    true |
| analytics.dashboard.view      |                    true |
| subscription.plan.view_public |                   false |

This allows public/basic access while protecting premium capabilities.

---

# 18. Plan Rules

Plans must use explicit feature allowlists.

A plan only includes the features listed in its plan-feature records.

The Subscription Service must not infer access from product names.

Example:

```text
A plan that includes Academy Management does not automatically include academy.featured_listing.
```

Required rules:

* A plan must list every included product feature explicitly.
* A plan must reject unknown feature keys.
* A plan must reject inactive or retired product features.
* A plan must publish only active included features as entitlements.
* A plan must treat missing features as unavailable.
* A plan may include quota or limit values for included features.

Default rule:

```text
Missing feature = deny
```

---

# 19. Cannot-Have Rule

A plan cannot use a product feature when:

```text
Feature key is not listed in the plan
OR feature key does not exist
OR feature is inactive or retired
OR subscription is inactive
OR subscription is cancelled
OR subscription is expired
OR trial window has ended
OR feature limit is exhausted, if usage limits exist later.
```

---

# 20. Example Plan Matrix

| Feature                  | Free | Academy Starter | Academy Pro | Enterprise |
| ------------------------ | ---: | --------------: | ----------: | ---------: |
| academy.profile.manage   |  Yes |             Yes |         Yes |        Yes |
| academy.team.manage      |   No |             Yes |         Yes |        Yes |
| academy.featured_listing |   No |              No |         Yes |        Yes |
| booking.create_event     |   No |         Limited |         Yes |        Yes |
| booking.unlimited_events |   No |              No |         Yes |        Yes |
| analytics.dashboard.view |   No |              No |         Yes |        Yes |
| analytics.export         |   No |              No |          No |        Yes |
| api.access.basic         |   No |              No |          No |        Yes |
| api.access.partner       |   No |              No |          No |        Yes |

The matrix is for product documentation and UI display.

The database source of truth is still the plan-feature allowlist.

---

# 21. Entitlement Output

Subscription Service must expose active entitlements.

Example:

```json
{
  "owner_type": "academy",
  "owner_id": "academy_123",
  "organisation_id": "org_123",
  "application_id": "app_rollfinders",
  "subscription_id": "sub_123",
  "plan_key": "academy_pro",
  "status": "active",
  "features": [
    {
      "key": "academy.profile.manage",
      "product_key": "academy_management",
      "limits": null
    },
    {
      "key": "booking.create_event",
      "product_key": "bookings",
      "limits": {
        "active_events_per_month": null
      }
    },
    {
      "key": "analytics.dashboard.view",
      "product_key": "analytics",
      "limits": null
    }
  ]
}
```

Consumers must treat missing features as unavailable.

---

# 22. Entitlement Decision Endpoint

Subscription Service must expose an entitlement check endpoint.

```http
POST /v1/entitlements/check
```

Request:

```json
{
  "owner_type": "academy",
  "owner_id": "academy_123",
  "application_id": "app_rollfinders",
  "organisation_id": "org_123",
  "resource_id": "course_123",
  "feature_key": "booking.create_event"
}
```

Response:

```json
{
  "allowed": false,
  "decision": "deny",
  "reason": "PLAN_FEATURE_NOT_INCLUDED",
  "owner_policy": {
    "subscription_supported": true,
    "subscription_required": true
  },
  "subscription_id": "sub_123",
  "plan_id": "plan_starter",
  "feature_key": "booking.create_event"
}
```

Decision rules:

| Condition                                           | Result                  |
| --------------------------------------------------- | ----------------------- |
| Owner type unsupported                              | Pass subscription check |
| Feature is not subscription-controlled              | Pass subscription check |
| Required subscription missing                       | Deny                    |
| Active subscription missing requested feature       | Deny                    |
| Active subscription includes requested feature      | Allow                   |
| Platform owner policy does not require subscription | Pass subscription check |

---

# 23. Access Evaluation Logic

For every protected request, the API Gateway must:

1. Authenticate the subject.
2. Resolve the route permission.
3. Resolve owner context.
4. Resolve required subscription feature key, if any.
5. Call Authorisation Service for IAM decision.
6. Call Subscription Service for entitlement decision when the route has a subscription feature key.
7. Combine both decisions.
8. Deny before proxying when either decision denies.
9. Audit the decision.

Final rule:

```text
Allow only when IAM allows AND subscription allows or passes.
```

The gateway must not check whether the user personally has a subscription unless the request is for a practitioner subscription.

For academy and organisation subscriptions, the owner subscription is checked, not the user account.

---

# 24. Final Decision Matrix

| Subscription Target Owner | Active Owner Subscription | Plan Includes Feature | IAM Allows User Action | Result                |
| ------------------------- | ------------------------: | --------------------: | ---------------------: | --------------------- |
| No                        |              Not required |          Not required |                    Yes | Allow                 |
| No                        |              Not required |          Not required |                     No | Deny                  |
| Yes                       |                        No |                    No |                    Yes | Deny for paid feature |
| Yes                       |                       Yes |                    No |                    Yes | Deny                  |
| Yes                       |                       Yes |                   Yes |                     No | Deny                  |
| Yes                       |                       Yes |                   Yes |                    Yes | Allow                 |

---

# 25. Access Examples

## Example 1: Academy Without Subscription

Academy:

```text
No active subscription
```

User role:

```text
academy_owner
```

IAM permission:

```text
course.create = true
```

Requested feature:

```text
booking.create_event
```

Result:

```text
DENY
```

Reason:

```text
SUBSCRIPTION_REQUIRED
```

## Example 2: Academy With Starter Plan

Plan includes:

```text
academy.profile.manage
course.create
course.update
```

Plan does not include:

```text
course.delete
analytics.dashboard.view
```

User has IAM permission:

```text
course.delete
```

Requested action:

```http
DELETE /courses/{id}
```

Result:

```text
DENY
```

Reason:

```text
PLAN_FEATURE_NOT_INCLUDED
```

IAM allows the user, but the plan does not include the feature.

## Example 3: Same User, Two Academies

User:

```text
user_id = user_456
```

Academy A:

```text
owner_type = academy
owner_id = academy_a
plan = Academy Pro
```

Academy B:

```text
owner_type = academy
owner_id = academy_b
plan = none
```

Request 1:

```text
User creates event under academy_a.
```

Result:

```text
Allowed if IAM allows.
```

Request 2:

```text
User creates event under academy_b.
```

Result:

```text
Denied for subscription-controlled event creation.
```

Reason:

```text
NO_ACTIVE_SUBSCRIPTION
```

The user does not carry Academy A’s subscription into Academy B.

## Example 4: Platform Admin

User role:

```text
platform_admin
```

Owner type:

```text
platform
```

Subscription target:

```text
No
```

Result:

```text
IAM decides access.
```

No customer subscription is required.

## Example 5: Practitioner Subscription

Owner:

```text
owner_type = practitioner
owner_id = user_123
```

Plan:

```text
Practitioner Plus
```

Plan includes:

```text
booking.priority_access
saved.academies.unlimited
```

Plan does not include:

```text
ai.video.analysis
```

Requested feature:

```text
ai.video.analysis
```

Result:

```text
DENY
```

Reason:

```text
PLAN_FEATURE_NOT_INCLUDED
```

---

# 26. Billing And Plan Journey

The billing and plan journey defines how an eligible admin subscribes an owner to a plan, upgrades to a higher plan, requests or applies a downgrade, cancels a plan, and keeps active plan entitlements enforced across the platform.

All billing and plan actions must be owner-scoped. The actor starts the action, but the subscription and resulting entitlements belong to the selected `owner_type` and `owner_id`.

The system must keep billing, subscription state, and access enforcement separate:

```text
Subscription Service owns plans, subscriptions, plan changes, and entitlements.
Payment Service owns checkout, payment status, refunds, provider events, and billing records.
Authorisation Service owns user role and permission decisions.
API Gateway combines entitlement and permission checks before forwarding protected requests.
Portal renders the plan journey and admin controls.
```

Final feature access requires both:

```text
owner subscription entitlement
user IAM permission for the requested resource/action
```

Subscription entitlement alone must not bypass IAM permission checks. IAM permission alone must not unlock subscription-controlled product features.

## 26.1 View Plans

The portal must display available plans in price order.

Each plan card must show:

* Plan name.
* Price.
* Billing cycle.
* Current plan marker.
* Feature comparison.
* Action button.

Button rules:

| Current State          | Compared Plan              | Button       |
| ---------------------- | -------------------------- | ------------ |
| No active subscription | Any available plan         | Subscribe    |
| Active plan exists     | Same plan                  | Current Plan |
| Active plan exists     | Higher price               | Upgrade      |
| Active plan exists     | Lower price                | Downgrade    |
| Active plan exists     | Same price, different plan | Switch Plan  |

## 26.2 Subscribe Flow

When a user selects `Subscribe`:

```text
Portal sends request to Subscription Service through API Gateway.
API Gateway verifies the actor can manage subscriptions for the selected owner scope.
Subscription Service validates owner, organisation, application, and plan.
If plan is free/manual, Subscription Service activates subscription.
If plan is paid, Subscription Service creates pending subscription.
Subscription Service requests checkout from Payment Service.
Portal redirects user to checkout.
Payment Service confirms payment through a payment-result callback.
Subscription Service activates subscription only after successful payment confirmation.
Entitlements are published for the owner.
```

The created subscription belongs to the selected owner, not automatically to the user who started the checkout.

Failed, cancelled, or expired checkout must leave the subscription pending or failed and must not publish paid entitlements.

## 26.3 Upgrade Flow

When a user selects `Upgrade`:

```text
Subscription Service creates upgrade plan-change request.
Payment Service creates checkout if payment is required.
On successful payment-result callback, Subscription Service applies upgrade immediately.
Entitlements are recalculated immediately for the owner.
API Gateway enforces upgraded features on the next request.
```

If payment fails, the plan-change status becomes failed, the existing plan remains active, and no upgraded entitlements are granted.

## 26.4 Downgrade Flow

Downgrades should default to end of billing period.

```text
User requests downgrade.
Subscription Service creates pending downgrade.
Current plan remains active until current_period_end.
At effective date, the scheduled downgrade job or admin endpoint applies the downgrade.
Entitlements are recalculated for the owner.
Removed features become unavailable.
```

The scheduled downgrade apply operation must be idempotent and must only apply due plan changes with status `scheduled`.

Immediate downgrade may be added later as an admin-only action.

## 26.5 Switch Plan Flow

When a user switches to a same-price plan:

```text
Subscription Service creates switch request.
If no payment is required, switch applies immediately.
If payment is required, switch applies only after successful payment-result callback.
Entitlements are recalculated.
```

## 26.6 Cancel Flow

Cancellation should default to end of billing period.

```text
User requests cancellation.
Subscription Service sets cancel_at_period_end = true.
Entitlements remain active until period end.
At period end, subscription becomes cancelled.
Paid entitlements are removed or owner moves to default/free plan if configured.
```

Cancellation must be reversible until the effective cancellation date.

## 26.7 Reactivate Flow

Before cancellation becomes effective:

```text
User requests reactivation.
Subscription Service clears cancel_at_period_end.
Subscription remains active.
Entitlements continue.
```

## 26.8 Payment Result Handling

Payment Service must notify Subscription Service after checkout completion.

The payment-result message must identify:

```text
plan_change_id
payment_id
checkout_id
status
paid_at
failure_reason
```

On success:

```text
Subscription Service validates the plan change.
Subscription Service records payment_confirmed.
Subscription Service applies the subscription or plan change.
Subscription Service records a billing event.
Subscription Service recalculates entitlements.
```

On failure, cancellation, or expiry:

```text
Subscription Service marks the plan change failed.
Subscription Service records a payment_failed billing event.
Current subscription entitlements remain unchanged.
```

The callback must be idempotent so repeated payment events do not apply the same plan change twice.

## 26.9 Journey Service Responsibilities

### Portal

* Display plan comparison.
* Display current plan and pending plan changes.
* Display correct Subscribe, Upgrade, Downgrade, Switch Plan, and Current Plan labels.
* Start plan actions through the API Gateway.
* Redirect to checkout when payment is required.
* Show cancellation and scheduled downgrade state.

### API Gateway

* Protect subscription and billing routes.
* Call Authorisation Service before proxying protected subscription routes.
* Enforce both owner entitlement and IAM permission decisions for protected business routes.
* Deny by default when no explicit allow is returned.
* Keep subscription management permission checks inside the actor's owner boundary.

### Subscription Service

* Own product, feature, plan, subscription, plan-change, and entitlement data.
* Create pending subscriptions and plan changes.
* Decide whether a plan action requires payment.
* Request checkout creation from Payment Service.
* Apply successful plan changes after payment confirmation.
* Apply scheduled downgrades when their effective date is due.
* Publish active entitlements.
* Expose current subscription and plan-change state.

### Payment Service

* Create checkout sessions for paid plan actions.
* Record payment status.
* Receive provider callbacks and webhooks.
* Notify Subscription Service of successful, failed, cancelled, or expired payment.
* Store payment references against generic subscription resources.

### Authorisation Service

* Continue owning roles, permissions, resources, and access decisions.
* Evaluate IAM permission access.
* Participate in the final decision path after API Gateway combines entitlement and permission checks.

---

# 27. Subscription Statuses

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

# 28. Plan Change Types

Required change types:

```text
subscribe
upgrade
downgrade
switch
cancel
reactivate
```

---

# 29. Plan Change Statuses

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

# 30. Payment Checkout Contract

Payment Service should support generic checkout requests for subscription resources.

Example:

```json
{
  "client_id": "rollfinders",
  "resource_type": "subscription_plan_change",
  "resource_id": "plan_change_123",
  "resource_label": "Academy Pro monthly subscription",
  "amount_minor": 6900,
  "currency": "GBP",
  "provider": "stripe",
  "payment_method_type": "card",
  "metadata": {
    "application_id": "app_rollfinders",
    "organisation_id": "org_123",
    "owner_type": "academy",
    "owner_id": "academy_123",
    "subscription_id": "sub_123",
    "plan_change_id": "plan_change_123",
    "to_plan_id": "plan_academy_pro",
    "initiated_by_user_id": "user_456"
  }
}
```

Important:

```text
initiated_by_user_id records who started the action.

owner_type and owner_id define who owns the subscription.
```

Paid subscriptions must not activate before payment success.

Failed payments must not grant entitlements.

---

# 31. Proposed Data Additions

## 31.1 subscriptions

The subscription table must identify the owner.

Required ownership fields:

```text
id
application_id
organisation_id
owner_type
owner_id
plan_id
status
current_period_start
current_period_end
cancel_at_period_end
created_by_user_id
created_at
updated_at
```

Important:

```text
created_by_user_id is audit metadata.

It is not the subscription owner unless owner_type = practitioner
and owner_id = created_by_user_id.
```

## 31.2 subscription_plan_changes

```text
id
subscription_id
application_id
organisation_id
owner_type
owner_id
from_plan_id
to_plan_id
change_type
status
effective_at
payment_id
checkout_id
requested_by_user_id
approved_by_user_id
created_at
updated_at
```

Recommended indexes:

```text
subscription_id
application_id
organisation_id
owner_type, owner_id
status
effective_at
```

## 31.3 subscription_billing_events

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

## 31.4 product_features Additions

```text
feature_key text not null
subscription_controlled boolean not null default true
```

Recommended uniqueness:

```text
unique(product_id, feature_key)
```

or, if product boundaries are not stable:

```text
unique(service_key, feature_key)
```

---

# 32. API Requirements

## 32.1 Subscription Service APIs

```http
GET /v1/products
POST /v1/products
GET /v1/products/{product_key}
PUT /v1/products/{product_key}

GET /v1/product-features
POST /v1/product-features
GET /v1/product-features/{feature_key}
PUT /v1/product-features/{feature_key}

GET /v1/plans
POST /v1/plans
GET /v1/plans/{plan_key}
PUT /v1/plans/{plan_key}
PUT /v1/plans/{plan_key}/features

GET /v1/applications/{application_id}/available-product-features

GET /v1/applications/{application_id}/subscriptions/current
GET /v1/applications/{application_id}/subscriptions
POST /v1/applications/{application_id}/subscriptions

GET /v1/owners/{owner_type}/{owner_id}/subscriptions/current
POST /v1/owners/{owner_type}/{owner_id}/subscriptions

GET /v1/subscriptions/{subscription_id}
POST /v1/subscriptions/{subscription_id}/plan-changes
GET /v1/subscriptions/{subscription_id}/plan-changes
POST /v1/subscriptions/{subscription_id}/cancel
POST /v1/subscriptions/{subscription_id}/reactivate

GET /v1/applications/{application_id}/entitlements
GET /v1/owners/{owner_type}/{owner_id}/entitlements
POST /v1/entitlements/check
```

## 32.2 Payment Service APIs

```http
POST /v1/billing/checkout
GET /v1/billing/checkout/{checkout_id}
GET /v1/billing/subscriptions/{billing_subscription_id}
GET /v1/billing/subscriptions/{billing_subscription_id}/invoices
```

---

# 33. Authorisation Requirements

Subscription Service must not check hardcoded role names.

The API Gateway route registry must attach permission metadata to every protected Subscription Service route.

Example permissions:

| Permission                           | Purpose                                 | Scope                          |
| ------------------------------------ | --------------------------------------- | ------------------------------ |
| subscription.product.read            | Read products and product features      | application                    |
| subscription.product.manage          | Create or update products and features  | platform/application           |
| subscription.plan.read               | Read plans                              | application                    |
| subscription.plan.manage             | Create or update plans                  | platform/application           |
| subscription.available_features.read | Read plan-builder availability          | application                    |
| subscription.subscription.read       | Read subscriptions                      | organisation/application/owner |
| subscription.subscription.manage     | Create, cancel, or change subscriptions | organisation/application/owner |
| subscription.entitlement.read        | Read entitlements                       | organisation/application/owner |

---

# 34. Route Permission Matrix

| Route                                                            | Permission                           |
| ---------------------------------------------------------------- | ------------------------------------ |
| GET /v1/products                                                 | subscription.product.read            |
| POST /v1/products                                                | subscription.product.manage          |
| GET /v1/products/{product_key}                                   | subscription.product.read            |
| PUT /v1/products/{product_key}                                   | subscription.product.manage          |
| GET /v1/product-features                                         | subscription.product.read            |
| POST /v1/product-features                                        | subscription.product.manage          |
| GET /v1/product-features/{feature_key}                           | subscription.product.read            |
| PUT /v1/product-features/{feature_key}                           | subscription.product.manage          |
| GET /v1/plans                                                    | subscription.plan.read               |
| POST /v1/plans                                                   | subscription.plan.manage             |
| GET /v1/plans/{plan_key}                                         | subscription.plan.read               |
| PUT /v1/plans/{plan_key}                                         | subscription.plan.manage             |
| PUT /v1/plans/{plan_key}/features                                | subscription.plan.manage             |
| GET /v1/applications/{application_id}/available-product-features | subscription.available_features.read |
| GET /v1/applications/{application_id}/subscriptions              | subscription.subscription.read       |
| POST /v1/applications/{application_id}/subscriptions             | subscription.subscription.manage     |
| GET /v1/owners/{owner_type}/{owner_id}/subscriptions/current     | subscription.subscription.read       |
| POST /v1/owners/{owner_type}/{owner_id}/subscriptions            | subscription.subscription.manage     |
| GET /v1/subscriptions/{subscription_id}                          | subscription.subscription.read       |
| POST /v1/subscriptions/{subscription_id}/cancel                  | subscription.subscription.manage     |
| POST /v1/subscriptions/{subscription_id}/plan-changes            | subscription.subscription.manage     |
| GET /v1/applications/{application_id}/entitlements               | subscription.entitlement.read        |
| GET /v1/owners/{owner_type}/{owner_id}/entitlements              | subscription.entitlement.read        |

---

# 35. Denial Reasons

Access denial must be auditable with clear reason codes.

Required reasons:

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

For MVP:

```text
PLAN_LIMIT_EXCEEDED
```

should exist as a future-safe reason but should not be enforced until usage limits are implemented.

---

# 36. UI Requirements

## 36.1 Academy and Organisation Users

If no subscription exists and a premium feature is requested, show:

```text
Choose your plan to activate this feature.
```

Actions:

```text
View Plans
Start Free Plan
Upgrade
Contact Support
```

If active plan does not include the feature, show:

```text
This feature is not included in your current plan.
```

Actions:

```text
View Plans
Upgrade
Contact Support
```

## 36.2 Practitioner Users

If a practitioner requests a premium feature, show:

```text
This feature is available on Practitioner Plus.
```

Actions:

```text
View Plans
Upgrade
```

## 36.3 Platform Admins

Do not show customer subscription prompts for platform administration features.

Only show subscription prompts when the platform admin is operating inside a subscription-target owner context.

Example:

```text
Platform Admin editing academy plan features may see subscription state.

Platform Admin managing system settings should not be asked to subscribe.
```

---

# 37. Backend Enforcement Rule

The API Gateway must deny requests before downstream services are called when:

```text
Owner requires subscription
AND requested feature is subscription-controlled
AND no active owner subscription exists
```

or when:

```text
Active owner plan does not include requested feature
```

Downstream services must not override the gateway decision.

---

# 38. Audit Requirements

The system must record audit events for denied subscription checks.

Audit event should include:

```text
request_id
subject_id
owner_type
owner_id
application_id
organisation_id
resource_id
route
http_method
permission
feature_key
iam_decision
subscription_decision
final_decision
reason
created_at
```

Do not log:

```text
Bearer tokens
Payment card data
Secrets
Raw provider payloads containing sensitive data
```

---

# 39. Acceptance Criteria

The MVP is complete when:

* Products are documented as purchasable capability areas.
* Product features are stable machine keys.
* Plans are explicit feature allowlists.
* Missing plan features are treated as unavailable.
* Subscriptions belong to owners, not automatically to users.
* Normal users do not automatically receive subscriptions.
* Users access subscription features only through the owner context they are operating under.
* Subscription Service does not own API permissions.
* Payment Service owns checkout and payment state.
* Authorisation Service owns IAM decisions.
* API Gateway combines IAM and subscription decisions.
* Academies can initialise subscriptions.
* Organisations can initialise subscriptions.
* Practitioner subscriptions can be explicitly initialised where supported.
* Super admins do not require customer subscriptions by default.
* Platform admins do not require customer subscriptions by default.
* Platform engineers do not require customer subscriptions by default.
* Free/manual plans activate without checkout.
* Paid plans create checkout before activation.
* Successful payment activates subscription or plan change.
* Failed payment does not grant entitlements.
* Downgrades are scheduled by default.
* Active entitlements match the active owner plan.
* API Gateway denies access to features outside the active owner plan.
* IAM permissions cannot bypass owner plan entitlements.
* Deny decisions are audited with clear reasons.
* Downstream services cannot bypass subscription rules.

---

# 40. Implementation Tickets

## SUB-001: Add Subscription Owner Policies

Type: Backend / Database

Goal:

Define which owner types support or require subscriptions.

Scope:

* Add `subscription_owner_policies`.
* Seed policies for academy, organisation, practitioner, partner, platform, application, and user.
* Add repository lookup.
* Add admin list/get/update endpoints if runtime configuration is required.
* Keep unsupported and not-required as default.

Acceptance Criteria:

* Policy rows are idempotently seeded.
* Academy and organisation are supported and required.
* Practitioner is supported but not required by default.
* Platform/admin access is not forced into customer subscription checks.
* Tests cover default and seeded policy lookup.

---

## SUB-002: Add Stable Feature Keys and Subscription-Controlled Flag

Type: Backend / Database / Portal

Goal:

Make product features enforceable by code, not display names.

Scope:

* Add `feature_key`.
* Add `subscription_controlled`.
* Backfill seeded features.
* Add uniqueness constraint.
* Update Go models, handlers, repositories, and portal forms.
* Keep display name editable.

Acceptance Criteria:

* Feature display name can change without breaking enforcement.
* Duplicate feature keys are rejected.
* Public/basic features can be marked as not subscription-controlled.
* Feature create, edit, list, and plan assignment flows still work.

---

## SUB-003: Map API Gateway Routes to Subscription Feature Keys

Type: API Gateway

Goal:

Let gateway know which commercial feature controls each route.

Scope:

* Extend route metadata with optional `subscription_feature_key`.
* Add constants for feature keys.
* Map commercial routes.
* Leave platform/admin/system routes IAM-only unless operating inside owner context.
* Add route metadata tests.

Acceptance Criteria:

* Existing permission mapping still works.
* IAM-only routes still work.
* Subscription-controlled routes have stable feature keys.
* Public routes remain public.

---

## SUB-004: Add Entitlement Decision Endpoint

Type: Subscription Service API

Goal:

Answer whether an owner has access to a requested feature.

Scope:

* Add `POST /v1/entitlements/check`.
* Include owner type, owner id, application id, organisation id, resource id, and feature key.
* Return allowed, decision, reason, owner policy, subscription, plan, and feature details.

Acceptance Criteria:

* Missing academy subscription denies subscription-controlled features.
* Active plan missing feature denies.
* Active plan including feature allows.
* Non-controlled features pass.
* Platform owner policy passes.

---

## SUB-005: Enforce Subscription Decisions in API Gateway

Type: API Gateway

Goal:

Deny subscription-controlled requests before downstream proxying.

Scope:

* Resolve IAM permission.
* Resolve owner context.
* Call Authorisation Service.
* Call Subscription Service when route has feature key.
* Combine decisions.
* Return structured 403 responses.

Acceptance Criteria:

* Downstream service is not called when subscription denies.
* Gateway returns clear denial reason.
* Existing IAM denial behaviour remains.
* Tests cover IAM-only, subscription pass, and subscription deny.

---

## SUB-006: Prevent Automatic User Subscription Assignment

Type: Backend / Database / API Gateway

Goal:

Ensure subscriptions are owner-scoped and not automatically assigned to users.

Scope:

* Ensure subscription records require `owner_type` and `owner_id`.
* Prevent implicit subscription lookup by `user_id` except when `owner_type = practitioner`.
* Ensure `created_by_user_id` is audit metadata only.
* Add tests for same user across two academies with different subscriptions.
* Add denial reason `SUBSCRIPTION_OWNER_MISMATCH`.

Acceptance Criteria:

* User does not inherit academy subscription outside that academy.
* User does not inherit organisation subscription outside that organisation.
* Practitioner subscription only applies when request owner context is practitioner.
* Subscription lookup by user ID alone is rejected for academy and organisation features.

---

## SUB-007: Audit Subscription Enforcement Decisions

Type: Backend / API Gateway / Subscription Service

Goal:

Record explainable deny reasons.

Scope:

* Add audit event for subscription denies.
* Preserve IAM denial audit.
* Include request id, subject, owner, feature, permission, and reason.
* Avoid logging secrets.

Acceptance Criteria:

* Deny events are queryable by request id.
* Reasons use approved constants.
* IAM and subscription denials are clearly separated.

---

## SUB-008: Portal Subscription Prompts and Recovery UX

Type: Frontend / Portal

Goal:

Help blocked users understand how to activate required features.

Scope:

* Show missing-subscription prompts.
* Show upgrade prompts for missing plan features.
* Add View Plans, Start Free Plan, Upgrade, and Contact Support actions.
* Do not show customer subscription prompts on platform admin-only screens.
* Surface API Gateway denial reasons.

Acceptance Criteria:

* Missing subscription does not show generic error.
* Missing plan feature shows upgrade messaging.
* Platform admin screens do not ask for subscription by default.

---

## SUB-009: Owner Subscription Initialisation

Type: Backend / Portal / Payment Integration

Goal:

Allow supported owners to start subscriptions.

Scope:

* Support owner types academy, organisation, and practitioner.
* Free/manual plans activate without checkout.
* Paid plans create checkout state.
* Store plan-change and billing events.
* Preserve application subscription compatibility.

Acceptance Criteria:

* Academy can start free plan.
* Organisation can start free plan.
* Practitioner can start supported plan.
* Paid plan creates checkout state without activating early.
* Existing application subscription management remains compatible.

---

## SUB-010: Billing and Plan Change Storage

Type: Database

Goal:

Store lifecycle state for subscription changes and billing events.

Scope:

* Add `subscription_plan_changes`.
* Add `subscription_billing_events`.
* Add indexes.
* Add repository methods.
* Add migration and rollback notes.

Acceptance Criteria:

* Plan changes can be created, listed, updated, and applied.
* Billing events can be attached to subscriptions and plan changes.
* Migration runs locally.

---

## SUB-011: Payment Checkout Integration

Type: Backend

Goal:

Use Payment Service checkout for paid subscription actions.

Scope:

* Create checkout for paid subscribe/upgrade/switch actions.
* Use generic resource type `subscription_plan_change`.
* Store checkout and payment references.
* Do not activate paid plans before payment success.

Acceptance Criteria:

* Paid action creates Payment Service checkout.
* Subscription remains pending until payment success.
* Failed payment does not grant entitlements.

---

## SUB-012: Payment Success and Failure Handling

Type: Backend

Goal:

Apply or fail plan changes after payment result.

Scope:

* Add callback or event consumer.
* Mark plan change as payment confirmed or failed.
* Apply successful changes.
* Record billing event.

Acceptance Criteria:

* Successful payment activates target plan.
* Failed payment does not grant entitlement.
* Billing event is stored.

---

## SUB-013: Current Subscription API

Type: Backend

Goal:

Allow portal to load current subscription state in one call.

Scope:

* Implement current subscription endpoint.
* Return active subscription, plan, pending change, and cancellation state.

Acceptance Criteria:

* Portal can render current plan from one API call.
* Pending downgrade and cancellation are visible.

---

## SUB-014: Downgrade Scheduler

Type: Backend Worker

Goal:

Apply scheduled downgrades at the correct effective date.

Scope:

* Add worker/job.
* Find due scheduled downgrades.
* Apply target plan.
* Recalculate entitlements.
* Record lifecycle event.

Acceptance Criteria:

* Scheduled downgrade applies automatically.
* Removed features become unavailable after effective date.
* Entitlements remain unchanged before effective date.

---

## SUB-015: Cancellation and Reactivation

Type: Backend

Goal:

Support cancel at period end and reactivation before cancellation takes effect.

Scope:

* Implement cancel endpoint.
* Implement reactivate endpoint.
* Update current subscription response.
* Remove entitlements after cancellation effective date.

Acceptance Criteria:

* Cancellation does not remove entitlements before period end.
* Reactivation keeps subscription active.
* Cancelled subscription no longer grants paid features after effective date.

---

## SUB-016: Portal Plan Journey UI

Type: Frontend

Goal:

Allow users to view, subscribe, upgrade, downgrade, switch, cancel, and reactivate.

Scope:

* Show current plan.
* Show correct button labels.
* Show pending change notices.
* Redirect to checkout when required.
* Refresh state after action.

Acceptance Criteria:

* No plan shows Subscribe.
* Higher plan shows Upgrade.
* Lower plan shows Downgrade.
* Active plan shows Current Plan.
* Paid action starts checkout.
* Free action activates without checkout.

---

## SUB-017: End-to-End Tests

Type: QA / Backend / Frontend

Goal:

Prove IAM and subscription enforcement works end to end.

Scope:

* Test free plan subscription.
* Test paid plan subscription through mocked checkout.
* Test upgrade.
* Test scheduled downgrade.
* Test cancellation entitlement removal.
* Test API denial for excluded feature.
* Test platform admin IAM-only access.
* Test academy owner with IAM allow but missing plan feature denied.
* Test same user under two academy contexts where only one academy has subscription.

Acceptance Criteria:

* E2E tests cover every final decision matrix row.
* Tests cover free/basic non-controlled feature access.
* Tests cover subscription denial before downstream service call.
* Tests prove subscriptions do not automatically follow the user across owners.
* Tests pass in local CI.

---

## SUB-018: Operational Runbook

Type: Platform / Documentation

Goal:

Help operators debug subscription and billing issues.

Scope:

* Document how to inspect subscription state.
* Document how to inspect plan changes.
* Document how to inspect payment references.
* Document how to recover failed checkout.
* Document how to manually cancel or apply pending changes.
* Document how to verify owner context and entitlement checks.

Acceptance Criteria:

* Operators can debug subscription issues without reading code.
* Runbook includes common failure scenarios.
* Runbook explains owner-scoped subscriptions.
* Runbook includes safe manual recovery steps.

---

# 41. Recommended Delivery Order

Implement in this order:

```text
1. SUB-001: Owner policies
2. SUB-002: Feature keys and subscription-controlled flag
3. SUB-006: Prevent automatic user subscription assignment
4. SUB-003: Route-to-feature mapping
5. SUB-004: Entitlement decision endpoint
6. SUB-005: API Gateway enforcement
7. SUB-010: Plan change and billing event storage
8. SUB-009: Owner subscription initialisation
9. SUB-011: Payment checkout integration
10. SUB-012: Payment callback handling
11. SUB-013: Current subscription API
12. SUB-014: Downgrade scheduler
13. SUB-015: Cancellation and reactivation
14. SUB-008: Portal recovery prompts
15. SUB-016: Portal plan journey UI
16. SUB-007: Audit events
17. SUB-017: E2E tests
18. SUB-018: Operational runbook
```

---

# 42. Final Rule

Before subscription enforcement:

```text
IAM decides what the user can do.
```

After subscription enforcement applies:

```text
Subscription plan limits what is commercially available to the owner.

IAM limits what the user is personally allowed to do inside that owner context.

Final access requires both.
```

Subscription ownership rule:

```text
Subscriptions are owner-scoped.

Subscriptions are not automatically assigned to users.

Users can only use subscription features through the subscribed owner context they are acting under.

The only user-related exception is practitioner subscription,
where owner_type = practitioner and owner_id = user_id.
```
