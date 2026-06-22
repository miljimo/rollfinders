# PRD: Organisation Service

## Overview

Create a standalone Organisation Service responsible for managing organisations, applications, application ownership, and service tenancy.

The Organisation Service becomes the root tenant service for the platform.

All other services will use Organisation Service to determine ownership, isolation, permissions, billing, and resource boundaries.

The Organisation Service does not manage domain entities such as academies, courses, bookings, or payments.

---

# Business Goal

Transform Rollfinders from a single application into a platform capable of hosting multiple applications using shared services.

Examples:

```text
Organisation
    ├── Rollfinders
    │      ├── Users Service
    │      ├── Academy Service
    │      ├── Courses Service
    │      ├── Booking Service
    │      └── Payments Service
    │
    ├── Fitness Finder
    │      ├── Users Service
    │      ├── Courses Service
    │      └── Payments Service
    │
    └── Event Hub
           ├── Users Service
           ├── Booking Service
           └── Payments Service
```

---

# Responsibilities

Organisation Service owns:

* Organisations
* Applications
* Application Ownership
* Organisation Settings
* Organisation Status
* Service Access

Organisation Service does not own:

* Users
* User-to-organisation membership
* Roles
* Permissions
* Academies
* Courses
* Bookings
* Payments

Users/IAM Service is the current implementation baseline for organisation membership records.
Authorisation Service owns all permission and role assignment decisions.

---

# Concepts

## Organisation

Represents a business, company, brand, or platform.

Examples:

```text
Rollfinders Ltd
BJJ Events Ltd
Fitness Hub Ltd
```

---

## Application

Represents a software application belonging to an organisation.

Examples:

```text
Rollfinders Marketplace
Academy Portal
Fitness Finder
Event Hub
```

Applications consume shared platform services.

---

# Ownership Hierarchy

```text
Organisation
    ↓
Application
    ↓
Services
    ↓
Domain Resources
```

Example:

```text
Organisation
    ↓
Rollfinders

Application
    ↓
Rollfinders Marketplace

Academy
    ↓
Gracie Academy

Course
    ↓
Saturday Open Mat
```

---

# Database

## organisations

