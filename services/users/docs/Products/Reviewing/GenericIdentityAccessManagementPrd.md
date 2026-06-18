# Product Requirements Document (PRD)

# Generic Identity & Access Management (IAM) Service

## Document Information

| Field | Value |
| --- | --- |
| Product | User Management Service |
| Version | 1.0 |
| Status | Draft |
| Audience | Product Managers, Architects, Backend Engineers, API Developers |
| Database | PostgreSQL |
| Architecture | Microservice or Shared Platform Service |

## 1. Overview

The User Management Service provides centralized identity, authentication, authorization, role management, and privilege management capabilities for applications and services.

The service acts as a lightweight IAM platform and supports user directory, authentication, RBAC, permission management, organization or tenant support, auditability, and API-based management.

## 2. Objectives

Business goals:

* Centralize user administration.
* Reduce duplicate user management implementations.
* Support multi-tenant applications.
* Provide scalable authorization controls.
* Enable future SSO integration.

Technical goals:

* Secure user identities.
* Support role-based access control.
* Support permission-based authorization.
* Support organization-level role assignment.
* Provide REST APIs.

## 3. User Types

* Super Administrator can manage all organizations, all users, roles, permissions, and system configuration.
* Organization Administrator can manage users, roles, and permissions within an organization, but cannot manage other organizations or system settings.
* Manager can view users, assign approved roles, and manage operational resources.
* Standard User can log in, update their own profile, and access authorized resources.
* Guest can access limited resources.

## 4. Functional Requirements

FR-001 User Management:

* System shall allow create, read, update, deactivate, reactivate, and delete user.
* User attributes shall include `id`, `email`, optional `username`, `first_name`, `last_name`, optional `phone`, `password_hash`, `status`, `created_at`, and `updated_at`.

FR-002 Authentication:

* System shall support email login, username login, password validation, password reset, password change, and account lockout.
* Future support includes SSO, OAuth2, OpenID Connect, and SAML.

FR-003 Role Management:

* System shall allow create, edit, delete, view, and assign role.
* Roles are data rows, not hard-coded application branches.

FR-004 Permission Management:

* System shall allow create permission, view permission, assign permission to role, and remove permission from role.
* Permission keys shall use the `resource.action` format.

FR-005 User Role Assignment:

* System shall support assigning, removing, and viewing user roles.
* A user may have multiple roles.

FR-006 Direct User Permissions:

* System shall support direct user permission exceptions.
* Permission evaluation priority shall be explicit deny, explicit allow, then role permission.

FR-007 Organization Management:

* System shall support creating, updating, disabling organizations, adding users, and removing users.

FR-008 Organization Role Assignment:

* Roles may exist within organizations.
* The same user may hold different roles in different organizations.

FR-009 User Status Management:

* Supported statuses are `pending_verification`, `active`, `inactive`, `suspended`, `locked`, and `deleted`.

FR-010 User Profile Management:

* Users can update profile, change password, verify email, and verify phone.

FR-011 Audit Logging:

* System shall record user creation, user update, password changes, role assignments, permission assignments, and login events.
* Audit fields shall include actor, action, resource, resource ID, timestamp, old value, and new value.

## 5. Authorization Model

RBAC:

```text
User -> Role -> Permission
```

Effective permissions:

```text
Role Permissions + Direct User Permissions - Denied Permissions
```

## 6. API Requirements

Users:

```http
POST   /api/v1/users
GET    /api/v1/users
GET    /api/v1/users/{id}
PUT    /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

Roles:

```http
POST   /api/v1/roles
GET    /api/v1/roles
GET    /api/v1/roles/{id}
PUT    /api/v1/roles/{id}
DELETE /api/v1/roles/{id}
```

Permissions:

```http
POST   /api/v1/permissions
GET    /api/v1/permissions
GET    /api/v1/permissions/{id}
```

User roles:

```http
POST   /api/v1/users/{id}/roles
DELETE /api/v1/users/{id}/roles/{roleId}
GET    /api/v1/users/{id}/roles
```

Organizations:

```http
POST   /api/v1/organisations
GET    /api/v1/organisations
GET    /api/v1/organisations/{id}
PUT    /api/v1/organisations/{id}
```

## 7. Non-Functional Requirements

* Passwords shall be hashed using Argon2 or bcrypt.
* HTTPS is required.
* JWT authentication and refresh tokens are supported.
* Account lockout shall happen after configurable failed attempts.
* The service shall support 1M+ users, 100K+ organizations, horizontal scaling, 99.9% uptime, P95 API response under 200ms, and permission evaluation under 20ms.

## 8. Database Model

Core tables:

```text
users
roles
permissions
user_roles
role_permissions
user_permissions
organisations
organisation_users
organisation_user_roles
```

Audit tables:

```text
audit_logs
login_history
```

## 9. Future Enhancements

Phase 2: MFA, passkeys, Google Login, Microsoft Login, GitHub Login.

Phase 3: SCIM provisioning, OpenID Connect provider, SAML provider, fine-grained authorization.

Phase 4: policy engine, ABAC, dynamic policies, conditional access.

## 10. Success Metrics

| Metric | Target |
| --- | --- |
| User Creation Success Rate | >99% |
| Login Success Rate | >99% |
| API Availability | 99.9% |
| Permission Evaluation Time | <20ms |
| Password Reset Completion | >95% |
| Audit Coverage | 100% |
