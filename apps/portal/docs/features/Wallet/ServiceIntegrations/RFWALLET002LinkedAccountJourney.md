# RF-WALLET-002 - Implement External Wallet Linked Account Journey

## Feature / Component

- Feature: Wallet Service
- Component: External wallet linked account onboarding
- Priority: P0
- Branch: `master`
- Developer owner: Full-stack Developer
- Test owner: QA Engineer
- Dependencies: Wallet dashboard shell, Wallet linked account APIs, Payment Stripe Connect APIs
- Source PRD: `apps/backend_api/internal/services/wallet/docs/prds/proposal.md`

## Goal

Create a wallet-first linked account journey so an unlinked external wallet can choose a provider account and start Stripe Connect onboarding from `/dashboard/wallet/{walletId}/link-account`.

## Scope

The agent must:
- Add a dedicated link-account page for external wallets at `/dashboard/wallet/{walletId}/link-account`.
- Change wallet dashboard and wallet details `Link Account` actions to navigate to that page instead of redirecting directly to Stripe.
- Show wallet summary, current linked account state, and provider choices on the link-account page.
- Enable Stripe Connect as the first provider option and keep Bank, Card, and PayPal unavailable until their journeys are defined.
- Start Stripe Connect through a wallet-owned portal API route and return users to wallet details after refresh/completion.
- Persist Stripe Connect provider details in Wallet linked account records.
- Keep external wallets inactive until a connected linked account exists.

The agent must not:
- Move payment transaction ownership into Wallet.
- Make Wallet call Stripe or any external provider directly.
- Implement Bank, Card, or PayPal onboarding.
- Create a second dashboard layout.

## Implementation Notes

- Reuse the existing dashboard route and component patterns.
- Use the portal/API layer to orchestrate Stripe Connect and Wallet linked account writes.
- Wallet service owns the linked account record and wallet activation state.
- Payment service can continue to own Stripe Connect provider calls during this transition.
- Linked account creation must be retry-safe so refresh/retry actions do not create duplicate active provider records for the same wallet/provider.

## Acceptance Criteria

- WHEN an external wallet has no linked account, THEN Wallet Details and wallet table actions show `Link Account`.
- WHEN `Link Account` is selected, THEN the user navigates to `/dashboard/wallet/{walletId}/link-account`.
- WHEN the link-account page loads, THEN it shows wallet summary and provider choices.
- WHEN Stripe Connect is selected, THEN the wallet Stripe Connect API starts onboarding and records a Wallet linked account.
- WHEN Stripe Connect refresh/completion returns, THEN the user is redirected to Wallet Details for the selected wallet.
- WHEN a connected linked account is recorded, THEN the external wallet becomes active.
- WHEN an internal wallet opens the link-account page, THEN provider linking is blocked with an explanatory message.

## Regression / Compatibility Tests

- Confirm Wallet dashboard still renders through the existing App Dashboard shell.
- Confirm Wallet Details dialog still works.
- Confirm Wallet transaction dashboard still works.
- Confirm payment Stripe Connect APIs remain callable.
- Confirm TypeScript compilation passes.
- Confirm Wallet service tests pass.

## Out Of Scope

- Full Payment Settings UI cutover to wallet-linked accounts.
- Stripe webhook ingestion.
- Bank, Card, and PayPal provider onboarding.
- Provider disconnect/reconnect lifecycle.
