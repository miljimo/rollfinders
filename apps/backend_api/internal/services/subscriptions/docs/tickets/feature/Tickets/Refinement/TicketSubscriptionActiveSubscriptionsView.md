# Name: SUBSCRIPTIONS-UI-002 - Rename Subscribers view to Active Subscriptions

## Feature / Component

- Feature: Subscription dashboard
- Component: App Dashboard UI
- Priority: P1
- Branch: `feature/subscription-active-subscriptions-view`
- Developer owner: AI agent
- Test owner: AI agent
- Dependencies: Existing Subscription Service list subscriptions endpoint
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Goal

Make the subscriptions list understandable as active subscription records instead of a confusing subscriber/admin table.

## Scope

The agent must:
- Rename the `Subscribers` navigation/page to `Active Subscriptions`.
- Keep the existing route/query value for compatibility.
- Show useful subscription columns: subscription, owner, plan, billing period, amount, status, started date, and renews/ends date.
- Rename `New Subscriber` to `Assign Subscription` for manual admin assignment.
- Keep existing actions and permissions intact.

The agent must not:
- Change subscription lifecycle rules.
- Change payment processing or Stripe integration.
- Create a new dashboard layout.

## Implementation Notes

- Reuse existing dashboard table components.
- Keep `subscriptionsView=subscribers` as the route value to avoid breaking links.
- This is a UI terminology and table-structure improvement.

## Acceptance Criteria

- WHEN a user opens the subscriptions list, THEN the page title is `Active Subscriptions`.
- WHEN a subscription exists, THEN the table shows the plan name, amount, billing cycle, owner, status, started date, and renews/ends date.
- WHEN an admin needs to manually create a subscription, THEN the button says `Assign Subscription`.
- WHEN existing links use `subscriptionsView=subscribers`, THEN they still work.

## Regression / Compatibility Tests

- Confirm the subscription dashboard typechecks.
- Confirm existing edit/cancel/suspend/reactivate actions remain available.
- Confirm no route value changes break existing links.

## Out Of Scope

- Stripe webhook reconciliation.
- Wallet transaction posting.
- Subscription service API schema changes.
