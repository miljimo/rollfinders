# PRD: Dashboard Rolls API

Version: 1.0

Route: `GET /api/dashboard/rolls`

Source: `src/app/api/dashboard/rolls/route.ts`

---

# Objective

Return recent roll activity for the authenticated standard dashboard user's assigned academy.

---

# IF/WHEN/THEN Requirements

## DASH-ROLLS-001: Standard Dashboard Authorization

IF a user calls `GET /api/dashboard/rolls`

WHEN the user is not authorized for the standard dashboard

THEN the API SHALL reject the request.

## DASH-ROLLS-002: Academy Scope

IF an authorized dashboard user calls the API

WHEN roll records are queried

THEN the API SHALL return only rolls associated with the user's assigned academy.

AND any search query SHALL be applied only within the user's assigned academy scope.

AND results SHALL be ordered by nearest upcoming occurrence first where occurrence data is available.

## DASH-ROLLS-003: Response Shape

IF roll records exist

WHEN the API responds

THEN the API SHALL return JSON with a `rolls` array.

AND the response SHALL contain only fields needed for read-only display.

AND the response SHALL NOT expose mutation capability.

## DASH-ROLLS-004: Empty State

IF no roll records exist for the academy

WHEN the API responds

THEN the API SHALL return `{ "rolls": [] }`.

---

# Acceptance Criteria

* Unauthenticated users cannot access roll data.
* Users cannot access rolls for unrelated academies.
* Response shape remains stable for dashboard UI consumers.
* The API remains read-only for Standard User dashboard consumers.
