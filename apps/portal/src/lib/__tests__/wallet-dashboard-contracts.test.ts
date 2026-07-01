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
  assert.match(dashboard, /<WalletDashboard balances=\{walletResult\.balances\}/);
  assert.match(dashboard, /transactions=\{walletResult\.transactions\}/);
  assert.doesNotMatch(dashboard, /view=\{walletView\}/);
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

test("wallet dashboard shows balances, wallets, and transaction panel without extra action UI", () => {
  const source = readSource("apps/portal/src/app/dashboard/wallet/WalletDashboard.tsx");

  assert.match(source, /Available Balance/);
  assert.match(source, /Reserved Balance/);
  assert.match(source, /Ledger Balance/);
  assert.match(source, /<Table/);
  assert.match(source, /title="Wallets"/);
  assert.match(source, /WalletTransactionsDashboard/);
  assert.match(source, /title="Transactions"/);
  assert.match(source, /pagination=\{\{/);
  assert.doesNotMatch(source, /Create Wallet/);
  assert.doesNotMatch(source, /DialogShell/);
  assert.doesNotMatch(source, /ActionMenu/);
  assert.doesNotMatch(source, /Search wallets/);
  assert.doesNotMatch(source, /walletSearch/);
});
