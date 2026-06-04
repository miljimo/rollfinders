# Multi-Admin Academy Management

## Feature ID

RF-010

## Priority

High

## Type

Platform Management

---

# Objective

Implement a Multi-Admin Academy Management system that allows Academy Owners to invite and manage additional administrators for their academy.

The feature must integrate with the existing RollFinder platform without breaking or modifying existing functionality.

The existing Academy Claiming, Academy Profile Management, Open Mat Management, Search, Map, and Discovery functionality must continue to work exactly as before.

---

# Business Problem

Many academies have multiple people responsible for maintaining academy information.

Examples:

* Head Coach
* Assistant Coach
* Academy Manager
* Reception Staff
* Marketing Manager

Currently only a single account can manage an academy.

This creates a maintenance bottleneck and increases the likelihood of outdated academy information.

The platform must support multiple authorized administrators per academy.

---

# Existing Functionality

The following functionality already exists and must not be modified:

* Academy Directory
* Academy Profiles
* Open Mat Listings
* Open Mat Creation
* Academy Claiming
* Search
* Map Discovery
* User Authentication
* User Registration

All existing APIs must remain backward compatible.

---

# New Functionality

## Academy Owner Capabilities

Academy Owners can:

* View academy team members
* Invite new academy admins
* Remove academy admins
* Transfer academy ownership
* Resend invitations
* Cancel pending invitations

---

## Academy Admin Capabilities

Academy Admins can:

* Edit academy profile
* Create open mats
* Update open mats
* Update academy information

Academy Admins cannot:

* Delete academy
* Transfer ownership
* Add admins
* Remove admins
* Modify owner permissions

---

## Platform Super Admin Capabilities

Platform Admins can:

* View all academy memberships
* Remove academy members
* Resolve ownership disputes
* Disable academy access

---

# User Stories

## Story 1

As an Academy Owner

I want to invite another admin

So they can help maintain academy information.

---

## Story 2

As an Academy Owner

I want to remove an admin

So I can revoke access when necessary.

---

## Story 3

As an Academy Admin

I want to update academy information

So the academy profile remains accurate.

---

## Story 4

As a Platform Administrator

I want visibility into academy memberships

So I can support users and resolve issues.

---

# Database Changes

## New Table: academy_members

Purpose:

Stores academy membership and role assignments.

```sql
CREATE TABLE academy_members (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_academy
        FOREIGN KEY (academy_id)
        REFERENCES academies(id),

    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);
```

Role values:

```text
OWNER
ADMIN
```

---

## New Table: academy_invitations

Purpose:

Stores pending invitations.

```sql
CREATE TABLE academy_invitations (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL,
    invited_email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL,
    token VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

Status values:

```text
PENDING
ACCEPTED
CANCELLED
EXPIRED
```

---

# Authorization Rules

## Academy Owner

Allowed:

* View Team
* Invite Admin
* Remove Admin
* Edit Academy
* Create Open Mat
* Transfer Ownership

Denied:

* None

---

## Academy Admin

Allowed:

* Edit Academy
* Create Open Mat
* Update Open Mat

Denied:

* Invite Admin
* Remove Admin
* Transfer Ownership

---

## Platform Admin

Allowed:

* Full Access

---

# API Requirements

## Get Academy Team

```http
GET /api/academies/{academyId}/members
```

Returns:

```json
[
  {
    "userId": "123",
    "name": "John Smith",
    "email": "john@example.com",
    "role": "OWNER"
  }
]
```

---

## Invite Academy Admin

```http
POST /api/academies/{academyId}/members/invite
```

Request:

```json
{
  "email": "coach@example.com"
}
```

Response:

```json
{
  "success": true
}
```

---

## Remove Academy Admin

```http
DELETE /api/academies/{academyId}/members/{memberId}
```

Response:

```json
{
  "success": true
}
```

---

## Accept Invitation

```http
POST /api/invitations/{token}/accept
```

Response:

```json
{
  "success": true
}
```

---

# UI Requirements

## New Academy Settings Section

Add new navigation item:

```text
Academy Settings
 ├── General
 ├── Open Mats
 ├── Team Management
```

---

## Team Management Screen

Display:

* Team Members
* Role
* Date Added

Actions:

* Invite Admin
* Remove Admin
* Resend Invite
* Cancel Invite

---

## Invite Admin Modal

Fields:

```text
Email Address
```

Actions:

```text
Invite
Cancel
```

Validation:

* Valid email required
* Duplicate invitations prevented
* Existing admins cannot be re-invited

---

# Security Requirements

The implementation must:

* Validate academy ownership
* Prevent privilege escalation
* Validate invitation tokens
* Expire invitations after 7 days
* Prevent self-removal of the only owner
* Log all membership changes

---

# Audit Logging

Create audit entries for:

* Admin Invited
* Admin Removed
* Ownership Transferred
* Invitation Accepted
* Invitation Cancelled

Log format:

```json
{
  "academyId": "",
  "userId": "",
  "action": "",
  "timestamp": ""
}
```

---

# Notifications

Send notifications for:

## Invitation Sent

Subject:

```text
You've been invited to manage an academy on RollFinder
```

---

## Invitation Accepted

Notify academy owner.

---

## Admin Removed

Notify removed user.

---

# Acceptance Criteria

The feature is complete when:

* Academy owners can invite admins
* Admins can accept invitations
* Admins can manage academy content
* Owners can remove admins
* Role-based permissions are enforced
* Existing academy functionality remains unchanged
* Existing open mat functionality remains unchanged
* Existing APIs continue to function
* Security validation passes
* Audit logging is implemented
* Unit tests pass
* Integration tests pass

---

# Non-Functional Requirements

Performance:

* Team pages load in under 2 seconds

Security:

* No unauthorized role escalation

Scalability:

* Support 10,000+ academies
* Support 100,000+ academy memberships

Maintainability:

* Follow existing project architecture
* Follow existing coding standards
* Follow existing API patterns

---

# AI Agent Implementation Instructions

Before making changes:

1. Analyze current authentication system.
2. Analyze existing academy ownership model.
3. Reuse existing authorization middleware.
4. Reuse existing UI component patterns.
5. Reuse existing API conventions.

During implementation:

* Do not break existing functionality.
* Do not rename existing APIs.
* Do not modify existing database columns unless required.
* Prefer additive database migrations.
* Ensure backward compatibility.

After implementation:

* Generate migration scripts.
* Generate API tests.
* Generate permission tests.
* Generate UI tests.
* Generate documentation updates.

Feature Status:

READY FOR IMPLEMENTATION
