# PRD: RollFinders Subscription Service

## Overview

Create a dedicated Subscription Service responsible for products, product features, commercial plans, customer subscriptions, billing lifecycle state, and entitlement publication.

The Subscription Service answers:

```text
What has this organisation purchased?
Which product features are included in the active plan?
Which product features are unavailable to this plan?
```

The service must not own payment processing or user permissions.

```text
Payments Service answers: Was the customer charged?
Subscription Service answers: What plan and features does the customer have?
Authorisation Service answers: Can this user perform this action on this resource?
```

This separation keeps commercial packaging independent from API permissions and payment provider details.

---

## Objectives

* Define RollFinders products as purchasable capability areas.
* Define stable product feature keys under each product.
* Define plans as explicit bundles of product features.
* Make it clear which features a plan includes and which features it cannot use.
* Publish subscription entitlements for the Orchestrator, Authorisation Service, and domain services to consume.
* Support upgrades, downgrades, renewals, trials, cancellations, and billing-cycle changes without embedding payment-provider logic.

---

## Service Responsibilities

### Subscription Service Owns

* Product catalogue.
* Product feature catalogue.
* Plan catalogue.
* Plan pricing metadata.
* Plan feature inclusion rules.
* Subscription lifecycle state.
* Trials.
* Renewals.
* Upgrades.
* Downgrades.
* Pending plan changes.
* Proration calculation inputs and requested charges.
* Entitlement publication.

### Subscription Service Does Not Own

* Card payments.
* Payment provider accounts.
* Refund processing.
* Invoice payment collection.
* User roles.
* User permissions.
* API route permissions.
* Resource-level access decisions.

---

## Service Boundaries

### Organisation Service

Organisation Service is responsible for:

* organisations;
* applications;
* application lifecycle status;
* application-service enablement;
* tenant-level service availability.

Subscription Service should use Organisation Service to know which platform services are available for an application before creating or editing plans.

For RollFinders, Organisation Service exposes application services through:

```http
GET /v1/applications/{application_id}/services
```

The response tells Subscription Service which service keys are enabled for that application, for example:

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

Subscription Service must not create plans from services that are disabled for the target application once Organisation Service service availability is active.

### Payments Service

Payments Service is responsible for:

* charging customers;
* payment methods;
* payment providers;
* refunds;
* invoices;
* transaction history;
* payout and connected-account state.

Payments Service must not know what a subscription includes.

### Authorisation Service

Authorisation Service is responsible for:

* permissions;
* roles;
* resources;
* permission assignments;
* effective permission resolution;
* access decisions.

Authorisation Service must not charge customers or own commercial plan definitions.

All Subscription Service business routes must be protected by Authorisation Service decisions through the API gateway route registry. Authentication alone is not enough.

Only infrastructure routes may be public:

```http
GET /healthz
GET /readyz
```

All product, feature, plan, subscription, and entitlement routes require a user with the matching subscription permission.

### Orchestrator/API Service

The Orchestrator/API Service may combine subscription entitlements and authorisation checks for user-facing requests.

Example:

```text
1. Check Subscription Service: Does the organisation have `booking.create_event`?
2. Check Authorisation Service: Can this user create bookings for this academy?
3. Forward the request only when both checks pass.
```

Browser and mobile clients must access Subscription Service through the Orchestrator/API gateway. The gateway must call Authorisation Service before proxying protected subscription routes.

---

## Core Concepts

### Product

A product is a purchasable capability area.

Examples:

```text
Academy Management
Bookings
Analytics
Payments
API Access
Notifications
AI Coach
```

A product is not itself enough to grant access. Access is granted through product features included in a plan.

### Product Feature

A product feature is a stable commercial capability key owned by one product.

Examples:

```text
academy.profile.manage
academy.team.manage
academy.featured_listing
booking.create_event
booking.unlimited_events
analytics.dashboard.view
analytics.export
api.access.basic
api.access.partner
notification.email.send
```

Product features are not API permissions. They describe what the customer has bought, not which user can perform an action.

### Plan

A plan is a commercial package with pricing and a list of included product features.

Examples:

```text
Free
Academy Starter
Academy Pro
Enterprise
```

### Entitlement

An entitlement is the runtime grant produced from an active subscription.

