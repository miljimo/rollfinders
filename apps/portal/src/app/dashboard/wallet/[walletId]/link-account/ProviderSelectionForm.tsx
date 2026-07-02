"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import { Button } from "@/components/Button";
import type { WalletCurrency } from "@/lib/wallet-service";

const providerOptions: AutoCompleteTextFieldOption[] = [
  {
    id: "STRIPE",
    label: "Stripe Connect",
    description: "Available",
    meta: "Stripe external account onboarding payouts",
  },
  {
    id: "BANK",
    label: "Bank Account",
    description: "Coming soon",
    meta: "Bank account provider",
  },
  {
    id: "CARD",
    label: "Card",
    description: "Coming soon",
    meta: "Card account provider",
  },
  {
    id: "PAYPAL",
    label: "PayPal",
    description: "Coming soon",
    meta: "PayPal account provider",
  },
];

export function ProviderSelectionForm({ currency, walletId }: { currency: WalletCurrency; walletId: string }) {
  const [provider, setProvider] = useState("");
  const canContinue = provider === "STRIPE";
  const disabledReason = providerDisabledReason(provider);

  return (
    <form action="/api/wallet/stripe-connect" method="get" className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="walletId" value={walletId} />
      <input type="hidden" name="currency" value={currency} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <AutoCompleteTextField
          emptyMessage="No account providers found."
          label="Account provider"
          name="provider"
          onSelectedIdChange={setProvider}
          options={providerOptions}
          placeholder="Search Stripe Connect, Bank Account, Card, or PayPal"
          selectedId={provider}
          size="lg"
        />
        <Button disabled={!canContinue} type="submit" variant="primary" className="min-h-14 px-5">
          <CreditCard size={18} aria-hidden />
          Continue
        </Button>
      </div>

      <p className={`mt-3 text-sm font-semibold ${canContinue ? "text-teal-800" : "text-amber-800"}`}>
        {canContinue ? "Stripe Connect is available for external wallet account linking." : disabledReason}
      </p>
    </form>
  );
}

function providerDisabledReason(provider: string) {
  if (!provider) return "Select an account provider to continue.";
  if (provider === "BANK") return "Bank Account linking is not available yet. Choose Stripe Connect to continue.";
  if (provider === "CARD") return "Card linking is not available yet. Choose Stripe Connect to continue.";
  if (provider === "PAYPAL") return "PayPal linking is not available yet. Choose Stripe Connect to continue.";
  return "Choose Stripe Connect to continue.";
}
