# RF-WALLET-001 - Implement Wallet Transaction Dashboard

## Feature / Component

- Feature: Wallet Service
- Component: Wallet transaction dashboard
- Priority: P0
- Branch: `master`
- Developer owner: Full-stack Developer
- Test owner: QA Engineer
- Dependencies: Wallet dashboard shell and Wallet Service transaction APIs
- Source PRD: `apps/backend_api/internal/services/wallet/docs/prds/proposal.md`

## Task

Implement the Wallet > Transactions dashboard view so selecting the Transactions menu item shows a transaction summary, filters, and transaction table in the main dashboard content area.

## Implementation Notes

- Reuse the existing dashboard shell and wallet sidebar navigation.
- Fetch wallet transactions through the API gateway wallet endpoints.
- Keep the UI data-driven from wallet service responses.
- Show summary cards for total credits, total debits, net movement, and total transactions.
- Show filters for search, date range, wallet, type, and status.
- Show a transaction table with date, description, type, wallet, amount, status, reference, and action columns.
- Preserve the existing wallet overview/create-wallet view when `walletView` is not `transactions`.

## Acceptance Criteria

- WHEN a user clicks Wallet > Transactions, THEN `/dashboard/wallet?walletView=transactions` renders the transaction dashboard UI.
- WHEN transactions are available, THEN the dashboard shows summary cards and a table of transaction rows.
- WHEN no transactions are available, THEN the dashboard shows the transaction shell with an empty table state.
- WHEN a transaction is credit-like, THEN it is styled as a credit and contributes to total credits.
- WHEN a transaction is debit-like, THEN it is styled as a debit and contributes to total debits.
- WHEN wallet service calls fail, THEN the wallet dashboard shows an actionable warning state.

## Regression / Compatibility Tests

- Existing wallet dashboard route still renders through the admin dashboard shell.
- Existing wallet create form and wallet table still render for the default wallet dashboard view.
- Wallet sidebar still excludes the removed Wallets child menu item.
- TypeScript compilation passes.

## Out Of Scope

- Backend transaction API changes.
- Transaction detail drawer implementation.
- Export and filter submit behavior beyond rendering the requested UI controls.
