# Academy Service PRD

## Overview

Create a standalone Academy API Service responsible for academy lifecycle management, academy profile management, academy verification, ownership claims, academy invitations, academy team/domain membership, academy social links, and academy-facing settings.

The Academy Service becomes the source of truth for academy domain data. It does not replace Organisation Service, Users Service, Authorisation Service, Courses Service, Booking Service, or Payments Service.

The service must follow existing RollFinders service patterns:

* PostgreSQL
* REST APIs
* service-owned database schema
* stored procedures/functions for data operations
* existing audit and logging patterns
* existing API gateway routing
* internal service authentication
* permission checks delegated to Authorisation Service

The Academy Service must not own:

* user identity or authentication
* platform roles or permissions
* organisations or application registry
* courses, events, open mats, seminars, or course activities
* bookings or attendance
* payment processing, refunds, transactions, or Stripe Connect account state

Those services remain the source of truth for their domains.

---

## Business Goals

* Reduce RollFinders application complexity.
* Separate academy management from marketplace browsing workflows.
* Support one organisation managing one or more academy locations.
* Enable academy self-service profile management.
* Enable academy ownership claims and review.
* Support future academy portals without creating multiple admin accounts for the same organisation.

---

## Current Implementation Fit

The current RollFinders application already has academy domain data in Prisma/public tables:

* `academies`
* `academy_social_links`
* `claim_requests`
* `academy_members`
* `academy_invitations`
* `academy_claim_reminders`

The current implementation also has related fields embedded in `academies`, including profile, verification, listing, location, image, and contact fields.

Current platform direction:

* Users Service owns canonical users in the `users` schema.
* Authorisation Service owns roles, permissions, role assignments, direct user permissions, and permission evaluation.
* Organisation Service owns organisations, applications, application-service enablement, tenant status, and tenant settings.
* Academy Service owns academy/location domain resources scoped under an organisation/application.
* Courses, Booking, and Payments consume academy/organisation identifiers but own their own records.

---

## Service Responsibilities

### Academy Lifecycle

* Create academy.
* Update academy.
* Archive academy.
* Publish academy.
* Suspend academy.
* Track academy listing state.

### Academy Profile

* Academy name and slug.
* Branding.
* Description.
* Contact details.
* Social links.
* Academy images.
* Address and geocoding fields.
* Profile settings.
* Public listing flags.

### Academy Domain Membership

* Assign academy owners.
* Remove academy owners.
* Assign academy admins.
* Remove academy admins.
* Assign academy coaches or members where the product needs domain membership.
* Remove academy coaches or members.

Academy membership is a domain relationship. It is not the platform permission source.

### Academy Verification

* Verification submission.
* Verification approval.
* Verification rejection.
* Verification status tracking.
* Review notes and audit trail.

### Academy Claims

* Submit academy claim.
* Approve claim.
* Reject claim.
* Link claim to a claimant user id from Users Service.
* Grant academy membership after approval.
* Record claim audit trail.

### Academy Invitations And Reminders

* Create academy invitations.
* Accept academy invitations.
* Cancel academy invitations.
* Expire academy invitations.
* Track claim reminder attempts.

### Cross-Service References

* Store `organisation_id` for academy tenancy.
* Store `application_id` once application scoping is stable.
* Store user ids as text references to Users Service.
* Store course ids only when a future read model requires it.

---

## Ownership Boundaries

### Academy Service Owns

* Academies.
* Academy profiles.
* Academy social links.
* Academy claims.
* Academy verification.
* Academy invitations.
* Academy claim reminders.
* Academy owner/admin/member domain relationships.
* Academy-level settings.
* Academy location/listing state.

### Organisation Service Owns

* Organisations.
* Applications.
* Application-service enablement.
* Tenant status.
* Tenant settings.
* Organisation-to-application registry.

An organisation can own one or more academies. In RollFinders, an academy is a domain resource/location under an organisation/application, not the organisation itself in the final model.

### Users Service Owns

* User identity.
* Authentication.
* Credentials.
* Sessions.
* Password reset.
* MFA.
* User profile/status/protected-account state.

### Authorisation Service Owns

