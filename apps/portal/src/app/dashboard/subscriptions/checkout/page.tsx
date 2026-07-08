import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, CreditCard, Info, Lock, Package, Pencil, RefreshCw, ShieldCheck, ShoppingBag, Star, WalletCards } from "lucide-react";

import { Button } from "@/components/Button";
import { listApplicationSubscriptions, listSubscriptionPlansPage, quoteSubscriptionPlans, type SubscriptionPlan } from "@/lib/subscriptions-service";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import { listWalletsPage, getWalletBalance } from "@/lib/wallet-service";
import { startSubscriptionCardCheckoutAction, startSubscriptionWalletCheckoutAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Subscription Checkout",
  description: "Choose how to pay for your RollFinders subscription.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function selectedPlanIds(value: string | string[] | undefined) {
  return (firstParam(value) ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function moneyMinor(amount: number, currency: string) {
  return `${currency || "GBP"} ${(amount / 100).toFixed(0)}`;
}

function billingPeriodLabel(period: "month" | "year") {
  return period === "year" ? "yearly" : "monthly";
}

function checkoutOptionsHref(input: {
  applicationId: string;
  billingPeriod: "month" | "year";
  paymentMode: "subscription" | "one_time";
  selectedPlans: string;
}) {
  return `/dashboard/subscriptions/checkout?${new URLSearchParams({
    applicationId: input.applicationId,
    billingPeriod: input.billingPeriod,
    paymentMode: input.paymentMode,
    selectedPlans: input.selectedPlans,
  }).toString()}`;
}

function unavailableSubscriptionPlanStatus(status: string) {
  return ["active", "trial", "checkout_pending", "payment_confirmed", "past_due", "suspended", "scheduled_downgrade", "cancel_at_period_end"].includes(status.toLowerCase());
}

export default async function SubscriptionCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireDashboardUser();
  const params = await searchParams;
  const planIds = selectedPlanIds(params.selectedPlans);
  if (!planIds.length) redirect("/dashboard/subscriptions");

  const paymentMode = firstParam(params.paymentMode) === "one_time" ? "one_time" : "subscription";
  const billingPeriod = firstParam(params.billingPeriod) === "year" ? "year" : "month";
  const applicationId = firstParam(params.applicationId) || process.env.ROLLFINDERS_APPLICATION_ID || "app_rollfinders";
  const actor = { id: user.id, role: user.role, email: user.email, academyId: user.academyId };
  const [planResult, subscriptions, walletsPage] = await Promise.all([
    listSubscriptionPlansPage(actor, { limit: 100, offset: 0 }).catch(() => ({ plans: [], pagination: { limit: 100, offset: 0, count: 0, has_more: false } })),
    listApplicationSubscriptions(applicationId, actor).catch(() => []),
    listWalletsPage({ actorUserId: user.id, ownerId: user.id, currency: "GBP", limit: 5 }).catch(() => ({ wallets: [], pagination: { count: 0, has_more: false, limit: 5, offset: 0, total: 0 } })),
  ]);
  const selectedPlans = planResult.plans.filter((plan) => planIds.includes(plan.id));
  if (!selectedPlans.length) redirect("/dashboard/subscriptions");
  const activePlanIds = new Set(subscriptions.filter((subscription) => unavailableSubscriptionPlanStatus(subscription.status)).map((subscription) => subscription.plan_id));
  const checkoutPlans = selectedPlans.filter((plan) => !activePlanIds.has(plan.id));
  if (!checkoutPlans.length) redirect("/dashboard/subscriptions?selectedPlans=");
  const checkoutPlan = checkoutPlans[0];
  const quote = await quoteSubscriptionPlans(checkoutPlans.map((plan) => plan.id), billingPeriod, actor);
  const monthlyQuote = billingPeriod === "month" ? quote : await quoteSubscriptionPlans(checkoutPlans.map((plan) => plan.id), "month", actor);
  const yearlyQuote = billingPeriod === "year" ? quote : await quoteSubscriptionPlans(checkoutPlans.map((plan) => plan.id), "year", actor);
  const total = quote.total_minor;
  const currency = checkoutPlans[0]?.currency ?? "GBP";
  const walletBalances = await Promise.all(walletsPage.wallets.map(async (wallet) => ({
    wallet,
    balance: await getWalletBalance(wallet.id, undefined, user.id).catch(() => null),
  })));
  const fundedWallet = walletBalances.find((item) => (item.balance?.availableBalance ?? 0) >= total);
  const walletCanCover = Boolean(fundedWallet);
  const actionError = (firstParam(params.actionError) ?? "").trim();
  const selectedPlanParam = checkoutPlans.map((plan) => plan.id).join(",");
  const monthlyTotal = monthlyQuote.total_minor;
  const yearlyTotal = yearlyQuote.total_minor;

  const walletBalanceText = walletBalances.length
    ? walletBalances.map(({ wallet, balance }) => `${wallet.currency} wallet: ${moneyMinor(balance?.availableBalance ?? 0, wallet.currency)}`).join(" / ")
    : "No GBP wallet found";
  const paymentSummary = `${paymentMode === "one_time" ? "One-time payment" : "Recurring subscription"} - ${billingPeriodLabel(billingPeriod)}`;

  return (
    <main className="min-h-screen bg-[#f8faf7] px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-stone-200 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-lg text-teal-700">
                <Package size={32} aria-hidden />
              </span>
              <span className="text-2xl font-black text-slate-950">RollFinders</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-black text-slate-700">
              <Lock size={18} aria-hidden />
              Secure checkout
            </div>
          </div>
        </header>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight text-slate-950">Checkout</h1>
            <p className="mt-1 text-base font-medium text-slate-600">Review your subscription, choose billing, and complete payment.</p>
          </div>
          <ol className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-500">
            {["Review", "Billing", "Payment", "Confirm"].map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className={`inline-flex size-10 items-center justify-center rounded-full border text-base font-black ${index === 0 ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 bg-white text-slate-700"}`}>{index + 1}</span>
                <span className={index === 0 ? "text-teal-800" : "text-slate-600"}>{step}</span>
                {index < 3 ? <span className="hidden h-px w-12 bg-stone-300 sm:block" /> : null}
              </li>
            ))}
          </ol>
        </div>

        {actionError ? <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{actionError}</div> : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="grid gap-5">
            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Package size={24} aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-slate-950">Selected modules</h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">{checkoutPlans.length} module{checkoutPlans.length === 1 ? "" : "s"} selected for this checkout.</p>
                  </div>
                </div>
                <Button href="/dashboard/subscriptions" variant="subtle" className="min-h-9 text-teal-800 underline">
                  <Pencil size={16} aria-hidden />
                  Edit modules
                </Button>
              </div>
              <div className="mt-4 grid gap-2">
                {checkoutPlans.map((plan) => (
                  <div key={plan.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border border-stone-200 bg-white px-3 py-2">
                    <span className="inline-flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                      <Package size={22} aria-hidden />
                    </span>
                    <p className="min-w-0 truncate text-sm font-black text-slate-950">{plan.name}</p>
                    <p className="text-sm font-black text-teal-800">{moneyMinor(plan.price_minor, plan.currency)} <span className="font-semibold text-slate-600">/ {plan.billing_cycle}</span></p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <CalendarDays size={24} aria-hidden />
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Billing setup</h2>
                  <p className="mt-1 text-sm font-medium text-slate-600">Yearly one-time access ends after one year. Recurring billing renews automatically.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-stone-200 bg-white text-sm font-black">
                  <Button href={checkoutOptionsHref({ applicationId, billingPeriod, paymentMode: "subscription", selectedPlans: selectedPlanParam })} variant="secondary" className={`min-h-12 justify-center rounded-none border-0 shadow-none ${paymentMode === "subscription" ? "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-600" : "bg-white text-slate-600"}`}>
                    <RefreshCw size={18} aria-hidden />
                    Subscription
                  </Button>
                  <Button href={checkoutOptionsHref({ applicationId, billingPeriod, paymentMode: "one_time", selectedPlans: selectedPlanParam })} variant="secondary" className={`min-h-12 justify-center rounded-none border-0 shadow-none ${paymentMode === "one_time" ? "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-600" : "bg-white text-slate-600"}`}>
                    <Clock3 size={18} aria-hidden />
                    One-time
                  </Button>
                </div>
                <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-stone-200 bg-white text-sm font-black">
                  <Button href={checkoutOptionsHref({ applicationId, billingPeriod: "month", paymentMode, selectedPlans: selectedPlanParam })} variant="secondary" className={`min-h-12 justify-center rounded-none border-0 shadow-none ${billingPeriod === "month" ? "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-600" : "bg-white text-slate-600"}`}>
                    <CalendarDays size={18} aria-hidden />
                    Monthly
                  </Button>
                  <Button href={checkoutOptionsHref({ applicationId, billingPeriod: "year", paymentMode, selectedPlans: selectedPlanParam })} variant="secondary" className={`min-h-12 justify-center rounded-none border-0 shadow-none ${billingPeriod === "year" ? "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-600" : "bg-white text-slate-600"}`}>
                    <CalendarDays size={18} aria-hidden />
                    Yearly
                  </Button>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <CreditCard size={24} aria-hidden />
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Payment method</h2>
                  <p className="mt-1 text-sm font-medium text-slate-600">Choose how you would like to pay.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <form action={startSubscriptionWalletCheckoutAction} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                  <input type="hidden" name="selectedPlans" value={selectedPlanParam} />
                  <input type="hidden" name="planId" value={checkoutPlan.id} />
                  <input type="hidden" name="applicationId" value={applicationId} />
                  <input type="hidden" name="organisationId" value="" />
                  <input type="hidden" name="paymentMode" value={paymentMode} />
                  <input type="hidden" name="billingPeriod" value={billingPeriod} />
                  <input type="hidden" name="walletId" value={fundedWallet?.wallet.id ?? ""} />
                  <input type="hidden" name="amountMinor" value={total} />
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex size-5 shrink-0 rounded-full border border-stone-300" />
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                      <WalletCards size={24} aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-slate-950">Wallet</h3>
                      <p className="mt-1 text-sm font-medium leading-5 text-slate-600">Use available RollFinders wallet balance for this subscription payment.</p>
                      <p className="mt-3 text-sm font-bold text-slate-700">{walletBalanceText}</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">GBP due: {moneyMinor(total, currency)}</p>
                    </div>
                  </div>
                  <Button type="submit" variant="danger" disabled={!walletCanCover} className="mt-4 min-h-11 w-full justify-center bg-red-50 text-red-700 hover:bg-red-50">
                    {walletCanCover ? "Pay with Wallet" : "Insufficient wallet balance"}
                  </Button>
                </form>

                <form action={startSubscriptionCardCheckoutAction} className="relative rounded-lg border border-teal-700 bg-white p-4 shadow-sm ring-1 ring-teal-700">
                  <input type="hidden" name="selectedPlans" value={selectedPlanParam} />
                  <input type="hidden" name="planId" value={checkoutPlan.id} />
                  <input type="hidden" name="applicationId" value={applicationId} />
                  <input type="hidden" name="organisationId" value="" />
                  <input type="hidden" name="paymentMode" value={paymentMode} />
                  <input type="hidden" name="billingPeriod" value={billingPeriod} />
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">
                    <Star size={14} aria-hidden />
                    Recommended
                  </span>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex size-5 shrink-0 rounded-full border-4 border-teal-700" />
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                      <CreditCard size={24} aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-slate-950">Card</h3>
                      <p className="mt-1 text-sm font-medium leading-5 text-slate-600">Continue to Stripe card checkout. Successful payment records the subscription in RollFinders.</p>
                    </div>
                  </div>
                  <Button type="submit" variant="primary" className="mt-5 min-h-11 w-full justify-center bg-teal-700 text-white hover:bg-teal-800">
                    Pay by Card
                  </Button>
                </form>
              </div>
            </section>
          </div>

          <aside className="self-start rounded-lg border border-stone-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <ShoppingBag size={24} aria-hidden />
              </span>
              <h2 className="text-xl font-black text-slate-950">Your order</h2>
            </div>
            <div className="mt-5">
              <p className="text-base font-black text-slate-950">Modules ({checkoutPlans.length})</p>
              <div className="mt-3 grid gap-3">
                {checkoutPlans.map((plan) => (
                  <div key={plan.id} className="flex items-center gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                      <Package size={22} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{plan.name}</p>
                      <p className="text-sm font-semibold text-slate-500">{moneyMinor(monthlyQuote.products.filter((product) => product.plan_id === plan.id).reduce((sum, product) => sum + product.total_minor, 0), plan.currency)} / month</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 border-t border-stone-200 pt-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-black text-slate-950">Billing</span>
                <span className="font-semibold text-slate-600">{paymentMode === "one_time" ? "One-time" : "Subscription"} - {billingPeriod === "year" ? "Yearly" : "Monthly"}</span>
              </div>
            </div>
            <div className="mt-4 border-t border-stone-200 pt-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-black text-slate-950">Subtotal (monthly)</span>
                <span className="font-black text-slate-950">{moneyMinor(monthlyTotal, currency)}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4 text-sm">
                <span className="font-black text-slate-950">Subtotal (yearly)</span>
                <span className="font-black text-slate-950">{moneyMinor(yearlyTotal, currency)}</span>
              </div>
              {quote.adjustment_minor !== 0 ? (
                <div className="mt-3 flex justify-between gap-4 text-sm">
                  <span className="font-black text-slate-950">Product adjustments</span>
                  <span className="font-black text-slate-950">{moneyMinor(quote.adjustment_minor, quote.currency)}</span>
                </div>
              ) : null}
              {quote.duplicate_feature_savings_minor > 0 ? (
                <div className="mt-3 flex justify-between gap-4 text-sm text-teal-800">
                  <span className="font-black">Duplicate feature savings</span>
                  <span className="font-black">-{moneyMinor(quote.duplicate_feature_savings_minor, quote.currency)}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm font-medium text-slate-700">
              <div className="flex gap-2">
                <Info size={18} className="shrink-0 text-sky-600" aria-hidden />
                <span>Taxes may be applied at checkout where applicable.</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
              <p className="text-sm font-black text-slate-950">Total due now</p>
              <p className="mt-1 text-5xl font-black leading-none text-teal-800">{moneyMinor(total, currency)}</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">{paymentSummary}</p>
            </div>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-950">Yearly total</p>
                <p className="mt-1 text-sm font-medium text-slate-600">One-time access ends after one year.</p>
              </div>
              <p className="text-base font-black text-teal-800">{moneyMinor(yearlyTotal, currency)}</p>
            </div>
            <form action={startSubscriptionCardCheckoutAction} className="mt-5">
              <input type="hidden" name="selectedPlans" value={selectedPlanParam} />
              <input type="hidden" name="planId" value={checkoutPlan.id} />
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="organisationId" value="" />
              <input type="hidden" name="paymentMode" value={paymentMode} />
              <input type="hidden" name="billingPeriod" value={billingPeriod} />
              <Button type="submit" variant="primary" className="min-h-12 w-full justify-center bg-teal-700 text-white hover:bg-teal-800">
                Continue to Payment
                <Lock size={18} aria-hidden />
              </Button>
            </form>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
              <ShieldCheck size={18} className="text-emerald-600" aria-hidden />
              Secure, encrypted, and PCI compliant
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
