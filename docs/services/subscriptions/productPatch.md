# PRD Addendum: Subscription Targeting and IAM Fallback Rules

## Objective

Update the RollFinders subscription model so that subscriptions are required only for subscription-target owners, such as Academies, Organisations, and Practitioners.

Platform-level users such as Super Admins and Platform Admins do not need customer subscriptions by default.

The system must support two access modes:

1. **IAM-only mode** when the owner has no subscription requirement.
2. **Subscription-enforced mode** when the owner has an active subscription.

Once a subscription is active for a subscription-target owner, the subscription becomes the commercial access ceiling. Users under that owner may only access features included in the active subscription plan, even if IAM roles or permissions would otherwise allow more.

---

# Core Principle

```text
IAM controls who can do what.

Subscriptions control what the owner has purchased.

When subscription enforcement applies, access requires both:

Active subscription plan includes the feature
AND
IAM role/permission allows the user action
```

If either check fails, access must be denied.

---

# Subscription Target Owners

Subscriptions are required or supported for the following owner types:

```text
ACADEMY
ORGANISATION
PRACTITIONER
PARTNER
```

For the current implementation, priority should be:

```text
ACADEMY
ORGANISATION
PRACTITIONER
```

These owners must initialise a subscription before subscription-controlled commercial features become available.

---

# Non-Subscription Platform Users

The following users do not require customer subscriptions by default:

```text
SUPER_ADMIN
PLATFORM_ADMIN
PLATFORM_ENGINEER
SUPPORT_OPERATOR
```

These users are controlled primarily by IAM roles and permissions.

They are not treated as customers purchasing platform plans unless an internal plan model is explicitly introduced later.

---

# Access Modes

## 1. IAM-Only Mode

IAM-only mode applies when:

```text
The owner type is not subscription-targeted
OR
The feature is not subscription-controlled
OR
The platform is still in bootstrap mode
OR
No subscription policy has been enabled for that owner type
```

In IAM-only mode, access is controlled by:

```text
Authentication
Role
Permission
Resource ownership/scope
```

Example:

```text
Platform Admin manages system settings.

No customer subscription is required.

IAM permission decides access.
```

---

## 2. Subscription-Enforced Mode

Subscription-enforced mode applies when:

```text
The owner type is subscription-targeted
AND
The requested feature is subscription-controlled
AND
A subscription is active or required for that owner
```

In this mode, IAM alone is not enough.

Access requires:

```text
Active subscription
Plan includes requested feature
User role allows action
User permission allows action
Access key allows action, if used
Usage limit has not been exceeded
```

---

# Rule When There Is No Subscription

If the owner is subscription-targeted but has no subscription, the system must apply a policy decision.

## Recommended Policy

```text
No subscription = IAM-only access to free/public/basic features only.
No subscription = deny paid/commercial features.
```

This means the user may still access basic platform features allowed by IAM, but cannot access subscription-controlled features.

Example:

```text
Academy has no subscription.

Allowed:
- View own basic academy profile
- Request subscription setup
- View available plans

Denied:
- Create paid courses
- Use analytics
- Use featured listing
- Use API access
```

---

# Subscription Initialisation

Academies, Organisations, and Practitioners must be able to initialise a subscription.

Initialisation means:

```text
Owner selects a plan
Subscription Service creates subscription
Payment Service charges if required
Subscription becomes active after successful payment
Entitlements are published
API Gateway and Authorisation Service enforce plan access
```

For free plans:

```text
Owner selects free plan
Subscription is created without payment
Entitlements are published immediately
```

---

# Access Evaluation Logic

For every protected request, the API Gateway must call the Authorisation Service.

The Authorisation Service should evaluate:

```text
1. Is the subject authenticated?
2. What owner is this request operating under?
3. Is the owner type subscription-targeted?
4. Is the requested feature subscription-controlled?
5. Does the owner have an active subscription?
6. Does the active plan include the requested feature?
7. Does the user's IAM role allow the action?
8. Does the user's IAM permission allow the action?
9. If using Access Key, does the Access Key allow the action?
10. Are usage limits still available?
```

---

# Final Decision Matrix

| Subscription Target Owner | Active Subscription | Plan Includes Feature | IAM Allows Action | Result                |
| ------------------------- | ------------------: | --------------------: | ----------------: | --------------------- |
| No                        |        Not required |          Not required |               Yes | Allow                 |
| No                        |        Not required |          Not required |                No | Deny                  |
| Yes                       |                  No |                    No |               Yes | Deny for paid feature |
| Yes                       |                 Yes |                    No |               Yes | Deny                  |
| Yes                       |                 Yes |                   Yes |                No | Deny                  |
| Yes                       |                 Yes |                   Yes |               Yes | Allow                 |