* Roles.
* Permissions.
* Role-permission mappings.
* User-role assignments.
* Direct user-permission assignments.
* Effective permission evaluation.

Academy Service must call Authorisation Service or receive an already-authorised request from the API gateway/application layer before mutating protected academy resources.

### Courses Service Owns

* Courses.
* Events.
* Open mats.
* Seminars.
* Activities.
* Course schedule and pricing metadata.

Courses Service stores academy/organisation identifiers for scoping. Academy Service does not create courses.

### Booking Service Owns

* Bookings.
* Attendance.
* Booking status.
* Booking cancellation.

### Payments Service Owns

* Payment processing.
* Refunds.
* Transactions.
* Payment account settings.
* Stripe Connect account ids.
* Stripe onboarding status.
* Charges/payouts capability state.

Academy Service may display or cache a payment capability summary returned by Payments Service, but it must not own Stripe Connect account state.

---

## Authentication And Authorisation

Academy Service does not own end-user authentication.

All public or admin traffic should enter through the RollFinders app/API gateway. Internal Academy Service APIs require service authentication.

Protected operations require Authorisation Service permission checks. Permission scope should include:

```text
organisation_id
application_id
resource_type = academy
resource_id = academy_id
```

For list/search operations, the scope may omit `resource_id` and use `organisation_id` or platform-level scope.

---

## Permission Catalog

Permission names use the `academy.resource.action` pattern where the resource needs finer separation. General academy permissions use `academy.action`.

### Academy Core

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.create` | Create a new academy/location resource. | organisation/application |
| `academy.view` | View academy records and public/admin profile details. | platform, organisation, or academy |
| `academy.read` | Read non-sensitive academy details. | platform, organisation, or academy |
| `academy.search` | Search/list academies. | platform or organisation |
| `academy.edit` | Edit academy records and profile fields. | academy |
| `academy.update` | Update academy core fields such as name, slug, status metadata. | academy |
| `academy.archive` | Archive academy from active management. | academy |
| `academy.activate` | Reactivate a suspended academy. | academy/platform |
| `academy.publish` | Publish academy to marketplace surfaces. | academy |
| `academy.public.enabled` | Enable academy public listing and discovery visibility. | academy |
| `academy.unpublish` | Remove academy from marketplace surfaces without deleting it. | academy |
| `academy.suspend` | Suspend academy management or listing due to policy/quality concerns. | academy |
| `academy.delete` | Permanently delete academy where allowed by retention policy. | academy/platform |
| `academy.restore` | Restore archived/suspended academy. | academy |
| `academy.claim.view` | View academy ownership claim workflow access. | academy/platform |
| `academy.verify` | Verify academy records. | platform |
| `academy.unverify` | Remove academy verification. | platform |
| `academy.audit.view` | View academy audit history. | academy/platform |

### Academy Profile

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.profile.read` | Read editable academy profile data. | academy |
| `academy.profile.update` | Update description, branding, contact details, images, and settings. | academy |
| `academy.profile.location.update` | Update address, city, postcode, latitude, and longitude. | academy |
| `academy.profile.media.update` | Update logo, cover image, and related media. | academy |
| `academy.profile.contact.update` | Update phone, email, website, and contact metadata. | academy |
| `academy.profile.settings.update` | Update academy-level profile/settings flags. | academy |

### Academy Social Links

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.social.read` | Read academy social links. | academy |
| `academy.social.update` | Create, update, or remove academy social links. | academy |

### Academy Membership

Academy membership permissions control domain membership records only. They do not grant platform access by themselves.

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.member.read` | View academy owners/admins/coaches/members. | academy |
| `academy.member.add` | Add a user to academy membership through the current Academy Service endpoint. | academy |
| `academy.member.assign` | Add a user to academy membership. | academy |
| `academy.member.update` | Change academy member role/status. | academy |
| `academy.member.remove` | Remove a user from academy membership. | academy |
| `academy.member.owner.assign` | Assign academy owner relationship. | academy |
| `academy.member.owner.transfer` | Transfer academy ownership. | academy |
| `academy.member.owner.remove` | Remove academy owner relationship where allowed. | academy |
| `academy.member.admin.assign` | Assign academy admin relationship. | academy |
| `academy.member.admin.remove` | Remove academy admin relationship. | academy |
| `academy.member.coach.assign` | Assign academy coach relationship. | academy |
| `academy.member.coach.remove` | Remove academy coach relationship. | academy |

