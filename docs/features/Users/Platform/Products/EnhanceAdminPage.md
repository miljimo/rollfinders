# Ticket: Enhance Admin Page

## Schema Impact

No schema changes are required for this PRD.

IF this dashboard enhancement is implemented

WHEN the deployment is prepared

THEN no database migration script SHALL be required for this PRD.

AND deployment SHALL only require application code changes that read existing data.

## Objective

Improve the main RollFinders admin dashboard so it works as a clear operational landing page after the Academy Management module was split into its own route.

## Requirements

* Add clear module navigation cards for the primary admin workflows.
* Keep quick access to Academy Management, Open Mats, Users, and Email Operations.
* Add operational metrics beyond academy counts.
* Surface email delivery records that need attention.
* Surface invalid email counts for super admins.
* Show recent audited admin activity for super admins.
* Preserve existing role-based controls and protected super-admin behavior.
* Avoid duplicate dashboard panels that repeat metrics already shown in the overview.
* Keep primary dashboard actions clear: the main admin page links to Academies, while the dedicated Academy Management page owns the New Academy action.

## Implementation

The admin page now includes:

* Module cards linking to:
  * `/admin/academies`
  * `/admin/open-mats/new`
  * `#users`
  * `#email-operations`
* Academy metrics:
  * Total academies
  * Verified academies
  * Pending verification
  * Featured academies
  * Active open mats
* Operational metrics:
  * Users
  * Outbound emails
  * Email attention
  * Invalid emails
* Anchored dashboard panels for academy, open mat, user, email, and audit sections.
* Recent Admin Activity panel using `AdminAuditLog` for super admins.
* Removed the duplicated Academy Management panel from `/admin`.
* Changed the top dashboard action from `New Academy` to the Academies panel at `/admin?panel=academies`.
* Kept the academy creation action on the `/admin?panel=academies` panel.

## Acceptance Criteria

1. Admin dashboard remains protected by platform-admin authorization.
2. Super-admin-only data remains hidden from non-super-admin users.
3. Dashboard provides obvious navigation to major admin modules.
4. Dashboard displays email and user operational metrics.
5. Recent admin audit activity is visible to super admins.
6. Admin dashboard does not repeat the same academy metrics in both overview cards and a second panel.
7. TypeScript, lint, and production build checks pass.

---

## Current Implementation Status

Reviewed against source code on 2026-06-05.

Status: Mostly implemented.

Implemented:

* Admin dashboard route exists at `/admin`.
* Module cards exist for academy management, open mats, users, email operations, and settings.
* Dashboard metrics include academy counts, user counts, open mat counts, and email counts.
* Recent admin activity is visible for super admins.
* Super-admin-only dashboard sections are conditionally rendered.

MVP gaps or notes:

* The Users module now links to `/admin/users`, not `#users`.
* Email operations are visible through dashboard panels and settings/admin routes rather than a full standalone email-operations page.

MVP decision:

* The enhanced admin dashboard is MVP-usable.
