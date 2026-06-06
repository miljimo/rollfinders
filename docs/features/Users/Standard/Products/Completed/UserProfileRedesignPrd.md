# PRD: Simple Admin User Profile

Version: 1.1

Status: Done

Priority: Medium

Review date: 2026-06-05

Implementation evidence: `src/app/admin/page.tsx` includes `ViewUserDialog`, which provides the simple user profile modal.

Branch:

`feature/simple-admin-user-profile`

---

# Objective

Add a simple admin user profile view that lets admins review user identity, access, status, and available actions without editing inside a dense table row.

This is an MVP-friendly detail view. It should stay simple and reuse the existing user management actions.

---

# Design Reference

The original richer mockup is stored here for visual direction, but the MVP implementation should be simpler than the image:

![Admin user profile redesign mockup](../../assets/user-profile-redesign-mockup.png)

MVP design direction:

* One modal, drawer, or detail route.
* Header with initials avatar, name, email, role badge, and status badge.
* One `Account Details` section.
* One `Actions` section.
* No tabs.
* No right-side summary panel.
* No activity timeline for MVP.

---

# Current Source Context

Existing UI:

* `src/app/admin/users/page.tsx`
* `src/app/admin/users/CreateUserForm.tsx`

Existing actions:

* `src/app/admin/users/actions.ts`
* `updateManagedUser`
* `toggleManagedUserDisabled`
* `sendPasswordChangeEmail`
* `deleteManagedUser`

Existing API:

* `src/app/api/admin/users/[id]/route.ts`
* `src/app/api/admin/users/[id]/disable/route.ts`
* `src/app/api/admin/users/[id]/enable/route.ts`
* `src/app/api/admin/users/[id]/password-reset/route.ts`

Existing model:

* `User.name`
* `User.email`
* `User.role`
* `User.academyId`
* `User.status`
* `User.disabled`
* `User.emailStatus`
* `User.lastLoginAt`
* `User.createdAt`
* `User.isProtected`

---

# Current Implementation Status

Reviewed against source code on 2026-06-05.

Status: Done.

Current behavior:

* User details are available through a separate profile modal.
* Dense inline table controls are no longer the only way to review account details.
* Existing actions already support the required profile actions.

MVP decision:

* Implement a simple profile/detail view only.
* Do not build tabs, activity timeline, or complex security panels for MVP.

---

# User Story

As an admin, I want to open a simple user profile so that I can review account details and take common management actions without scanning the table row.

---

# Field Inventory

Display fields:

* `name`
* `email`
* `role`
* academy name, derived from `academyId`
* `status`
* `emailStatus`
* `lastLoginAt`
* `createdAt`
* protected account indicator from `isProtected`

Actions:

* Edit user
* Send password email
* Disable user
* Enable user
* Delete user, only when allowed

---

# IF/WHEN/THEN Requirements

## SUP-001: Open User Profile

IF an authorized admin is on `/admin/users`

WHEN they select `View Profile` or the user identity action

THEN the system SHALL open a simple user profile view for that user.

Done when:

* The view opens without losing the current users list context.
* The admin can close the view and return to the same list.
* Unauthorized users cannot open profiles outside their scope.

---

## SUP-002: Header

IF the profile view opens

WHEN user data loads

THEN the header SHALL show initials avatar, display name, email, role badge, and account status badge.

Done when:

* Missing name falls back to email.
* Initials are derived from name or email.
* Disabled users show `Disabled`.
* Active users show `Active`.
* Protected users show a `Protected` indicator.

---

## SUP-003: Account Details

IF the profile view renders

WHEN account details are displayed

THEN the UI SHALL show role, academy, status, email status, last login, and created date.

Done when:

* Academy displays academy name or `None`.
* Last login displays formatted date or `Never`.
* Created date displays formatted date.
* Field labels are clear and scannable.

---

## SUP-004: Action Visibility

IF the admin can manage the viewed user

WHEN the profile renders

THEN the UI SHALL show only the actions that the admin is allowed to perform.

Done when:

* Protected users hide disallowed actions.
* Self-delete is not available.
* Delete is hidden for super-user accounts.
* Academy admins only see allowed actions for users in their academy scope.
* Read-only users show details without management buttons.

---

## SUP-005: Edit User

IF the admin selects `Edit User`

WHEN they update name, email, role, academy, or status

THEN the system SHALL save through the existing managed user update path.

Done when:

* Email validation is enforced.
* Role and academy rules match current user management permissions.
* Successful edits revalidate `/admin/users`.
* Edit actions are audit logged.

---

## SUP-006: Send Password Email

IF the admin selects `Send Password Email`

WHEN the action succeeds

THEN the system SHALL queue the existing password reset/change email.

Done when:

* The existing password email action is reused.
* Success or failure feedback is visible.
* The action is audit logged.

---

## SUP-007: Disable Or Enable User

IF the admin selects disable or enable

WHEN the action succeeds

THEN the system SHALL update `status` and `disabled` consistently.

Done when:

* Disabled users save with `status = DISABLED` and `disabled = true`.
* Enabled users save with `status = ACTIVE` and `disabled = false`.
* Final active super-user protection is preserved.
* The action is audit logged.

---

## SUP-008: Delete User

IF the admin selects `Delete User`

WHEN they confirm the destructive action

THEN the system SHALL delete the user and return to `/admin/users`.

Done when:

* Delete requires confirmation.
* Delete is unavailable for disallowed users.
* Deletion is audit logged.
* The profile closes after successful deletion.

---

## SUP-009: Responsive Layout

IF the profile is viewed on mobile

WHEN the UI renders

THEN the profile SHALL stack cleanly in one column.

Done when:

* Header content wraps cleanly.
* Badges do not overlap.
* Buttons remain reachable.
* Text fits within its containers.

---

# Acceptance Criteria

* Admin can open a user profile from `/admin/users`.
* Profile shows name, email, role, academy, status, email status, last login, and created date.
* Profile shows only allowed actions.
* Existing user management actions are reused.
* Read-only profiles are supported.
* Mobile layout is usable.

---

# Suggested Implementation Breakdown

1. Add a `View Profile` action to the users table.
2. Create a simple `UserProfile` modal, drawer, or route.
3. Fetch user details using existing server data or `/api/admin/users/[id]`.
4. Reuse existing actions for edit, password email, disable/enable, and delete.
5. Add permission-aware action visibility.
6. Add manual QA for super admin, platform admin, and academy admin scopes.
