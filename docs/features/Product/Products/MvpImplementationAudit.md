# MVP Implementation Audit

Version: 1.0

Review date: 2026-06-05

Purpose:

This document maps the current Markdown requirements to the current source code so human engineers and AI agents can quickly see what is MVP-ready, what is partial, and what still needs implementation.

---

# Source Areas Reviewed

Product and feature requirements:

* `docs/features/Product/Products/Reviewing/RollFinderMvpPrd.md`
* `docs/features/Product/Products/FounderProductUpdate.md`
* `apps/portal/docs/features/Users/Academies/Products/`
* `apps/portal/docs/features/OpenMats/Products/`
* `apps/portal/docs/features/Users/*/Products/`
* `apps/portal/docs/features/Platform/Products/PublicBusinessInformation.md`
* `apps/portal/docs/features/SharedComponents/Table.md`

Implementation areas:

* `src/app/academies`
* `src/app/open-mats`
* `src/app/map`
* `src/app/admin`
* `src/app/api`
* `src/app/dashboard`
* `src/components`
* `src/lib`
* `prisma/schema.prisma`

---

# MVP Summary

| Area | Status | Notes |
| --- | --- | --- |
| Academy directory | Implemented | Public browse, search, profile, directions, and BJJ-specific fields exist. |
| Open Mat Radar | Implemented | Public open mats page supports today, tomorrow, weekend, gi/no-gi, search, distance sorting, detail pages, and directions. |
| Search | Implemented | Academy and open mat search are server-side and cover borough, postcode, academy, gi/no-gi, beginner, and competition terms. |
| Map | Partial | Public map route exists with Google Maps embed fallback and academy listing rail. Custom markers and marker-click tracking are not implemented. |
| Public business pages | Implemented | About, contact, privacy policy, and terms pages exist. |
| Admin dashboard | Implemented | Admin overview, metrics, module navigation, recent academies, and recent open mats exist. |
| Academy management | Implemented | Admin academy list, filters, pagination, create/edit/detail, verification status, featured state, and delete controls exist. |
| Academy verification | Partial | Admin can set `PENDING`, `VERIFIED`, or `REJECTED`; public verified state is derived. Dedicated verification audit metadata is still missing. |
| Pending academies | Partial | Counts, filters, and status badges exist. Dashboard metric navigation should still be added. |
| Academy claiming | Implemented with follow-ups | Public claim action/form, pending claim storage, admin approve/reject, requester notification, academy access grant, and claim invitation emails exist. Remaining follow-ups: requester submission confirmation email, claim funnel analytics, rate limiting, and database-level duplicate pending claim guard where supported. |
| Multi-admin academy team | Mostly implemented | Team page, invitations, accept flow, remove member, transfer owner, resend, and cancel exist. Team-action audit logging and owner notifications are still missing. |
| User management | Mostly implemented | Dedicated `/admin/users`, search/filter/pagination, create/edit/disable/enable/delete/password email, APIs, protected account safeguards, and audit logs exist. |
| User profile detail | Missing | User details are currently inline in the table. A simple profile modal/detail view is still a future UI task. |
| Analytics | Missing | No Google Analytics, PostHog, event tracking, or MVP reporting path is visible in source. |
| Reusable table | Implemented | Component, child files, pagination, empty/loading states, responsive overflow, status badges, and unit tests exist. |
| Email delivery | Implemented for current flows | Reliable email queue, password reset email, invitation email, and email delivery job exist. Admin-created temp-password email should be verified separately if required. |

---

# Critical MVP Gaps

## MVP-001: Analytics For Success Metrics

Status: Missing

Required next work:

* Choose analytics provider.
* Track page views.
* Track academy search submitted.
* Track open mat search/filter submitted.
* Track open mat detail viewed.
* Track academy profile viewed.
* Track directions clicked.
* Track map viewed.
* Track map marker clicked if custom markers are implemented.
* Track claim profile started.
* Track claim profile submitted.
* Add a lightweight monthly reporting path for visitors, weekly active users, returning users, and monthly searches.

---

## MVP-002: Complete Academy Claiming Flow

Status: Implemented with follow-ups

Implemented:

* Public `Claim this academy` action on academy profile.
* Claim form with requester details and verification evidence.
* Submitted claims are stored as `PENDING`.
* Admin pending claims view and detail review flow.
* Approve/reject actions.
* Approval creates or links requester user account.
* Approval grants academy management access.
* Rejection queues requester notification.
* Admin audit logs record claim decisions.
* Academy claim invitation emails can be queued from academy creation, edit, and manual reminder flows.

Remaining follow-ups:

* Queue requester submission confirmation email after public claim intake.
* Add claim funnel analytics events.
* Add public claim rate limiting by IP and/or requester email.
* Add a database-level duplicate pending claim guard where supported.

---

## MVP-003: Map Marker Experience

Status: Partial

Required next work:

* Decide whether MVP needs custom markers or if the embedded map plus listing rail is enough.
* If custom markers are required, implement academy/open mat markers.
* Marker click should reveal academy/open mat summary and link to detail.
* Marker clicks should be trackable by analytics.

---

## MVP-004: Verification Audit Detail

Status: Partial

Required next work:

* When `verificationStatus` changes, write audit metadata with previous status, next status, actor, academy ID, and timestamp.
* Keep `verified` derived from `verificationStatus`.

---

## MVP-005: Simple User Profile Detail

Status: Implemented

Implemented:

* Admin user profile modal is available from `/admin?panel=users`.
* Modal shows identity, role, academy, status, last login, and created date.
* Existing user management actions remain available through the surrounding user management UI.
* MVP view stays simple without tabs or activity timeline.

---

# Implemented MVP Functions To Preserve

Do not regress these while implementing missing MVP work:

* Public academy search and profiles.
* Public open mat search/filter/detail.
* Directions links.
* Admin academy create/edit/delete.
* Academy verification status save behavior.
* Admin user create/edit/disable/enable/delete/password reset email.
* Academy team invitations and acceptance.
* Reliable email queue.
* Table component behavior and tests.

---

# Recommended Next Branches

Use one branch per focused MVP gap:

* `feature/mvp-analytics-events`
* `feature/academy-claiming-flow`
* `feature/map-marker-experience`
* `feature/academy-verification-audit`
* `feature/simple-user-profile-detail`