If an organisation subscribes to `Academy Pro`, the Subscription Service publishes the active product features for that organisation as entitlements.

---

## Product Feature Catalogue

The Subscription Service must keep a catalogue of product features.

Each product feature should have:

* stable key;
* product key;
* display name;
* description;
* status;
* optional limit metadata.

Example catalogue:

| Product | Feature Key | Description |
| --- | --- | --- |
| Academy Management | `academy.profile.manage` | Manage academy profile, address, images, and contact details. |
| Academy Management | `academy.team.manage` | Manage academy owners, admins, coaches, and team members. |
| Academy Management | `academy.featured_listing` | Enable paid or approved featured placement when the product policy allows it. |
| Bookings | `booking.create_event` | Create bookable events, seminars, open mats, or courses. |
| Bookings | `booking.unlimited_events` | Remove event-count limits for the billing period. |
| Analytics | `analytics.dashboard.view` | View analytics dashboards. |
| Analytics | `analytics.export` | Export analytics reports. |
| API Access | `api.access.basic` | Use basic API access. |
| API Access | `api.access.partner` | Use partner or enterprise API access. |

Feature keys must remain stable. If implementation permissions change, the product feature key should not change unless the commercial capability changes.

---

## Available Service And Product Loading

Plan creation must be driven by available application services.

Subscription Service should load availability in this order when Organisation Service service availability exists:

```text
Organisation Service
    |
    v
Application services enabled for application_id
    |
    v
Subscription Service product catalogue filtered by service_key
    |
    v
Product features available for plan creation
```

During bootstrap, the Organisation Service application-service table or API may not exist yet. In that case, Subscription Service must support a fallback mode so platform admins can create the initial subscription products and plans.

Bootstrap fallback order:

```text
Organisation Service application services unavailable
    |
    v
Load Authorisation Service permission catalogue
    |
    v
Group permissions into draft products/features
    |
    v
Allow platform admin to create product features and plans
```

The fallback is only for product and plan setup. It does not move permission ownership into Subscription Service.

### Service Key To Product Mapping

Each product in the Subscription Service catalogue must declare the service it depends on.

Example:

| Service Key | Product Key | Product |
| --- | --- | --- |
| `academy` | `academy_management` | Academy Management |
| `booking` | `bookings` | Bookings |
| `analytics` | `analytics` | Analytics |
| `payment` | `payments` | Payments |
| `notification` | `notifications` | Notifications |
| `api` | `api_access` | API Access |

If Organisation Service says `analytics` is disabled for an application, Subscription Service must not offer the `analytics` product or its features during plan creation for that application.

### Product Catalogue Fields

Products should include:

* product key;
* service key;
* display name;
* description;
* status;
* whether the product is plan-selectable.

Example:

```json
{
  "key": "bookings",
  "service_key": "booking",
  "name": "Bookings",
  "status": "active",
  "plan_selectable": true
}
```

### Product Feature Catalogue Fields

Product features should include:

* feature key;
* product key;
* display name;
* description;
* status;
* optional limit metadata;
* whether the feature is plan-selectable.

Example:

```json
{
  "key": "booking.create_event",
  "product_key": "bookings",
  "name": "Create bookable events",
  "status": "active",
  "plan_selectable": true,
  "limits": {
    "active_events_per_month": "optional"
  }
}
```

### Plan Builder Availability Rules

When an admin creates a plan, Subscription Service must:

* read enabled application services from Organisation Service when available;
* map enabled service keys to active products;
* load active plan-selectable features for those products;
* hide disabled-service products from the plan builder;
* reject submitted plan features whose service is disabled;
* reject submitted plan features whose product or feature is inactive;
* treat missing features as unavailable.

This lets the plan builder automatically load available products and features without hardcoding every service in the UI.

### Bootstrap Permission Catalogue Fallback

If Organisation Service cannot provide application-service availability because the service table or endpoint does not exist yet, Subscription Service must fail open for catalogue setup only.

In bootstrap mode, Subscription Service should:

* call Authorisation Service to list available permission definitions;
* group permissions by prefix into suggested product areas;
* expose those groups to platform admins as draft product-feature candidates;
* allow platform admins to create products, product features, and plans from those candidates;
* mark created product features as commercial feature keys, not permission records;
* keep the original permission codes only as mapping hints or documentation metadata.