---

# Example 1: Academy Without Subscription

Academy:

```text
No active subscription
```

User role:

```text
ACADEMY_OWNER
```

IAM permission:

```text
courses.create = true
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

The academy must initialise a subscription that includes event/course creation.

---

# Example 2: Academy With Starter Plan

Academy plan:

```text
Academy Starter
```

Plan includes:

```text
academy.profile.manage
course.create
course.update
```

Plan does not include:

```text
course.delete
analytics.view
```

User role:

```text
ACADEMY_OWNER
```

IAM permission allows:

```text
course.delete
```

Requested action:

```text
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

Even though IAM allows the user to delete courses, the active plan does not include course deletion.

---

# Example 3: Platform Admin

User role:

```text
PLATFORM_ADMIN
```

Requested action:

```text
Manage public academy listing review
```

Owner type:

```text
PLATFORM
```

Subscription target:

```text
No
```

Result:

```text
IAM decides access
```

If the platform admin has the required IAM permission, access is allowed.

No customer subscription is required.

---

# Example 4: Practitioner Subscription

Practitioner:

```text
owner_type = PRACTITIONER
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

# Required Subscription Policy Table

Add a policy table to define which owner types require subscriptions.

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
ACADEMY        supported=true   required=true
ORGANISATION   supported=true   required=true
PRACTITIONER   supported=true   required=false
SUPER_ADMIN    supported=false  required=false
PLATFORM_ADMIN supported=false  required=false
```

---

# Feature Subscription Control

Not every feature must be subscription-controlled.

Add a field to product features:

```text
subscription_controlled boolean
```

Example:

```text
academy.public.view               subscription_controlled=false
academy.profile.manage            subscription_controlled=true
course.create                     subscription_controlled=true
analytics.view                    subscription_controlled=true
subscription.plan.view_public      subscription_controlled=false
```

This allows basic/public access to remain available while premium capabilities require subscription.

---

# Backend Enforcement Rule

The API Gateway must deny requests before they reach downstream services when:

```text
Owner requires subscription
AND
Requested feature is subscription-controlled
AND
No active subscription exists
```

or when:

```text
Active plan does not include requested feature
```

Downstream services must not override this decision.

---

# UI Requirements

## For Academies and Organisations

If no subscription exists, show:

```text
Choose your plan to activate this feature.
```

Provide actions:

```text
View Plans
Start Free Plan
Upgrade
Contact Support
```

## For Practitioners

If the feature is premium, show:

```text
This feature is available on Practitioner Plus.
```

## For Platform Admins

Do not show customer subscription prompts for platform administration features unless the action is performed inside a subscription-target owner context.

---

# Audit Reasons

Access denial must be audited with specific reasons:

```text
SUBSCRIPTION_REQUIRED
NO_ACTIVE_SUBSCRIPTION
PLAN_FEATURE_NOT_INCLUDED
PLAN_LIMIT_EXCEEDED
IAM_PERMISSION_MISSING
ROLE_PERMISSION_MISSING
ACCESS_KEY_PERMISSION_MISSING
OWNER_TYPE_NOT_SUBSCRIPTION_TARGET
```

---

# Acceptance Criteria

The implementation is complete when:

```text
Academies can initialise subscriptions.
Organisations can initialise subscriptions.
Practitioners can initialise subscriptions where supported.

Super admins do not require customer subscriptions by default.
Platform admins do not require customer subscriptions by default.
Platform engineers do not require customer subscriptions by default.

If no subscription exists, IAM controls non-subscription features.
If a feature is subscription-controlled, the owner must have an active plan that includes it.
If a user has IAM permission but the plan does not include the feature, access is denied.
If a plan includes a feature but the user lacks IAM permission, access is denied.

The API Gateway enforces the decision before calling downstream services.
The Authorisation Service combines IAM and subscription entitlement checks.
Downstream services do not bypass subscription rules.
All deny decisions are audited with clear reasons.
```

---

# Final Rule

```text
Before subscription enforcement:
IAM decides what the user can do.

After subscription applies:
Subscription plan limits what is commercially available.
IAM limits what the user is personally allowed to do.

Final access requires both.
```

---

# Implementation Review

