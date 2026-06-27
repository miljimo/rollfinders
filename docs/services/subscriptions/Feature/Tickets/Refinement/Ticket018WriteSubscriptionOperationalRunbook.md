# 018 - Write Subscription Operational Runbook

## Feature / Component

- Feature: Subscription Service
- Component: Documentation / Platform operations
- Priority: P2
- Branch: `docs/subscription-runbook`
- Developer owner: Platform sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket017AddSubscriptionEndToEndTests
- Source PRD: `docs/services/subscriptions/product.md`

## Goal

Document how operators inspect, diagnose, and safely recover subscription and billing journey issues.

## Scope

The agent must:
- Document how to inspect subscription state, plan changes, billing events, and entitlement decisions.
- Document how to recover failed checkout and pending plan-change states.
- Document how to manually cancel, reactivate, or apply a pending change safely.
- Document owner-scoped subscription rules and common denial reasons.

The agent must not:
- Include secrets, credentials, or raw provider payloads.
- Recommend direct writes to non-Subscription Service-owned tables.

## Implementation Notes

- Keep commands environment-aware and explicit about read-only versus mutating operations.
- Link back to `docs/services/subscriptions/product.md`.
- Include rollback and audit verification notes.

## Acceptance Criteria

- WHEN an operator sees a denied feature request, THEN the runbook explains how to find the owner, feature key, plan, and denial reason.
- WHEN checkout fails, THEN the runbook explains how to identify the related plan change and billing event.
- WHEN manual recovery is required, THEN the runbook describes safe checks before mutation.

## Regression / Compatibility Tests

- Confirm the runbook does not include secrets or provider credentials.
- Confirm documented table names match the migration.
- Confirm denial reason names match the PRD.

## Out Of Scope

- Provider-specific tax or invoice accounting.