Example permission grouping:

| Permission Prefix | Suggested Product |
| --- | --- |
| `academy.*` | Academy Management |
| `booking.*` | Bookings |
| `course.*` | Courses |
| `payment.*` | Payments |
| `analytics.*` | Analytics |
| `notification.*` | Notifications |
| `api.*` | API Access |

Example fallback conversion:

```text
Authorisation permission:
booking.create

Draft product feature:
booking.create_event

Product:
Bookings
```

The fallback must not automatically grant every permission to every customer. It only makes all known capabilities visible to platform admins so they can build the product catalogue and choose which features each plan includes.

Once Organisation Service service availability exists, Subscription Service must prefer Organisation Service and use the fallback only for missing migration data or explicit admin repair flows.

---

## Authorisation Requirements

Subscription Service must not check hardcoded role names. Protected access is controlled by Authorisation Service permissions.

The API gateway route registry must attach permission metadata to every protected Subscription Service route. The gateway must deny the request before proxying when Authorisation Service does not return an allow decision.

### Permission Catalog

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `subscription.product.read` | Read subscription products and product features. | application |
| `subscription.product.manage` | Create or update subscription products and product features. | platform/application |
| `subscription.plan.read` | Read subscription plans and plan feature allowlists. | application |
| `subscription.plan.manage` | Create or update plans and plan feature allowlists. | platform/application |
| `subscription.available_features.read` | Read plan-builder product feature availability. | application |
| `subscription.subscription.read` | Read subscriptions. | organisation/application |
| `subscription.subscription.manage` | Create, cancel, or change subscriptions. | organisation/application |
| `subscription.entitlement.read` | Read active subscription entitlements. | organisation/application |

### Route Permission Matrix

| Route | Permission |
| --- | --- |
| `GET /v1/products` | `subscription.product.read` |
| `POST /v1/products` | `subscription.product.manage` |
| `GET /v1/products/{product_key}` | `subscription.product.read` |
| `PUT /v1/products/{product_key}` | `subscription.product.manage` |
| `GET /v1/product-features` | `subscription.product.read` |
| `POST /v1/product-features` | `subscription.product.manage` |
| `GET /v1/product-features/{feature_key}` | `subscription.product.read` |
| `PUT /v1/product-features/{feature_key}` | `subscription.product.manage` |
| `GET /v1/plans` | `subscription.plan.read` |
| `POST /v1/plans` | `subscription.plan.manage` |
| `GET /v1/plans/{plan_key}` | `subscription.plan.read` |
| `PUT /v1/plans/{plan_key}` | `subscription.plan.manage` |
| `PUT /v1/plans/{plan_key}/features` | `subscription.plan.manage` |
| `GET /v1/applications/{application_id}/available-product-features` | `subscription.available_features.read` |
| `GET /v1/applications/{application_id}/subscriptions` | `subscription.subscription.read` |
| `POST /v1/applications/{application_id}/subscriptions` | `subscription.subscription.manage` |
| `GET /v1/subscriptions/{subscription_id}` | `subscription.subscription.read` |
| `POST /v1/subscriptions/{subscription_id}/cancel` | `subscription.subscription.manage` |
| `POST /v1/subscriptions/{subscription_id}/change-plan` | `subscription.subscription.manage` |
| `GET /v1/applications/{application_id}/entitlements` | `subscription.entitlement.read` |

The gateway should send `application_id` as the application scope for application-scoped routes. For subscription-id routes, the gateway or service must resolve the subscription to its owning `organisation_id` and `application_id` before scoped decisions are completed.

---

## Plan Feature Rules

Plans must use an explicit allowlist.

A plan has only the product features listed in that plan. If a feature is not listed, the plan cannot use it.

The Subscription Service must not infer all product features from a product name. For example, a plan that includes the Academy Management product does not automatically include `academy.featured_listing`.

### Required Rules

* A plan must list every included product feature explicitly.
* A plan must reject unknown feature keys.
* A plan must not expose inactive or retired product features.
* A plan must publish only included active features as entitlements.
* A plan must treat all non-included features as unavailable.
* A plan may include quota or limit values for included features.

### Cannot-Have Rule

A plan cannot have a product feature when:

