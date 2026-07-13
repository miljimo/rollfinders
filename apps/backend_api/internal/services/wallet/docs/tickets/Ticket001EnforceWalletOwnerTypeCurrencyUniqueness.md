# Name: 001 - Enforce One Wallet Per Owner Type And Currency

## Feature / Component

- Feature: Wallet Management
- Component: Wallet Service, database constraints, API validation, dashboard feedback
- Priority: P0
- Branch: `feature/wallet-owner-type-currency-uniqueness`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: None
- Source PRD: `apps/backend_api/internal/services/wallet/docs/prds/proposal.md`

## Goal

Prevent duplicate wallets for the same owner, wallet type, and currency while still allowing the same owner to have different wallet types or currencies.

## Scope

The develop must:
- Add a Wallet Service uniqueness rule for `owner_type`, `owner_id`, `wallet_type`, and `currency`.
- Add or update the database migration/index so duplicate active records cannot be inserted concurrently.
- Update wallet creation logic to return a clear conflict error when a duplicate wallet already exists.
- Update portal wallet creation feedback so admins understand why the wallet was not created.
- Add tests covering API/service/database duplicate prevention.

The agent must not:
- Prevent different wallet types with the same currency for the same owner, for example one `INTERNAL GBP` and one `EXTERNAL GBP`.
- Prevent the same wallet type and currency for different owners.
- Change wallet ledger, transaction, reservation, payout, or transfer semantics.

## Implementation Notes

- The uniqueness key is: `owner_type + owner_id + wallet_type + currency`.
- The rule applies per owner. A user, academy, or platform can each have their own wallet with the same wallet type and currency.
- If historical duplicate rows exist, add a safe migration strategy before creating the unique index. Do not delete ledger-bearing wallets automatically.
- If the service supports wallet statuses, decide whether inactive wallets count. Default expectation: active wallets must be unique, and reactivation must also respect the uniqueness rule.
- The API should use a stable error code such as `wallet_duplicate_owner_type_currency`.

## Acceptance Criteria

- WHEN an owner already has an active `EXTERNAL GBP` wallet, THEN creating another active `EXTERNAL GBP` wallet for that owner fails with a conflict.
- WHEN an owner already has an active `EXTERNAL GBP` wallet, THEN creating an `INTERNAL GBP` wallet for that same owner is allowed.
- WHEN an owner already has an active `EXTERNAL GBP` wallet, THEN another owner can create their own active `EXTERNAL GBP` wallet.
- WHEN a duplicate is rejected, THEN the portal shows a clear message explaining that this owner already has that wallet type and currency.
- WHEN two duplicate create requests race, THEN the database constraint prevents duplicate records.

## Regression / Compatibility Tests

- Confirm wallet listing still shows existing wallets.
- Confirm transfers, reservations, adjustments, and ledger transactions still work for existing wallets.
- Confirm wallet creation still supports the currently allowed wallet currencies.
- Confirm existing duplicate historical data does not break migrations without an explicit remediation path.

## Out Of Scope

- Merging duplicate existing wallets.
- Moving balances or ledger entries between wallets.
- Changing wallet transaction types.
- Introducing new wallet currencies or wallet types.
