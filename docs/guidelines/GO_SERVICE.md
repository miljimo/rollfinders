# Go Service Responsibility and API Structure

Use this for services under:

```txt
apps/backend_api/internal/services/<service_name>/
```

## Core Rule

One service = one business domain.

A service must not become a container for unrelated features.

Examples:

```txt
subscriptions -> products, plans, subscriptions, entitlement publication
payments -> payment processing, refunds, invoices, provider state
organisations -> organisation profile, academy profile, organisation settings
authorisation -> roles, permissions, access rules
```

Bad:

```txt
subscriptions -> subscriptions, payments, roles, permissions, organisation settings
```

---

# Service Ownership

A service owns:

* domain models
* business rules
* state changes
* repository layer
* service events
* service tests

A service must not own:

* unrelated domain logic
* another service’s tables
* another service’s permissions
* another service’s payment state
* auth/authz rules

Before adding code, check:

```txt
Does this belong to this service domain?
Does this service own the data?
Would this still belong here if separated later?
```

If unclear, create a boundary decision ticket.

---

# API Service Structure

Services with API endpoints must use:

```txt
apps/backend_api/internal/services/<service_name>/
  Server.go

  domain/
    <StructName>.go
    errors.go
    constants.go

  repository/
    Repository.go
    PostgresRepository.go

  service/
    Service.go
    <UseCaseName>.go

  endpoints/
    Create<Resource>.go
    Get<Resource>.go
    List<Resource>.go
    Update<Resource>.go
    Delete<Resource>.go

  bootstrap/
    Bootstrap.go

  README.md
```

Example:

```txt
apps/backend_api/internal/services/subscriptions/
  Server.go
  domain/
    Subscription.go
    SubscriptionPlan.go
    Product.go
    ProductFeature.go
    errors.go
    constants.go
  repository/
    Repository.go
    PostgresRepository.go
  service/
    Service.go
    CreateSubscription.go
    CreatePlan.go
  endpoints/
    CreateSubscription.go
    GetSubscription.go
    ListSubscriptions.go
    CreatePlan.go
    GetPlan.go
    ListPlans.go
  bootstrap/
    Bootstrap.go
  README.md
```

---

# Server.go

`Server.go` registers all service endpoints.

It may:

* create service router/group
* register routes
* attach endpoint handlers
* connect handlers to service layer

It must not:

* contain business logic
* decode request bodies
* execute SQL
* authenticate
* authorise

Example:

```go
func RegisterRoutes(router Router, svc *service.Service) {
    router.POST(RouteSubscriptions, endpoints.CreateSubscription(svc))
    router.GET(RouteSubscriptionByID, endpoints.GetSubscription(svc))
    router.GET(RouteSubscriptions, endpoints.ListSubscriptions(svc))
}
```

---

# endpoints/

One endpoint = one file.

Good:

```txt
endpoints/
  CreateSubscription.go
  GetSubscription.go
  ListSubscriptions.go
  UpdateSubscription.go
  CancelSubscription.go
```

Bad:

```txt
endpoints/
  SubscriptionEndpoints.go
```

Each endpoint file may contain:

* request struct
* response struct
* handler function
* request decoding
* response mapping
* endpoint error mapping

Endpoint handlers must:

* stay thin
* call service layer only
* not contain business logic
* not execute SQL
* not call repositories directly
* not authenticate or authorise
* not import another service’s internal package

Example:

```go
func CreateSubscription(svc *service.Service) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // decode request
        // call service
        // write response
    }
}
```

---

# Naming

Endpoint files use CamelCase.

Good:

```txt
CreateSubscription.go
GetSubscription.go
ListSubscriptions.go
```

Bad:

```txt
create_subscription.go
subscription_handlers.go
handlers.go
routes.go
```

Endpoint function names match the file purpose.

Good:

```go
func CreateSubscription(svc *service.Service) http.HandlerFunc
```

Bad:

```go
func Handle()
func SubscriptionHandler()
```

---

# Request / Response Types

Keep endpoint-only request/response structs inside the endpoint file.

Example:

```go
type CreateSubscriptionRequest struct {
    PlanID string `json:"plan_id"`
}

type CreateSubscriptionResponse struct {
    ID     string `json:"id"`
    Status string `json:"status"`
}
```

If reused by multiple endpoints, move to:

```txt
endpoints/SharedTypes.go
```

Do not create shared files unless reuse exists.

---

# Constants

Reusable inline strings must be constants.

Use constants for:

* routes
* statuses
* event names
* error codes
* feature keys
* provider names
* headers
* repeated values

Example:

```go
const (
    RouteSubscriptions    = "/subscriptions"
    RouteSubscriptionByID = "/subscriptions/:id"
)
```

---

# Ticket Notes

Add to Go API service tickets:

```md
## Implementation Notes

- Follow single responsibility.
- Service owns only its domain responsibility.
- `Server.go` registers all service endpoints.
- Each endpoint lives in `endpoints/<EndpointName>.go`.
- Endpoint files use CamelCase.
- Endpoint handlers call service layer only.
- Endpoint handlers must not contain business logic, SQL, auth, or repository calls.
- Reused strings must be constants.
- If ownership is unclear, mark it as a blocker.
```

Add to acceptance criteria:

```md
- WHEN reviewed, THEN the service has one clear domain responsibility.
- WHEN reviewed, THEN `Server.go` registers all endpoints.
- WHEN reviewed, THEN each endpoint has one CamelCase file under `endpoints/`.
- WHEN reviewed, THEN endpoints call service layer only.
- WHEN reviewed, THEN no endpoint contains business logic, SQL, auth, or repository calls.
- WHEN reviewed, THEN no other service’s owned tables are modified.
```
