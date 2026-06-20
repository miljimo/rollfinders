# 042 - Integrate RollFinders With Generic Payment Service Model

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: RollFinders server integration
- Priority: P0
- Branch: `feature/rollfinders-generic-payment-integration`
- Developer owner: RollFinders Full Stack Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket037PaymentAllocationCreateFlow, Ticket038StripeConnectProviderAdapter
- Source PRD: `services/payments/docs/PaymentService.md`

## Task

Update RollFinders server-side payment integration to use generic Payment Service concepts for academy-owned payments without leaking RollFinders domain concepts into the Payment Service.

## Implementation Notes

- Map academy to `payee`.
- Map academy Stripe account to `payee_account`.
- Map course occurrence to `resource_type: "course_occurrence"`.
- Map event to `resource_type: "event"`.
- Map membership to `resource_type: "membership"` when needed.
- Send platform commission policy or explicit commission allocation.
- For academy-owned course/event payments, request connected payee settlement only when the academy payee account is enabled.
- Keep existing platform-settled payment flows working.

## Acceptance Criteria

- WHEN an academy has an enabled connected account, THEN paid course/event checkout can request connected payee settlement.
- WHEN an academy has no enabled connected account, THEN checkout is hidden, blocked, or falls back according to product policy.
- WHEN payment succeeds, THEN RollFinders can still display payment history from the Payment Service.
- WHEN payment is refunded, THEN RollFinders sees refund status through Payment Service APIs.

## Regression / Compatibility Tests

- Tina SHALL test existing RollFinders checkout from UI and API.
- Tina SHALL test payment dashboard records for platform-settled and connected-payee-settled payments.
- Tina SHALL verify unverified/unclaimed academy checkout remains hidden or blocked.

## Out Of Scope

New dashboard visual redesign.