### Academy Claims

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.claim.submit` | Submit a claim for an academy. | academy/public flow |
| `academy.claim.read` | Read academy claim details. | academy/platform |
| `academy.claim.search` | List/search academy claims. | platform or organisation |
| `academy.claim.update` | Update claim metadata or review notes. | platform |
| `academy.claim.approve` | Approve an academy ownership claim. | platform |
| `academy.claim.reject` | Reject an academy ownership claim. | platform |
| `academy.claim.cancel` | Cancel/withdraw a pending claim. | claimant or platform |
| `academy.claim.audit.read` | Read claim review/audit trail. | platform |

### Academy Verification

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.verification.submit` | Submit verification material. | academy |
| `academy.verification.read` | Read verification state and submitted material. | academy/platform |
| `academy.verification.update` | Update verification submission before review. | academy |
| `academy.verification.review` | Review verification material. | platform |
| `academy.verification.approve` | Approve academy verification. | platform |
| `academy.verification.reject` | Reject academy verification. | platform |
| `academy.verification.audit.read` | Read verification review/audit trail. | platform |

### Academy Invitations

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.invitation.create` | Create academy invitation. | academy |
| `academy.invitation.read` | Read academy invitations. | academy |
| `academy.invitation.cancel` | Cancel pending invitation. | academy |
| `academy.invitation.resend` | Resend invitation. | academy |
| `academy.invitation.accept` | Accept invitation by token. | invitation/public flow |
| `academy.invitation.expire` | Expire invitation manually or by job. | academy/system |

### Academy Claim Reminders

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.claim_reminder.create` | Send or queue claim reminder. | platform |
| `academy.claim_reminder.read` | Read claim reminder history. | platform |
| `academy.claim_reminder.audit.read` | Read reminder audit details. | platform |

