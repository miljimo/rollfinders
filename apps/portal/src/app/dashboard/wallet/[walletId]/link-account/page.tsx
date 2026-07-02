import { ArrowLeft, CreditCard, Link2 } from "lucide-react";
import { redirect } from "next/navigation";

import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { getManagedUser } from "@/lib/users-service";
import { getWallet, listLinkedWalletAccounts, type LinkedWalletAccount, type WalletRecord } from "@/lib/wallet-service";
import { Button } from "@/components/Button";
import { TableStatusBadge } from "@/components/Table";
import { ProviderSelectionForm } from "./ProviderSelectionForm";

type LinkAccountParams = {
  walletId: string;
};

export default async function LinkExternalWalletAccountPage({
  params,
}: {
  params: Promise<LinkAccountParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=%2Fdashboard%2Fwallet");
  if (!isPlatformAdminRole(user.role) && !isAcademyAdminRole(user.role)) redirect("/dashboard");

  const { walletId } = await params;
  const wallet = await getWallet(walletId, user.accessToken, user.id);
  const linkedAccounts = wallet.walletType === "external"
    ? await listLinkedWalletAccounts(wallet.id, user.accessToken, user.id).catch(() => [])
    : [];
  const linkedAccount = linkedAccounts.find((account) => account.status !== "DISABLED");
  const ownerAccountName = await resolveWalletOwnerAccountName(wallet.ownerId, user);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button href="/dashboard/wallet" variant="secondary">
            <ArrowLeft size={18} aria-hidden />
            Wallets
          </Button>
          <Button href={`/dashboard/wallet?walletDialog=wallet-details&walletId=${encodeURIComponent(wallet.id)}`} variant="secondary">
            Wallet Details
          </Button>
        </div>

        <header>
          <h1 className="text-4xl font-black tracking-normal text-slate-950">Link External Wallet Account</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
            Choose which provider account should be linked to this external wallet.
          </p>
        </header>

        <WalletSummary wallet={wallet} linkedAccount={linkedAccount} ownerAccountName={ownerAccountName} />

        {wallet.walletType !== "external" ? (
          <Notice tone="warning" text="Only external wallets can be linked to provider accounts." />
        ) : linkedAccount?.provider === "STRIPE" && linkedAccount.status === "PENDING" ? (
          <StripePendingLinkPanel currency={wallet.currency} linkedAccount={linkedAccount} walletId={wallet.id} />
        ) : linkedAccount ? (
          <Notice tone="success" text="This external wallet already has a linked account." />
        ) : (
          <ProviderSelectionForm currency={wallet.currency} walletId={wallet.id} />
        )}
      </div>
    </main>
  );
}

function WalletSummary({ linkedAccount, ownerAccountName, wallet }: { linkedAccount?: LinkedWalletAccount; ownerAccountName: string; wallet: WalletRecord }) {
  const rows = [
    { label: "Wallet ID", value: wallet.id },
    { label: "Owner Account", value: ownerAccountName },
    { label: "Wallet Type", value: wallet.walletType },
    { label: "Currency", value: wallet.currency },
    { label: "Status", value: <TableStatusBadge status={wallet.status} /> },
    { label: "Linked Account", value: linkedAccount ? linkedAccount.displayName || linkedAccount.provider : "Not linked" },
  ];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Link2 size={22} aria-hidden />
        </span>
        <h2 className="text-xl font-black text-slate-950">Wallet Summary</h2>
      </div>
      <dl className="grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 border-b border-stone-100 pb-3 last:border-b-0 last:pb-0 md:grid-cols-[10rem_minmax(0,1fr)]">
            <dt className="text-sm font-black text-stone-600">{row.label}</dt>
            <dd className="break-all text-sm font-semibold text-slate-950">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StripePendingLinkPanel({ currency, linkedAccount, walletId }: { currency: WalletRecord["currency"]; linkedAccount: LinkedWalletAccount; walletId: string }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <h2 className="text-lg font-black text-amber-950">Stripe Connect onboarding is not complete</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
            Continue Stripe Connect to finish the provider requirements. The external wallet will remain inactive until Stripe verifies the account for charges and payouts.
          </p>
          <p className="mt-2 break-all text-xs font-semibold text-amber-800">
            Provider account: {linkedAccount.providerAccountId || linkedAccount.externalReference || "Not available"}
          </p>
        </div>
        <form action="/api/wallet/stripe-connect" method="get">
          <input type="hidden" name="walletId" value={walletId} />
          <input type="hidden" name="currency" value={currency} />
          <input type="hidden" name="provider" value="STRIPE" />
          <Button type="submit" variant="primary" className="min-h-12 px-5">
            <CreditCard size={18} aria-hidden />
            Continue Stripe Connect
          </Button>
        </form>
      </div>
    </section>
  );
}

async function resolveWalletOwnerAccountName(
  ownerId: string,
  currentUser: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
) {
  const owner = await getManagedUser(currentUser, ownerId)
    .then((result) => result.user)
    .catch(() => null);

  return owner?.name ?? owner?.email ?? (ownerId === currentUser.id ? currentUser.email : undefined) ?? ownerId;
}

function Notice({ text, tone }: { text: string; tone: "success" | "warning" }) {
  const className = tone === "success" ? "border-teal-200 bg-teal-50 text-teal-900" : "border-amber-200 bg-amber-50 text-amber-900";
  return <div className={`rounded-lg border px-4 py-4 text-sm font-bold ${className}`}>{text}</div>;
}
