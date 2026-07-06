# Product Requirements Document (PRD)

# Authentication Service Extraction

**Document:** `product.md`

## Overview

The current `Users Service` is responsible for both user management and authentication.

To improve separation of concerns, scalability, and maintainability, all authentication-related functionality will be extracted into a dedicated **Authentication Service**.

This is a **non-breaking architectural refactor**. Existing API behaviour, request/response contracts, and frontend integrations must continue to function without modification.

---

# Objectives

Create a standalone Authentication Service responsible for:

* User authentication
* Password management
* Password reset
* Session management
* Refresh tokens
* JWT generation and validation
* Email verification
* Account verification
* Login history
* Account lockout
* Multi-factor authentication (future)

The existing Users Service will become responsible only for user profile and identity management.

---

# Guiding Principles

## MUST NOT

The developer or AI agent must not:

* Change existing API contracts
* Change JWT format
* Change frontend behaviour
* Change mobile app behaviour
* Change database schemas unless required for authentication
* Change user IDs
* Break existing integrations

## MUST

The  developer or AI agent must:

* Preserve all existing functionality
* Preserve authentication behaviour
* Maintain backwards compatibility
* Keep Users Service focused on user management
* Keep Authentication Service focused on identity verification

---

# Service Responsibilities

## Authentication Service

Authentication Service owns:

```text
Login
Logout
JWT Creation
JWT Validation
Refresh Tokens
Password Hashing
Password Verification
Password Reset
Password Change
Email Verification
Account Verification
Session Management
Login History
Failed Login Tracking
Account Lockout
Remember Me
```

Future responsibilities:

```text
Multi-Factor Authentication (MFA)

Single Sign-On (SSO)

OAuth

Social Login

Passkeys

Device Management
```

---

## Users Service

Users Service owns:

```text
User Profile

Profile Updates

Display Name

Avatar

Contact Information

Academy Membership

Roles

Organisation Membership

Preferences
```

Users Service is **not** responsible for passwords or sessions.

---

# Authentication Flow

```text
Client
    │
    ▼
Authentication Service
    │
Verify Credentials
    │
Generate JWT
    │
Generate Refresh Token
    │
Store Session
    │
Return Tokens
```

---

# Password Reset Flow

```text
User

↓

Forgot Password

↓

Authentication Service

↓

Generate Reset Token

↓

Notification Service

↓

Email Reset Link

↓

User Sets New Password

↓

Authentication Service

↓

Invalidate Old Sessions

↓

Password Updated
```

---

# Session Management

Authentication Service owns every authenticated session.

Session capabilities:

* Create session
* Refresh session
* Revoke session
* Logout current device
* Logout all devices
* Track active devices

Each session should include:

```text
Session ID

User ID

Device ID

IP Address

User Agent

Created At

Last Activity

Expires At

Refresh Token
```

---

# JWT Management

Authentication Service is the only service allowed to:

* Generate JWTs
* Sign JWTs
* Validate JWTs
* Rotate signing keys

No other service should generate authentication tokens.

---

# Password Management

Authentication Service owns:

```text
Password Hashing

Password Verification

Password Complexity Rules

Password Expiration (optional)

Password History (future)
```

Passwords must never leave the Authentication Service.

---

# User Lookup

Authentication Service should not duplicate user profile data.

When required, it should retrieve user information from Users Service.

Example:

```text
Login

↓

Authentication Service

↓

Users Service

↓

Get User By Email

↓

Verify Password

↓

Generate Session
```

Authentication Service stores authentication data only.

Users Service stores profile data.

---

# Data Ownership

Authentication Service owns:

```text
Credentials

Password Hashes

Sessions

Refresh Tokens

Verification Tokens

Password Reset Tokens

Failed Login Attempts

Login History
```

Users Service owns:

```text
User Profile

Names

Email Address

Phone Number

Avatar

Academy Membership

Preferences
```

---

# API Endpoints

Authentication Service

```http
POST /auth/login

POST /auth/logout

POST /auth/refresh

POST /auth/forgot-password

POST /auth/reset-password

POST /auth/change-password

POST /auth/verify-email

POST /auth/resend-verification

GET /auth/sessions

DELETE /auth/sessions/{id}

DELETE /auth/sessions

POST /auth/validate
```

Users Service

```http
GET /users/{id}

PUT /users/{id}

PATCH /users/{id}

GET /users/me

DELETE /users/{id}
```

Authentication endpoints must be removed from Users Service after migration.

---

# Database Ownership

Authentication database:

```text
credentials

sessions

refresh_tokens

password_reset_tokens

verification_tokens

login_attempts

login_history
```

Users database remains unchanged.

---

# Security Requirements

Authentication Service must implement:

* Argon2id or bcrypt password hashing
* JWT signing
* Refresh token rotation
* Session revocation
* Account lockout
* Login attempt throttling
* Audit logging
* Secure HTTP-only cookies (where applicable)

---

# Integration

Authentication Service communicates with:

* Users Service
* Notification Service
* API Gateway
* Authorization Service (future)

Authentication Service must not communicate directly with business services such as Courses, Bookings, or Payments.

---

# Migration Requirements

The migration must be completed without service interruption.

Migration steps:

1. Create Authentication Service.
2. Move authentication logic from Users Service.
3. Preserve existing APIs.
4. Update internal routing.
5. Validate compatibility.
6. Remove duplicated authentication code from Users Service.
7. Execute regression tests.

---

# Acceptance Criteria

The implementation is complete when:

* Users can log in without behavioural changes.
* Existing JWTs remain compatible.
* Password reset works.
* Email verification works.
* Sessions are managed by Authentication Service.
* Users Service no longer contains authentication logic.
* Existing clients require no changes.
* All existing tests pass.
* No regressions are introduced.