### Academy Analytics And Audit

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.analytics.read` | Read academy profile and listing analytics. | academy/platform |
| `academy.audit.read` | Read academy domain audit logs. | academy/platform |

### Academy Payment Capability Summary

These permissions only control academy-facing reads/actions that proxy to Payments Service. They do not transfer payment ownership to Academy Service.

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `academy.payment_status.read` | Read academy payment capability/onboarding summary from Payments Service. | academy |
| `academy.payment_onboarding.start` | Start Payments Service onboarding flow for academy owner. | academy |
| `academy.payment_onboarding.refresh` | Refresh Payments Service onboarding flow link/status. | academy |
| `academy.payment_onboarding.disconnect` | Request Payments Service disconnect flow. | academy/platform |

### Permission Rules

* New Academy Service routes must declare their required permission.
* Mutations must include `organisation_id`, `application_id`, `resource_type`, and `resource_id` where known.
* Public claim/invitation submission routes may use token or public-flow validation before later attaching Authorisation Service checks.
* Domain membership roles like `owner`, `admin`, `coach`, and `member` do not replace Authorisation Service permissions.
* Platform review actions such as claim approval and verification approval should require platform-scoped permissions.

---

## Route Permission Matrix

| Route | Permission |
| --- | --- |
| `POST /v1/academies` | `academy.create` |
| `GET /v1/academies` | `academy.search` |
| `GET /v1/academies/{academy_id}` | `academy.view` |
| `PATCH /v1/academies/{academy_id}` | `academy.edit` |
| `DELETE /v1/academies/{academy_id}` | `academy.delete` |
| `GET /v1/academies/{academy_id}/members` | `academy.member.read` |
| `POST /v1/academies/{academy_id}/members` | `academy.member.add` |
| `DELETE /v1/academies/{academy_id}/members/{user_id}` | `academy.member.remove` |
| `GET /v1/memberships` | `academy.membership.read` |
| `POST /v1/academies/{academy_id}/archive` | `academy.archive` |
| `POST /v1/academies/{academy_id}/activate` | `academy.activate` |
| `POST /v1/academies/{academy_id}/publish` | `academy.publish` |
| `POST /v1/academies/{academy_id}/public/enable` | `academy.public.enabled` |
| `POST /v1/academies/{academy_id}/unpublish` | `academy.unpublish` |
| `POST /v1/academies/{academy_id}/suspend` | `academy.suspend` |
| `POST /v1/academies/{academy_id}/restore` | `academy.restore` |
| `POST /v1/academies/{academy_id}/verify` | `academy.verify` |
| `POST /v1/academies/{academy_id}/unverify` | `academy.unverify` |
| `GET /v1/academies/{academy_id}/audit` | `academy.audit.view` |
| `GET /v1/academies/{academy_id}/profile` | `academy.profile.read` |
| `PUT /v1/academies/{academy_id}/profile` | `academy.profile.update` |
| `GET /v1/academies/{academy_id}/social-links` | `academy.social.read` |
| `PUT /v1/academies/{academy_id}/social-links` | `academy.social.update` |
| `PUT /v1/academies/{academy_id}/members/{member_id}` | `academy.member.update` |
| `DELETE /v1/academies/{academy_id}/members/{member_id}` | `academy.member.remove` |
| `POST /v1/academies/{academy_id}/claims` | `academy.claim.submit` |
| `GET /v1/academy-claims` | `academy.claim.search` |
| `GET /v1/academy-claims/{claim_id}` | `academy.claim.read` |
| `PUT /v1/academy-claims/{claim_id}` | `academy.claim.update` |
| `POST /v1/academy-claims/{claim_id}/approve` | `academy.claim.approve` |
| `POST /v1/academy-claims/{claim_id}/reject` | `academy.claim.reject` |
| `POST /v1/academy-claims/{claim_id}/cancel` | `academy.claim.cancel` |
| `POST /v1/academies/{academy_id}/verification` | `academy.verification.submit` |
| `GET /v1/academies/{academy_id}/verification` | `academy.verification.read` |
| `PUT /v1/academies/{academy_id}/verification` | `academy.verification.update` |
| `POST /v1/academies/{academy_id}/verification/approve` | `academy.verification.approve` |
| `POST /v1/academies/{academy_id}/verification/reject` | `academy.verification.reject` |
| `POST /v1/academies/{academy_id}/invitations` | `academy.invitation.create` |
| `GET /v1/academies/{academy_id}/invitations` | `academy.invitation.read` |
| `POST /v1/academy-invitations/{token}/accept` | `academy.invitation.accept` |
| `POST /v1/academy-invitations/{invitation_id}/cancel` | `academy.invitation.cancel` |
| `POST /v1/academy-invitations/{invitation_id}/resend` | `academy.invitation.resend` |
| `POST /v1/academies/{academy_id}/claim-reminders` | `academy.claim_reminder.create` |
| `GET /v1/academies/{academy_id}/claim-reminders` | `academy.claim_reminder.read` |
| `GET /v1/academies/{academy_id}/analytics` | `academy.analytics.read` |
| `GET /v1/academies/{academy_id}/audit` | `academy.audit.read` |
| `GET /v1/academies/{academy_id}/payment-status` | `academy.payment_status.read` |
| `POST /v1/academies/{academy_id}/payment-onboarding/start` | `academy.payment_onboarding.start` |
| `POST /v1/academies/{academy_id}/payment-onboarding/refresh` | `academy.payment_onboarding.refresh` |
| `POST /v1/academies/{academy_id}/payment-onboarding/disconnect` | `academy.payment_onboarding.disconnect` |

---

## Database Schema

Academy Service should own an `academy` database schema in the shared RollFinders PostgreSQL database.

All data operations should go through stored procedures/functions, following the payment service migration structure.

### academies

```sql
id text primary key
organisation_id text not null
application_id text
name text not null
slug text not null
status text not null
verification_status text not null
featured boolean not null default false
verified boolean not null default false
created_by_user_id text
created_at timestamptz not null
updated_at timestamptz not null
```

### academy_profiles

```sql
academy_id text primary key
description text
affiliation text
website text
email text
phone text
address jsonb
city text
postcode text
borough text
country text
latitude numeric
longitude numeric
logo_url text
cover_image_url text
categories text
drop_in_price numeric
gi_available boolean
nogi_available boolean
beginner_friendly boolean
competition_focused boolean
created_at timestamptz not null
updated_at timestamptz not null
```

### academy_social_links

```sql
id text primary key
academy_id text not null
platform text not null
url text not null
created_at timestamptz not null
updated_at timestamptz not null
```

### academy_members

```sql
id text primary key
academy_id text not null
user_id text not null
member_role text not null
status text not null
created_at timestamptz not null
updated_at timestamptz not null
```

Domain member roles:

* owner
* admin
* coach
* member

These roles describe the user's academy relationship. They do not replace Authorisation Service roles or permissions.

### academy_claims

```sql
id text primary key
academy_id text not null
requester_name text not null
requester_email text not null
requester_role text not null
claimant_user_id text
status text not null
evidence jsonb
reviewed_by_user_id text
reviewed_at timestamptz
rejection_reason text
review_notes text
created_at timestamptz not null
updated_at timestamptz not null
```

### academy_verifications

```sql
id text primary key
academy_id text not null
submitted_by_user_id text
status text not null
verification_data jsonb
reviewed_by_user_id text
reviewed_at timestamptz
review_notes text
created_at timestamptz not null
updated_at timestamptz not null
```

### academy_invitations

```sql
id text primary key
academy_id text not null
invited_email text not null
invited_by_user_id text
status text not null
token text not null
expires_at timestamptz
accepted_at timestamptz
created_at timestamptz not null
updated_at timestamptz not null
```

### academy_claim_reminders

```sql
id text primary key
academy_id text not null
actor_user_id text not null
recipient_email text
outcome text not null
reason text
source text
created_at timestamptz not null
```

### Future Read Models

Do not create `academy_course_references` in v1.

Courses Service should own course-to-academy relationships by storing academy/organisation/application identifiers. Academy Service may add read models later only if the query pattern justifies duplication.

Do not create `academy_stripe_accounts` in Academy Service.

Payments Service owns Stripe Connect account records. Academy Service may call Payments Service or consume an event/read model for payment capability display.

---

## Migration From RollFinders

Move academy-domain data from Prisma/public tables into Academy Service:

* `academies`
* `academy_social_links`
* `claim_requests`
* `academy_members`
* `academy_invitations`
* `academy_claim_reminders`

Do not move:

* `users`
* `roles`
* `permissions`
* `courses`
* `events`
* `bookings`
* `payments`
* `payment_account_settings`

Migration steps:

1. Finalise Academy Service boundaries, permissions, and schema.
2. Add Academy Service permissions to the Authorisation Service catalog.
3. Create Academy Service runtime and migrations.
4. Add academy schema tables, functions, and procedures.
5. Add internal Academy Service API.
6. Backfill existing academy data into the Academy Service schema.
7. Add RollFinders Academy client/helper.
8. Cut over read paths from Prisma academy tables to Academy Service APIs.
9. Cut over write paths from Prisma academy tables to Academy Service APIs.
10. Keep Courses, Booking, and Payments consuming academy ids during compatibility.
11. Add `organisation_id` compatibility mapping.
12. Add `application_id` once Organisation Service application registry is stable.
13. Remove legacy public academy tables only after all reads/writes are migrated.

---

## Compatibility Rules

For v1:

* Existing academy ids remain stable.
* Existing Courses/Booking/Payments references to academy ids remain valid.
* Existing academy id may continue to act as `organisation_id` only where current services require compatibility.
* Academy Service must expose enough data for the existing RollFinders dashboard and marketplace pages before Prisma academy tables are removed.

Target model:

* `organisation_id` identifies the tenant/business.
* `application_id` identifies RollFinders Marketplace.
* `academy_id` identifies an academy/location/resource under the organisation/application.

---

## Open Decisions

* Whether Academy Service should expose public marketplace read APIs directly or only internal admin APIs first.
* Whether academy member roles should remain `owner/admin` only in v1 or expand immediately to `coach/member`.
* Whether geocoding remains in the RollFinders app temporarily or moves into Academy Service in v1.
* Whether academy claim approval should synchronously call Authorisation Service to assign permissions or emit an event for an async assignment workflow.
