# Ticket: Enhance Admin Page

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

## Acceptance Criteria

1. Admin dashboard remains protected by platform-admin authorization.
2. Super-admin-only data remains hidden from non-super-admin users.
3. Dashboard provides obvious navigation to major admin modules.
4. Dashboard displays email and user operational metrics.
5. Recent admin audit activity is visible to super admins.
6. TypeScript, lint, and production build checks pass.