Status: Partially implemented. The backend data model, subscription feature keys, entitlement endpoint, API Gateway enforcement path, and portal feature-management fields are now in place. Remaining work is focused on audit events, richer owner initialisation flows, denial recovery UX, and broader live E2E coverage.

## Current System Fit

The backend now has:

* Subscription products, product features, plans, plan products, plan features, subscriptions, plan changes, and billing events.
* API Gateway route-to-permission mappings.
* Authorisation Service IAM checks through `/v1/authorize`.
* Subscription entitlement lookup for application-owned subscriptions.
* Subscription owner policy records seeded for supported owner types.
* `feature_key` and `subscription_controlled` on product features.
* Stable route-to-subscription feature mappings for the first commercial endpoint set.
* API Gateway entitlement checks before proxying subscription-controlled routes.
* Subscription Service entitlement decisions through `/v1/entitlements/check`.
* Portal create/edit support for feature keys and subscription-controlled flags.

Remaining gaps:

* Denial audit reasons for subscription checks.
* Full subscription initialisation flows for academy, organisation, and practitioner owners.
* Portal prompts/actions based on missing subscription or missing plan feature.
* Complete route coverage for analytics/API access as those service endpoints mature.
* Live end-to-end tests across running API Gateway, Subscription Service, downstream services, and portal flows.

## Required Clarifications Before Build

### Owner Type Values

The PRD uses uppercase owner types such as:

```text
ACADEMY
ORGANISATION
PRACTITIONER
```

The current database uses lowercase values:

```text
application
organisation
academy
user
```

Implementation should standardise on lowercase persisted values and map UI/API display labels where needed.

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

### Practitioner Mapping

Practitioner currently maps closest to a user-owned subscription.

Recommended rule:

```text
owner_type = practitioner
owner_id = user_id
```

Avoid reusing plain `user` for practitioner subscriptions, because normal user identity and commercial practitioner ownership are different concepts.

### Feature Identifier

Product features currently have human names, for example:

```text
Create bookable events
View analytics dashboard
```

Subscription enforcement needs a stable machine key that can be compared to API Gateway permissions.

Recommended schema addition:

```text
product_features.feature_key text not null
```

Examples:

```text
academy.profile.manage
course.create
analytics.view
payment.accept_online
api.partner_access
```

This should be unique per service/product boundary and should usually match the route permission name when the feature controls an endpoint.

### IAM And Subscription Split

Do not merge subscription checks into IAM permission rows.

Recommended responsibility:

* API Gateway resolves route, permission, resource, owner context, and feature key.
* Authorisation Service answers IAM decision.
* Subscription Service answers entitlement decision.
* API Gateway combines both decisions before proxying.

Authorisation Service may expose a combined endpoint later, but the internal decision must remain explainable as:

```text
iam_decision
subscription_decision
final_decision
reason
```

### Usage Limits

The PRD lists `PLAN_LIMIT_EXCEEDED`, but the current scope says user/usage limits are not implemented.

Keep `PLAN_LIMIT_EXCEEDED` as a future reason only. Do not implement usage-limit enforcement in this patch.

---

# Implementation Tickets

## SUB-PATCH-001: Add Subscription Owner Policies

Type: Backend database and API

Status: Partially complete

Goal: Define which owner types support or require subscriptions.

Scope:

* Add `subscriptions.subscription_owner_policies`.
* Seed policies for `academy`, `organisation`, `practitioner`, `partner`, `platform`, `application`, and `user`.
* Add repository methods and API endpoints to list/get/update policies.
* Keep default policy safe: unsupported and not required unless explicitly seeded.

Acceptance criteria:

* Policy rows are idempotently seeded.
* `academy` and `organisation` are supported and required.
* `practitioner` is supported but not required by default.
* platform/admin access is not forced into customer subscription checks.
* Tests cover default policy lookup and seeded policy values.

Implemented:

* `subscriptions.subscription_owner_policies` exists in the subscriptions migration.
* Policies are seeded for `academy`, `organisation`, `practitioner`, `partner`, `platform`, `application`, and `user`.
* Repository policy lookup is used by entitlement checks.

Remaining:

* Add list/get/update policy admin endpoints if policies must be configurable from the dashboard.
* Add portal admin surface only if product operations need runtime policy edits.

## SUB-PATCH-002: Add Stable Feature Keys And Subscription-Controlled Flag

Type: Backend database, API, seed data, portal

Status: Complete for backend/API/portal feature management

Goal: Make product features enforceable by code, not by display name.

Scope:

