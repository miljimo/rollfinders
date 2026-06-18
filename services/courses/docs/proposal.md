# Course Service - Technical PRD

## Overview

Build a standalone Course Service following the same architecture, coding standards, patterns, eventing model, deployment model, and repository structure currently used by the existing User Service and Payment Service.

The service is responsible only for course management.

The service must be designed as a domain-driven microservice and must not own user, organisation, payment, booking, attendance, authentication, or authorization data.

All references to users and organisations are external identifiers.

---

# Technology Stack

## Language

* Golang 1.24+

## Database

* PostgreSQL 16+

## Containerisation

* Docker

## API

* REST
* JSON
* OpenAPI 3



# Service Responsibilities

The Course Service owns:

* Course Types
* Courses
* Course Activities
* Course Schedules
* Course Sessions
* Session Locations
* Session Histories

---

# Non Responsibilities

The Course Service must not manage:

* Users
* Organisations
* Memberships
* Payments
* Bookings
* Attendance
* Authentication
* Authorization

---

# Domain Model

## Course Type

Represents a category of course.

Examples:

* Open Mat
* Sparring
* Training
* Boxing
* Seminar
* Workshop
* Yoga
* Custom (User defined courses)

Each organisation can create its own types.

---

## Course

Represents a reusable course definition.

Examples:

* Tuesday BJJ Beginners
* Friday Open Mat
* Boxing Fundamentals
* Summer Seminar

A course can have:

* activities
* schedules
* sessions

---

## Activity

Represents a sub-section of a course.

Example:

| Activity   | Duration |
| ---------- | -------- |
| Warm Up    | 15 mins  |
| Drilling   | 30 mins  |
| Sparring   | 20 mins  |
| Discussion | 15 mins  |

Activities are relative to session start time.

---

## Schedule

Represents recurring scheduling rules.

Examples:

* Every Monday
* Every Friday
* Every 2 weeks
* Monthly

Schedules automatically generate sessions.

---

## Session

Represents an actual scheduled occurrence of a course.

Example:

Course:
BJJ Beginners

Sessions:

* 2026-01-05
* 2026-01-12
* 2026-01-19

---

## Session Location

Stores physical location information.

---

# Database Schema

## course_types

```sql
CREATE TABLE course_types (
    id UUID PRIMARY KEY,
    organisation_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

---

## courses

```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY,
    organisation_id UUID NOT NULL,
    course_type_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    level VARCHAR(50),
    capacity INT,
    price_amount DECIMAL(10,2),
    currency VARCHAR(10),
    status VARCHAR(50),
    created_by_user_id UUID,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

---

## course_activities

```sql
CREATE TABLE course_activities (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_offset_minutes INT NOT NULL,
    duration_minutes INT NOT NULL,
    sort_order INT NOT NULL
);
```

---

## course_schedules

```sql
CREATE TABLE course_schedules (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL,
    recurrence_type VARCHAR(50) NOT NULL,
    day_of_week INT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE,
    created_at TIMESTAMP NOT NULL
);
```

---

## course_sessions

```sql
CREATE TABLE course_sessions (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL,
    organisation_id UUID NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    capacity INT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

---

## session_locations

```sql
CREATE TABLE session_locations (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    location_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7)
);
```

---

# Session Generation

Implement a background worker.

Purpose:

Generate future sessions automatically from schedules.

Rules:

* Generate sessions 90 days ahead
* Prevent duplicates
* Support daily schedules
* Support weekly schedules
* Support fortnightly schedules
* Support monthly schedules

Worker frequency:

```text
Every 24 hours
```

---

# REST Endpoints

## Course Types

```http
POST   /course-types
GET    /course-types
GET    /course-types/{id}
PUT    /course-types/{id}
DELETE /course-types/{id}
```

---

## Courses

```http
POST   /courses
GET    /courses
GET    /courses/{id}
PUT    /courses/{id}
DELETE /courses/{id}
```

---

## Activities

```http
POST   /courses/{id}/activities
GET    /courses/{id}/activities
PUT    /activities/{id}
DELETE /activities/{id}
```

---

## Schedules

```http
POST   /courses/{id}/schedules
GET    /courses/{id}/schedules
PUT    /schedules/{id}
DELETE /schedules/{id}
```

---

## Sessions

```http
GET    /sessions
GET    /sessions/{id}
PUT    /sessions/{id}
POST   /sessions/{id}/cancel
```

---

# Events

Publish events using the same event framework already used by Payment Service.

## course.created

```json
{
  "event":"course.created",
  "course_id":"uuid",
  "organisation_id":"uuid"
}
```

---

## course.updated

```json
{
  "event":"course.updated",
  "course_id":"uuid"
}
```

---

## course.deleted

```json
{
  "event":"course.deleted",
  "course_id":"uuid"
}
```

---

## session.created

```json
{
  "event":"session.created",
  "session_id":"uuid",
  "course_id":"uuid"
}
```

---

## session.cancelled

```json
{
  "event":"session.cancelled",
  "session_id":"uuid"
}
```

---

# Security

Authentication is performed by API Gateway.

Course Service must trust incoming JWT.

Expected claims:

```json
{
  "sub":"user-id",
  "organisation_id":"organisation-id",
  "roles":["academy_admin"]
}
```

Course Service does not validate passwords.

Course Service does not issue tokens.

---

# Folder Structure

```text
course-service

├── cmd
│   └── api

├── internal

│   ├── courses
│   ├── course_types
│   ├── schedules
│   ├── sessions
│   ├── activities

│   ├── repository
│   ├── handlers
│   ├── services
│   ├── events
│   ├── middleware
│   └── workers

├── migrations

├── pkg

├── configs

├── docs

├── Dockerfile

└── docker-compose.yml
```

---

# Acceptance Criteria

1. Course types can be created per organisation.

2. Courses can be created and updated.

3. Activities can be attached to courses.

4. Schedules can be attached to courses.

5. Sessions are automatically generated.

6. Duplicate sessions are prevented.

7. Session cancellation is supported.

8. Events are published.

9. Swagger documentation is generated.

10. Docker deployment works.

11. PostgreSQL migrations run automatically.

12. Unit tests and integration tests are included.

13. Service follows the same architecture and patterns as existing User Service and Payment Service.

14. Production-ready code only.

15. No mock implementations.
