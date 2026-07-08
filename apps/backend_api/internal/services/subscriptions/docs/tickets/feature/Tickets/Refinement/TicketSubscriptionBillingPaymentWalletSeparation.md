# Name: SUBSCRIPTIONS-BILLING-001 - Separate billing events, payment transactions, and wallet ledger transactions

## Feature / Component

- Feature: Subscription billing and payment visibility
- Component: Subscription Service, Payment Service, Wallet Service, App Dashboard
- Priority: P1
- Branch: `feature/subscription-billing-payment-wallet-separation`
- Developer owner: AI agent
- Test owner: AI agent
- Dependencies: Existing Subscription, Payment, and Wallet service APIs
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Goal

Ensure Billing Events describe subscription billing lifecycle, Payment Transactions describe actual payment attempts/results, and Wallet Transactions describe wallet ledger movements only.

## Scope

The agent must:
- Make Billing Events show a human-readable summary of what is being billed, the amount, billing period, payment mode, and whether the bill is paid or pending.
- Ensure subscription card and wallet payments are visible as Payment Transactions when payment has actually occurred.
- Ensure Wallet Transactions show only real wallet ledger movements, with wording that makes this boundary clear.
- Link Billing Events, Payment Transactions, and Wallet Transactions with available references such as subscription ID, plan change ID, payment ID, provider reference, and wallet reference.
- Preserve Payment Service as the external provider interface and Wallet Service as the wallet ledger owner.

The agent must not:
- Treat Billing Events as successful payment transactions.
- Create wallet ledger records for card payments unless wallet balance is actually affected.
- Make Wallet Service call Stripe or parse Stripe provider objects.
- Store wallet balances in Payment Service or Subscription Service.

## Implementation Notes

- Billing Events are subscription lifecycle/audit records. They may be pending, paid, failed, cancelled, or applied.
- Payment Transactions are actual money movement attempts/results recorded by Payment Service.
- Wallet Transactions are internal wallet ledger movements recorded by Wallet Service.
- Stripe checkout creation must create a pending Billing Event, not a successful payment.
- Stripe success/webhook handling must record a Payment Transaction and update the linked Billing Event.
- Wallet payment handling must record both a Payment Transaction and a Wallet Transaction debit.
- Existing dashboards must use the current App Dashboard layout and table components.

## Acceptance Criteria

- WHEN subscription checkout starts, THEN one pending Billing Event shows the selected plan/modules, billing period, payment mode, amount, and unpaid status.
- WHEN Stripe confirms a subscription card payment, THEN one Payment Transaction is visible with subscription description, amount, method, provider, status, and provider reference.
- WHEN Stripe confirms a subscription card payment, THEN the linked Billing Event shows paid/applied status and references the payment transaction.
- WHEN wallet balance pays a subscription, THEN Payment Transactions show the wallet payment and Wallet Transactions show the ledger debit.
- WHEN card pays a subscription, THEN Wallet Transactions do not show a wallet debit unless wallet ledger was actually affected.
- WHEN course payments credit academy wallets, THEN Payment Transactions show the payment and Wallet Transactions show the academy wallet credit.
- WHEN repeated checkout attempts exist, THEN Billing Events do not present them as duplicate paid billings.
- WHEN academy admins view dashboards, THEN they see scoped billing/payment/wallet records only.
- WHEN super admins view dashboards, THEN they can see platform-wide billing/payment/wallet records according to permissions.

## Regression / Compatibility Tests

- Confirm existing course payment transactions still appear in Payment Transactions.
- Confirm existing wallet transaction listing still works.
- Confirm subscription checkout still creates pending billing events.
- Confirm subscription marketplace and checkout screens still typecheck.
- Confirm no service imports another service internal package.

## Out Of Scope

- Changing Stripe account configuration.
- Rebuilding wallet ledger architecture.
- Migrating old production data.
- Adding a new dashboard layout.
