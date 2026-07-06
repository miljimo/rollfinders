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

Academy Admin dashboard capabilities, same-academy user management, academy profile management, and academy-scoped open mat permissions are defined in:

`apps/portal/docs/features/Users/Academies/Products/AcademyAdminWithDashboardRoles.md`

This multi-admin PRD SHALL NOT duplicate or override the canonical Academy Admin dashboard PRD.

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

Academy Admin dashboard and content-management permissions are governed by:

`apps/portal/docs/features/Users/Academies/Products/AcademyAdminWithDashboardRoles.md`

This workflow PRD only governs academy membership/team invitation, removal, transfer, resend, cancel, and accept-invitation workflows.

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

---

# Current Implementation Status

Reviewed against source code on 2026-06-05.

Status: Mostly implemented.

Implemented:

* `AcademyMember` and `AcademyInvitation` models exist.
* Academy team page exists at `/admin/academies/[id]/team`.
* Owners/platform admins can invite academy admins.
* Invitation email is queued through the reliable email system.
* Pending invitations are listed.
* Invitations can be resent.
* Invitations can be cancelled.
* Invited users can accept invitations at `/admin/invitations/[token]`.
* Owners/platform admins can remove academy members.
* Ownership transfer exists.
* Academy admins can view/edit their assigned academy and manage open mats according to access rules.

MVP gaps or notes:

* Team-management actions are not currently writing detailed admin audit log entries.
* Owner notifications for invitation accepted and admin removed are not visible in source.
* The page shows a raw accept URL for pending invitations. This is acceptable for internal MVP admin use, but should be polished later.
* API endpoints listed in this PRD are not all present as separate REST routes; current implementation uses Next.js server actions for the UI flow.

MVP decision:

* The core multi-admin academy team workflow is MVP-usable.
* Add audit logging for invite, resend, cancel, remove, transfer owner, and accept invitation before treating this as fully complete.
