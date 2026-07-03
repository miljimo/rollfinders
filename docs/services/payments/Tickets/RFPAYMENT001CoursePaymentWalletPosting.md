# Name: RFPAYMENT001 - Course Payment Wallet Posting

## Feature

- Feature: Course payment wallet ledger posting
- Priority: P0
- Source PRD: `docs/services/payments/proposal.md`
- Related PRD: `docs/services/wallet/proposal.md`

## Goal

When a course payment succeeds, RollFinders must show the financial movement in Wallet so academy owners can see course payment transactions and platform fees even when Stripe settles funds directly to the connected account.

## Scope

The implementation must:

- Include academy owner wallet metadata when creating course checkout records.
- On successful provider callback, mark the booking payment received.
- On successful provider callback, post idempotent wallet ledger effects.
- Credit the academy owner receiving wallet with a `BOOKING_PAYMENT` transaction.
- Debit the academy owner receiving wallet and credit the platform revenue wallet with a `COMMISSION` transaction when Pricing Policy returns a positive platform fee.
- Use Pricing Policy Service to calculate provider-specific platform fees.
- Use Wallet Service for all wallet and ledger changes.
- Preserve Payment Service as the source of truth for provider payment records.

The implementation must not:

- Store wallet balances in Payment Service.
- Call Wallet Service from Payment Service.
- Call Payment Service from Wallet Service.
- Duplicate provider account details in wallet transactions.
- Create non-idempotent callback side effects.

## Acceptance Criteria

- WHEN a Stripe course checkout succeeds, THEN the booking is marked payment received.
- WHEN a Stripe course checkout succeeds, THEN one `BOOKING_PAYMENT` wallet transaction is recorded for the academy owner receiving wallet.
- WHEN the active Pricing Policy has a platform fee, THEN one `COMMISSION` wallet transaction is recorded for that payment.
- WHEN the callback is replayed, THEN no duplicate wallet ledger entries are created.
- WHEN the academy owner has an active external wallet, THEN it is used before an internal wallet.
- WHEN the academy owner has no active wallet, THEN an internal receiving wallet is created.

## Follow-Up Ticket: Internal Wallet Course Payment Option

Logged-in practitioners must be able to pay for a course with an internal wallet when they have an active wallet with sufficient available funds.

Acceptance criteria:

- Show payment method options for logged-in practitioners.
- Keep provider checkout as the guest/default option.
- Enable internal-wallet payment only when the payer has an eligible active internal wallet and enough available balance.
- Create a Payment Service payment record for the internal-wallet payment fact.
- Debit the payer wallet, credit the academy owner receiving wallet, post platform commission, link payment to booking, and mark the booking paid.
- Show a clear disabled reason when internal-wallet payment cannot be used.
