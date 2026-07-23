"use client";

import { CreditCard } from "lucide-react";

import { Button } from "@/app/_components/Button";
import type { WalletCurrency } from "@/lib/wallet-service";

export function ProviderSelectionForm({
  currency,
  walletId,
}: {
  currency: WalletCurrency;
  walletId: string;
}) {
  return (
    <form
      action="/api/wallet/stripe-connect"
      method="get"
      className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="walletId" value={walletId} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="provider" value="STRIPE" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex items-start gap-4 rounded-lg border border-teal-100 bg-teal-50 p-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700">
            <CreditCard size={22} aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Stripe Connect
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              External wallet accounts currently support Stripe only. Continue
              to Stripe Connect to complete account onboarding for charges and
              payouts.
            </p>
          </div>
        </div>
        <Button type="submit" variant="primary" className="min-h-14 px-5">
          <CreditCard size={18} aria-hidden />
          Continue Stripe Connect
        </Button>
      </div>
    </form>
  );
}
