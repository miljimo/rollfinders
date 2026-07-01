import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

test("wallet service client uses API gateway wallet endpoints", () => {
  const source = readSource("apps/portal/src/lib/wallet-service.ts");

  assert.match(source, /server-only/);
  assert.match(source, /apiGatewayUrl/);
  assert.match(source, /\/v1\/wallets\?\$\{params\.toString\(\)\}/);
  assert.match(source, /\/v1\/wallets\/\$\{encodeURIComponent\(walletId\)\}\/balance/);
  assert.match(source, /\/v1\/wallets\/\$\{encodeURIComponent\(walletId\)\}\/transactions/);
  assert.match(source, /\/v1\/wallets\/\$\{encodeURIComponent\(walletId\)\}\/linked-accounts/);
  assert.match(source, /type LinkedWalletAccount/);
  assert.match(source, /\/v1\/wallets`, \{[\s\S]*method:\s*"POST"/);
  assert.match(source, /wallet_type:\s*input\.walletType/);
  assert.doesNotMatch(source, /owner_type:\s*input\.ownerType/);
  assert.match(source, /Authorization/);
});

test("wallet dashboard route renders through the app dashboard shell", () => {
  const page = readSource("apps/portal/src/app/dashboard/wallet/page.tsx");
  const dashboard = readSource("apps/portal/src/app/dashboard/AdminDashboardWorkspace.tsx");

  assert.match(page, /AdminDashboardWorkspace/);
  assert.match(page, /panel:\s*"wallet"/);
  assert.match(dashboard, /selectedPanel[\s\S]*value === "wallet"/);
  assert.match(dashboard, /href:\s*"\/dashboard\/wallet"[\s\S]*label:\s*"Wallet"/);
  assert.match(dashboard, /panel === "wallet"[\s\S]*\? getDashboardWallets/);
  assert.match(dashboard, /getWalletBalance/);
  assert.match(dashboard, /<WalletDashboard error=\{walletResult\.error\}/);
  assert.match(dashboard, /linkedAccounts=\{walletResult\.linkedAccounts\}/);
  assert.match(dashboard, /transactions=\{walletResult\.transactions\}/);
  assert.match(dashboard, /view=\{walletView\}/);
  assert.match(dashboard, /title=\{walletView === "transactions" \? "Transactions" : "Wallets"\}/);
  assert.match(dashboard, /walletDialog === "create-transaction"/);
  assert.match(dashboard, /authorize\(currentUser,\s*"wallet\.transfer"/);
  assert.match(dashboard, /<WalletTransferDialog balances=\{walletResult\.balances\} canCreateTransfer=\{canCreateWalletTransfer\} wallets=\{walletResult\.wallets\}/);
  assert.match(dashboard, /WalletTransfer/);
  assert.match(dashboard, /Wallet Transfer/);
  assert.match(dashboard, /wallet\.transfer privilege/);
  const form = readSource("apps/portal/src/app/dashboard/wallet/WalletTransfer.tsx");
  assert.match(form, /export function WalletTransfer/);
  assert.match(form, /AutoCompleteTextField/);
  assert.match(form, /destinationWalletOptions[\s\S]*option\.id !== sourceWalletId/);
  assert.match(form, /SourceWalletBalance/);
  assert.match(form, /Source wallet balance/);
  assert.doesNotMatch(form, /name="transactionType"/);
  assert.doesNotMatch(form, /Manual debit/);
  assert.match(form, /name="sourceWalletId"/);
  assert.match(form, /name="destinationWalletId"/);
  assert.match(form, /wallet-transfer-disabled-reason/);
  assert.match(form, /dashboard submit action is not connected to the wallet transfer API/);
  assert.match(form, /name="amount"[\s\S]*Create Transfer/);
});

test("wallet transfer permission is used for authorisation", () => {
  const authorisation = readSource("apps/portal/src/lib/authorisation-service.ts");

  assert.match(authorisation, /permission\.startsWith\("wallet\."\)/);
});

test("wallet dashboard side panel exposes transaction command only", () => {
  const dashboard = readSource("apps/portal/src/app/dashboard/AdminDashboardWorkspace.tsx");
  const walletDashboard = readSource("apps/portal/src/app/dashboard/wallet/WalletDashboard.tsx");

  assert.match(dashboard, /const walletNavigationSections = \[/);
  assert.match(dashboard, /href:\s*"\/dashboard\/wallet", icon:\s*"dashboard", label:\s*"Dashboard"/);
  assert.match(dashboard, /href:\s*"\/dashboard\/wallet\?walletView=transactions", icon:\s*"transactions", label:\s*"Transactions"/);
  assert.match(dashboard, /href === "\/dashboard\/wallet"[\s\S]*children: walletNavigationSections/);
  assert.doesNotMatch(dashboard, /href:\s*"\/dashboard\/wallet\?walletView=wallets", icon:\s*"wallet", label:\s*"Wallets"/);
  assert.doesNotMatch(dashboard, /href:\s*"\/dashboard\/wallet\?walletView=transfers", icon:\s*"transfers", label:\s*"Transfers"/);
  assert.doesNotMatch(dashboard, /href:\s*"\/dashboard\/wallet\?walletView=approvals", icon:\s*"approvals", label:\s*"Approvals"/);
  assert.doesNotMatch(dashboard, /href:\s*"\/dashboard\/wallet\?walletView=payouts", icon:\s*"payouts", label:\s*"Payouts"/);
  assert.doesNotMatch(dashboard, /href:\s*"\/dashboard\/wallet\?walletView=reserves", icon:\s*"reserves", label:\s*"Reserves"/);
  assert.doesNotMatch(dashboard, /href:\s*"\/dashboard\/wallet\?walletView=settings", icon:\s*"settings", label:\s*"Settings"/);
  assert.doesNotMatch(walletDashboard, /function WalletSidebar/);
  assert.doesNotMatch(walletDashboard, /Wallet dashboard sections/);
});

test("wallet dashboard shows wallets and transaction panel without aggregate balance cards or extra action UI", () => {
  const source = readSource("apps/portal/src/app/dashboard/wallet/WalletDashboard.tsx");

  assert.doesNotMatch(source, /icon:\s*Icon/);
  assert.doesNotMatch(source, /Funds available to use/);
  assert.doesNotMatch(source, /Funds reserved for holds/);
  assert.doesNotMatch(source, /Total ledger balance/);
  assert.doesNotMatch(source, /function WalletMetric/);
  assert.match(source, /LinkedAccountSummary/);
  assert.match(source, /ProviderAccount/);
  assert.match(source, /title: "Linked Account"/);
  assert.match(source, /title: "Provider Account"/);
  assert.doesNotMatch(source, /title: "Available Balance"/);
  assert.doesNotMatch(source, /title: "Reserved Balance"/);
  assert.doesNotMatch(source, /title: "Ledger Balance"/);
  assert.match(source, /<Table/);
  assert.match(source, /title="Wallets"/);
  assert.match(source, /WalletTransactionsDashboard/);
  assert.match(source, /<h2 className="text-2xl font-black text-stone-950">Transactions<\/h2>/);
  assert.match(source, /href="\/dashboard\/wallet\?walletView=transactions&walletDialog=create-transaction"/);
  assert.match(source, /Create/);
  assert.match(source, /const transactionPageSize = 5/);
  assert.match(source, /transactionPageHref/);
  assert.match(source, /transactionPage/);
  assert.match(source, /transactions\.slice\(start, start \+ transactionPageSize\)/);
  assert.match(source, /pagination=\{\{/);
  assert.doesNotMatch(source, /Create Wallet/);
  assert.doesNotMatch(source, /DialogShell/);
  assert.doesNotMatch(source, /ActionMenu/);
  assert.doesNotMatch(source, /Search wallets/);
  assert.doesNotMatch(source, /walletSearch/);
});
