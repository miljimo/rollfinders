## API Gateway

`cmd/api` is the RollFinders backend API gateway. It is the single backend entry point for clients that should not call domain services directly.

The gateway currently does four things:

- Serves API documentation from `GET /`.
- Serves a Postman-importable OpenAPI document from `GET /openapi.json`.
- Checks dependency readiness from `GET /healthz` and `GET /readyz`.
- Looks up each request in the gateway route registry.
- Enforces authentication and authorisation before proxying protected requests to the target service.

The executable is intentionally thin. Process lifecycle, logging, signal handling, and graceful shutdown are shared through `internal/core/servicebase`. Gateway behaviour lives in `cmd/api/server`.

### Request Flow

```text
Client
  |
  v
cmd/api
  |
  |-- public infrastructure route?  -> serve locally
  |-- public registered route?      -> proxy to target service
  |
  |-- protected registered route?
        |
        |-- require X-Actor-User-ID
        |-- build authorisation request from route metadata
        |-- POST Authorisation Service /v1/authorize
        |-- deny early on failed/denied authorisation
        |-- proxy to target service only after allow
```

### Route Registry

All gateway routes are declared in:

```text
apps/backend_api/internal/services/api/server/routes.go
```

Each route declares:

- HTTP method
- public gateway path
- target service
- permission code for protected routes
- optional resource type and route parameter used as `resourceId`
- whether the route is public

Protected routes must include permission metadata. Tests fail if a protected route has no permission, if resource metadata is incomplete, or if generated API docs drift from the registry.

### Authorisation

Protected routes require `X-Actor-User-ID`.

The gateway does not grant access from authentication alone and does not special-case self access. It calls the Authorisation Service with:

- `subjectId`
- `permission`
- `organisationId`
- configured `applicationId`
- optional `resourceType`
- optional `resourceId`

If Authorisation Service does not return an allow decision, the gateway returns an early error and does not call the downstream service.

### Public Routes

Only routes explicitly marked `Public: true` in the route registry are public, plus local infrastructure endpoints:

- `GET /`
- `GET /healthz`
- `GET /readyz`

Public route access is not based on broad path prefixes.

### Generated API Documentation

`GET /` returns JSON API documentation generated from the same route registry used for enforcement. This keeps endpoint documentation aligned with actual routing and permissions.

The response includes:

- API name and version
- health endpoint paths
- every registered gateway route
- target service
- public/protected status
- permission code for protected routes
- resource scope metadata where applicable

`GET /openapi.json` returns an OpenAPI 3.1 document that can be imported into Postman. A generated static copy is also available at:

```text
docs/services/api/openapi.json
```

### Current Scope

Implemented now:

- request routing
- dependency health/readiness checks
- public route metadata
- protected route metadata
- required actor header for protected routes
- Authorisation Service decision check
- early deny before proxying
- generated route documentation
- request IDs and access logging

Not implemented yet in the API gateway:

- Access Key authentication
- Service License validation
- subscription entitlement checks
- rate limits
- usage quotas

Those controls should be added as gateway middleware or pre-authorisation checks when the backing services and data contracts exist. The README should not describe them as active until they are implemented and covered by tests.

### Local Run

```bash
cd apps/backend_api
go run ./cmd/api
```

Important environment variables:

```text
PORT
ROLLFINDERS_APPLICATION_ID
USER_PUBLIC_BASE_URL
AUTHORISATION_PUBLIC_BASE_URL
ACADEMY_PUBLIC_BASE_URL
ORGANISATION_PUBLIC_BASE_URL
COURSE_PUBLIC_BASE_URL
BOOKING_PUBLIC_BASE_URL
PAYMENT_PUBLIC_BASE_URL
LEGACY_NEXT_PUBLIC_BASE_URL
READ_TIMEOUT
WRITE_TIMEOUT
SHUTDOWN_TIMEOUT
```

### Verification

```bash
cd apps/backend_api
go test ./cmd/api/...
go test ./...
go build ./cmd/api ./cmd/services/...
```

Core regression coverage lives in:

```text
apps/backend_api/internal/services/api/server/routes_test.go
apps/backend_api/internal/services/api/server/server_test.go
```
