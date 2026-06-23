## Go Migration Requirement

The current Rollfinders API/orchestration layer is implemented in TypeScript within the frontend

This feature requires creating a new Go-based Orchestrator API Service.
The new Go service will replace the existing TypeScript API gateway/orchestration logic.
This service can be public and can be access via mobile and desktop applications.
Following the same existing service patterns to implement this functionality.
---

# Migration Goals

* Move API orchestration from TypeScript to Go.
* Keep Rollfinders frontend as UI-only.
* Keep existing backend services unchanged initially.
* Route frontend requests through the Go Orchestrator.
* Remove business logic from TypeScript layer step by step.
* Keep current system working during migration.

---

# Migration Strategy

## Phase 1: Build Go Orchestrator

Create new Go service:

```text
rollfinders-orchestrator-api
```

Responsibilities:

```text
Authentication validation
Authorisation checks
Permission checks
Service routing
Request validation
Response formatting
Audit logging
```

The orchestrator does not own permissions, roles, or user assignments. It calls Authorisation Service with the permission required by the target route and the request scope.

---

## Phase 2: Proxy Existing TypeScript APIs

The Go Orchestrator may initially call the existing TypeScript APIs where business logic still exists.

```text
Frontend
   ↓
Go Orchestrator
   ↓
Existing TypeScript API
   ↓
Backend Services
```

This allows safe migration without breaking the app.

---

## Phase 3: Move Logic Out of TypeScript

Move orchestration logic from TypeScript into Go.

```text
Before:
TypeScript API owns business workflow

After:
Go Orchestrator owns workflow
TypeScript becomes obsolete or UI-only support
```

---

## Phase 4: Direct Service Integration

Final state:

```text
Frontend / Mobile
   ↓
Go Orchestrator
   ↓
Users Service
   ↓
Authorisation Service
   ↓
Academy Service
   ↓
Courses Service
   ↓
Booking Service
   ↓
Payments Service
```

No frontend calls backend services directly.

No TypeScript API business logic remains.

---

# Permission Enforcement

The Go Orchestrator is the primary enforcement point for browser/mobile requests.

The orchestrator SHALL:

* validate the authenticated actor through Users Service or trusted session/JWT context
* resolve `organisation_id`, `application_id`, and resource identifiers from the route/request
* map each exposed route to one orchestrator-owned permission code
* register or reconcile required permission definitions with Authorisation Service
* call Authorisation Service `POST /v1/authorize`
* fail closed when the permission check cannot be completed
* forward only authorised requests to downstream services

The orchestrator SHALL NOT:

* store roles or permissions
* assign roles or permissions
* calculate effective permissions locally
* check hardcoded role names for access control

The orchestrator owns the permission catalog for routes it exposes. Downstream services do not register permissions and do not depend on Authorisation Service for gateway access control. This keeps downstream services free from gateway permission catalog dependencies and allows route permission changes to be made in the orchestration layer.

Permission prefixes are grouped by routed domain:

| Prefix | Routed Domain | Examples |
| --- | --- | --- |
| `academy.*` | Academy routes | `academy.update`, `academy.claim.approve` |
| `course.*` | Course routes | `course.create`, `course.session.cancel` |
| `booking.*` | Booking routes | `booking.create`, `booking.attendance.record` |
| `payment.*` | Payment routes | `payment.refund.create`, `payment.payout_request.approve` |
| `organisation.*` | Organisation routes | `organisation.application.create`, `organisation.service.enable` |
| `user.*` | User/account routes | `user.create`, `user.status.disable` |
| `authorisation.*` | Authorisation administration routes | `authorisation.role.create`, `authorisation.assignment.grant` |

Domain access should use domain-specific permission codes, not a generic gateway permission such as `gateway.access`.

Example authorisation request:

```json
{
  "subjectId": "user_123",
  "permission": "payment.payout_request.approve",
  "organisationId": "org_123",
  "applicationId": "app_rollfinders",
  "resourceType": "payout_request",
  "resourceId": "payout_456"
}
```

---

# Go Technical Requirements

Language:

```text
Go
```

Suggested Framework:

```text
Chi or Gin
```

Recommended:

```text
Chi
```

Reason:

```text
Lightweight
Good for API gateway/orchestrator pattern
Easy middleware composition
```

---

# Go Project Structure

```text
/cmd/api
/internal/auth
/internal/authorization
/internal/config
/internal/gateway
/internal/registry
/internal/services
/internal/audit
/internal/middleware
/internal/http
/internal/models
/internal/repository
/pkg/httpclient
```

---

# Implemented MVP Runtime

The first Go API service runtime lives in:

```text
services/api
```

Local compose exposes it on:

```text
API_PUBLIC_BASE_URL=http://localhost:3007
```

