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
  assert.match(source, /\/v1\/transfers\?\$\{params\.toString\(\)\}/);
  assert.match(source, /\/v1\/wallets\/\$\{encodeURIComponent\(walletId\)\}\/linked-accounts/);
  assert.match(source, /type LinkedWalletAccount/);
  assert.match(source, /\/v1\/wallets`, \{[\s\S]*method:\s*"POST"/);
  assert.match(source, /\/v1\/transfers`, \{[\s\S]*method:\s*"POST"/);
  assert.match(source, /"Idempotency-Key":\s*input\.idempotencyKey/);
  assert.match(source, /wallet_type:\s*input\.walletType/);
  assert.doesNotMatch(source, /owner_type:\s*input\.ownerType/);
  assert.match(source, /Authorization/);
  assert.match(source, /X-Actor-User-ID/);
  assert.match(source, /actorUserId\?: string/);
});

test("wallet dashboard route renders through the app dashboard shell", () => {
  const page = readSource("apps/portal/src/app/dashboard/wallet/page.tsx");
  const dashboard = readSource("apps/portal/src/app/dashboard/AdminDashboardWorkspace.tsx");

  assert.match(page, /AdminDashboardWorkspace/);
  assert.match(page, /panel:\s*"wallet"/);
  assert.match(dashboard, /selectedPanel[\s\S]*value === "wallet"/);
  assert.match(dashboard, /href:\s*"\/dashboard\/wallet"[\s\S]*label:\s*"Wallet"/);
  assert.match(dashboard, /panel === "wallet"[\s\S]*\? getDashboardWallets/);
  assert.match(dashboard, /getDashboardWallets\(walletPage, currentUser\.id, currentUser\.accessToken\)/);
  assert.match(dashboard, /listWalletsPage\(\{ accessToken, actorUserId/);
  assert.match(dashboard, /getWalletBalance/);
  assert.match(dashboard, /<WalletDashboard balances=\{walletResult\.balances\} error=\{walletActionError \?\? walletResult\.error\}/);
  assert.match(dashboard, /linkedAccounts=\{walletResult\.linkedAccounts\}/);
  assert.match(dashboard, /transactions=\{walletResult\.transactions\}/);
  assert.match(dashboard, /view=\{walletView\}/);
  assert.match(dashboard, /title=\{walletView === "transactions" \? "Transactions" : "Wallets"\}/);
  assert.match(dashboard, /walletDialog === "create-transaction"/);
  assert.match(dashboard, /walletDialog === "transaction-details"/);
  assert.match(dashboard, /walletDialog === "wallet-details"/);
  assert.match(dashboard, /walletDialog === "select-wallet-owner"/);
  assert.match(dashboard, /getManagedUser\(currentUser, currentUser\.id\)/);
  assert.match(dashboard, /currentUserWalletOwner/);
  assert.match(dashboard, /<CreateWalletDialog currentUser=\{currentUserWalletOwner\} params=\{params\} users=\{managedUsersPage\.users\}/);
  assert.match(dashboard, /<WalletOwnerPickerDialog currentUser=\{currentUserWalletOwner\} params=\{params\} users=\{managedUsersPage\.users\}/);
  assert.match(dashboard, /function selectedWalletOwnerId/);
  assert.match(dashboard, /return currentUserId/);
  assert.match(dashboard, /walletOwnerPickerHref/);
  assert.match(dashboard, /Choose a user you have permission to manage as the wallet owner/);
  assert.match(dashboard, /selectedWallet\(walletResult\.wallets, params\)/);
  assert.match(dashboard, /selectedWalletLinkedAccount/);
  assert.match(dashboard, /<WalletDetailsDialog closeHref=\{walletDetailsCloseHref\(params\)\} linkedAccount=\{selectedWalletLinkedAccount\} wallet=\{selectedWalletForDialog\}/);
  assert.match(dashboard, /title="Wallet Details"/);
  assert.match(dashboard, /Link Account/);
  assert.match(dashboard, /\/dashboard\/wallet\/\$\{encodeURIComponent\(wallet\.id\)\}\/link-account/);
  const linkAccountPage = readSource("apps/portal/src/app/dashboard/wallet/[walletId]/link-account/page.tsx");
  assert.match(linkAccountPage, /Link External Wallet Account/);
  assert.match(linkAccountPage, /ProviderSelectionForm/);
  const providerSelectionForm = readSource("apps/portal/src/app/dashboard/wallet/[walletId]/link-account/ProviderSelectionForm.tsx");
  assert.match(providerSelectionForm, /AutoCompleteTextField/);
  assert.match(providerSelectionForm, /Stripe Connect/);
  assert.match(providerSelectionForm, /Bank Account/);
  assert.match(providerSelectionForm, /\/api\/wallet\/stripe-connect/);
  assert.match(providerSelectionForm, /id:\s*"STRIPE"/);
  assert.match(providerSelectionForm, /id:\s*"BANK"/);
  assert.match(providerSelectionForm, /id:\s*"CARD"/);
  assert.match(providerSelectionForm, /id:\s*"PAYPAL"/);
  assert.match(providerSelectionForm, /disabled=\{!canContinue\}/);
  assert.match(providerSelectionForm, /provider === "STRIPE"/);
  const walletStripeConnectRoute = readSource("apps/portal/src/app/api/wallet/stripe-connect/route.ts");
  assert.match(walletStripeConnectRoute, /\/api\/wallet\/stripe-connect\/refresh/);
  assert.match(walletStripeConnectRoute, /createLinkedWalletAccount/);
  assert.match(walletStripeConnectRoute, /provider !== "STRIPE"/);
  const walletStripeRefreshRoute = readSource("apps/portal/src/app/api/wallet/stripe-connect/refresh/route.ts");
  assert.match(walletStripeRefreshRoute, /refreshStripePaymentAccountSetting/);
  assert.match(walletStripeRefreshRoute, /createLinkedWalletAccount/);
  assert.match(walletStripeRefreshRoute, /walletDialog:\s*"wallet-details"/);
  assert.match(dashboard, /selectedWalletTransaction\(walletResult\.transactions, params\)/);
  assert.match(dashboard, /<WalletTransactionDetailsDialog closeHref=\{transactionDetailsCloseHref\(params\)\} transaction=\{selectedWalletTransactionForDialog\}/);
  assert.match(dashboard, /title="Transaction Details"/);
  assert.match(dashboard, /authorize\(currentUser,\s*"wallet\.transfer"/);
  assert.match(dashboard, /<WalletTransferDialog balances=\{walletResult\.balances\} canCreateTransfer=\{canCreateWalletTransfer\} wallets=\{walletResult\.wallets\}/);
  assert.match(dashboard, /createDashboardWalletTransfer/);
  assert.match(dashboard, /walletActionError \?\? walletResult\.error/);
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
  assert.match(form, /action=\{action\}/);
  assert.match(form, /type="hidden" name="currency"/);
  assert.doesNotMatch(form, /wallet-transfer-disabled-reason/);
  assert.doesNotMatch(form, /dashboard submit action is not connected to the wallet transfer API/);
  assert.match(form, /name="amount"[\s\S]*Create Transfer/);
  const actions = readSource("apps/portal/src/app/dashboard/wallet/actions.ts");
  assert.match(actions, /actorUserId: user\.id/);
  assert.match(actions, /export async function createDashboardWalletTransfer/);
  assert.match(actions, /authorize\(user,\s*"wallet\.transfer"/);
  assert.match(actions, /createWalletTransfer/);
  assert.match(actions, /parseTransferAmount/);
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
  assert.doesNotMatch(source, /LinkedAccountSummary/);
  assert.doesNotMatch(source, /ProviderAccount/);
  assert.doesNotMatch(source, /title: "Linked Account"/);
  assert.doesNotMatch(source, /title: "Provider Account"/);
  assert.match(source, /title: "Total Balance"/);
  assert.match(source, /formatWalletBalance/);
  assert.doesNotMatch(source, /title: "Available Balance"/);
  assert.doesNotMatch(source, /title: "Reserved Balance"/);
  assert.doesNotMatch(source, /title: "Ledger Balance"/);
  assert.match(source, /<Table/);
  assert.match(source, /<h2 className="text-2xl font-black text-stone-950">Wallets<\/h2>/);
  assert.match(source, /WalletTransactionsDashboard/);
  assert.match(source, /<h2 className="text-2xl font-black text-stone-950">Transactions<\/h2>/);
  assert.match(source, /href="\/dashboard\/wallet\?walletView=transactions&walletDialog=create-transaction"/);
  assert.match(source, /Create/);
  assert.match(source, /title: "Actions"/);
  assert.match(source, /TransactionActionMenu/);
  assert.match(source, /trigger=\{<span className="text-xl font-black leading-none" aria-hidden>\.\.\.<\/span>\}/);
  assert.match(source, /Cancel Transaction/);
  assert.match(source, /Cancel Transaction unavailable/);
  assert.match(source, /getRowHref=\{\(row\) => transactionDetailsHref\(searchParams, row\.id\)\}/);
  assert.match(source, /walletDialog", "transaction-details"/);
  assert.match(source, /walletTransactionId/);
  assert.match(source, /const transactionPageSize = 5/);
  assert.match(source, /transactionPageHref/);
  assert.match(source, /transactionPage/);
  assert.match(source, /transactions\.slice\(start, start \+ transactionPageSize\)/);
  assert.match(source, /pagination=\{\{/);
  assert.match(source, /href="\/dashboard\/wallet\?walletDialog=create-wallet"/);
  assert.match(source, /Create Wallet/);
  assert.match(source, /WalletActionMenu/);
  assert.match(source, /getRowDoubleClickHref=\{\(row\) => walletDetailsHref\(searchParams, row\.id\)\}/);
  assert.match(source, /function walletDetailsHref/);
  assert.match(source, /walletDialog=wallet-details&walletId=/);
  assert.match(source, /View Wallet Details/);
  assert.match(source, /selectedWallet\(wallets: WalletRecord\[\], searchParams: WalletDashboardSearchParams\)/);
  assert.match(source, /walletDetailsCloseHref/);
  assert.doesNotMatch(source, /DialogShell/);
  assert.doesNotMatch(source, /Search wallets/);
  assert.doesNotMatch(source, /name="walletSearch"/);
});

test("table rows navigate on click while preserving action controls", () => {
  const source = readSource("apps/portal/src/components/Table/TableRow.tsx");

  assert.match(source, /onClick=\{navigate\}/);
  assert.match(source, /isInteractiveElement\(event\.target\)/);
  assert.match(source, /Click to view details/);
});
