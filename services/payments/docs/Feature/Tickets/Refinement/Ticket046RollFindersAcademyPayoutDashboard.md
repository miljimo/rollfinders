# 046 - Integrate RollFinders Academy Payout Request Dashboard

## Feature / Component

- Feature: Academy Payout Requests
- Component: RollFinders academy and platform admin dashboard integration
- Priority: P0
- Branch: `feature/rollfinders-academy-payout-dashboard`
- Developer owner: Frontend Engineer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket045AcademyPayoutRequestApi
- Source PRD: `services/payments/docs/LagenciesService.md`

## Task

Add RollFinders dashboard flows for academies to request payout and for Platform Admin or Super Admin users to review and manage payout requests.

## Implementation Notes

- Add academy payout balance display using Payment Service balance API.
- Add payout request history to the Payments > Payouts view.
- Add a request payout action only when Payment Service returns payout eligibility.
- Add clear blocked states for missing Stripe Connect account, pending verification, held funds, minimum payout, and unavailable balance.
- Add Platform Admin and Super Admin payout request review table.
- Add actions for approve, reject, hold, release, cancel, and mark paid by calling Payment Service APIs.
- Keep all business rules in Payment Service responses. UI should render state and submit actions only.
- Use existing dashboard table, action menu, alert, badge, and form components where possible.

## Acceptance Criteria

- WHEN an Academy Admin has eligible available balance, THEN they can submit a payout request from the payout dashboard.
- WHEN an Academy Admin has no enabled payout account, THEN the UI shows the Payment Service reason and does not submit a request.
- WHEN a Platform Admin approves, rejects, holds, releases, or marks paid, THEN the UI updates from the Payment Service canonical state.
- WHEN a payout request is paid, THEN academy available balance decreases on refresh.
- WHEN an API call fails, THEN the UI displays a specific actionable error.

## Regression / Compatibility Tests

- Tina SHALL test academy, platform admin, and super admin dashboard navigation still works on desktop and mobile.
- Tina SHALL test existing payment overview, transactions, earnings, refunds, and settings views still render.
- Tina SHALL test payout request actions do not appear for unauthorized roles.
- Tina SHALL test that frontend code does not calculate payout eligibility independently.

## Out Of Scope

Payment Service backend implementation.