## Current Implementation Status

| Capability | State | Notes |
| --- | --- | --- |
| Go API Orchestrator runtime | Implemented | `services/api/cmd/api` and compose service exist. |
| Downstream proxy routing | Implemented | Routes forward to users, academy, organisation, courses, booking, payments, authorisation, and legacy Next.js targets. |
| Explicit route registry | Implemented | `RouteDefinition` registry exists in `internal/server/routes.go`. |
| Fail-closed route authorisation | Implemented | Protected routes require actor, route mapping, Authorisation Service allow decision, and resource resolution when configured. |
| Resource-scoped authorisation request | Implemented | Orchestrator sends subject, permission, application, organisation, resource type, and resource id where available. |
| Orchestrator-owned permission catalog generation | Implemented | Route-derived `PermissionDefinition` catalog exists in code. |
| Permission catalog registration/reconciliation | Not Implemented | Orchestrator does not yet create/update missing permission records in Authorisation Service. |
| Downstream-service permission registration | Not Required | Downstream services remain dependency-free for gateway permissions. |

---

# Endpoint Authorisation Enforcement

The Orchestrator Handler is responsible for enforcing authorisation before any downstream service call is made.

For every incoming request, the handler SHALL:

1. Authenticate the user.
2. Resolve the target endpoint.
3. Resolve the target resource.
4. Resolve the required permission.
5. Call the Authorisation Service.
6. Forward the request only when authorised.

## Enforcement Flow

```text
Client Request
       |
       v
Orchestrator Handler
       |
       +--> Authenticate User
       |
       +--> Resolve Endpoint
       |
       +--> Resolve Resource
       |
       +--> Resolve Permission
       |
       +--> Authorisation Service
                 |
         +-------+-------+
         |               |
       ALLOW          DENY
         |               |
         v               v
Forward Request    Return 403
```

## Route Registration

Every downstream route exposed by the orchestrator MUST have a route definition. The route definition is the orchestrator's local enforcement contract and MUST reference a permission code owned and registered by the orchestrator.

```go
type RouteDefinition struct {
    Method          string
    Path            string
    Service         string
    Permission      string
    ResourceType    string
    ResourceIDParam string
}
```

The orchestrator SHALL NOT invent permissions from path prefixes or HTTP methods. If no route definition exists, the request SHALL fail closed and SHALL NOT be forwarded.

Example:

```go
{
    Method:          "POST",
    Path:            "/v1/academies/{academyId}/search/hide",
    Service:         "academy-service",
    Permission:      "academy.search.hide",
    ResourceType:    "academy",
    ResourceIDParam: "academyId",
}
```

## Permission Catalog Ownership

The orchestrator owns the permission catalog for every route it exposes.

Orchestrator responsibilities:

```text
Define permission codes for every protected endpoint
Define resource type and resource id semantics
Build permission definitions from the route registry
Register or seed missing permission definitions in Authorisation Service
Keep permission codes stable once assigned to routes
Load route definitions
Resolve route to permission code
Resolve resource scope
Call Authorisation Service
Forward only when allowed
Fail closed when permission mapping is absent
```

Authorisation Service responsibilities:

```text
Persist permission definitions
Return allow/deny decisions
Fail closed for unknown permissions
Provide catalog seed/reconciliation endpoints or migrations
```

Downstream service responsibilities:

```text
Accept requests forwarded by the orchestrator
Trust that gateway authentication and authorisation have completed for public client traffic
Avoid registering gateway permission codes
Avoid depending on Authorisation Service for orchestrator route access
```

The orchestrator SHALL treat the permission `code` as the stable identifier used in authorisation requests. If Authorisation Service also returns a permission `id`, that id may be used internally by Authorisation Service, but route definitions SHALL use the permission `code`.

Examples:

| Service | Route | Permission Code | Resource Type |
| --- | --- | --- | --- |
| Academy Service | `POST /v1/academies/{academyId}/search/hide` | `academy.search.hide` | `academy` |
| Booking Service | `POST /v1/bookings` | `booking.create` | none |
| Booking Service | `POST /v1/bookings/{bookingId}/cancel` | `booking.cancel` | `booking` |
| Payments Service | `POST /v1/refunds` | `payment.refund.create` | none |
| Courses Service | `PUT /v1/courses/{courseId}` | `course.update` | `course` |

If the orchestrator exposes a new downstream endpoint, the implementation is incomplete until:

```text
Permission code exists in the orchestrator route catalog
Orchestrator registers or reconciles the permission in Authorisation Service
Orchestrator route definition references that permission code
Route-level tests prove deny prevents downstream forwarding
```

## Authorisation Request

Before calling the downstream service, the orchestrator SHALL send an authorisation request equivalent to:

