"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Eye, FileText, Layers3, Percent, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { SubscriptionSubmitButton } from "./SubscriptionSubmitButton";
import { PlanFeatureFields } from "./PlanFeatureFields";

type BillingCycle = {
  key: string;
  name: string;
};

type RoleOption = {
  id: string;
  level: number;
  name: string;
};

type PlanFeature = {
  id: string;
  name: string;
  feature_key: string;
  product_id: string;
  service_id?: string;
  description?: string;
  status?: string;
  currency?: string;
  base_price_minor?: number;
};

type ImportPlan = {
  featureIds: string[];
  id: string;
  name: string;
};

type PlanValue = {
  billing_cycle: string;
  currency: string;
  description: string;
  id: string;
  is_internal: boolean;
  name: string;
  price_minor: number;
  discount_percent?: number;
  status: string;
  target_user_level: number;
};

type PlanWizardFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  billingCycles: BillingCycle[];
  buttonLabel: string;
  features: PlanFeature[];
  importPlans: ImportPlan[];
  pendingLabel: string;
  plan?: PlanValue;
  roles: RoleOption[];
  selectedFeatureIds: string[];
};

const fallbackBillingCycles = [
  { key: "free", name: "Free" },
  { key: "month", name: "Month" },
  { key: "year", name: "Year" },
  { key: "manual", name: "Manual" },
];

function billingCycleLabel(cycle: string) {
  return cycle.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function lowestRoleLevel(roles: RoleOption[]) {
  if (!roles.length) return 0;
  return roles.reduce((lowest, role) => Math.min(lowest, role.level), roles[0]?.level ?? 0);
}

function uniqueLevelRoles(roles: RoleOption[]) {
  return roles
    .slice()
    .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name))
    .filter((role, index, sorted) => sorted.findIndex((item) => item.level === role.level) === index);
}

function moneyLabel(currency: string, amountMinor: number) {
  if (currency === "Points") return `${Math.max(0, amountMinor).toLocaleString("en-GB")} Points`;
  const symbol = currency === "GBP" ? "£" : `${currency} `;
  return `${symbol}${(Math.max(0, amountMinor) / 100).toFixed(2)}`;
}

function StepIcon({ active, complete, index }: { active: boolean; complete: boolean; index: number }) {
  return (
    <span className={active || complete ? "flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-black text-white shadow-sm" : "flex h-9 w-9 items-center justify-center rounded-full border border-slate-400 bg-white text-sm font-black text-slate-700"}>
      {complete ? <Check size={17} aria-hidden /> : index}
    </span>
  );
}

function TextField({ defaultValue = "", label, name, placeholder, required = false }: { defaultValue?: string; label: string; name: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-900">
      <span>{label} {required ? <span className="text-red-600">*</span> : null}</span>
      <input
        name={name}
        required={required}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base font-medium text-slate-900 outline-none focus:border-teal-700"
      />
    </label>
  );
}

function DescriptionField({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className="grid gap-2 text-sm font-black text-slate-900">
      Description
      <span className="relative">
        <textarea
          name="description"
          maxLength={300}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Describe what this plan includes..."
          className="min-h-36 w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-4 text-base font-medium text-slate-900 outline-none focus:border-teal-700"
        />
        <span className="absolute bottom-4 right-4 text-xs font-bold text-slate-500">{value.length} / 300</span>
      </span>
    </label>
  );
}

