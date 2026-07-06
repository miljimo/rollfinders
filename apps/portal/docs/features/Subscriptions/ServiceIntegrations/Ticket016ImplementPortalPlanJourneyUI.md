# 016 - Implement Portal Plan Journey UI

## Feature / Component

- Feature: Subscription Service
- Component: Portal / Dashboard
- Priority: P1
- Branch: `feature/subscription-plan-journey-ui`
- Developer owner: Frontend sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket012AddRollFindersClientAndGatewayIntegration
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Goal

Allow admins to view plans and start subscribe, upgrade, downgrade, switch, cancel, and reactivate actions from the portal.

## Scope

The agent must:
- Display current plan, available plans, included features, and pending plan changes.
- Render `Subscribe`, `Upgrade`, `Downgrade`, `Switch Plan`, and `Current Plan` using the PRD comparison rules.
- Redirect to checkout when the backend returns a checkout URL.
- Show scheduled downgrade and cancellation notices.

The agent must not:
- Call Subscription Service directly from browser code outside the approved gateway/client path.
- Add marketing landing pages.

## Implementation Notes

- Keep the UI operational and dashboard-oriented.
- Use existing portal components and subscription client patterns.
- Do not expose raw internal service URLs to browser clients.

## Acceptance Criteria

- WHEN no plan is active, THEN selectable plans show `Subscribe`.
- WHEN a higher-priced plan is shown, THEN it shows `Upgrade`.
- WHEN a lower-priced plan is shown, THEN it shows `Downgrade`.
- WHEN the current plan is shown, THEN it shows `Current Plan`.
- WHEN checkout is required, THEN the user is redirected to the checkout URL.

## Regression / Compatibility Tests

- Confirm existing dashboard navigation still works.
- Confirm platform admin screens do not show customer subscription prompts unless in owner context.
- Confirm failed plan actions show recoverable feedback.

## Out Of Scope

- New payment provider UI.
- Usage metering UI.
