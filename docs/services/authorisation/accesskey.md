# PRD: Access Keys

## Overview

Access Keys provide a second authentication method for RollFinders clients that need programmatic access without using a username, password, session, or refresh token.

Access Keys are additive. They SHALL NOT replace or change:

* existing credential login
* JWT authentication
* refresh tokens
* role assignments
* user permission assignments
* existing protected endpoint behaviour

Each request authenticates as exactly one actor:

```text
JWT token   -> authenticated user actor
Access Key -> access key actor owned by a user
```

Access Keys are not an additional gate for normal JWT requests in v1.

## Goals

The feature SHALL allow authenticated users to create personal Access Keys for automation and integrations while keeping permission authority in Authorisation Service.

The system SHALL support:

* personal Access Keys owned by users
* permission-scoped key access
* organisation, application, and resource scoping
* immediate key revocation
* optional expiry
* one-time raw key display
* hashed key storage
* access key audit events
* access key rate limiting
* subscription-plan limit reminders where plan limits apply

The system SHALL prevent a user from granting an Access Key a permission or scope they do not already hold. Access Key permissions are always bounded by the creator's effective permission rights.

## Ownership Boundaries

### Users Service Owns

* user identity
* credentials
* password management
* sessions
* refresh tokens
* JWT authentication

Users Service SHALL NOT store Access Keys or calculate Access Key permissions.

### Authorisation Service Owns

* Access Key records
* Access Key permission assignments
* Access Key scope assignments
* Access Key authentication checks
* Access Key authorisation decisions
* Access Key lifecycle state
* Access Key audit events

Authorisation Service remains the source of truth for permission definitions and effective access decisions.

### Domain Services Own

Domain services own their resources and route handling. They SHALL NOT store Access Keys, mutate Access Key permissions, or own global Access Key policy.

## Authentication Contract

Clients authenticate with an Access Key by sending:

```http
Authorization: Bearer RF_PK_<token>
```

The `RF_PK_` prefix identifies the bearer value as an Access Key. JWT bearer tokens continue to use the existing JWT format.

Authentication middleware SHALL:

1. Parse the `Authorization` header.
2. Route `RF_PK_` bearer values to Access Key authentication.
3. Route all other bearer values to existing JWT authentication.
4. Reject malformed or unknown bearer values using the existing unauthenticated response pattern.

An Access Key request does not create a user session and does not issue refresh tokens.

## Authorisation Model

Access Keys use the existing permission catalog. Route permission names SHALL match `docs/services/authorisation/product.md`.

Examples:

```text
GET    /v1/academies                          academy.search
GET    /v1/academies/{academy_id}             academy.view
PATCH  /v1/academies/{academy_id}             academy.edit

GET    /v1/courses/{id}                       course.read
POST   /v1/courses                            course.create

GET    /v1/bookings                           booking.read
POST   /v1/bookings/{booking_id}/confirm      booking.confirm

GET    /v1/payments/{id}                      payment.read
POST   /v1/payments/{id}/refunds              payment.refund
```

Access Key permission checks SHALL evaluate:

```text
key status
+ key expiry
+ requested permission
+ requested scope
```

Access Key permission assignment SHALL be constrained by the creating user's effective permissions at the time of assignment. A user cannot create or update a key so that the key has broader permission coverage, broader scope, or broader resource access than the user.

Changing the owner's permissions after key creation does not automatically expand the key. If the owner's authority is reduced, Authorisation Service SHALL deny future key permission updates outside the owner's remaining authority. Whether existing key grants are automatically reduced is a product policy outside v1 and MUST be decided before implementation if required.

## Scope Model

Access Key permissions MAY be scoped using the same scope concepts as user permission assignments:

```text
platform
organisation
application
resource
```

Resource scopes use canonical resource identifiers from Authorisation Service resources.

Examples:

```text
permission=academy.view
scope=resource
resource_id=academy_123

permission=course.read
scope=organisation
organisation_id=org_123

permission=payment.read
scope=application
application_id=app_123
```

The route authorisation layer SHALL resolve the requested route permission and resource scope, then ask Authorisation Service for a decision using the Access Key actor context.

## Subscription Plan Constraints

If a subscription plan or entitlement policy applies to the creator, organisation, application, or resource, Access Key creation and updates SHALL remain inside those plan limits.

Plan constraints MAY limit:

