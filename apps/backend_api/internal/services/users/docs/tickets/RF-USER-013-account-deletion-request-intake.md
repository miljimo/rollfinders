# Name: RF-USER-013 - Shared Dashboard Account Deletion Request Intake

## Feature / Component

- Feature: Account and personal-data deletion
- Component: Users service, shared dashboard, mobile navigation, public portal
- Priority: P0
- Branch: `feature/account-deletion-request-intake`
- Developer owner: Platform team
- Test owner: Platform team
- Dependencies: None
- Source PRD: `docs/platform/mobile.md`

## Goal

Allow practitioners to submit and manage a verified account-deletion request through shared dashboard settings or a public RollFinders resource.

## Scope

The agent must:

- Route authenticated mobile profiles into the shared dashboard with `surface=mobile`.
- Store one active verified deletion request per user in the Users service.
- Support authenticated intake, public email verification, current-request lookup, and cancellation.
- Send public verification and post-confirmation acknowledgement emails.
- Keep academy membership removal separate from account deletion.

The agent must not:

- Perform cross-service erasure or anonymisation.
- Let academy administrators request deletion for practitioners.
- Treat account disabling or academy membership removal as completed deletion.
- expose admin pages in the mobile WebView.

## Implementation Notes

- Public email responses must not reveal whether an account exists.
- Verification tokens are hashed, single-use, short-lived, and cleared after confirmation or cancellation.
- Verified requests receive a due date one calendar month after verification.
- `surface=mobile` changes presentation only and never permissions.
- The public privacy resource must state that lawful retention can apply.

## Acceptance Criteria

- WHEN an authenticated mobile practitioner selects Profile, THEN the shared dashboard profile opens with fixed mobile navigation.
- WHEN a user submits from dashboard settings, THEN one pending-processing request is recorded for the session user.
- WHEN a known public email confirms a valid token, THEN the request becomes pending processing and receives a due date.
- WHEN an unknown email is submitted, THEN no request is created and the generic response is unchanged.
- WHEN a pending request is cancelled, THEN its previous token cannot be used.

## Regression / Compatibility Tests

- Confirm desktop dashboard navigation and role routing remain unchanged.
- Confirm mobile sign-in, registration, logout, and bottom navigation still work.
- Confirm academy membership removal does not delete or disable the user.
- Confirm public responses prevent account enumeration.

## Out Of Scope

- Cross-service erasure, anonymisation, reconciliation, and completion notifications.
- Financial and fraud-record retention processing.
- Academy or organisation deletion.
- Play Console form submission.