* Add `feature_key text` to `subscriptions.product_features`.
* Add `subscription_controlled boolean not null default true`.
* Backfill existing seeded features with stable keys.
* Add unique index for feature keys within a product/service boundary.
* Update Go models, repository scans, create/update handlers, and portal forms.
* Keep human `name` editable without changing enforcement identity.

Acceptance criteria:

* Feature display name can change without breaking enforcement.
* Duplicate feature keys are rejected in the same product/service boundary.
* Public/basic features can be marked `subscription_controlled=false`.
* Feature list, create, update, and plan editing still work.

Implemented:

* `feature_key` and `subscription_controlled` are in the schema and Go models.
* Seeded features have stable machine keys.
* Feature create/update/list flows include the new fields.
* Portal feature forms expose feature key and subscription-controlled controls.
* Duplicate feature names are blocked within the same product/service boundary.

Note:

* Database default is safe for migrations. The portal defaults new admin-created features to subscription-controlled.

## SUB-PATCH-003: Map API Gateway Routes To Subscription Feature Keys

Type: API Gateway/core route metadata

Status: Complete for the first commercial route set

Goal: Let the gateway know which subscription feature controls each protected route.

Scope:

* Extend route definitions with optional `SubscriptionFeatureKey`.
* Add constants for subscription feature keys in shared route constants.
* Map commercially controlled routes, for example course create/update, analytics, payment account, API access.
* Leave pure platform/admin/system routes without subscription feature keys unless they operate inside an owner subscription context.
* Add route metadata tests to prevent protected commercial endpoints from missing feature keys.

Acceptance criteria:

* Existing permission mapping still works.
* Routes can be IAM-only when no subscription feature key is set.
* Subscription-controlled routes have stable feature keys.
* Public routes remain public.

Implemented:

* Route definitions support optional `SubscriptionFeatureKey`.
* Shared constants exist for the initial subscription feature keys.
* Academy profile/team, course create/update/delete, booking create, and payment connect routes are mapped.
* Gateway tests cover subscription-controlled route behaviour.

Remaining:

* Extend route mappings for analytics, API access, and any future commercial endpoints as those services expose stable routes.

## SUB-PATCH-004: Add Subscription Entitlement Decision Endpoint

Type: Subscription Service API

Status: Complete

Goal: Answer whether an owner has access to a requested feature.

Scope:

* Add endpoint such as:

```text
POST /v1/entitlements/check
```

* Request should include owner type, owner id, feature key, application id, organisation id, and resource id when available.
* Response should include:

```text
allowed
decision
reason
owner_policy
subscription_id
plan_id
feature_key
```

* Implement policy handling:
  * unsupported owner type = IAM-only/pass-through;
  * non-subscription-controlled feature = pass-through;
  * required subscription with no active subscription = deny;
  * active subscription missing feature = deny;
  * active subscription includes feature = allow.

Acceptance criteria:

* No active academy subscription denies subscription-controlled features.
* Active plan missing feature denies.
* Active plan including feature allows subscription side.
* Non-controlled features pass without subscription.
* Platform owner policy does not require subscription.

Implemented:

* `POST /v1/entitlements/check` exists.
* Decision response includes owner policy, subscription, plan, feature, decision, reason, and allowed state.
* Policy, non-controlled feature, missing subscription, missing feature, and allow paths are covered by service tests.

## SUB-PATCH-005: Enforce Subscription Decisions In API Gateway

Type: API Gateway

Status: Complete for the first enforcement path

Goal: Deny subscription-controlled requests before proxying downstream.

Scope:

* Resolve route IAM permission as today.
* Resolve owner context from headers/path/query/resource mapping.
* Call Authorisation Service for IAM decision.
* Call Subscription Service for entitlement decision when route has subscription feature key.
* Combine decisions:

```text
allow only when IAM allow AND subscription allow/pass
```

* Return structured errors with reason codes from the PRD.

Acceptance criteria:

* Downstream service is not called when subscription check denies.
* Gateway returns `403` with `NO_ACTIVE_SUBSCRIPTION` or `PLAN_FEATURE_NOT_INCLUDED`.
* Existing IAM denies still return IAM-specific reason.
* Gateway tests cover IAM-only routes, subscription pass, and subscription deny.

Implemented:

* API Gateway performs IAM first, then entitlement checks for routes with `SubscriptionFeatureKey`.
* Subscription denies return before downstream proxying.
* Gateway tests prove the downstream service is skipped on entitlement deny.

Remaining:

