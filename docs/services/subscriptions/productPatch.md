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
