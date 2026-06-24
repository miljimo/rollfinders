# Organisation Service PRD

## Purpose

Create a standalone Organisation Service that owns tenant records, application records, application-service enablement, tenant settings, and tenant lifecycle state for RollFinders platform applications.

Organisation Service is the root tenant registry. Domain services use its identifiers to scope records, but Organisation Service does not own those domain records.

## Current Context

RollFinders currently uses `organisation_id` and `application_id` across service boundaries before Organisation Service exists as a runtime service.

Current implementation constraints:

- Users/IAM Service remains the writable owner for user identity and organisation membership.
- Authorisation Service owns role bundles, permission definitions, permission assignment, and permission evaluation.
- Authorisation Service currently stores an `application_service_permissions` permission-evaluation projection for `app_rollfinders`; Organisation Service is the target durable owner for application-service enablement.
- Academy Service stores academy/location resources with `organisation_id` and `application_id`.
- Course, Booking, Payment, and Academy services store external organisation/application identifiers, not cross-service foreign keys.
- `app_rollfinders` is the current default RollFinders application identifier.
- Existing academy identifiers may still act as compatibility organisation scopes until the organisation registry is fully introduced.

## Goals

- Provide a durable source of truth for organisations and applications.
- Let one organisation own one or more applications.
- Let applications enable or disable shared platform services.
- Give downstream services stable `organisation_id` and `application_id` values.
- Support future non-RollFinders applications reusing shared services.
- Preserve existing RollFinders behavior during migration.

## Non-Goals

Organisation Service SHALL NOT own:

- user identities
- user authentication
- organisation membership assignments
- roles or permissions
- academy/location records
- courses or course occurrences
- bookings
- payments, payees, payouts, or Stripe Connect state
- notification delivery
- analytics events

Membership reads may be exposed later through a proxy/read model, but membership writes remain outside Organisation Service.

## Concepts

### Organisation

An organisation represents a tenant, company, brand, academy business, or platform owner.

Examples:

- RollFinders Ltd
- BJJ Events Ltd
- Fitness Hub Ltd

### Application

An application represents a software product owned by an organisation.

Examples:

- RollFinders Marketplace
- Academy Portal
- Fitness Finder
- Event Hub

### Application Service

An application service is a shared platform service enabled for an application.

Examples:

- `users`
- `authorisation`
- `academy`
- `course`
- `booking`
- `payment`
- `notification`
- `analytics`

For the first implementation, Organisation Service should seed current backend service keys and leave future services disabled or absent until they exist as runtime services.

### Resource Link

A resource link maps an organisation/application to an external domain resource when a service needs a registry-level reference without Organisation Service owning that resource.

Example:

```text
organisation_id = org_rollfinders
application_id = app_rollfinders
resource_type = academy
resource_id = academy_123
```

Resource links are optional for v1 and must not replace domain-service ownership.

## Ownership Boundaries

Organisation Service owns:

- organisations
- organisation profiles
- organisation settings
- applications
- application-service enablement
- organisation/application lifecycle status
- organisation audit events for its own mutations
- optional resource-link registry rows

Organisation Service consumes:

- Authorisation Service decisions for protected operations
- Users/IAM membership data for optional membership read endpoints

Authorisation Service consumes:

- organisation/application scope IDs for permission definitions and assignments
- Organisation Service API results when a protected operation must also consider tenant or application-service state

Other services consume:

- organisation IDs
- application IDs
- application-service enablement state
- organisation/application status

## Data Model

All identifiers SHOULD be text IDs with stable prefixes, following current service conventions.

Recommended prefixes:

- `org_`
- `app_`
- `org_profile_`
- `org_setting_`
- `org_resource_`
- `org_audit_`

### `organisations`

