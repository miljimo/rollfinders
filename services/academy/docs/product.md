# Academy Service PRD

## Overview

Create a standalone Academy API Service responsible for academy lifecycle management, academy administration, verification, claims, academy profile management, Stripe Connect onboarding, and academy-to-course relationships.

The Academy Service becomes the source of truth for all academy-related data.

The service must follow existing Rollfinders patterns:

* PostgreSQL
* REST APIs
* No authentication needed
* Existing audit and logging patterns
* Existing API gateway routing

The Academy Service must not own:

* Users
* Courses
* Events
* Bookings
* Payments

Those services remain the source of truth for their domains.

---

# Business Goals

* Reduce Rollfinders complexity
* Separate academy management from marketplace functionality
* Enable academy self-service onboarding
* Enable academy ownership claims
* Support future academy portals

---

# Service Responsibilities

## Academy Lifecycle

* Create Academy
* Update Academy
* Archive Academy
* Publish Academy
* Suspend Academy

## Academy Administration

* Assign Academy Admins
* Remove Academy Admins
* Assign Academy Members
* Remove Academy Members

## Academy Verification

* Verification submission
* Verification approval
* Verification rejection
* Verification status tracking

## Academy Claims

* Claim Academy
* Approve Claim
* Reject Claim
* Claim audit trail

## Academy Profile

* Academy branding
* Description
* Contact details
* Social links
* Academy images
* Academy settings


## Course References

Maintain academy ownership relationships.

Academy Service does not create courses.

Academy Service only references Courses Service resources.

---

# Ownership Boundaries

## Academy Service Owns

* Academies
* Academy Profiles
* Academy Claims
* Academy Verification
* Academy Admin Relationships
* Academy Member Relationships
* Stripe Connect Accounts References
* Academy Course References

## Courses Service Owns

* Courses
* Events
* Open Mats
* Seminars
* Activities

## Users Service Owns

* Authentication
* User Profiles
* Permissions

## Payments Service Owns

* Payment Processing
* Refunds
* Transactions
* e.t.c

## Booking Service Owns

* Bookings
* Attendance
* E.t.c

---

# Database Tables

## academies

```sql
id UUID PK
name VARCHAR(255)
slug VARCHAR(255)
status VARCHAR(50)
verification_status VARCHAR(50)
claim_status VARCHAR(50)
created_at
updated_at
```

## academy_profiles

```sql
academy_id UUID PK
description TEXT
email VARCHAR(255)
phone VARCHAR(50)
website VARCHAR(500)
logo_url TEXT
banner_url TEXT
address JSONB
social_links JSONB
created_at
updated_at
```

## academy_users

```sql
id UUID PK
academy_id UUID
user_id UUID
role VARCHAR(50)
status VARCHAR(50)
created_at
updated_at
```

Roles:

* owner
* admin
* coach
* member

## academy_claims

```sql
id UUID PK
academy_id UUID
claimant_user_id UUID
status VARCHAR(50)
evidence JSONB
review_notes TEXT
created_at
updated_at
```

## academy_verifications

```sql
id UUID PK
academy_id UUID
submitted_by UUID
status VARCHAR(50)
verification_data JSONB
review_notes TEXT
created_at
updated_at
```

## academy_course_references

```sql
id UUID PK
academy_id UUID
course_id UUID
status VARCHAR(50)
created_at
updated_at
```

## academy_stripe_accounts

```sql
id UUID PK
academy_id UUID
stripe_account_id VARCHAR(255)
onboarding_status VARCHAR(50)
charges_enabled BOOLEAN
payouts_enabled BOOLEAN
details_submitted BOOLEAN
created_at
updated_at
```

---

# Migration From Rollfinders

Move tables:

* academies
* academy_profiles
* academy_claims
* academy_verifications
* academy_users

Do not move:

* courses
* bookings
* payments
* users

Migration Steps:

1. Create Academy Service
2. Create new tables
3. Migrate data
4. Expose Academy APIs
5. Update Rollfinders integrations
6. Enable event synchronization
7. Remove legacy tables

---

# API Endpoints

## Academy

```http
POST   /academies
GET    /academies/{id}
PUT    /academies/{id}
DELETE /academies/{id}
```

## Academy Profile

```http
GET  /academies/{id}/profile
PUT  /academies/{id}/profile
```

## Academy Users

```http
POST   /academies/{id}/users
DELETE /academies/{id}/users/{userId}
GET    /academies/{id}/users
```

## Claims

```http
POST /academies/{id}/claims
GET  /claims/{id}
POST /claims/{id}/approve
POST /claims/{id}/reject
```

## Verification

```http
POST /academies/{id}/verification
POST /verification/{id}/approve
POST /verification/{id}/reject
```

## Course References

```http
POST   /academies/{id}/courses
DELETE /academies/{id}/courses/{courseId}
GET    /academies/{id}/courses
```

## Stripe Connect

```http
POST /academies/{id}/stripe/connect
GET  /academies/{id}/stripe/status
POST /academies/{id}/stripe/disconnect
```

---

# Stripe Connect Integration

Academies must onboard using Stripe Connect Express.

Flow:

1. Academy Admin initiates onboarding
2. Academy Service creates Stripe Connected Account
3. Stripe onboarding URL returned
4. Academy completes onboarding
5. Stripe webhook updates status
6. Academy becomes payout-enabled

Store:

```text
stripe_account_id
charges_enabled
payouts_enabled
details_submitted
```

Academy Service never stores banking details.

Only Stripe account references.

---

# Events

Publish:

```text
AcademyCreated
AcademyUpdated
AcademyClaimSubmitted
AcademyClaimApproved
AcademyVerified
AcademyStripeConnected
AcademyStripeDisconnected
AcademyCourseLinked
AcademyCourseUnlinked
```

Consume:

```text
CourseCreated
CourseUpdated
CourseDeleted
UserDeleted
```

---

# Rollfinders Integration

Rollfinders must stop querying academy tables directly.

Replace all academy database access with Academy Service APIs.

```text
Before:
Rollfinders -> Academy Tables

After:
Rollfinders -> Academy Service API
```

All academy pages must use Academy Service.

All academy administration must use Academy Service.

Rollfinders remains the marketplace frontend.

Academy Service becomes the academy backend.
