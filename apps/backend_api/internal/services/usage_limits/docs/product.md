# PRD: Usage Limits Service

## Product

RollFinders

## Service

Usage Limits Service

## Status

Draft for MVP implementation

## Last Updated

2026-07-03

---

# 1. Overview

RollFinders needs a dedicated Usage Limits Service that controls generic quota and usage consumption across platform resources without copying the resources owned by domain services.

The service answers:

```text
Can this owner consume this amount of this resource action during this period?
```

Examples:

```text
Can academy_123 create another course?
Can academy_456 invite another academy user?
Can user_789 export another analytics report?
Can academy_222 receive another booking in the current subscription billing period?
```

The Usage Limits Service must not store full copies of users, academies, courses, bookings, open mats, events, payments, analytics records, or student records. It stores generic usage policy, counters, reservations, overrides, and audit events only.

---

# 2. Service Boundary

## 2.1 Usage Limits Service Owns

The Usage Limits Service owns:

* Generic usage limit rules.
* Owner/resource/action counters.
* Usage reservations.
* Reservation confirmation and release.
* Usage increments and decrements.
* Owner-specific usage overrides.
* Usage decision audit events.
* Usage summaries for owners.

## 2.2 Usage Limits Service Does Not Own

The Usage Limits Service must not own:

* Subscription products, features, plans, subscriptions, or entitlement lifecycle.
* Payment, refund, wallet, ledger, or pricing policy records.
* User identity, roles, permissions, or authentication.
* Course, booking, academy, event, open mat, analytics, or student business data.
* API route permissions or IAM policy.

## 2.3 Related Service Boundaries

Subscription Service owns commercial plan definitions, owner subscriptions, and entitlements. Usage limit rules reference `subscription_plan_id` as an opaque identifier but do not create independent usage plans.

Authorisation Service owns permissions and IAM decisions. Usage limit denial is not a permission denial and must not be modelled as a role or permission.

Usage limit decisions SHALL NOT be modelled as permissions. Authorisation Service answers whether the actor has the required permission; Usage Limits Service answers whether the owner has remaining quota for the resource action.

Pricing Policy Service owns commercial fee rules. It may later consume usage data for metered billing or discounts, but it does not own quotas or counters.

Domain services own resource facts and mutations. They do not own quota policy.

---

# 3. Access Decision Flow

The API Gateway / Orchestrator must combine decisions in this order for protected routes:

```text
1. Authorisation Service: can this actor perform this permission?
2. Subscription Service: does the owner plan include this feature?
3. Usage Limits Service: can the owner consume this resource action?
4. Domain Service: perform the resource mutation.
5. Usage Limits Service: confirm or release the reservation.
```

Gateway route metadata must declare usage limits separately from permissions and subscription feature keys.

Example route metadata:

```text
permission: course.create
subscription_feature_key: course.create
usage_owner_type: academy
usage_resource_type: course
usage_action_key: create
usage_amount: 1
```

Usage limit checks must run only after IAM and subscription entitlement checks allow the request. Browser and mobile clients must not call Usage Limits directly for enforcement decisions.

If Usage Limits Service is unavailable for a limited route, the gateway must fail closed with a service-unavailable response. Routes without usage metadata must not call Usage Limits.

---

# 4. Core Concepts

## 4.1 Owner

The owner is the entity whose quota is consumed.

V1 owner types:

```text
academy
user
organisation
application
practitioner
```

Most commercial limits belong to `academy`. User-owned limits are allowed for personal actions such as academy claims or analytics exports.

## 4.2 Resource Type

`resource_type` identifies the generic thing being controlled.

Examples:

```text
course
booking
academy_user
open_mat
analytics_report
academy_claim
file_upload
custom_subdomain
```

Usage Limits treats resource types as opaque strings and does not resolve their domain meaning.

## 4.3 Action Key

`action_key` identifies the action being consumed.

Examples:

```text
create
invite
export
enable
upload
claim
send
```

