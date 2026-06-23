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
* map each route to one permission code declared by the owning service PRD
* call Authorisation Service `POST /v1/authorize`
* fail closed when the permission check cannot be completed
* forward only authorised requests to downstream services

The orchestrator SHALL NOT:

* store roles or permissions
* assign roles or permissions
* calculate effective permissions locally
* check hardcoded role names for access control

Permission catalogs are owned as follows:

| Prefix | Declared By | Examples |
| --- | --- | --- |
| `academy.*` | Academy Service PRD | `academy.update`, `academy.claim.approve` |
| `course.*` | Course Service PRD | `course.create`, `course.session.cancel` |
| `booking.*` | Booking Service PRD | `booking.create`, `booking.attendance.record` |
| `payment.*` | Payment Service PRD | `payment.refund.create`, `payment.payout_request.approve` |
| `organisation.*` | Organisation Service PRD | `organisation.application.create`, `organisation.service.enable` |
| `user.*` | Users Service PRDs | `user.create`, `user.status.disable` |
| `authorisation.*` | Authorisation Service PRD | `authorisation.role.create`, `authorisation.assignment.grant` |

Gateway-owned permissions should be avoided unless the gateway exposes operational admin routes of its own. Domain access must use the downstream service permission code, not a generic gateway permission.

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
* Go Orchestrator maps routes to service-declared permission codes.
* Go Orchestrator can proxy legacy TypeScript endpoints.
* Business logic is progressively removed from TypeScript.
* Final architecture supports web, mobile, and future frontend apps.
