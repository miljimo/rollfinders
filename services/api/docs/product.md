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