```sql
CREATE TABLE organisations (
    id UUID PRIMARY KEY,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,

    status VARCHAR(50) NOT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

---

## organisation_profiles

```sql
CREATE TABLE organisation_profiles (
    organisation_id UUID PRIMARY KEY,

    legal_name VARCHAR(255),
    website VARCHAR(500),

    email VARCHAR(255),
    phone VARCHAR(50),

    logo_url TEXT,

    address JSONB,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

---

## organisation_users

`organisation_users` is not owned by Organisation Service.

Current implementation keeps organisation membership in the Users/IAM service baseline. Future Organisation Service runtime may read membership through an IAM API or projected read model, but it must not introduce a second writable membership table.

---

## applications

```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY,

    organisation_id UUID NOT NULL,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,

    status VARCHAR(50) NOT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

---

## application_services

```sql
CREATE TABLE application_services (
    id UUID PRIMARY KEY,

    application_id UUID NOT NULL,

    service_name VARCHAR(100) NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

Example:

```text
Users
Academy
Courses
Bookings
Payments
Notifications
Analytics
```

---

# Service Integration

All services must support:

```text
organisation_id
application_id
```

Examples:

Users Service:

```sql
users
(
    id,
    organisation_id,
    application_id,
    ...
)
```

Academy Service:

```sql
academies
(
    id,
    organisation_id,
    application_id,
    ...
)
```

Courses Service:

```sql
courses
(
    id,
    organisation_id,
    application_id,
    ...
)
```

---

# API Endpoints

## Organisations

```http
POST   /organisations
GET    /organisations/{id}
PUT    /organisations/{id}
DELETE /organisations/{id}
```

---

## Organisation Membership References

```http
GET /organisations/{id}/memberships
```

This endpoint is optional future work and must proxy or reference IAM membership. Organisation Service must not create, update, or delete membership assignments directly.

---

## Applications

```http
POST   /organisations/{id}/applications
GET    /applications/{id}
PUT    /applications/{id}
DELETE /applications/{id}
```

---

## Application Services

```http
POST /applications/{id}/services
GET  /applications/{id}/services
PUT  /applications/{id}/services/{serviceName}
```

---

# Rollfinders Migration

Move from:

```text
Rollfinders
    ↓
Academies
```

To:

```text
Organisation
    ↓
Application
    ↓
Academies
```

Default migration:

```text
Organisation:
Rollfinders

Application:
Rollfinders Marketplace
```

Existing data should automatically belong to the default Rollfinders organisation and application.

---

# Security

Organisation Service must not check role names directly.

Protected operations must require Authorisation Service permission checks with `organisation_id` and, where relevant, `application_id` scope.

## Permission Catalog

Authorisation Service stores and evaluates these permissions. Organisation Service declares which permission is required for each protected operation.

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `organisation.create` | Create a platform-controlled organisation record. | platform |
| `organisation.read` | Read an organisation record. | organisation |
| `organisation.search` | Search/list organisations. | platform |
| `organisation.update` | Update organisation name, slug, or status-safe metadata. | organisation |
| `organisation.archive` | Archive an organisation. | organisation |
| `organisation.activate` | Reactivate an archived or suspended organisation. | organisation |
| `organisation.suspend` | Suspend an organisation from platform access. | platform |
| `organisation.delete` | Delete an organisation where policy allows hard deletion. | platform |
| `organisation.profile.read` | Read organisation profile details. | organisation |
| `organisation.profile.update` | Update organisation profile details. | organisation |
| `organisation.settings.read` | Read tenant settings. | organisation |
| `organisation.settings.update` | Update tenant settings. | organisation |
| `organisation.application.create` | Create an application under an organisation. | organisation |
| `organisation.application.read` | Read application records. | organisation/application |
| `organisation.application.search` | List applications for an organisation. | organisation |
| `organisation.application.update` | Update application metadata or status. | organisation/application |
| `organisation.application.archive` | Archive an application. | organisation/application |
| `organisation.service.read` | Read enabled services for an application. | organisation/application |
| `organisation.service.enable` | Enable a service for an application. | organisation/application |
| `organisation.service.disable` | Disable a service for an application. | organisation/application |
| `organisation.resource_link.read` | Read future organisation-to-domain-resource mappings. | organisation/application |
| `organisation.resource_link.create` | Create future organisation-to-domain-resource mappings. | organisation/application |
| `organisation.resource_link.update` | Update future organisation-to-domain-resource mappings. | organisation/application |
| `organisation.resource_link.delete` | Delete future organisation-to-domain-resource mappings. | organisation/application |
| `organisation.audit.read` | Read organisation/application audit events. | organisation/platform |

### Route Permission Matrix

| Route | Permission |
| --- | --- |
| `POST /organisations` | `organisation.create` |
| `GET /organisations/{id}` | `organisation.read` |
| `GET /organisations` | `organisation.search` |
| `PUT /organisations/{id}` | `organisation.update` |
| `DELETE /organisations/{id}` | `organisation.delete` |
| `POST /organisations/{id}/applications` | `organisation.application.create` |
| `GET /applications/{id}` | `organisation.application.read` |
| `GET /organisations/{id}/applications` | `organisation.application.search` |
| `PUT /applications/{id}` | `organisation.application.update` |
| `DELETE /applications/{id}` | `organisation.application.archive` |
| `POST /applications/{id}/services` | `organisation.service.enable` |
| `GET /applications/{id}/services` | `organisation.service.read` |
| `PUT /applications/{id}/services/{serviceName}` | `organisation.service.enable` or `organisation.service.disable` based on requested state |
| `GET /organisations/{id}/memberships` | IAM-backed membership read plus `organisation.read` |

Authorised users can:

* Create applications
* Enable services
* Read membership references through IAM-backed APIs

Application and domain permissions remain managed through Authorisation Service and declared by each individual service.

---

# Acceptance Criteria

* Organisations can be created.
* Organisation Service does not own or manage user membership.
* Organisations can create applications.
* Applications can enable services.
* Services support organisation_id.
* Services support application_id.
* Existing Rollfinders data is migrated to a default organisation.
* Existing Rollfinders functionality continues to work without breaking changes.
* New applications can reuse Users, Courses, Booking, Payments, and Academy services.
* Protected Organisation routes declare and enforce Authorisation Service permissions.
