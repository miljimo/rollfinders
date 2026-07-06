# PRD: User Auth Go Service API

Version: 1.0

Priority: High

Status: Ready For Review

---

# Objective

Define the Go service API required for authentication and account-session validation while preserving the existing NextAuth browser-session model.

---

# Route Summary

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/v1/auth/credentials` | Verify email/password credentials |
| `GET` | `/v1/accounts/{id}` | Return current active account context |

Service-to-service authentication and authorization SHALL be enforced by the orchestration layer before requests reach this service.

---

# Permission Requirements

Authentication routes primarily use credential, session, or token validation rather than `user.*` permissions.

| Route | Access Model |
| --- | --- |
| `POST /v1/auth/credentials` | Public credential verification through trusted browser/session flow. |
| `GET /v1/accounts/{id}` | Authenticated session/account lookup; caller must be the subject or an internal trusted service. |
| password reset request/validate/confirm routes | Token-based flow; admin-managed reset initiation requires `user.password.reset.send_managed` if exposed. |
| password change route | Requires authenticated subject and `user.password.change.self`. |

Users Service SHALL NOT return authoritative permissions from authentication responses. Callers must query Authorisation Service for effective permissions after identity is established.

---

# Internal Authentication

IF a request reaches a user-service route

WHEN the route is not `healthz` or `readyz`

THEN the service SHALL process the request without requiring a service API key header.

Invalid actor or permission context SHALL be handled by the orchestration layer or Authorisation Service, not by a shared service API key.

---

# Requirement 1: Credential Verification

Route:

```text
POST /v1/auth/credentials
```

Request body:

```json
{
  "email": "user@example.com",
  "password": "plain text password"
}
```

IF email or password is missing

WHEN the request is handled

THEN the service SHALL return `400`.

IF the account does not exist

WHEN credentials are verified

THEN the service SHALL return `401` without revealing whether the email exists.

IF the password does not match the stored hash

WHEN credentials are verified

THEN the service SHALL return `401`.

IF the account is disabled

WHEN credentials are verified

THEN the service SHALL return `403`.

IF the user is a standard user without an `academy_id`

WHEN the user has no academy membership row

THEN the service SHALL return `403`.

IF credentials are valid

WHEN the service returns success

THEN it SHALL update `users.last_login_at`.

The `last_login_at` write SHALL be executed through a stored procedure.

Success response:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "User Name",
    "role": "standard_user"
  }
}
```

---

# Requirement 2: Password Hash Compatibility

IF existing users have bcrypt password hashes

WHEN the Go service verifies credentials

THEN the service SHALL validate those hashes without requiring password migration.

The service SHALL NOT return password hash values in any API response.

---

# Requirement 3: Account Context Lookup

Route:

```text
GET /v1/accounts/{id}
```

IF the account exists and is active

WHEN the route is called

THEN the service SHALL return:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "role": "standard_user",
    "academyId": "academy_123"
  }
}
```

IF the account does not exist or is disabled

WHEN the route is called

THEN the service SHALL return `404`.

IF an academy admin successfully completes credential login

WHEN NextAuth or another trusted session client calls `GET /v1/accounts/{self}` for the same subject

THEN the request SHALL be authorised by the orchestration layer and the service SHALL return the active account context, including role and academy id.

IF `/v1/accounts/{self}` is denied after successful credential login for the same active subject

WHEN the browser session is being hydrated

THEN the flow SHALL be treated as a contract failure because login has issued a token that cannot load its own account.

---

# Requirement 5: NextAuth Compatibility

IF NextAuth calls the Go service during credentials auth

WHEN the Go service returns success

THEN NextAuth SHALL continue to place user id and role into the JWT/session callbacks using the same field names as before.

Existing UI code that reads:

```text
session.user.id
session.user.role
```

SHALL continue to work.

---

# Acceptance Criteria

* Invalid credentials do not reveal account existence.
* Disabled users cannot authenticate.
* Existing bcrypt hashes validate successfully.
* First successful login updates `last_login_at`.
* Standard users without an academy relationship cannot authenticate.
* NextAuth can populate the existing session shape from the service response.