```json
{
  "subjectId": "user_123",
  "permission": "academy.search.hide",
  "organisationId": "org_123",
  "applicationId": "rollfinders",
  "resourceType": "academy",
  "resourceId": "academy_456"
}
```

## Handler Behaviour

The handler SHALL NOT call the downstream service until:

```text
authorisation.allowed == true
```

If any of the following occurs:

```text
Permission mapping not found
Resource not resolved
Authorisation service unavailable
Authorisation denied
```

Then:

```text
Request must not be forwarded.
```

## Fail Closed

The default behaviour is:

```text
DENY
```

Never:

```text
ALLOW
```

## Example

Request:

```http
POST /v1/academies/academy_456/search/hide
```

Handler resolves:

```text
Resource Type : academy
Resource ID   : academy_456
Permission    : academy.search.hide
```

Authorisation Service:

```json
{
  "allowed": true
}
```

Result:

```text
Forward request to Academy Service
```

Otherwise:

```http
403 Forbidden
```

## Design Principle

The Orchestrator is the militarised enforcement layer.

Downstream services should assume:

```text
Authentication completed
Authorisation completed
Permission validated
Resource scope validated
```

before the request reaches them.

Container-to-container compose uses:

```text
API_PUBLIC_BASE_URL=http://api:8080
```

The root endpoint returns human- and machine-readable API documentation:

```text
GET /
```

Operational endpoints:

```text
GET /healthz
GET /readyz
```

Both operational endpoints check the API gateway dependencies:

```text
Users Service
Authorisation Service
Academy Service
Organisation Service
Courses Service
Booking Service
Payments Service
PostgreSQL database
```

If any dependency is unavailable, the endpoint returns `503` with the failing dependency and reason.

The gateway currently provides conservative domain-service forwarding:

| Gateway Route | Downstream Service | Notes |
| --- | --- | --- |
| `/auth/*` | Users Service | Login, logout, and password endpoints |
| `/v1/auth/*` | Users Service | Versioned auth helper APIs |
| `/v1/accounts/*` | Users Service | Account-owned APIs |
| `/v1/users/*` | Users Service | User-owned APIs |
| `/v1/authorisation/*` | Authorisation Service | Rewrites `/v1/authorisation/authorize` to `/v1/authorize` |
| `/v1/academies/*` | Academy Service | Academy-owned APIs |
| `/v1/organisations/*` | Organisation Service | Organisation-owned APIs |
| `/v1/applications/*` | Organisation Service | Application registry APIs |
| `/v1/courses/*` | Courses Service | Course-owned APIs |
| `/v1/course-types/*` | Courses Service | Course type APIs |
| `/v1/bookings/*` | Booking Service | Booking-owned APIs |
| `/v1/payments/*` | Payments Service | Payment-owned APIs |
| `/v1/checkouts/*` | Payments Service | Checkout APIs |
| `/v1/refunds/*` | Payments Service | Refund APIs |
| `/v1/payout*` | Payments Service | Payout APIs |
| `/legacy/*` | Existing Next.js app | Temporary compatibility route while TypeScript orchestration is removed |

This is the safe migration baseline. New cross-service workflows should be added to this service first. Existing TypeScript routes should be moved behind this gateway one workflow at a time, then deleted once the UI no longer calls them directly.

## Network Boundary

RollFinders frontend must call only the API service for service-owned endpoints.

Infrastructure must keep the tiers separated:

| Tier | Can Receive Traffic From | Can Call |
| --- | --- | --- |
| Frontend web | Public ALB | API service, database, public internet providers |
| API service | Frontend web | Users, Authorisation, Academy, Organisation, Courses, Booking, Payments, database |
| Domain services | API service only | Database and required public providers |

Lower service endpoints must not be published to the public internet or attached to a security group that accepts frontend web traffic. Local Compose mirrors this with separate `frontend`, `backend`, `app_database`, and `service_database` networks.

The API service does not yet replace every TypeScript API route. Remaining TypeScript orchestration is still present under:

```text
src/app/api
src/lib
```

Those routes are migration candidates, not the desired final state.

---

# Acceptance Criteria

* Go Orchestrator service created.
* Existing TypeScript API can still run during migration.
* Frontend routes begin moving to Go Orchestrator.
* Go Orchestrator validates authentication.
* Go Orchestrator calls Authorisation Service.
* Go Orchestrator blocks unauthorized requests.
* Go Orchestrator does not own roles, permissions, or assignments.
* Go Orchestrator maps routes to orchestrator-owned permission codes.
* Go Orchestrator registers or reconciles route permission codes with Authorisation Service.
* Go Orchestrator can proxy legacy TypeScript endpoints.
* Business logic is progressively removed from TypeScript.
* Final architecture supports web, mobile, and future frontend apps.
