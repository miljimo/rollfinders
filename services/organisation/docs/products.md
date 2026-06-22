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
* Organisation Users
* Application Ownership
* Organisation Settings
* Organisation Status
* Service Access

Organisation Service does not own:

* Users
* Academies
* Courses
* Bookings
* Payments

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

```sql
CREATE TABLE organisation_users (
    id UUID PRIMARY KEY,

    organisation_id UUID NOT NULL,
    user_id UUID NOT NULL,

    role VARCHAR(50) NOT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

Roles:

```text
owner
admin
member
```

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

## Organisation Users

```http
POST   /organisations/{id}/users
GET    /organisations/{id}/users
DELETE /organisations/{id}/users/{userId}
```

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

Only organisation owners and admins can:

* Create applications
* Enable services
* Manage organisation users

Application permissions remain managed by individual services.

---

# Acceptance Criteria

* Organisations can be created.
* Organisations can manage users.
* Organisations can create applications.
* Applications can enable services.
* Services support organisation_id.
* Services support application_id.
* Existing Rollfinders data is migrated to a default organisation.
* Existing Rollfinders functionality continues to work without breaking changes.
* New applications can reuse Users, Courses, Booking, Payments, and Academy services.
