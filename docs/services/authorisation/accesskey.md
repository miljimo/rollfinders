# Rollfinders PRD – Access Keys & Resource Authorization Enhancement

## Objective

Introduce Access Keys as an additional authorization mechanism without modifying or breaking any existing authentication, authorization, role, or service functionality.

This feature extends the current platform by allowing controlled access to resources through Access Keys while preserving:

* Existing login flow
* Existing JWT authentication
* Existing roles
* Existing services
* Existing permissions

---

# Existing Functionality (Must Not Change)

The following functionality already exists and must continue to work exactly as today:

### Authentication

* Username login
* Email login
* Password login
* JWT tokens
* Refresh tokens

### Roles

* Platform Admin
* Academy Admin
* Standard User
* Guest User

### Services

* Users Service
* Courses Service
* Booking Service
* Payment Service

### Existing Endpoint Authorization

Any authorization currently implemented must remain unchanged.

Access Keys must be additive and not replace current authorization.

---

# New Capability

Introduce Access Keys that provide additional resource access control.

Access Keys may be assigned to:

* Users
* Academies
* Internal services
* Future integrations

---

# Authentication Model

The platform supports two authentication methods.

## Method 1 – Existing Login

User logs in using:

```text
Username
Email
Password
```

System generates JWT.

No change required.

---

## Method 2 – Access Key

Client provides:

```http
Authorization: Bearer RF_PK_xxxxxxxxx
```

System validates Access Key.

---

# Resource Authorization

Each endpoint may optionally declare a required resource permission.

Example:

```text
GET    /academies           academy.read
POST   /academies           academy.write

GET    /courses             course.read
POST   /courses             course.write

GET    /bookings            booking.read
POST   /bookings            booking.write

GET    /payments            payment.read
POST   /payments            payment.write
```

---

# Authorization Rules

## Existing JWT User

When a user is authenticated using JWT:

1. Existing role checks execute normally.
2. Existing authorization remains unchanged.
3. If endpoint requires Access Key validation, Access Key permissions are also checked.

Result:

```text
Role Permission + Access Key Permission
```

Both must pass.

---

## Access Key Authentication

When Access Key is used directly:

1. Validate key.
2. Load permissions.
3. Verify resource access.
4. Allow or deny request.

---

# Access Key Entity

Fields:

```text
Id
OwnerId
OwnerType
Name
KeyHash
Status
CreatedAt
UpdatedAt
ExpiresAt
LastUsedAt
```

---

# New Database Tables

## access_keys

Stores generated keys.

## access_key_permissions

Stores resources attached to keys.

## access_key_audit_logs

Stores usage history.

No modifications required to existing tables.

---

# Key Lifecycle

## Create

Generate Access Key.

Example:

```text
RF_PK_ABC123XYZ
```

Visible only once.

---

## Revoke

Disable immediately.

---

## Rotate

Create replacement key.

---

## Expire

Optional expiration date.

---

# Access Key Permissions

Examples:

```text
academy.read
academy.write

course.read
course.write

booking.read
booking.write

payment.read
payment.write

analytics.read
```

---

# Middleware Enhancement

Add new middleware:

```text
AccessKeyMiddleware
```

Responsibilities:

* Validate Access Key
* Load permissions
* Validate resource access
* Audit usage

Must not affect existing JWT middleware.

---

# Access Key Management UI

New page:

```text
Settings
   |
Access Keys
```

User can:

* Create key
* Revoke key
* Rotate key
* View usage
* View permissions

---

# Audit Logging

Capture:

```text
Access Key
User
Resource
Endpoint
Method
IP
Country
Response Code
Timestamp
```

---

# Rate Limiting

Rate limits are applied only to Access Keys.

Examples:

```text
Free        1000/day
Pro         10000/day
Enterprise  Unlimited
```

---

# Backward Compatibility Requirements

Mandatory:

1. Existing JWT authentication must continue to work.
2. Existing roles must continue to work.
3. Existing endpoints must continue to work.
4. Existing services must continue to work.
5. Existing mobile applications must continue to work.
6. Existing academy portals must continue to work.
7. No breaking API changes.
8. No database changes to existing business tables.

This feature must be implemented as an additive enhancement only.

---

# Success Criteria

* Existing functionality remains unchanged.
* Access Keys can be created and managed.
* Resource permissions can be attached to Access Keys.
* Endpoints can validate Access Keys.
* Audit logs are recorded.
* Rate limits are enforced.
* No regressions introduced.

```
```
