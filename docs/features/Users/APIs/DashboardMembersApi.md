# PRD: Dashboard Members API

Version: 1.0

Route: `GET /api/dashboard/members`

Source: `src/app/api/dashboard/members/route.ts`

---

# Objective

Allow a standard dashboard user to search members within their assigned academy scope.

---

# IF/WHEN/THEN Requirements

## DASH-MEMBERS-001: Standard Dashboard Authorization

IF a user calls `GET /api/dashboard/members`

WHEN the user is not authorized for the standard dashboard

THEN the API SHALL reject the request.

## DASH-MEMBERS-002: Academy Scope

IF an authorized dashboard user calls the API

WHEN member records are queried

THEN the API SHALL return only members within the user's assigned academy.

## DASH-MEMBERS-003: Search Query

IF the request includes `q`

WHEN the API queries members

THEN the API SHALL apply the existing member search rules.

## DASH-MEMBERS-004: Empty Search

IF no members match the search query

WHEN the response is generated

THEN the API SHALL return an empty `members` array rather than an error.

---

# Acceptance Criteria

* Academy isolation is enforced.
* Search is scoped to the authenticated user's academy.
* Response shape includes `members`.
