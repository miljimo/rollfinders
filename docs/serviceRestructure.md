# PRD: Rollfinders Backend Restructure to Go Monorepo Multi-Service Architecture

## Objective

Restructure the existing Rollfinders backend into a Go monorepo architecture that supports:

* Shared libraries across services
* Independent service deployment
* Independent Docker images
* Independent scaling
* Clear service boundaries
* Future service additions

WITHOUT breaking any existing functionality.

This is a structural refactor only.

Business behaviour must remain unchanged.

---

# Critical Requirements

## MUST NOT

The AI agent MUST NOT:

* Change business logic
* Change API contracts
* Change request/response payloads
* Change authentication behaviour
* Change authorization behaviour
* Change database schema
* Change endpoint URLs
* Change event formats
* Change frontend integrations
* Change mobile app integrations

---

## MUST

The AI agent MUST:

* Preserve all existing behaviour
* Preserve all existing tests
* Preserve all existing APIs
* Preserve all existing database interactions
* Preserve all existing events
* Preserve all existing environment variables

---

# Existing Services

The following services already exist and must remain separate:

```text
Users Service
Courses Service
Bookings Service
Payments Service
```

Future services:

```text
Access Keys Service
Notifications Service
Analytics Service
```

---

# Target Repository Structure

```text
rollfinders-backend/

├── cmd/
│   ├── users-service/
│   ├── courses-service/
│   ├── bookings-service/
│   ├── payments-service/
│   ├── access-keys-service/
│   ├── notifications-service/
│   └── analytics-service/
│
├── internal/
│   ├── users/
│   ├── courses/
│   ├── bookings/
│   ├── payments/
│   ├── accesskeys/
│   ├── notifications/
│   ├── analytics/
│   │
│   └── core/
│       ├── auth/
│       ├── config/
│       ├── database/
│       ├── logger/
│       ├── middleware/
│       ├── response/
│       ├── errors/
│       ├── validation/
│       ├── events/
│       ├── telemetry/
│       └── cache/
│
├── pkg/
│   ├── contracts/
│   ├── dto/
│   ├── clients/
│   └── events/
│
├── migrations/
├── deployments/
├── configs/
├── scripts/
├── docs/
│
├── go.mod
└── go.sum
```

---

# Service Entry Points

Every service must have its own entry point.

Example:

```text
cmd/users-service/main.go
cmd/courses-service/main.go
cmd/bookings-service/main.go
cmd/payments-service/main.go
```

Each service must compile independently.

Example:

```bash
go build ./cmd/users-service
go build ./cmd/payments-service
```

---

# Shared Platform Libraries

The AI agent must identify duplicated code and move it into:

```text
internal/core/
```

Examples:

```text
Authentication
Database Connections
Logging
Middleware
Validation
Caching
Configuration
Error Handling
Event Publishing
```

Business logic must NOT be moved into platform libraries.

---

# Service Ownership Rules

Users Service owns:

```text
Users
Authentication
Roles
Profiles
```

Courses Service owns:

```text
Courses
Activities
Open Mats
Training Sessions
```

Bookings Service owns:

```text
Bookings
Attendance
Reservations
```

Payments Service owns:

```text
Payments
Transactions
Refunds
```

Access Keys Service owns:

```text
Access Keys
Permissions
Resource Access
Audit Logs
```

Notifications Service owns:

```text
Emails
SMS
WhatsApp
Push Notifications
```

Analytics Service owns:

```text
Visits
Tracking
Reporting
Metrics
```

---

# Internal Dependencies

Services MUST NOT access another service's database directly.

Allowed:

```text
Users Service
      ↓
Users Client
      ↓
Users API
```

Not allowed:

```text
Payments Service
      ↓
Users Database
```

---

# Package Rules

Shared DTOs:

```text
pkg/dto
```

Shared Contracts:

```text
pkg/contracts
```

Shared Clients:

```text
pkg/clients
```

Example:

```go
type UserClient interface {
    GetUser(ctx context.Context, id string)
}
```

---

# Docker Requirements

Every service must have its own Docker image.

Example:

```text
deployments/docker/
├── users-service.Dockerfile
├── courses-service.Dockerfile
├── bookings-service.Dockerfile
├── payments-service.Dockerfile
├── access-keys-service.Dockerfile
├── notifications-service.Dockerfile
└── analytics-service.Dockerfile
```

---

# Build Requirements

The AI agent must ensure:

```bash
go build ./...
```

passes successfully.

---

# Testing Requirements

Before and after refactor:

Run:

```bash
go test ./...
```

All existing tests must continue to pass.

No reduction in test coverage is allowed.

---

# API Compatibility Requirements

The AI agent must verify:

## Routes

No route changes.

## Request Payloads

No payload changes.

## Response Payloads

No payload changes.

## Error Responses

No error format changes.

---

# Database Compatibility Requirements

The AI agent must verify:

* No table changes
* No column changes
* No migration modifications
* No data loss

The restructure must be code-only.

---

# Environment Compatibility Requirements

Existing environment variables must continue working.

Examples:

```text
DATABASE_URL
JWT_SECRET
REDIS_URL
SMTP_HOST
```

No renaming allowed.

---

# Acceptance Criteria

The refactor is complete only when:

✓ Existing services compile

✓ Existing tests pass

✓ Existing APIs behave identically

✓ Existing database schema remains unchanged

✓ Existing Docker deployments continue working

✓ Shared platform libraries are extracted

✓ Each service can be deployed independently

✓ No regressions detected

✓ Access Keys Service skeleton created

✓ Notifications Service skeleton created

✓ Analytics Service skeleton created

---

# Definition of Done

The platform behaves exactly as before.

The only visible change is improved repository structure and service separation.

Users, academies, bookings, courses, and payments continue operating without any behavioural changes.

```
```
