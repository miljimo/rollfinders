# 001 - Finalise Subscription Domain Boundaries

## Feature / Component

- Feature: Subscription Service
- Component: Product and domain contract
- Priority: P0
- Branch: `feature/subscription-service-boundaries`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: None
- Source PRD: `docs/services/subscriptions/product.md`

## Task

Finalise the Subscription Service implementation contract before code work begins.

## Implementation Notes

- Confirm Subscription Service owns products, product features, plans, plan feature rules, subscriptions, lifecycle state, and entitlement publication.
- Confirm Subscription Service does not own user roles, user permissions, API route permissions, payment processing, refunds, invoices, or provider account state.
- Confirm Organisation Service is the preferred source for application-service availability once its service table/API exists.
- Confirm bootstrap mode may load Authorisation Service permission definitions only to help platform admins create product-feature candidates.
- Confirm bootstrap fallback does not grant all permissions to customers and does not move permission ownership into Subscription Service.
- Confirm products/features are commercial capability keys, while permissions remain Authorisation Service records.

## Acceptance Criteria

- WHEN the PRD is reviewed, THEN service ownership boundaries are explicit.
- WHEN an implementer reads the PRD, THEN they can identify how Organisation, Authorisation, Payments, API, and Subscription services interact.
- WHEN bootstrap fallback is described, THEN it is limited to catalogue setup and cannot be interpreted as customer access grant logic.

## Regression / Compatibility Tests

- Review against current Organisation Service PRD, Authorisation Service PRD, Payments Service PRD, and API Service PRD.
- Confirm no ticket requires Subscription Service to store or evaluate user permissions.

## Out Of Scope

Runtime implementation.
