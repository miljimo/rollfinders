# PRD: Dashboard Academy Detail API

Version: 1.0

Route: `GET /api/dashboard/academies/[id]`

Source: `src/app/api/dashboard/academies/[id]/route.ts`

---

# Objective

Return academy detail data to a standard dashboard user only for their assigned academy.

---

# IF/WHEN/THEN Requirements

## DASH-ACADEMY-001: Standard Dashboard Authorization

IF a user calls `GET /api/dashboard/academies/[id]`

WHEN the user is not authorized for the standard dashboard

THEN the API SHALL reject the request.

## DASH-ACADEMY-002: Academy ID Scope

IF an authorized dashboard user requests an academy ID

WHEN the requested ID does not match the user's assigned academy ID

THEN the API SHALL return HTTP 403.

## DASH-ACADEMY-003: Academy Not Found

IF the requested academy ID matches the user's assigned academy

WHEN no academy record exists

THEN the API SHALL return HTTP 404 with an academy not found error.

## DASH-ACADEMY-004: Academy Detail Response

IF the requested academy exists and is within scope

WHEN the API responds

THEN the API SHALL return JSON with an `academy` object.

---

# Acceptance Criteria

* Academy-scoped access is enforced by ID.
* Out-of-scope IDs return HTTP 403.
* Missing in-scope records return HTTP 404.
