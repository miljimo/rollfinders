"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";

export function PricingPolicyScopeField({
  options,
  selectedProviderId,
}: {
  options: AutoCompleteTextFieldOption[];
  selectedProviderId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function loadPolicy(providerId: string) {
    if (!providerId || providerId === selectedProviderId) return;
    const nextParams = new URLSearchParams(searchParams?.toString() ?? "");
    nextParams.set("paymentsView", "settings");
    nextParams.set("pricingProviderId", providerId);
    nextParams.delete("paymentSettingsError");
    nextParams.delete("paymentSettingsMessage");
    router.push(`/dashboard/payment?${nextParams.toString()}`);
  }

  return (
    <div className="grid gap-1">
      <AutoCompleteTextField
        label="Wallet or provider account"
        name="providerId"
        options={options}
        selectedId={selectedProviderId}
        onSelectedIdChange={loadPolicy}
        placeholder="Search wallet ID, wallet owner, provider account, or linked account"
        emptyMessage="No wallets or provider accounts match that search."
      />
      <p className="text-xs font-semibold text-slate-500">Choose a scope to load its current pricing policy before saving changes.</p>
    </div>
  );
}