* Improve owner-context resolution for complex routes where headers/query/resource fallback is not enough.

## SUB-PATCH-006: Audit Subscription Enforcement Decisions

Type: API Gateway, Authorisation Service, Subscription Service

Status: Not started

Goal: Record explainable deny reasons.

Scope:

* Add audit event for subscription entitlement checks that deny.
* Preserve IAM audit for missing permission/role/access key.
* Include request id, subject id, owner type, owner id, feature key, permission, and reason.
* Do not log secrets or bearer tokens.

Acceptance criteria:

* Deny events are queryable by request id.
* Reasons use the PRD reason constants.
* Audit entries separate IAM denial from subscription denial.

## SUB-PATCH-007: Portal Subscription Prompts And Plan Initialisation

Type: Portal UI and server actions

Status: Partially complete

Goal: Make blocked users understand how to activate required subscription features.

Scope:

* Show subscription prompts for academy/organisation/practitioner owner contexts.
* Add actions: View Plans, Start Free Plan, Upgrade, Contact Support.
* Do not show customer subscription prompts for platform admin screens unless operating inside a subscription-target owner context.
* Surface API Gateway denial reasons in dashboard screens.

Acceptance criteria:

* Missing subscription shows a plan activation prompt instead of a generic error.
* Missing plan feature shows upgrade messaging.
* Platform admin screens do not ask for customer subscription by default.

Implemented:

* Portal feature administration understands feature keys and subscription-controlled features.
* Plans UI now distinguishes current, upgrade, downgrade, and subscribe actions.

Remaining:

* Replace generic API errors with missing-subscription and upgrade prompts on protected dashboard workflows.
* Wire plan activation/upgrade actions into the entitlement denial recovery path.

## SUB-PATCH-008: Subscription Initialisation For Owner Types

Type: Subscription Service, Payment Service integration, Portal

Status: Partially complete

Goal: Let supported owners start a subscription.

Scope:

* Generalise subscription creation beyond application-only endpoints.
* Support owner types `academy`, `organisation`, and `practitioner`.
* Free/manual plans activate without checkout.
* Paid plans create pending/checkout state and use Payment Service or existing Stripe checkout bridge.
* Store plan-change/billing events.

Acceptance criteria:

* Academy can start free plan.
* Organisation can start free plan.
* Practitioner can start supported plan.
* Paid plan creates checkout state without activating early.
* Existing application subscription management remains compatible.

Implemented:

* Database and entitlement logic understand the supported owner types.
* Existing application subscription management remains compatible.

Remaining:

* Generalise create/start subscription endpoints and UI flows for academy, organisation, and practitioner owners.
* Harden paid plan checkout state and plan-change event handling for the new owner types.

## SUB-PATCH-009: Contract And E2E Tests

Type: Tests

Status: Partially complete

Goal: Prove IAM and subscription enforcement works end to end.

Scope:

* Unit tests for policy lookup and entitlement decision.
* API Gateway tests proving downstream proxy is skipped on subscription deny.
* Authorisation/IAM compatibility tests.
* Portal tests for prompt rendering.
* Seed/migration tests for policy and feature key data.

Acceptance criteria:

* Tests cover every final decision matrix row in this PRD.
* Tests cover free/basic non-controlled feature access.
* Tests cover platform admin IAM-only flow.
* Tests cover academy owner with IAM allow but missing plan feature denied.

Implemented:

* Subscription Service tests cover entitlement decision paths.
* API Gateway tests cover entitlement pass/deny and downstream proxy skipping.
* Route catalog tests cover subscription resource metadata.
* Full backend Go tests and portal build/typecheck have passed locally after the implementation.

Remaining:

* Add live integration/E2E tests through running API Gateway, Subscription Service, downstream service, and portal.
* Add portal denial prompt tests after SUB-PATCH-007 recovery UI is implemented.

---

# Remaining Delivery Order

1. SUB-PATCH-006: add audit events for subscription entitlement denies.
2. SUB-PATCH-008: complete owner subscription initialisation for academy, organisation, and practitioner.
3. SUB-PATCH-007: add portal recovery prompts for missing subscription and missing plan features.
4. SUB-PATCH-009: add live integration and portal E2E coverage.
5. SUB-PATCH-003: continue extending route-to-feature mappings as new commercial endpoints are introduced.

The data model, initial route metadata, entitlement API, and first API Gateway enforcement path are already implemented. The remaining order focuses on operational visibility, customer recovery flows, and broader confidence.
