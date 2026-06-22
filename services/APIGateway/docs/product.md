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
Authorization checks
Permission checks
Service routing
Request validation
Response formatting
Audit logging
```

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
Authorization Service
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
* Go Orchestrator calls Authorization Service.
* Go Orchestrator blocks unauthorized requests.
* Go Orchestrator can proxy legacy TypeScript endpoints.
* Business logic is progressively removed from TypeScript.
* Final architecture supports web, mobile, and future frontend apps.
