# PRD: Verified Belt Lineage & Graduation History

## Feature Branch

```text
feature/verified-belt-lineage
```

---

# Objective

Implement a verified BJJ belt lineage system that allows practitioners to:

* Create practitioner profiles.
* Record belt graduations.
* Link graduations to instructors.
* Verify belt promotions through instructor and academy approval workflows.
* Maintain immutable graduation history.
* Display practitioner lineage and verification status.

The system must support cross-academy promotions and maintain an auditable record of all belt graduations.

---

# Roles

## STANDARD_USER

Can:

* Create and edit profile.
* Add graduation records.
* Request verification.
* View lineage.
* View graduation history.

## ACADEMY_ADMIN

Can:

* Approve graduation requests.
* View academy graduation records.
* View lineage records associated with academy.

## PLATFORM_ADMIN

Can:

* Resolve disputes.
* Audit records.
* Override verification status.

---

# Data Model

## practitioners

| Field               | Type           |
| ------------------- | -------------- |
| id                  | UUID           |
| first_name          | VARCHAR        |
| last_name           | VARCHAR        |
| email               | VARCHAR UNIQUE |
| avatar_url          | TEXT           |
| academy_id          | UUID NULL      |
| current_belt_rank   | ENUM           |
| stripe_count        | INTEGER        |
| verification_status | ENUM           |
| created_at          | TIMESTAMP      |
| updated_at          | TIMESTAMP      |

---

## belt_graduations

Stores every promotion ever received.

| Field               | Type           |
| ------------------- | -------------- |
| id                  | UUID           |
| practitioner_id     | UUID           |
| belt_rank           | ENUM           |
| stripe_count        | INTEGER        |
| graduation_date     | DATE           |
| instructor_user_id  | UUID NULL      |
| instructor_name     | VARCHAR        |
| instructor_email    | VARCHAR        |
| awarding_academy_id | UUID NULL      |
| verification_status | ENUM           |
| approved_at         | TIMESTAMP NULL |
| created_at          | TIMESTAMP      |

---

## graduation_approvals

Stores all approval decisions.

| Field            | Type      |
| ---------------- | --------- |
| id               | UUID      |
| graduation_id    | UUID      |
| approver_user_id | UUID      |
| approver_role    | ENUM      |
| status           | ENUM      |
| comments         | TEXT      |
| approved_at      | TIMESTAMP |

---

## graduation_audit_logs

Immutable history.

| Field         | Type      |
| ------------- | --------- |
| id            | UUID      |
| graduation_id | UUID      |
| action_type   | VARCHAR   |
| actor_user_id | UUID      |
| actor_role    | VARCHAR   |
| old_value     | JSONB     |
| new_value     | JSONB     |
| created_at    | TIMESTAMP |

---

# Belt Verification Status

```typescript
enum VerificationStatus {
  DRAFT,
  PENDING_INSTRUCTOR,
  PENDING_ACADEMY,
  VERIFIED,
  REJECTED,
  DISPUTED
}
```

---

# Belt Rank Enum

```typescript
enum BeltRank {
  WHITE,
  BLUE,
  PURPLE,
  BROWN,
  BLACK,
  CORAL,
  RED_BLACK,
  RED
}
```

---

# Business Rules

## Rule 1 - Graduation Creation

IF practitioner submits a graduation

THEN create graduation record

AND set status to:

```text
PENDING_INSTRUCTOR
```

---

## Rule 2 - Instructor Lookup

IF instructor email exists

THEN:

* Link instructor_user_id
* Display verified indicator
* Create instructor approval request

---

## Rule 3 - Instructor Not Found

IF instructor email does not exist

THEN:

* Keep instructor_user_id null
* Create invitation
* Set status:

```text
AWAITING_INSTRUCTOR_REGISTRATION
```

---

## Rule 4 - Cross Academy Promotion

IF instructor belongs to a different academy

THEN:

* Link awarding academy automatically
* Store academy relationship
* Trigger academy approval workflow

---

## Rule 5 - Instructor Approval

IF instructor approves

AND instructor is academy owner

THEN:

```text
VERIFIED
```

No second approval required.

---

## Rule 6 - Dual Approval

IF instructor approves

AND instructor is NOT academy owner

THEN:

```text
PENDING_ACADEMY
```

Academy owner approval required.

---

## Rule 7 - Academy Approval

IF academy owner approves

THEN:

```text
VERIFIED
```

---

## Rule 8 - Rejection

IF instructor OR academy owner rejects

THEN:

```text
REJECTED
```

Store rejection reason.

---

# User Flows

## Flow 1 - Add Graduation

1. User opens profile.
2. User selects Add Graduation.
3. User enters:

   * Belt rank
   * Graduation date
   * Instructor name
   * Instructor email
4. System validates instructor.
5. System creates graduation.
6. Approval workflow begins.

---

## Flow 2 - Instructor Approval

1. Instructor receives notification.
2. Instructor reviews request.
3. Instructor approves or rejects.
4. System updates status.

---

## Flow 3 - Academy Approval

1. Academy owner receives notification.
2. Owner reviews graduation.
3. Owner approves or rejects.
4. System updates graduation status.

---

# API Requirements

## POST

```http
/api/graduations
```

Create graduation.

---

## GET

```http
/api/graduations
```

List graduation history.

---

## GET

```http
/api/graduations/{id}
```

Graduation details.

---

## POST

```http
/api/graduations/{id}/approve
```

Approve graduation.

---

## POST

```http
/api/graduations/{id}/reject
```

Reject graduation.

---

## GET

```http
/api/practitioners/{id}/lineage
```

Returns lineage tree.

---

# Dashboard Requirements

## Profile Card

Display:

* Avatar
* Full Name
* Current Belt
* Stripe Count
* Main Academy
* Verification Badge

---

## Current Rank Widget

Display:

* Belt Rank
* Verified Status
* Awarding Instructor
* Awarding Academy
* Graduation Date

---

## Graduation Timeline

Display all graduations in chronological order.

Example:

```text
White Belt
2018

Blue Belt
2020

Purple Belt
2023

Brown Belt
2026
```

---

## Pending Verification Widget

Display:

* Belt
* Status
* Required Approver
* Submitted Date

---

## Activity Feed

Display:

* Graduation Created
* Graduation Approved
* Graduation Rejected
* Academy Joined
* Instructor Linked

---

# Academy Dashboard

## Graduation Management

Table Columns:

* Student
* Belt
* Instructor
* Academy
* Status
* Submitted Date
* Actions

Actions:

* Approve
* Reject
* View Details

---

# Audit Requirements

Every action must create an audit log.

Events:

* Graduation Created
* Graduation Updated
* Approval Submitted
* Approval Rejected
* Verification Completed
* Verification Reopened

Audit logs must never be deleted.

---

# Acceptance Criteria

## AC1

User can create graduation records.

## AC2

System validates instructor email.

## AC3

System automatically links instructor profile when found.

## AC4

Cross-academy promotions are supported.

## AC5

Instructor approval workflow functions correctly.

## AC6

Academy approval workflow functions correctly.

## AC7

Verified status appears after required approvals.

## AC8

Graduation history remains permanently visible.

## AC9

Lineage endpoint returns instructor chain.

## AC10

All actions are written to immutable audit logs.