export function PlanWizardForm({
  action,
  billingCycles,
  buttonLabel,
  features,
  importPlans,
  pendingLabel,
  plan,
  roles,
  selectedFeatureIds,
}: PlanWizardFormProps) {
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedFeatureIds);
  const initialDiscountPercent = Math.min(100, Math.max(0, plan?.discount_percent ?? 0));
  const [discountEnabled, setDiscountEnabled] = useState(initialDiscountPercent > 0);
  const [discountPercent, setDiscountPercent] = useState(initialDiscountPercent);
  const options = useMemo(() => {
    const seen = new Set<string>();
    return (billingCycles.length ? billingCycles : fallbackBillingCycles).filter((cycle) => {
      if (!cycle.key || seen.has(cycle.key)) return false;
      seen.add(cycle.key);
      return true;
    });
  }, [billingCycles]);
  const roleOptions = uniqueLevelRoles(roles);
  const fallbackLevel = lowestRoleLevel(roles);
  const selectedTargetLevel = roleOptions.some((role) => role.level === plan?.target_user_level) ? String(plan?.target_user_level) : String(fallbackLevel);
  const selectedBillingCycle = options.some((cycle) => cycle.key === plan?.billing_cycle) ? plan?.billing_cycle : options[0]?.key ?? "month";
  const selectedFeatures = useMemo(() => selectedIds
    .map((featureId) => features.find((feature) => feature.id === featureId))
    .filter((feature): feature is PlanFeature => Boolean(feature)), [features, selectedIds]);
  const selectedCurrency = selectedFeatures.find((feature) => feature.currency)?.currency ?? plan?.currency ?? "GBP";
  const subtotalMinor = selectedFeatures.reduce((total, feature) => total + Math.max(0, feature.base_price_minor ?? 0), 0);
  const effectiveSubtotalMinor = subtotalMinor > 0 ? subtotalMinor : plan?.price_minor ?? 0;
  const normalizedDiscountPercent = discountEnabled ? Math.min(100, Math.max(0, Number.isFinite(discountPercent) ? discountPercent : 0)) : 0;
  const discountMinor = Math.round(effectiveSubtotalMinor * normalizedDiscountPercent / 100);
  const finalPriceMinor = Math.max(0, effectiveSubtotalMinor - discountMinor);
  const steps = [
    { description: "Add the essential details of your plan.", icon: FileText, label: "Basic Info" },
    { description: "Set who can access this plan and its visibility.", icon: ShieldCheck, label: "Target & Visibility" },
    { description: "Choose the features included in this plan.", icon: Layers3, label: "Features" },
    { description: "Apply an optional percentage discount.", icon: Percent, label: "Discount" },
    { description: "Review your plan details and create it.", icon: Eye, label: "Review & Create" },
  ];
  const ActiveIcon = steps[step - 1]?.icon ?? FileText;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {plan ? <input type="hidden" name="planId" value={plan.id} /> : null}
      <input type="hidden" name="priceMinor" value={String(finalPriceMinor)} />
      <input type="hidden" name="discountPercent" value={String(normalizedDiscountPercent)} />
      <input type="hidden" name="lowestUserLevel" value={fallbackLevel} />

      <aside className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <ol className="relative grid gap-10 before:absolute before:left-[1.1rem] before:top-10 before:h-[calc(100%-5rem)] before:w-px before:bg-slate-200">
          {steps.map((item, index) => {
            const stepNumber = index + 1;
            const active = stepNumber === step;
            const complete = stepNumber < step;
            return (
              <li key={item.label} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4">
                <button type="button" onClick={() => setStep(stepNumber)} className="relative z-10 text-left" aria-label={item.label}>
                  <StepIcon active={active} complete={complete} index={stepNumber} />
                </button>
                <button
                  type="button"
                  onClick={() => setStep(stepNumber)}
                  className={active ? "rounded-lg bg-teal-50 px-5 py-5 text-left shadow-sm" : "px-5 py-2 text-left"}
                >
                  <span className="block text-base font-black text-slate-950">{item.label}</span>
                  <span className="mt-2 block text-sm font-medium leading-6 text-slate-600">{item.description}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-8 rounded-xl border border-teal-100 bg-teal-50 p-5">
          <p className="text-xs font-black uppercase tracking-normal text-teal-800">Cost</p>
          <p className="mt-2 text-3xl font-black text-teal-900">{moneyLabel(selectedCurrency, finalPriceMinor)}</p>
          {discountEnabled ? (
            <p className="mt-2 text-sm font-bold text-teal-800">{normalizedDiscountPercent}% discount applied</p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-600">Calculated from selected features</p>
          )}
        </div>
      </aside>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-8 p-8 lg:p-10">
          <header className="flex items-start gap-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <ActiveIcon size={30} aria-hidden />
            </span>
            <span>
              <h2 className="text-2xl font-black text-slate-950">{steps[step - 1]?.label}</h2>
              <p className="mt-2 text-base font-medium text-slate-600">{steps[step - 1]?.description}</p>
            </span>
          </header>

          <div className={step === 1 ? "grid gap-7" : "hidden"}>
            <div className="grid gap-6 lg:grid-cols-2">
              <TextField name="name" label="Name" required placeholder="e.g. Pro Plan" defaultValue={plan?.name ?? ""} />
              <label className="grid gap-2 text-sm font-black text-slate-900">
                Currency <span className="sr-only">required</span>
                <select name="currency" defaultValue={plan?.currency ?? "GBP"} className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base font-medium outline-none focus:border-teal-700">
                  <option value="GBP">GBP</option>
                  <option value="Points">Points</option>
                </select>
              </label>
            </div>
            <DescriptionField defaultValue={plan?.description ?? ""} />
            <label className="grid gap-2 text-sm font-black text-slate-900">
              Billing cycle <span className="text-red-600">*</span>
              <select name="billingCycle" defaultValue={selectedBillingCycle} className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base font-medium outline-none focus:border-teal-700">
                {options.map((cycle) => <option key={cycle.key} value={cycle.key}>{cycle.name || billingCycleLabel(cycle.key)}</option>)}
              </select>
            </label>
          </div>

          <div className={step === 2 ? "grid gap-6" : "hidden"}>
            <label className="grid gap-2 text-sm font-black text-slate-900">
              Target user level
              <select name="targetUserLevel" defaultValue={selectedTargetLevel} className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base font-medium outline-none focus:border-teal-700">
                {roleOptions.length ? roleOptions.map((role) => (
                  <option key={role.id} value={role.level}>Level {role.level} ({role.name})</option>
                )) : (
                  <option value={fallbackLevel}>Level {fallbackLevel}</option>
                )}
              </select>
              <span className="text-xs font-semibold leading-5 text-slate-500">Only users with this role level or higher can add the plan.</span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input name="isInternal" type="checkbox" defaultChecked={plan?.is_internal ?? false} className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700" />
              <span>
                <span className="block font-black text-slate-900">Internal plan</span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">Hide this plan from academy and user plan selection, but keep it available for admin assignment.</span>
              </span>
            </label>
            {plan ? (
              <label className="grid gap-2 text-sm font-black text-slate-900">
                Status
                <select name="status" defaultValue={plan.status} className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base font-medium outline-none focus:border-teal-700">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Suspended</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </label>
            ) : null}
          </div>

          <div className={step === 3 ? "grid gap-6" : "hidden"}>
            <PlanFeatureFields features={features} importPlans={importPlans} onSelectionChange={setSelectedIds} selectedFeatureIds={selectedIds} />
          </div>

          <div className={step === 4 ? "grid gap-6" : "hidden"}>
            <section className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={discountEnabled}
                  onChange={(event) => setDiscountEnabled(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700"
                />
                <span>
                  <span className="block font-black text-slate-900">Apply discount</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">Leave disabled to use the calculated feature total.</span>
                </span>
              </label>
              <label className="grid max-w-xs gap-2 text-sm font-black text-slate-900">
                Discount percent
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discountPercent}
                  disabled={!discountEnabled}
                  onChange={(event) => setDiscountPercent(Number(event.target.value))}
                  className="min-h-12 rounded-lg border border-slate-300 bg-white px-4 text-base font-medium text-slate-900 outline-none focus:border-teal-700 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </label>
            </section>
          </div>

          <div className={step === 5 ? "grid gap-5" : "hidden"}>
            <div className="grid gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-black uppercase tracking-wide text-amber-800">Review before creating</p>
              <p className="text-base font-semibold leading-7 text-amber-950">Please review the plan details, selected features, pricing, and discount before creating this plan. Once created, users may be able to subscribe based on the configured visibility and target level.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Feature total</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{moneyLabel(selectedCurrency, effectiveSubtotalMinor)}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Discount</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{normalizedDiscountPercent}%</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Final cost</p>
                  <p className="mt-2 text-xl font-black text-teal-800">{moneyLabel(selectedCurrency, finalPriceMinor)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-8 py-7 lg:px-10">
          <Button href="/dashboard/subscriptions?subscriptionsView=plans" type="button" variant="secondary" className="min-h-12 px-7">Cancel</Button>
          {step < steps.length ? (
            <Button type="button" variant="primary" className="min-h-12 px-8" onClick={() => setStep((value) => Math.min(steps.length, value + 1))}>
              Next
              <ArrowRight size={18} aria-hidden />
            </Button>
          ) : (
            <SubscriptionSubmitButton label={buttonLabel} pendingLabel={pendingLabel} />
          )}
        </footer>
      </section>
    </form>
  );
}