The effective usage key is:

```text
owner_type:resource_type:action_key
```

Examples:

```text
academy:course:create
academy:academy_user:invite
academy:booking:create
user:analytics_report:export
```

## 4.4 Limit Value

`limit_value` is the maximum allowed usage for the matching owner, resource, action, plan, and period.

Rules:

* `NULL` means unlimited.
* Missing matching rule means unlimited.
* Overrides take precedence over plan rules.
* Counters and reservations must both be considered before allowing a new reservation.

## 4.5 Period Type

V1 period types:

```text
lifetime
subscription_period
```

Monthly-style limits must use the owner subscription billing period supplied by Subscription Service or the gateway. Calendar month and owner-timezone windows are not V1 behavior.

## 4.6 Active-Count Semantics

V1 resource limits are active-count limits.

This means deleting or removing the limited resource decrements usage and restores quota.

Examples:

```text
If an academy plan allows 5 active courses and one course is deleted, remaining course:create quota increases by 1.
If an academy plan allows 10 active academy users and one user is removed, remaining academy_user:invite quota increases by 1.
```

Lifetime action-count limits may be added later per usage key, but they are not the default V1 behavior.

---

# 5. Data Model

The service must use generic tables. It must not create columns such as `courses_count`, `bookings_count`, or `users_count`.

## 5.1 `usage_limit_rules`

```sql
CREATE TABLE usage_limit_rules (
    id text PRIMARY KEY,

    subscription_plan_id text NOT NULL,
    owner_type text NOT NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,

    limit_value integer NULL,
    period_type text NOT NULL DEFAULT 'lifetime',
    is_active boolean NOT NULL DEFAULT true,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE (
        subscription_plan_id,
        owner_type,
        resource_type,
        action_key,
        period_type
    )
);
```

`subscription_plan_id` is an opaque Subscription Service plan identifier. Usage Limits must not store plan name, price, billing cycle, product catalogue data, or subscription lifecycle status.

## 5.2 `usage_counters`

```sql
CREATE TABLE usage_counters (
    id text PRIMARY KEY,

    owner_type text NOT NULL,
    owner_id text NOT NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,

    used_count integer NOT NULL DEFAULT 0,

    period_type text NOT NULL DEFAULT 'lifetime',
    period_start timestamptz NULL,
    period_end timestamptz NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE (
        owner_type,
        owner_id,
        resource_type,
        action_key,
        period_type,
        period_start,
        period_end
    )
);
```

## 5.3 `usage_reservations`

```sql
CREATE TABLE usage_reservations (
    id text PRIMARY KEY,

    idempotency_key text NOT NULL UNIQUE,
    owner_type text NOT NULL,
    owner_id text NOT NULL,
    subscription_plan_id text NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,

    amount integer NOT NULL DEFAULT 1,
    status text NOT NULL,

    period_type text NOT NULL DEFAULT 'lifetime',
    period_start timestamptz NULL,
    period_end timestamptz NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz NULL,
    released_at timestamptz NULL
);
```

Allowed reservation statuses:

```text
reserved
confirmed
released
expired
```

## 5.4 `usage_limit_overrides`