* the feature key is not listed in the plan;
* the feature key does not exist in the product feature catalogue;
* the feature is inactive or retired;
* the subscription is inactive, cancelled, expired, or outside its trial window;
* the feature limit is exhausted and the feature is limit-bound.

This means the default answer for a missing feature is deny.

---

## Example Plan Matrix

| Feature | Free | Academy Starter | Academy Pro | Enterprise |
| --- | --- | --- | --- | --- |
| `academy.profile.manage` | Yes | Yes | Yes | Yes |
| `academy.team.manage` | No | Yes | Yes | Yes |
| `academy.featured_listing` | No | No | Yes | Yes |
| `booking.create_event` | No | Limited | Yes | Yes |
| `booking.unlimited_events` | No | No | Yes | Yes |
| `analytics.dashboard.view` | No | No | Yes | Yes |
| `analytics.export` | No | No | No | Yes |
| `api.access.basic` | No | No | No | Yes |
| `api.access.partner` | No | No | No | Yes |

The matrix is a product and documentation view. The service source of truth should still be the plan feature allowlist.

---

## Example Plan Definitions

### Free

Included features:

```text
academy.profile.manage
```

Cannot use:

```text
academy.team.manage
academy.featured_listing
booking.create_event
analytics.dashboard.view
analytics.export
api.access.basic
```

### Academy Starter

Included features:

```text
academy.profile.manage
academy.team.manage
booking.create_event
```

Limits:

```text
booking.create_event = 5 active events per month
```

Cannot use:

```text
academy.featured_listing
booking.unlimited_events
analytics.export
api.access.basic
```

### Academy Pro

Included features:

```text
academy.profile.manage
academy.team.manage
academy.featured_listing
booking.create_event
booking.unlimited_events
analytics.dashboard.view
```

Cannot use:

```text
analytics.export
api.access.basic
api.access.partner
```

### Enterprise

Included features:

```text
academy.profile.manage
academy.team.manage
academy.featured_listing
booking.create_event
booking.unlimited_events
analytics.dashboard.view
analytics.export
api.access.basic
api.access.partner
notification.email.send
```

Enterprise may also receive custom feature limits or manual contract terms.

---

## Entitlement Output

The Subscription Service should expose active organisation entitlements in a shape similar to:

```json
{
  "organisation_id": "org_123",
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

## Relationship To Permissions

Product features and permissions must stay separate.

Example:

```text
Subscription feature:
booking.create_event

Possible Authorisation permissions:
booking.create
booking.update
booking.publish
booking.cancel
```

The Subscription Service decides whether the organisation has the booking feature.

The Authorisation Service decides whether the current user can create or update a booking in the target resource scope.

This prevents commercial plan changes from forcing permission catalogue changes, and prevents permission refactors from rewriting subscription plans.

---

## Upgrade Flow

When a customer upgrades:

```text
Current plan
    |
    v
Requested plan
    |
    v
Subscription Service calculates effective date and proration input
    |
    v
Payments Service charges the customer
    |
    v
Subscription Service activates the new plan
    |
    v
Subscription Service publishes updated entitlements
```

Newly included features may become available immediately after successful payment, depending on product policy.

---

## Downgrade Flow

Downgrades should normally take effect at the next billing cycle.

```text
Request downgrade
    |
    v
Create pending plan change
    |
    v
Keep current plan active until period end
    |
    v
Activate downgraded plan
    |
    v
Publish reduced entitlements
```

Features removed by the downgrade become unavailable when the downgraded plan becomes active.

Partial refunds should require manual approval unless a future product policy explicitly allows automatic refunds.

---

## Validation Requirements

The Subscription Service must validate:

* every plan feature key exists in the product feature catalogue;
* inactive features are not granted by new plans;
* active subscriptions publish entitlements only for the active plan;
* inactive subscriptions publish no active feature entitlements;
* pending downgrades do not remove features before their effective date;
* exhausted feature limits are reported clearly to consumers;
* plan changes are auditable.

---

## Acceptance Criteria

* Products are documented as purchasable capability areas.
* Product features are documented as stable commercial capability keys.
* Plans are documented as explicit feature allowlists.
* The PRD clearly states that missing plan features are unavailable.
* The PRD clearly states that Subscription Service does not own API permissions.
* The PRD gives examples of features a plan has and cannot have.
* The PRD gives an entitlement response shape for future implementation.
