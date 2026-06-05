# PRD: NextAuth API

Version: 1.0

Route: `GET|POST /api/auth/[...nextauth]`

Source: `src/app/api/auth/[...nextauth]/route.ts`

---

# Objective

Provide the NextAuth route handler for authentication, session, callback, and sign-in/sign-out flows using the shared RollFinders auth configuration.

---

# IF/WHEN/THEN Requirements

## AUTH-001: Delegate To NextAuth

IF a request reaches `/api/auth/[...nextauth]`

WHEN the method is `GET` or `POST`

THEN the API SHALL delegate handling to `NextAuth(authOptions)`.

## AUTH-002: Shared Auth Configuration

IF authentication behavior is changed

WHEN the API handler runs

THEN the route SHALL use the shared `authOptions` from `src/lib/auth.ts`.

## AUTH-003: Session Integrity

IF a user signs in, signs out, or validates a session

WHEN NextAuth processes the request

THEN the API SHALL preserve the configured session, provider, credential, and callback rules.

## AUTH-004: Unsupported Direct Changes

IF a feature requires auth behavior changes

WHEN implementation begins

THEN changes SHOULD be made in shared auth configuration rather than duplicating auth logic inside the route file.

---

# Acceptance Criteria

* `GET` and `POST` are exported from the NextAuth handler.
* The route imports and uses `authOptions`.
* Route code remains thin and does not duplicate auth rules.