```sql
CREATE TABLE usage_limit_overrides (
    id text PRIMARY KEY,

    owner_type text NOT NULL,
    owner_id text NOT NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,

    limit_value integer NULL,
    period_type text NOT NULL DEFAULT 'lifetime',
    reason text NULL,
    created_by text NULL,

    starts_at timestamptz NOT NULL DEFAULT now(),
    ends_at timestamptz NULL,
    is_active boolean NOT NULL DEFAULT true,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

## 5.5 `usage_audit_events`

```sql
CREATE TABLE usage_audit_events (
    id text PRIMARY KEY,

    owner_type text NOT NULL,
    owner_id text NOT NULL,
    subscription_plan_id text NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,

    decision text NOT NULL,
    reason text NULL,
    limit_value integer NULL,
    used_count integer NULL,
    reserved_count integer NULL,
    amount integer NULL,

    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

---

# 6. API

All API paths use the `/v1/usage-limits` prefix.

## 6.1 Check

```http
POST /v1/usage-limits/check
```

Checks usage without reserving or consuming quota.

Request:

```json
{
  "owner_type": "academy",
  "owner_id": "academy_123",
  "subscription_plan_id": "plan_free",
  "resource_type": "course",
  "action_key": "create",
  "amount": 1,
  "period_type": "lifetime",
  "period_start": null,
  "period_end": null
}
```

Response:

```json
{
  "allowed": true,
  "decision": "allow",
  "reason": null,
  "limit": 5,
  "used": 3,
  "reserved": 0,
  "remaining": 2,
  "period_type": "lifetime"
}
```

## 6.2 Create Reservation

```http
POST /v1/usage-limits/reservations
```

Atomically checks quota and reserves usage before a downstream mutation.

Request:

```json
{
  "idempotency_key": "request_123:course.create",
  "owner_type": "academy",
  "owner_id": "academy_123",
  "subscription_plan_id": "plan_free",
  "resource_type": "course",
  "action_key": "create",
  "amount": 1,
  "period_type": "lifetime"
}
```

Response:

```json
{
  "allowed": true,
  "reservation_id": "ures_123",
  "decision": "allow",
  "limit": 5,
  "used": 3,
  "reserved": 1,
  "remaining": 1
}
```

## 6.3 Confirm Reservation

```http
POST /v1/usage-limits/reservations/{reservation_id}/confirm
```

Confirms a reservation after the resource mutation succeeds and moves the reserved amount into `used_count`.

## 6.4 Release Reservation

```http
POST /v1/usage-limits/reservations/{reservation_id}/release
```

Releases a reservation when the downstream mutation fails or is cancelled.

## 6.5 Increment

```http
POST /v1/usage-limits/increment
```

Directly increments usage for trusted orchestration or event-replay flows.

## 6.6 Decrement

```http
POST /v1/usage-limits/decrement
```

Decrements usage for active-count resources when the owning resource is deleted, removed, or reversed.

## 6.7 Owner Summary

```http
GET /v1/usage-limits/owners/{owner_type}/{owner_id}
```

Returns current usage counters and matching limits for an owner.

---

# 7. V1 Integration

Start with these usage keys:

```text
academy:course:create
academy:academy_user:invite
academy:open_mat:create
academy:booking:create
academy:analytics_report:export
```

Gateway route definitions must include usage metadata for the matching create, invite, or export routes.

The gateway must pass:

```text
owner_type
owner_id
subscription_plan_id
resource_type
action_key
amount
period_type
period_start
period_end
request_id or idempotency_key
```

Subscription Service entitlement checks must expose enough active subscription context for the gateway to supply `subscription_plan_id` and billing period boundaries to Usage Limits.

---

# 8. Non-Goals For V1

V1 does not include:

* Independent usage plans or owner usage plan assignments.
* Usage-based billing.
* Metered invoicing.
* Pricing discounts based on usage.
* Event-only counter sync.
* Calendar-month resets.
* Owner-timezone reset windows.
* Per-key lifetime action-count semantics.
* Client-side-only enforcement.
* Domain-service-owned quota policy.

---

# 9. Acceptance Criteria

* Usage Limits stores generic quota state and no copied domain resource data.
* Subscription Service remains the owner of plans, subscriptions, and entitlements.
* Usage limit rules reference Subscription Service plan IDs and do not create a second plan system.
* Gateway enforces IAM, subscription entitlement, and usage limits before protected limited mutations.
* Reservations prevent over-consumption under concurrent requests.
* Successful downstream mutations confirm reservations.
* Failed downstream mutations release reservations.
* Deleting/removing active-count resources decrements usage.
* Missing usage rules are treated as unlimited.
* Billing-period limits use subscription billing period boundaries.
* Usage service unavailability fails closed for routes with usage metadata.