```sql
CREATE TABLE organisations (
    id text PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### `organisation_profiles`

```sql
CREATE TABLE organisation_profiles (
    organisation_id text PRIMARY KEY REFERENCES organisations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    legal_name text,
    website text,
    email text,
    phone text,
    logo_url text,
    address jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### `organisation_settings`

```sql
CREATE TABLE organisation_settings (
    organisation_id text NOT NULL REFERENCES organisations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organisation_id, setting_key)
);
```

### `applications`

```sql
CREATE TABLE applications (
    id text PRIMARY KEY,
    organisation_id text NOT NULL REFERENCES organisations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, slug)
);
```

### `application_services`

```sql
CREATE TABLE application_services (
    application_id text NOT NULL REFERENCES applications(id) ON UPDATE CASCADE ON DELETE CASCADE,
    service_key text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (application_id, service_key)
);
```

This table is the source of truth for application-service enablement. Authorisation Service must not keep an `application_service_permissions` table; protected flows that need service enablement must read Organisation Service or receive a trusted Organisation Service decision.

### `organisation_resource_links`

```sql
CREATE TABLE organisation_resource_links (
    id text PRIMARY KEY,
    organisation_id text NOT NULL REFERENCES organisations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    application_id text REFERENCES applications(id) ON UPDATE CASCADE ON DELETE CASCADE,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, application_id, resource_type, resource_id)
);
```

### `organisation_audit_events`

```sql
CREATE TABLE organisation_audit_events (
    id text PRIMARY KEY,
    actor_user_id text,
    organisation_id text,
    application_id text,
    action text NOT NULL,
    previous_value jsonb,
    new_value jsonb,
    request_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

## API Requirements

The service SHOULD follow existing Go service conventions:

- `GET /healthz`
- `GET /readyz`
- JSON request/response bodies
- structured error envelopes
- database access through SQL functions/procedures where practical
- local Dockerfile and compose integration

### Organisations

```http
POST   /v1/organisations
GET    /v1/organisations
GET    /v1/organisations/{organisation_id}
PUT    /v1/organisations/{organisation_id}
DELETE /v1/organisations/{organisation_id}
```

Delete SHOULD archive by default. Hard deletion requires explicit policy and must fail when dependent applications exist unless the request is a documented destructive operation.

### Organisation Profile

```http
GET /v1/organisations/{organisation_id}/profile
PUT /v1/organisations/{organisation_id}/profile
```

### Organisation Settings

```http
GET /v1/organisations/{organisation_id}/settings
PUT /v1/organisations/{organisation_id}/settings/{setting_key}
```

### Applications

```http
POST   /v1/organisations/{organisation_id}/applications
GET    /v1/organisations/{organisation_id}/applications
GET    /v1/applications/{application_id}
PUT    /v1/applications/{application_id}
DELETE /v1/applications/{application_id}
```

Delete SHOULD archive by default.

### Application Services

```http
GET /v1/applications/{application_id}/services
PUT /v1/applications/{application_id}/services/{service_key}
```

The `PUT` request toggles `enabled`.

### Resource Links

```http
POST   /v1/organisations/{organisation_id}/resource-links
GET    /v1/organisations/{organisation_id}/resource-links
GET    /v1/resource-links/{resource_link_id}
PUT    /v1/resource-links/{resource_link_id}
DELETE /v1/resource-links/{resource_link_id}
```

Resource links are implementation-phase optional. If omitted from v1, the API should be documented as future work.

### Membership References

```http
GET /v1/organisations/{organisation_id}/memberships
```

This endpoint is optional future work. If implemented, it must read from Users/IAM or an IAM-owned projection. It must not write membership assignments.

## Authorisation

Organisation Service must not check role names directly.

Protected operations must call Authorisation Service or receive a trusted authorisation decision from the gateway/application layer.

### Permission Catalog

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `organisation.create` | Create an organisation. | platform |
| `organisation.read` | Read organisation details. | organisation |
| `organisation.search` | List/search organisations. | platform |
| `organisation.update` | Update organisation metadata. | organisation |
| `organisation.delete` | Delete or archive an organisation. | platform |
| `organisation.activate` | Activate an organisation. | platform or organisation |
| `organisation.suspend` | Suspend an organisation. | platform |
| `organisation.archive` | Archive an organisation. | platform or organisation |
| `organisation.profile.read` | Read organisation profile. | organisation |
| `organisation.profile.update` | Update organisation profile. | organisation |
| `organisation.settings.read` | Read organisation settings. | organisation |
| `organisation.settings.update` | Update organisation settings. | organisation |
| `organisation.application.create` | Create applications. | organisation |
| `organisation.application.read` | Read application details. | organisation/application |
| `organisation.application.search` | List/search applications. | organisation |
| `organisation.application.update` | Update application metadata or status. | organisation/application |
| `organisation.application.archive` | Archive an application. | organisation/application |
| `organisation.application.manage` | Transitional broad permission for existing RollFinders admin checks. | organisation/application |
| `organisation.service.read` | Read application-service enablement. | organisation/application |
| `organisation.service.enable` | Enable application services. | organisation/application |
| `organisation.service.disable` | Disable application services. | organisation/application |
| `organisation.resource_link.read` | Read resource links. | organisation/application |
| `organisation.resource_link.create` | Create resource links. | organisation/application |
| `organisation.resource_link.update` | Update resource links. | organisation/application |
| `organisation.resource_link.delete` | Delete resource links. | organisation/application |
| `organisation.audit.read` | Read organisation audit events. | organisation or platform |

### Route Permission Matrix

| Route | Permission |
| --- | --- |
| `POST /v1/organisations` | `organisation.create` |
| `GET /v1/organisations` | `organisation.search` |
| `GET /v1/organisations/{organisation_id}` | `organisation.read` |
| `PUT /v1/organisations/{organisation_id}` | `organisation.update` |
| `DELETE /v1/organisations/{organisation_id}` | `organisation.delete` |
| `GET /v1/organisations/{organisation_id}/profile` | `organisation.profile.read` |
| `PUT /v1/organisations/{organisation_id}/profile` | `organisation.profile.update` |
| `GET /v1/organisations/{organisation_id}/settings` | `organisation.settings.read` |
| `PUT /v1/organisations/{organisation_id}/settings/{setting_key}` | `organisation.settings.update` |
| `POST /v1/organisations/{organisation_id}/applications` | `organisation.application.create` |
| `GET /v1/organisations/{organisation_id}/applications` | `organisation.application.search` |
| `GET /v1/applications/{application_id}` | `organisation.application.read` |
| `PUT /v1/applications/{application_id}` | `organisation.application.update` |
| `DELETE /v1/applications/{application_id}` | `organisation.application.archive` |
| `GET /v1/applications/{application_id}/services` | `organisation.service.read` |
| `PUT /v1/applications/{application_id}/services/{service_key}` | `organisation.service.enable` or `organisation.service.disable` |
| `GET /v1/organisations/{organisation_id}/memberships` | `organisation.read` plus IAM-backed membership read |

## Service Integration Rules

All domain services must treat `organisation_id` and `application_id` as external identifiers.

Domain services must not create cross-service database foreign keys to Organisation Service tables.

Organisation Service should expose enough read APIs for other services and the RollFinders app to validate:

- organisation exists
- organisation status allows access
- application exists
- application status allows access
- requested service is enabled for the application

## RollFinders Seed And Migration

The first implementation must seed:

```text
Organisation:
id = org_rollfinders
name = RollFinders
slug = rollfinders
status = ACTIVE

Application:
id = app_rollfinders
organisation_id = org_rollfinders
name = RollFinders Marketplace
slug = rollfinders-marketplace
status = ACTIVE
```

Default enabled services for `app_rollfinders`:

- `account`
- `auth`
- `user`
- `authorisation`
- `academy`
- `course`
- `booking`
- `payment`
- `payout`
- `organisation`

Future services may add:

- `notification`
- `analytics`

Migration must not break current compatibility flows where existing academy IDs are used as organisation scopes. The migration plan should introduce the registry first, then move callers to registry-backed organisation IDs in a separate cutover.

## Implementation Tickets

### Ticket 001 - Service Foundation

- Add `services/organisation` Go module.
- Add Dockerfile and compose integration.
- Add `/healthz` and `/readyz`.
- Add database connection configuration matching existing services.
- Acceptance: service starts locally and reports ready when the database is reachable.

### Ticket 002 - Migration Framework And Core Schema

- Add `apps/backend_api/migrations/organisation`.
- Create the Organisation Service schema.
- Add tables listed in this PRD.
- Add idempotent seed data for `org_rollfinders` and `app_rollfinders`.
- Acceptance: migrations can run repeatedly without error.

### Ticket 003 - Organisation CRUD APIs

- Implement create, read, list, update, archive/delete.
- Add audit events for mutations.
- Acceptance: API supports active/suspended/archived lifecycle without hard-deleting by default.

### Ticket 004 - Profile And Settings APIs

- Implement profile read/update.
- Implement settings list/upsert.
- Acceptance: settings are per organisation and use JSON values.

### Ticket 005 - Application APIs

- Implement application create, read, list, update, archive.
- Acceptance: application slugs are unique within an organisation.

### Ticket 006 - Application Service Enablement APIs

- Implement application service list and toggle.
- Acceptance: enabled service state is visible and mutable through protected APIs.

### Ticket 007 - Authorisation Integration

- Add permission checks for protected routes.
- Use organisation/application scope when calling Authorisation Service.
- Acceptance: no route relies on hardcoded role names.

### Ticket 008 - RollFinders Client Integration

- Add a server-only Organisation Service client in the RollFinders app.
- Use it where application-service enablement or tenant status must be checked.
- Acceptance: existing RollFinders flows still work with `app_rollfinders`.

### Ticket 009 - Resource Link APIs

- Implement resource-link endpoints if needed by Academy, Course, Booking, or Payment workflows.
- Acceptance: links are references only and do not duplicate domain ownership.

### Ticket 010 - Membership Reference API

- Optional future ticket.
- Read membership references from Users/IAM or an IAM-owned projection.
- Acceptance: Organisation Service does not create, update, or delete memberships.

## Acceptance Criteria

- Organisation Service owns organisations, applications, service enablement, settings, and lifecycle status.
- Organisation Service does not own users, memberships, roles, permissions, academies, courses, bookings, or payments.
- `org_rollfinders` and `app_rollfinders` are seeded idempotently.
- Application-service enablement is stored per application.
- Protected routes declare and enforce Authorisation Service permissions.
- Domain services continue to store `organisation_id` and `application_id` as external identifiers.
- Existing RollFinders app behavior continues during the compatibility period.
- Migrations are repeatable.
- Local compose can start Organisation Service alongside the other services once implementation tickets are complete.
- The PRD gives engineers enough detail to implement the service without adding new ownership overlap.
