# PRD: Health API

Version: 1.0

Route: `GET /api/health`

Source: `src/app/api/health/route.ts`

---

# Objective

Expose a lightweight operational health endpoint for uptime checks and an optional deeper database connectivity check.

---

# IF/WHEN/THEN Requirements

## HEALTH-001: Basic Health Check

IF a monitoring client calls `GET /api/health`

WHEN no `deep=1` query parameter is provided

THEN the API SHALL return HTTP 200 with `{ "status": "ok" }`.

## HEALTH-002: Deep Health Check

IF a monitoring client calls `GET /api/health?deep=1`

WHEN the database query succeeds

THEN the API SHALL return HTTP 200 with `{ "status": "ok", "database": "ok" }`.

## HEALTH-003: Deep Health Failure

IF a monitoring client calls `GET /api/health?deep=1`

WHEN the database query fails

THEN the API SHALL return HTTP 503 with `{ "status": "error", "database": "error" }`.

## HEALTH-004: Public Availability

IF the health endpoint is called by an unauthenticated client

WHEN the request reaches the route

THEN the API SHALL respond without requiring user authentication.

---

# Acceptance Criteria

* Basic health checks do not require database access.
* Deep health checks verify database connectivity.
* Failed deep checks return HTTP 503.
* The response does not expose secrets, connection strings, or stack traces.