* whether Access Keys are available
* how many active keys can exist
* which permissions can be granted to keys
* which scopes or resources can be granted
* rate limits or usage quotas
* expiry or rotation requirements

When a requested Access Key grant or usage level is blocked or limited by a subscription plan, the API and UI SHALL return or display a clear reminder that the subscription plan restricts the requested Access Key capability. The system SHALL NOT silently grant access beyond the applicable plan.

## Database Model

Authorisation Service SHALL manage Access Key data in the PostgreSQL `authorisation` schema.

Runtime service code SHALL use database functions or stored procedures for reads, writes, and authorisation decisions. Go service code SHALL NOT embed direct SQL against Access Key tables.

No existing business tables SHALL be modified.

### access_keys

Stores Access Key metadata.

Required fields:

```text
id
owner_user_id
name
key_prefix
key_hash
status
created_at
updated_at
expires_at
last_used_at
last_used_ip
last_used_user_agent
revoked_at
revoked_by
rotated_from_key_id
```

`key_hash` stores only a hash of the raw key. The raw key SHALL be returned only once after creation.

Supported statuses:

```text
active
revoked
expired
rotated
```

### access_key_permissions

Stores permission grants for Access Keys.

Required fields:

```text
id
access_key_id
permission_id
organisation_id
application_id
resource_id
created_at
created_by
```

Each row grants one permission to one key for one scope.

### access_key_audit_events

Stores Access Key authentication and authorisation events.

Required fields:

```text
id
access_key_id
owner_user_id
event_type
permission_code
organisation_id
application_id
resource_id
route
method
ip_address
user_agent
decision
status_code
created_at
```

Audit events SHALL be recorded for successful use and denied use. Unknown or malformed key attempts SHOULD be audited without storing raw key material.

## Lifecycle

### Create

An authenticated user creates a personal Access Key with a name, optional expiry, and one or more permission grants.

Authorisation Service SHALL verify that the requested grants do not exceed the creator's effective permissions, scope, resource access, or applicable subscription-plan limits.

The generated key format is:

```text
RF_PK_<random_secret>
```

The raw key is displayed once and never stored in plaintext.

### Revoke

Revocation disables a key immediately for future requests.

Revoked keys SHALL remain visible in management and audit history.

### Rotate

Rotation creates a replacement key and marks the previous key as rotated or revoked according to implementation policy.

The replacement key SHALL require the same permission validation as key creation.

### Expire

If `expires_at` is set and the current time is after that value, the key SHALL be rejected.

Expired keys SHALL NOT be usable until explicitly replaced with a new active key.

## Management Surface

Authenticated users SHALL be able to manage their own personal Access Keys.

The management UI is expected under:

```text
Settings
  Access Keys
```

Users SHALL be able to:

* create a key
* view key metadata
* view assigned permissions
* view recent usage
* revoke a key
* rotate a key

The UI SHALL NOT display raw key material after creation.

## Rate Limiting

Access Key requests SHALL be rate limited independently from JWT-authenticated user requests.

Rate limiting policy SHALL be keyed by Access Key ID after authentication. Requests with malformed or unknown keys SHALL use the existing unauthenticated request rate limit strategy.

The exact quota values are outside this PRD unless defined by a subscription or platform policy document.

## Backward Compatibility

This feature SHALL be additive.

Mandatory compatibility requirements:

1. Existing JWT authentication continues to work.
2. Existing refresh token behaviour continues to work.
3. Existing roles continue to work.
4. Existing user permission assignments continue to work.
5. Existing route permission checks continue to work.
6. Existing mobile and portal clients continue to work.
7. No existing public API contract is broken.
8. No existing business tables are modified.

## Acceptance Criteria

* A user can create a personal Access Key and see the raw value exactly once.
* Raw Access Key values are never stored in plaintext.
* A valid active Access Key with the required permission and matching scope is accepted.
* Missing, malformed, unknown, revoked, expired, and rotated keys are rejected.
* A valid key without the required route permission is rejected.
* A user cannot grant a key permissions, scopes, or resource access beyond their own effective access.
* Subscription-plan limits are enforced or surfaced as clear reminders when they restrict Access Key creation, grants, or usage.
* Access Key authentication does not create sessions or refresh tokens.
* Access Key requests use the existing Authorisation Service permission catalog.
* Access Key usage and denied attempts create audit events without logging raw key material.
* Existing JWT authentication and authorisation behaviour is unchanged.
