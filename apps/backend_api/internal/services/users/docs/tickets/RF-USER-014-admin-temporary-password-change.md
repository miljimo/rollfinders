# Name: RF-USER-014 - Audited Admin Temporary Password Change

## Feature / Component

- Feature: User credential administration
- Component: Users service, API gateway, authorisation, dashboard, notification
- Priority: P0
- Branch: `feature/admin-temporary-password-change`
- Developer owner: Platform team
- Test owner: Platform team
- Dependencies: None
- Source PRD: `apps/backend_api/internal/services/users/docs/product.md`

## Goal

Allow an authorised administrator to set a managed user's temporary password while recording the actor and reason, revoking active sessions, and notifying the user without exposing the password.

## Scope

The agent must:

- Add a dedicated permission and managed-user endpoint for temporary password changes.
- Require a temporary password, confirmation, and administrative reason in the dashboard.
- Hash the password and atomically update credentials, revoke active sessions, and write an audit record.
- Record the acting administrator, target user, reason, action, and timestamp.
- Send a password-changed security notification that does not contain the password or create a reset request.
- Hide the action when the actor lacks permission or cannot manage the target user.
- Preserve the target user's ability to load their own account after authenticating with the temporary password.
- Reconcile legacy users that have no Authorisation service role assignment.

The agent must not:

- Store or log plaintext passwords.
- Email the temporary password.
- Use the public password-reset flow to perform the change.
- Allow administrators to change their own password or a protected account through this action.

## Implementation Notes

- Use `POST /v1/users/{userId}/temporary-password` and `user.password.set_temporary`.
- Keep authentication and authorisation in the gateway and portal orchestration layers.
- Store audit data in `users.admin_audit_logs` with action `USER_TEMPORARY_PASSWORD_SET`.
- The database procedure must make credential update, session revocation, and audit insertion one transaction.
- Notification delivery is best effort and occurs only after the credential operation succeeds.
- Self-account reads remain resource-scoped and must not allow a user to read another account.
- Missing-role reconciliation assigns only the default `STANDARD_USER` role and leaves every existing assignment unchanged.

## Acceptance Criteria

- WHEN an authorised administrator submits matching valid passwords and a reason, THEN the target credential changes and the action succeeds.
- WHEN the change succeeds, THEN every active target-user session is revoked.
- WHEN the target authenticates with the new temporary password, THEN their own account profile loads successfully.
- WHEN a legacy standard user has no Authorisation role, THEN deployment reconciliation adds the default role idempotently.
- WHEN the change succeeds, THEN the audit log identifies the administrator, target user, reason, and action time.
- WHEN the user is notified, THEN the message states that an administrator changed the password and contains no password or reset token.
- WHEN the reason is missing or passwords are invalid or mismatched, THEN no credential or audit data changes.
- WHEN the actor lacks permission or the target is protected, THEN the action is unavailable and the API rejects the request.

## Regression / Compatibility Tests

- Confirm self-service password changes and password-reset flows remain unchanged.
- Confirm managed-user details and permission editing still work.
- Confirm academy-scoped administrators cannot change users outside their authorised scope.
- Confirm self-account access does not permit reading a different user's account and an explicit deny still takes precedence.
- Confirm no plaintext password appears in responses, audit metadata, logs, or notification content.

## Out Of Scope

- Sending temporary passwords through email or SMS.
- Password expiry or forced-change-on-next-login support.
- Bulk password changes.
- Changes to public password-reset behaviour.
