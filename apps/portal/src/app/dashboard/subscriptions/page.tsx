import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Edit3, PauseCircle, Plus, Trash2, XCircle } from "lucide-react";
import { Role } from "@prisma/client";
import { ActionMenu } from "../../admin/ActionMenu";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import { DataTableWithSearch } from "@/components/data-table-with-search";
import { Icon, type SidePanelIcon } from "@/components/Icons";
import { Pagination } from "@/components/pagination";
import { SidePanelControl, type SidePanelItem } from "@/components/SidePanelControl";
import { Table, type TableColumn, type TableRecord } from "@/components/Table";
import { TabControl } from "@/components/tab-control";
import { listAuthorisationRoles, type AuthorisationRole } from "@/lib/authorisation-service";
import { listOrganisationApplications, listOrganisations, type OrganisationApplicationRecord, type OrganisationRecord } from "@/lib/organisation-service";
import { listPaymentTransactionsPage, type PaymentRecord } from "@/lib/payments";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import { getUserPermissionPanelModel, type AssignableUserFeature } from "@/lib/users-service";
import {
  getApplicationEntitlements,
  getCurrentApplicationSubscription,
  listApplicationSubscriptions,
  listSubscriptionBillingCycles,
  listSubscriptionFeatures,
  listSubscriptionFeaturesPage,
  listSubscriptionBillingEvents,
  listSubscriptionPlansPage,
  listSubscriptionProducts,
  recordSubscriptionPlanChangePaymentResult,
  type ApplicationEntitlements,
  type CurrentSubscriptionState,
  type OrganisationSubscription,
  type SubscriptionPagination,
  SubscriptionServiceError,
  type SubscriptionBillingEvent,
  type SubscriptionFeature,
  type SubscriptionBillingCycle,
  type SubscriptionPlan,
  type SubscriptionProduct,
} from "@/lib/subscriptions-service";
import {
  cancelSubscriberAction,
  createFeatureAction,
  createPlanAction,
  createProductAction,
  createSubscriptionAction,
  deleteSubscriberAction,
  deleteFeatureAction,
  deletePlanAction,
  deleteProductAction,
  disableFeatureAction,
  suspendSubscriberAction,
  suspendPlanAction,
  suspendProductAction,
  startPlanCheckoutAction,
  reactivateSubscriberAction,
  updateSubscriberAction,
  updateFeatureAction,
  updatePlanAction,
  updateProductAction,
} from "./actions";
import { PlanFeatureEditFields } from "./PlanFeatureEditFields";
import { PlanFeatureFields } from "./PlanFeatureFields";
import { PlanWizardForm } from "./PlanWizardForm";
import { ProductFeatureFields } from "./ProductFeatureFields";
import { SubscriptionCategoryCombobox } from "./SubscriptionCategoryCombobox";
import { SubscriptionMarketplaceGrid, type SubscriptionMarketplaceGridItem } from "./SubscriptionMarketplaceGrid";
import { SubscriptionSubmitButton } from "./SubscriptionSubmitButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Subscriptions",
  description: "Manage subscription products, features, plans, and entitlements.",
};

type SearchParams = Record<string, string | string[] | undefined>;
type SubscriptionView = "overview" | "plans" | "products" | "features" | "entitlements" | "subscribers" | "billing-events" | "usage-limits";

const subscriptionSections: { href: string; icon: SidePanelItem["icon"]; label: string; view: SubscriptionView }[] = [
  { href: "/dashboard/subscriptions", icon: "dashboard", label: "Subscription Overview", view: "overview" },
  { href: "/dashboard/subscriptions?subscriptionsView=plans", icon: "plans", label: "Plans", view: "plans" },
  { href: "/dashboard/subscriptions?subscriptionsView=features", icon: "features", label: "Features", view: "features" },
  { href: "/dashboard/subscriptions?subscriptionsView=products", icon: "products", label: "Products", view: "products" },
  { href: "/dashboard/subscriptions?subscriptionsView=entitlements", icon: "entitlements", label: "Entitlement Diagnostics", view: "entitlements" },
  { href: "/dashboard/subscriptions?subscriptionsView=subscribers", icon: "subscribers", label: "Active Subscriptions", view: "subscribers" },
  { href: "/dashboard/subscriptions?subscriptionsView=billing-events", icon: "transactions", label: "Billings", view: "billing-events" },
  { href: "/dashboard/subscriptions?subscriptionsView=usage-limits", icon: "limits", label: "Usage Limits", view: "usage-limits" },
];

const menuItemClass = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:bg-transparent";
const dangerMenuItemClass = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:bg-transparent";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: string | string[] | undefined, fallback = 1) {
  const parsed = Number(firstParam(value) ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function subscriptionView(value: string | string[] | undefined): SubscriptionView {
  const selected = firstParam(value);
  return subscriptionSections.some((section) => section.view === selected) ? selected as SubscriptionView : "overview";
}

function canViewEntitlementDiagnostics(role: Role) {
  return role === Role.SUPER_ADMIN || role === Role.PLATFORM_ADMIN;
}

function roleLabel(role: string) {
  return role.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function currencyLabel(plan: SubscriptionPlan) {
  return `${plan.currency} ${(plan.price_minor / 100).toFixed(2)} / ${plan.billing_cycle}`;
}

function viewTitle(view: SubscriptionView) {
  if (view === "plans") return "Plans";
  if (view === "products") return "Products";
  if (view === "features") return "Features";
  if (view === "entitlements") return "Entitlement Diagnostics";
  if (view === "subscribers") return "Active Subscriptions";
  if (view === "billing-events") return "Billings";
  if (view === "usage-limits") return "Usage Limits";
  return "Subscriptions Dashboard";
}

function viewDescription(view: SubscriptionView) {
  if (view === "plans") return "Create commercial plans and choose which plan features each plan can grant.";
  if (view === "products") return "Manage the products and features that can be packaged into subscription plans.";
  if (view === "features") return "Manage product-level feature flags and privileges that plans can include.";
  if (view === "entitlements") return "Internal diagnostic view for effective access grants loaded for the selected application.";
  if (view === "subscribers") return "Review active, pending, suspended, and assigned subscriptions for the selected application.";
  if (view === "billing-events") return "Review subscription billing statements, payment state, and invoice-ready records.";
  if (view === "usage-limits") return "Review metered usage limits attached to subscription features.";
  return "Overview of subscription catalogue, plans, subscribers, and entitlement health.";
}

function subscriptionHref(overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `/dashboard/subscriptions?${query}` : "/dashboard/subscriptions";
}

function navItems(activeView: SubscriptionView, role: Role): SidePanelItem[] {
  const sections = subscriptionSections.filter((section) => section.view !== "entitlements" || canViewEntitlementDiagnostics(role));
  return [
    {
      active: true,
      children: sections.map((section) => ({ active: section.view === activeView, href: section.href, icon: section.icon, label: section.label })),
      href: "/dashboard/subscriptions",
      icon: "payments",
      label: "Subscriptions",
    },
  ];
}

function footerNavItems(): SidePanelItem[] {
  return [
    { active: false, href: "/dashboard?panel=maps", icon: "map", label: "Map" },
    { active: false, href: "/dashboard?panel=settings", icon: "settings", label: "Settings" },
  ];
}

export default async function SubscriptionsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireDashboardUser();
  const params = await searchParams;
  const canManageSubscriptions = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN || user.role === Role.PLATFORM_ADMIN;
  if (!canManageSubscriptions) redirect("/dashboard");
  const activeView = subscriptionView(params.subscriptionsView);
  if (activeView === "entitlements" && !canViewEntitlementDiagnostics(user.role)) redirect("/dashboard/subscriptions");
  const plansPage = numberParam(params.plansPage);
  const plansPageSize = 10;
  const plansOffset = (plansPage - 1) * plansPageSize;
  const featuresPage = numberParam(params.featuresPage);
  const featuresPageSize = 10;
  const featuresOffset = (featuresPage - 1) * featuresPageSize;
  const productsPage = numberParam(params.productsPage);
  const subscribersPage = numberParam(params.subscribersPage);
  const plansSearch = (firstParam(params.plansSearch) ?? "").trim();
  const productsSearch = (firstParam(params.productsSearch) ?? "").trim();
  const featuresSearch = (firstParam(params.featuresSearch) ?? "").trim();
  const subscribersSearch = (firstParam(params.subscribersSearch) ?? "").trim();
  const dialog = firstParam(params.dialog);
  const actionError = (firstParam(params.actionError) ?? "").trim();
  const selectedPlanId = (firstParam(params.planId) ?? "").trim();
  const selectedProductId = (firstParam(params.productId) ?? "").trim();
  const selectedFeatureId = (firstParam(params.featureId) ?? "").trim();
  const selectedSubscriptionId = (firstParam(params.subscriptionId) ?? "").trim();
  const selectedBillingId = (firstParam(params.billingId) ?? "").trim();
  const selectedBillingDetailsTab = billingDetailsTab(firstParam(params.billingDetailsTab));
  const selectedMarketplacePlanIds = selectedMarketplacePlans(params.selectedPlans);
  const selectedMarketplaceCategory = (firstParam(params.marketplaceCategory) ?? "All").trim() || "All";
  const selectedPaymentMode = firstParam(params.paymentMode) === "one_time" ? "one_time" : "subscription";
  const selectedBillingPeriod = firstParam(params.billingPeriod) === "year" ? "year" : "month";
  const applicationId = firstParam(params.applicationId) || process.env.ROLLFINDERS_APPLICATION_ID || "app_rollfinders";
  const actionErrorCode = (firstParam(params.actionErrorCode) ?? "").trim();
  const actor = { id: user.id, role: user.role, email: user.email, academyId: user.academyId };
  const billingResult = firstParam(params.billing);
  const returnedPlanChangeId = (firstParam(params.plan_change_id) ?? "").trim();
  const returnedStripeCheckoutSessionId = (firstParam(params.stripe_checkout_session_id) ?? "").trim();
  if (returnedPlanChangeId && billingResult === "success") {
    await recordSubscriptionPlanChangePaymentResult(returnedPlanChangeId, {
      status: "succeeded",
      paymentId: returnedStripeCheckoutSessionId,
      provider: "stripe",
      providerReference: returnedStripeCheckoutSessionId || returnedPlanChangeId,
    }, actor);
    redirect("/dashboard/subscriptions?billingConfirmed=success");
  }
  if (returnedPlanChangeId && billingResult === "cancelled") {
    await recordSubscriptionPlanChangePaymentResult(returnedPlanChangeId, {
      status: "cancelled",
      provider: "stripe",
      providerReference: returnedPlanChangeId,
    }, actor);
    redirect("/dashboard/subscriptions?billingConfirmed=cancelled");
  }

  let error: string | null = actionError || null;
  const [products, features, featureResult, planResult, subscriptions, currentSubscriptionState, entitlements, organisations, applications, assignableFeatures, billingCycles, roles, paymentTransactionsResult] = await Promise.all([
    listSubscriptionProducts(actor).catch((err) => {
      error = serviceErrorMessage(err);
      return [];
    }),
    listSubscriptionFeatures(actor).catch(() => []),
    listSubscriptionFeaturesPage(actor, { limit: featuresPageSize, offset: featuresOffset }).catch(() => ({ features: [], pagination: { limit: featuresPageSize, offset: featuresOffset, count: 0, has_more: false } })),
    listSubscriptionPlansPage(actor, { limit: plansPageSize, offset: plansOffset }).catch(() => ({ plans: [], pagination: { limit: plansPageSize, offset: plansOffset, count: 0, has_more: false } })),
    listApplicationSubscriptions(applicationId, actor).catch(() => []),
    getCurrentApplicationSubscription(applicationId, actor).catch((): CurrentSubscriptionState => ({ subscription: null, pending_change: null, billing_events: [], cancellation: null })),
    getApplicationEntitlements(applicationId, actor).catch((): ApplicationEntitlements => ({ application_id: applicationId, features: [] })),
    listOrganisations(actor).catch(() => []),
    listOrganisationApplications(actor).catch(() => []),
    getUserPermissionPanelModel(actor, user.id, {
      organisationId: user.academyId ?? undefined,
      applicationId,
    }).catch(() => []),
    listSubscriptionBillingCycles(actor).catch(() => [
      { key: "free", name: "Free" },
      { key: "month", name: "Month" },
      { key: "year", name: "Year" },
      { key: "manual", name: "Manual" },
    ]),
    listAuthorisationRoles(actor).catch(() => []),
    listPaymentTransactionsPage({ limit: 100 }).catch(() => ({ payments: [], pagination: { limit: 100, offset: 0, count: 0, has_more: false } })),
  ]);
  if (!returnedPlanChangeId && billingResult === "success" && currentSubscriptionState.pending_change?.id) {
    await recordSubscriptionPlanChangePaymentResult(currentSubscriptionState.pending_change.id, {
      status: "succeeded",
      provider: "stripe",
      providerReference: currentSubscriptionState.pending_change.checkout_id || currentSubscriptionState.pending_change.id,
    }, actor);
    redirect("/dashboard/subscriptions?billingConfirmed=success");
  }
  if (!returnedPlanChangeId && billingResult === "cancelled" && currentSubscriptionState.pending_change?.id) {
    await recordSubscriptionPlanChangePaymentResult(currentSubscriptionState.pending_change.id, {
      status: "cancelled",
      provider: "stripe",
      providerReference: currentSubscriptionState.pending_change.checkout_id || currentSubscriptionState.pending_change.id,
    }, actor);
    redirect("/dashboard/subscriptions?billingConfirmed=cancelled");
  }
  const plans = planResult.plans;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedFeature = features.find((feature) => feature.id === selectedFeatureId);
  const paymentSubscriptionRows = paymentTransactionsResult.payments.filter((payment) => payment.metadata?.payment_scope === "SUBSCRIPTION" || payment.resourceType === "subscription");
  const selectedSubscription = subscriptions.find((subscription) => subscription.id === selectedSubscriptionId);
  const selectedBillingSubscription = paymentSubscriptionRows.find((subscription) => subscription.id === selectedSubscriptionId);
  const billingEvents = (await Promise.all(subscriptions.map((subscription) => listSubscriptionBillingEvents(subscription.id, actor).catch(() => [])))).flat();
  const selectedBillingPayment = paymentSubscriptionRows.find((billing) => billing.id === selectedBillingId);
  const selectedBilling = billingEvents.find((event) => event.id === selectedBillingId);
  const recoveryPrompt = subscriptionRecoveryPrompt(actionErrorCode || actionError, plans, entitlements);

  return (
    <div className="min-h-screen bg-[#f8faf7] text-slate-900">
      <SidePanelControl
        accountLabel={user.name ?? user.email}
        footerNavigationItems={footerNavItems()}
        mobileNavigationItems={navItems(activeView, user.role)}
        navigationItems={navItems(activeView, user.role)}
        roleLabel={roleLabel(user.role)}
        supportHref="/contact"
      />
      <main className="transition-[padding] duration-200 lg:pl-[var(--admin-side-panel-width,16rem)]">
        <header className="border-b border-stone-200 bg-white px-4 py-6 sm:px-8">
          <p className="text-xs font-black uppercase text-teal-800">Subscription Service</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">{viewTitle(activeView)}</h1>
          <p className="mt-2 max-w-3xl text-slate-600">{viewDescription(activeView)}</p>
        </header>
        <section className="px-4 py-8 sm:px-8">
          {error ? <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}
          {recoveryPrompt ? <SubscriptionRecoveryPrompt prompt={recoveryPrompt} /> : null}

          <SubscriptionViewPanel activeBillingPeriod={selectedBillingPeriod} activePaymentMode={selectedPaymentMode} activeView={activeView} applicationId={applicationId} applications={applications} billingEvents={billingEvents} billingSubscriptionPayments={paymentSubscriptionRows} currentSubscriptionState={currentSubscriptionState} entitlements={entitlements} featurePagination={featureResult.pagination} features={features} featuresSearch={featuresSearch} featureTableRows={featureResult.features} selectedMarketplaceCategory={selectedMarketplaceCategory} organisations={organisations} planPagination={planResult.pagination} plans={plans} plansPage={plansPage} plansSearch={plansSearch} products={products} productsPage={productsPage} productsSearch={productsSearch} roles={roles} selectedMarketplacePlanIds={selectedMarketplacePlanIds} subscribersPage={subscribersPage} subscribersSearch={subscribersSearch} subscriptions={subscriptions} userRole={user.role} />
        </section>
      </main>
      {dialog === "new-plan" ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=plans" description="Create a subscription plan without leaving the dashboard." maxWidthClass="max-w-7xl" title="New Plan">
          <div className="mt-5">
            <CreatePlanForm billingCycles={billingCycles} features={features} importPlans={plans} roles={roles} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "edit-plan" && selectedPlan ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=plans" description="Update this subscription plan." maxWidthClass="max-w-7xl" title="Edit Plan">
          <div className="mt-5">
            <PlanForm action={updatePlanAction} billingCycles={billingCycles} buttonLabel="Update" features={features} importPlans={plans} pendingLabel="Updating..." plan={selectedPlan} roles={roles} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "plan-details" && selectedPlan ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=plans" description="Review this plan's price, visibility, and feature grants." title="Plan Details">
          <div className="mt-5">
            <PlanDetailsPanel features={features} plan={selectedPlan} products={products} roles={roles} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "new-product" ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=products" description="Create products from service features and permissions. You can define multiple products for a single service." title="New Product">
          <div className="mt-5">
            <CreateProductForm assignableFeatures={assignableFeatures} productFeatures={[]} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "edit-product" && selectedProduct ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=products" description="Create products from service features and permissions. You can define multiple products for a single service." title="Edit Product">
          <div className="mt-5">
            <ProductForm action={updateProductAction} assignableFeatures={assignableFeatures} buttonLabel="Save product" product={selectedProduct} productFeatures={features.filter((feature) => feature.product_id === selectedProduct.id || feature.product_ids?.includes(selectedProduct.id))} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "new-feature" ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=features" description="Create a priced feature from an existing product." title="New Plan Feature">
          <div className="mt-5">
            <CreateFeatureForm features={features} products={products} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "edit-feature" && selectedFeature ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=features" description="Update this priced plan feature." title="Edit Plan Feature">
          <div className="mt-5">
            <FeatureForm action={updateFeatureAction} buttonLabel="Save plan feature" feature={selectedFeature} features={features} products={products} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "new-subscriber" ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=subscribers" description="Assign a subscription record without leaving the dashboard." title="Assign Subscription">
          <div className="mt-5">
            <CreateSubscriptionPanel applicationId={applicationId} applications={applications} billingPeriod={selectedBillingPeriod} entitlements={entitlements} features={features} organisations={organisations} paymentMode={selectedPaymentMode} plans={plans} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "edit-subscriber" && selectedSubscription ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=subscribers" description="Update this subscription record." title="Edit Subscription">
          <div className="mt-5">
            <SubscriberForm plans={plans} subscription={selectedSubscription} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "subscription-details" && (selectedSubscription || selectedBillingSubscription) ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=subscribers" description="Review the selected subscription, billing, and provider references." title="Subscription Details">
          <div className="mt-5">
            <SubscriptionDetailsPanel billingSubscription={selectedBillingSubscription} features={features} lifecycleSubscription={selectedSubscription} plans={plans} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "billing-details" && (selectedBillingPayment || selectedBilling) ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=billing-events" description="Review the billing statement, payment state, and invoice references." title="Billing Details">
          <div className="mt-5">
            <BillingDetailsPanel activeTab={selectedBillingDetailsTab} billing={selectedBilling} billingPayment={selectedBillingPayment} currentState={currentSubscriptionState} plans={plans} subscriptions={subscriptions} />
          </div>
        </DialogShell>
      ) : null}
    </div>
  );
}

function serviceErrorMessage(err: unknown) {
  if (err instanceof SubscriptionServiceError) {
    if (err.status === 403) return "You do not have permission to manage subscription data yet. Ask an administrator to assign the subscription permissions for this dashboard.";
    return err.message;
  }
  return "Subscription Service is unavailable.";
}

type SubscriptionRecoveryAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type SubscriptionRecoveryPromptModel = {
  title: string;
  message: string;
  actions: SubscriptionRecoveryAction[];
};

function subscriptionRecoveryPrompt(actionError: string, plans: SubscriptionPlan[], entitlements: ApplicationEntitlements): SubscriptionRecoveryPromptModel | null {
  const reason = actionError.toUpperCase();
  if (!reason.includes("SUBSCRIPTION_REQUIRED") && !reason.includes("PLAN_FEATURE_NOT_INCLUDED")) {
    return null;
  }
  const sortedPlans = plans.filter((plan) => !plan.is_internal).sort((left, right) => left.price_minor - right.price_minor || left.name.localeCompare(right.name));
  const freePlan = sortedPlans.find((plan) => plan.price_minor === 0 || plan.billing_cycle === "free");
  const upgradePlan = sortedPlans.find((plan) => plan.id !== entitlements.plan_id && (!entitlements.plan_id || plan.price_minor > (sortedPlans.find((item) => item.id === entitlements.plan_id)?.price_minor ?? -1)));
  const actions: SubscriptionRecoveryAction[] = [
    { href: "/dashboard/subscriptions?subscriptionsView=plans", label: "View Plans", variant: "primary" },
  ];
  if (freePlan && !entitlements.subscription_id) {
    actions.push({ href: `/dashboard/subscriptions?subscriptionsView=subscribers&dialog=new-subscriber&planId=${encodeURIComponent(freePlan.id)}`, label: "Start Free Plan", variant: "secondary" });
  }
  if (upgradePlan && entitlements.subscription_id) {
    actions.push({ href: "/dashboard/subscriptions?subscriptionsView=plans", label: "Upgrade", variant: "secondary" });
  }
  actions.push({ href: "/contact", label: "Contact Support", variant: "secondary" });
  if (reason.includes("SUBSCRIPTION_REQUIRED")) {
    return {
      title: "Subscription Required",
      message: "This owner does not have an active subscription for the selected application.",
      actions,
    };
  }
  return {
    title: "Plan Upgrade Required",
    message: "The active plan does not include the requested feature.",
    actions,
  };
}

function SubscriptionRecoveryPrompt({ prompt }: { prompt: SubscriptionRecoveryPromptModel }) {
  return (
    <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-amber-950">{prompt.title}</h2>
          <p className="mt-1 text-sm font-medium text-amber-900">{prompt.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {prompt.actions.map((action) => (
            <Button key={`${action.label}-${action.href}`} href={action.href} variant={action.variant ?? "secondary"} className="min-h-10 justify-center px-3 text-sm">
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function SubscriptionViewPanel({
  activeBillingPeriod,
  activePaymentMode,
  activeView,
  applicationId,
  applications,
  billingEvents,
  billingSubscriptionPayments,
  currentSubscriptionState,
  entitlements,
  featurePagination,
  features,
  featuresSearch,
  featureTableRows,
  selectedMarketplaceCategory,
  organisations,
  planPagination,
  plans,
  plansPage,
  plansSearch,
  products,
  productsPage,
  productsSearch,
  roles,
  selectedMarketplacePlanIds,
  subscribersPage,
  subscribersSearch,
  subscriptions,
  userRole,
}: {
  activeBillingPeriod: "month" | "year";
  activePaymentMode: "subscription" | "one_time";
  activeView: SubscriptionView;
  applicationId: string;
  applications: OrganisationApplicationRecord[];
  billingEvents: SubscriptionBillingEvent[];
  billingSubscriptionPayments: PaymentRecord[];
  currentSubscriptionState: CurrentSubscriptionState;
  entitlements: ApplicationEntitlements;
  featurePagination: SubscriptionPagination;
  features: SubscriptionFeature[];
  featuresSearch: string;
  featureTableRows: SubscriptionFeature[];
  selectedMarketplaceCategory: string;
  organisations: OrganisationRecord[];
  planPagination: SubscriptionPagination;
  plans: SubscriptionPlan[];
  plansPage: number;
  plansSearch: string;
  products: SubscriptionProduct[];
  productsPage: number;
  productsSearch: string;
  roles: AuthorisationRole[];
  selectedMarketplacePlanIds: string[];
  subscribersPage: number;
  subscribersSearch: string;
  subscriptions: OrganisationSubscription[];
  userRole: string;
}) {
  if (activeView === "plans") {
    const filteredPlans = filterPlans(plans, plansSearch);
    const pageFromOffset = Math.floor(planPagination.offset / Math.max(planPagination.limit, 1)) + 1;
    const currentPage = Math.max(1, pageFromOffset);
    const totalPages = planPagination.has_more ? currentPage + 1 : currentPage;
    return (
      <PlansTable
        plans={filteredPlans}
        search={plansSearch}
        pagination={{
          page: currentPage,
          previousHref: subscriptionHref({ subscriptionsView: "plans", plansPage: currentPage - 1, plansSearch: plansSearch || undefined }),
          nextHref: subscriptionHref({ subscriptionsView: "plans", plansPage: currentPage + 1, plansSearch: plansSearch || undefined }),
          totalPages,
        }}
      />
    );
  }

  if (activeView === "products") {
    const filteredProducts = filterProducts(products, productsSearch);
    const pagedProducts = localTablePage(filteredProducts, productsPage);
    return (
      <ProductsTable
        products={pagedProducts.items}
        features={features}
        search={productsSearch}
        pagination={{
          page: pagedProducts.currentPage,
          previousHref: subscriptionHref({ subscriptionsView: "products", productsPage: pagedProducts.currentPage - 1, productsSearch: productsSearch || undefined }),
          nextHref: subscriptionHref({ subscriptionsView: "products", productsPage: pagedProducts.currentPage + 1, productsSearch: productsSearch || undefined }),
          totalPages: pagedProducts.totalPages,
        }}
      />
    );
  }

  if (activeView === "features") {
    const filteredFeatures = filterFeatures(featureTableRows, featuresSearch);
    const pageFromOffset = Math.floor(featurePagination.offset / Math.max(featurePagination.limit, 1)) + 1;
    const currentPage = Math.max(1, pageFromOffset);
    const totalPages = featurePagination.has_more ? currentPage + 1 : currentPage;
    return (
      <FeaturesTable
        features={filteredFeatures}
        search={featuresSearch}
        pagination={{
          page: currentPage,
          previousHref: subscriptionHref({ subscriptionsView: "features", featuresPage: currentPage - 1, featuresSearch: featuresSearch || undefined }),
          nextHref: subscriptionHref({ subscriptionsView: "features", featuresPage: currentPage + 1, featuresSearch: featuresSearch || undefined }),
          totalPages,
        }}
      />
    );
  }

  if (activeView === "entitlements") {
    const entitlementPlanIds = entitlements.plan_ids?.length ? entitlements.plan_ids : entitlements.plan_id ? [entitlements.plan_id] : [];
    const currentPlans = entitlementPlanIds.map((planId) => plans.find((plan) => plan.id === planId)?.name ?? planId);
    const entitlementFeatureNames = entitlementFeatureLabels(entitlements, features);
    return (
      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Entitlement Diagnostics</h2>
        <p className="mt-1 text-sm text-slate-600">Internal access-grant diagnostics for application {applicationId}.</p>
        <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
          {entitlementPlanIds.length ? (
            <div className="grid gap-2">
              <p><span className="font-bold">Plans:</span> {currentPlans.join(", ")}</p>
              <p><span className="font-bold">Status:</span> {entitlements.status ?? "ACTIVE"}</p>
              <p><span className="font-bold">Union features:</span> {entitlementFeatureNames.join(", ") || "No features."}</p>
            </div>
          ) : "No active entitlement set for this application."}
        </div>
      </section>
    );
  }

  if (activeView === "subscribers") {
    const filteredSubscriptions = filterSubscriptions(subscriptions, subscribersSearch);
    const pagedSubscriptions = localTablePage(filteredSubscriptions, subscribersPage);
    return (
      <SubscriptionsTable
        billingSubscriptionPayments={billingSubscriptionPayments}
        plans={plans}
        search={subscribersSearch}
        subscriptions={pagedSubscriptions.items}
        pagination={{
          page: pagedSubscriptions.currentPage,
          previousHref: subscriptionHref({ subscriptionsView: "subscribers", subscribersPage: pagedSubscriptions.currentPage - 1, subscribersSearch: subscribersSearch || undefined }),
          nextHref: subscriptionHref({ subscriptionsView: "subscribers", subscribersPage: pagedSubscriptions.currentPage + 1, subscribersSearch: subscribersSearch || undefined }),
          totalPages: pagedSubscriptions.totalPages,
        }}
      />
    );
  }

  if (activeView === "billing-events") return <BillingEventsTable billingSubscriptionPayments={billingSubscriptionPayments} currentState={currentSubscriptionState} events={billingEvents} plans={plans} subscriptions={subscriptions} />;
  if (activeView === "usage-limits") return <EmptyOperationalPanel title="Usage Limits" description="Usage metering and limit enforcement are not connected yet." />;

  return <SubscriptionMarketplace activeBillingPeriod={activeBillingPeriod} activePaymentMode={activePaymentMode} billingSubscriptionPayments={billingSubscriptionPayments} currentState={currentSubscriptionState} currentSubscriptionId={currentSubscriptionState.subscription?.id ?? entitlements.subscription_id} features={features} selectedMarketplaceCategory={selectedMarketplaceCategory} plans={plans.filter((plan) => !plan.is_internal)} products={products} roles={roles} selectedPlanIds={selectedMarketplacePlanIds} subscriptions={subscriptions} userRole={userRole} />;
}

function filterPlans(plans: SubscriptionPlan[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return plans;
  return plans.filter((plan) => [plan.id, plan.name, plan.description, plan.status, plan.billing_cycle, plan.currency].join(" ").toLowerCase().includes(normalized));
}

function filterProducts(products: SubscriptionProduct[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return products;
  return products.filter((product) => [product.id, product.service_id, product.name, product.description, product.status, product.currency, product.price_minor].join(" ").toLowerCase().includes(normalized));
}

function filterFeatures(features: SubscriptionFeature[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return features;
  return features.filter((feature) => [feature.id, feature.product_id, ...(feature.product_ids ?? []), feature.service_id ?? "", feature.feature_key, feature.name, feature.description, feature.status].join(" ").toLowerCase().includes(normalized));
}

function entitlementFeatureLabels(entitlements: ApplicationEntitlements, features: SubscriptionFeature[]) {
  const featureById = new Map(features.map((feature) => [feature.id, feature]));
  return (entitlements.features ?? []).map((feature) => featureById.get(feature.feature_id)?.name ?? "Unknown feature");
}

function entitlementPlanLabel(entitlements: ApplicationEntitlements, plans: SubscriptionPlan[]) {
  if (!entitlements.plan_id) return "";
  return plans.find((plan) => plan.id === entitlements.plan_id)?.name ?? "Unknown plan";
}

function filterSubscriptions(subscriptions: OrganisationSubscription[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return subscriptions;
  return subscriptions.filter((subscription) => [subscription.id, subscription.owner_type, subscription.owner_id, subscription.plan_id, subscription.status].join(" ").toLowerCase().includes(normalized));
}

function BillingEventsTable({ billingSubscriptionPayments, currentState, events, plans, subscriptions }: { billingSubscriptionPayments: PaymentRecord[]; currentState: CurrentSubscriptionState; events: SubscriptionBillingEvent[]; plans: SubscriptionPlan[]; subscriptions: OrganisationSubscription[] }) {
  const subscriptionOwners = new Map(subscriptions.map((subscription) => [subscription.id, `${subscription.owner_type}:${subscription.owner_id}`]));
  const planBySubscription = new Map(subscriptions.map((subscription) => [subscription.id, subscription.plan_id]));
  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));
  const sortedEvents = visibleBillingEvents(events).sort((left, right) => Date.parse(right.created_at || "") - Date.parse(left.created_at || ""));
  const paymentBillingRows = billingSubscriptionPayments.map((payment) => ({
    id: payment.id,
    eventType: "Billing statement",
    summary: billingPaymentSummary(payment),
    status: paymentStatusLabelForBilling(payment.status),
    paymentState: paymentStatusLabelForBilling(payment.status),
    owner: payment.metadata?.owner_type && payment.metadata?.owner_id ? `${payment.metadata.owner_type}:${payment.metadata.owner_id}` : payment.clientId ?? "-",
    plan: payment.metadata?.plan_name ?? payment.resourceLabel ?? payment.resourceId ?? "Subscription plan",
    provider: payment.provider || "payment-service",
    amount: `${payment.currency || "GBP"} ${((payment.amount ?? 0) / 100).toFixed(2)}`,
    reference: payment.providerPaymentId || payment.checkoutSessionId || payment.id,
    created: payment.createdAt ? new Date(payment.createdAt).toLocaleString("en-GB") : "-",
    source: "Payment billing",
  }));
  const paymentBillingPlanChanges = new Set(billingSubscriptionPayments.map((payment) => payment.metadata?.plan_change_id).filter(Boolean));
  const lifecycleRows = sortedEvents
    .filter((event) => !event.plan_change_id || !paymentBillingPlanChanges.has(event.plan_change_id))
    .map((event) => ({
    id: event.id,
    eventType: billingEventLabel(event.event_type),
    summary: billingEventSummary(event, currentState, planBySubscription, planNames),
    status: billingStatusLabel(event.status),
    paymentState: billingPaymentState(event),
    owner: subscriptionOwners.get(event.subscription_id) ?? event.subscription_id,
    plan: billingEventPlanLabel(event, currentState, planBySubscription, planNames),
    provider: event.provider || "subscription-service",
    amount: `${event.currency || "GBP"} ${((event.amount_minor ?? 0) / 100).toFixed(2)}`,
    reference: event.provider_reference || event.payment_id || event.plan_change_id || "-",
    created: event.created_at ? new Date(event.created_at).toLocaleString("en-GB") : "-",
    source: "Lifecycle fallback",
  }));
  const rows = [...paymentBillingRows, ...lifecycleRows];
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "eventType", title: "Billing Type" },
    { key: "summary", title: "Billing Summary" },
    { key: "paymentState", title: "Payment" },
    { key: "status", title: "Lifecycle" },
    { key: "owner", title: "Owner" },
    { key: "plan", title: "Plan" },
    { key: "provider", title: "Provider" },
    { key: "amount", title: "Amount" },
    { key: "reference", title: "Reference" },
    { key: "source", title: "Source" },
    { key: "created", title: "Created" },
  ];
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Billings</h2>
          <p className="mt-1 text-sm text-slate-600">Review statements for what should be paid, whether it has been paid, and the related subscription reference.</p>
        </div>
        <Button href="/dashboard/subscriptions?subscriptionsView=subscribers" variant="secondary" className="min-h-10">
          Active Subscriptions
        </Button>
      </div>
      <div className="mt-4">
        <Table columns={columns} data={rows} emptyMessage="No billings found." getRowDoubleClickHref={(row) => `/dashboard/subscriptions?subscriptionsView=billing-events&dialog=billing-details&billingId=${encodeURIComponent(String(row.id))}`} getRowHref={() => undefined} />
      </div>
    </section>
  );
}

function billingPaymentSummary(payment: PaymentRecord) {
  const plan = payment.metadata?.plan_name ?? payment.resourceLabel ?? payment.resourceId ?? "Subscription plan";
  const interval = payment.metadata?.billing_interval === "year" ? "yearly" : payment.metadata?.billing_interval === "month" ? "monthly" : payment.metadata?.billing_interval ?? "billing";
  const mode = payment.metadata?.payment_mode === "one_time" ? "one-time" : payment.metadata?.payment_mode === "subscription" ? "recurring" : "payment";
  return `${plan} - ${interval} ${mode}`;
}

function paymentStatusLabelForBilling(status: string) {
  if (status === "active" || status === "succeeded") return "Paid";
  if (status === "trialing") return "Trial";
  if (status === "cancelled" || status === "failed") return subscriptionStateLabel(status);
  return subscriptionStateLabel(status || "pending");
}

function visibleBillingEvents(events: SubscriptionBillingEvent[]) {
  const finalEvents = events.filter((event) => event.event_type === "plan_change_applied" || event.event_type === "payment_confirmed" || event.status === "applied" || event.status === "payment_confirmed");
  const finalEventIds = new Set(finalEvents.map((event) => event.id));
  const latestFinalBySubscription = new Map<string, SubscriptionBillingEvent>();
  for (const event of finalEvents) {
    const existing = latestFinalBySubscription.get(event.subscription_id);
    if (!existing || Date.parse(event.created_at || "") > Date.parse(existing.created_at || "")) {
      latestFinalBySubscription.set(event.subscription_id, event);
    }
  }
  const pendingBySubscription = new Map<string, SubscriptionBillingEvent>();
  const otherEvents: SubscriptionBillingEvent[] = [];

  for (const event of events) {
    if (finalEventIds.has(event.id)) continue;

    const isPendingCheckout = event.event_type === "checkout_created" || event.status === "checkout_pending";
    if (!isPendingCheckout) {
      otherEvents.push(event);
      continue;
    }

    const latestFinal = latestFinalBySubscription.get(event.subscription_id);
    if (latestFinal && Date.parse(latestFinal.created_at || "") >= Date.parse(event.created_at || "")) continue;

    const existing = pendingBySubscription.get(event.subscription_id);
    if (!existing || Date.parse(event.created_at || "") > Date.parse(existing.created_at || "")) {
      pendingBySubscription.set(event.subscription_id, event);
    }
  }

  return [...finalEvents, ...Array.from(pendingBySubscription.values()), ...otherEvents];
}

function billingEventPlanLabel(event: SubscriptionBillingEvent, currentState: CurrentSubscriptionState, planBySubscription: Map<string, string>, planNames: Map<string, string>) {
  const pending = currentState.pending_change;
  if (pending?.id && pending.id === event.plan_change_id && pending.to_plan_id) {
    return planNames.get(pending.to_plan_id) ?? pending.to_plan_id;
  }
  const planId = planBySubscription.get(event.subscription_id);
  return planNames.get(planId ?? "") ?? planId ?? "-";
}

function billingEventSummary(event: SubscriptionBillingEvent, currentState: CurrentSubscriptionState, planBySubscription: Map<string, string>, planNames: Map<string, string>) {
  const plan = billingEventPlanLabel(event, currentState, planBySubscription, planNames);
  const interval = billingEventInterval(event, currentState);
  const mode = billingEventPaymentMode(event);
  if (event.event_type === "checkout_created" || event.status === "checkout_pending") {
    return `${plan} - ${interval} ${mode} checkout`;
  }
  if (event.event_type === "payment_confirmed" || event.status === "payment_confirmed") {
    return `${plan} - ${interval} ${mode} payment received`;
  }
  if (event.event_type === "plan_change_applied" || event.status === "applied") {
    return `${plan} - subscription applied`;
  }
  return `${plan} - ${billingEventLabel(event.event_type)}`;
}

function billingEventInterval(event: SubscriptionBillingEvent, currentState: CurrentSubscriptionState) {
  const metadataInterval = event.metadata?.billing_period ?? event.metadata?.billing_interval ?? event.metadata?.renewal_interval;
  if (metadataInterval === "year") return "yearly";
  if (metadataInterval === "month") return "monthly";
  const pending = currentState.pending_change;
  if (pending?.id && pending.id === event.plan_change_id) return "selected-period";
  return "subscription";
}

function billingEventPaymentMode(event: SubscriptionBillingEvent) {
  const mode = event.metadata?.payment_mode;
  if (mode === "one_time") return "one-time";
  if (mode === "subscription") return "recurring";
  return "payment";
}

function billingPaymentState(event: SubscriptionBillingEvent) {
  if (event.status === "applied" || event.status === "payment_confirmed" || event.event_type === "payment_confirmed" || event.event_type === "plan_change_applied") return "Paid";
  if (event.status === "failed") return "Failed";
  if (event.status === "cancelled") return "Cancelled";
  if (event.status === "checkout_pending" || event.event_type === "checkout_created") return "Pending payment";
  return "Not paid";
}

function billingEventLabel(value: string) {
  const labels: Record<string, string> = {
    checkout_created: "Checkout created",
    payment_confirmed: "Payment confirmed",
    plan_change_applied: "Plan change applied",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function billingStatusLabel(value: string) {
  const labels: Record<string, string> = {
    applied: "Applied",
    checkout_pending: "Checkout pending",
    payment_confirmed: "Payment confirmed",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

type BillingDetailsTab = "transaction" | "plans" | "invoice";
type BillingPlanLine = {
  amount?: string;
  id?: string;
  name: string;
  planChangeId?: string;
  subscriptionId?: string;
};

function billingDetailsTab(value: string | undefined): BillingDetailsTab {
  if (value === "plans" || value === "invoice") return value;
  return "transaction";
}

function billingPlans({
  billing,
  billingPayment,
  currentState,
  planBySubscription,
  planNames,
  totalAmount,
}: {
  billing?: SubscriptionBillingEvent;
  billingPayment?: PaymentRecord;
  currentState: CurrentSubscriptionState;
  planBySubscription: Map<string, string>;
  planNames: Map<string, string>;
  totalAmount: string;
}): BillingPlanLine[] {
  const metadata = billingPayment?.metadata ?? billing?.metadata ?? {};
  const subscriptionId = billingPayment?.metadata?.subscription_id || billing?.subscription_id || "";
  const planChangeId = billingPayment?.metadata?.plan_change_id || billing?.plan_change_id || "";
  const fallbackPlanId = billingPayment?.metadata?.plan_id || (subscriptionId ? planBySubscription.get(subscriptionId) : "") || "";
  const fallbackPlanName = billingPayment?.metadata?.plan_name ?? billingPayment?.resourceLabel ?? (billing ? billingEventPlanLabel(billing, currentState, planBySubscription, planNames) : "Subscription plan");
  const planIds = metadataList(metadata, ["plan_ids", "selected_plan_ids", "bill_plan_ids"]);
  const planNamesList = metadataList(metadata, ["plan_names", "selected_plan_names", "bill_plan_names"]);
  const planAmounts = metadataList(metadata, ["plan_amounts", "selected_plan_amounts", "bill_plan_amounts"]);
  const count = Math.max(planIds.length, planNamesList.length, 1);

  return Array.from({ length: count }, (_, index) => {
    const id = planIds[index] || (index === 0 ? fallbackPlanId : "");
    const name = planNamesList[index] || (id ? planNames.get(id) : "") || (index === 0 ? fallbackPlanName : `Plan ${index + 1}`);
    return {
      amount: planAmounts[index] || (count === 1 ? totalAmount : undefined),
      id,
      name,
      planChangeId: index === 0 ? planChangeId : undefined,
      subscriptionId: index === 0 ? subscriptionId : undefined,
    };
  });
}

function metadataList(metadata: Record<string, string> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (!value) continue;
    const parsed = parseMetadataList(value);
    if (parsed.length) return parsed;
  }
  return [];
}

function parseMetadataList(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
}

function BillingDetailsPanel({ activeTab, billing, billingPayment, currentState, plans, subscriptions }: { activeTab: BillingDetailsTab; billing?: SubscriptionBillingEvent; billingPayment?: PaymentRecord; currentState: CurrentSubscriptionState; plans: SubscriptionPlan[]; subscriptions: OrganisationSubscription[] }) {
  const subscriptionOwners = new Map(subscriptions.map((subscription) => [subscription.id, `${subscription.owner_type}: ${subscription.owner_id}`]));
  const planBySubscription = new Map(subscriptions.map((subscription) => [subscription.id, subscription.plan_id]));
  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));
  const amount = billingPayment ? `${billingPayment.currency || "GBP"} ${((billingPayment.amount ?? 0) / 100).toFixed(2)}` : billing ? `${billing.currency || "GBP"} ${((billing.amount_minor ?? 0) / 100).toFixed(2)}` : "GBP 0.00";
  const paymentState = billingPayment ? paymentStatusLabelForBilling(billingPayment.status) : billing ? billingPaymentState(billing) : "Pending";
  const billPlans = billingPlans({ billing, billingPayment, currentState, planBySubscription, planNames, totalAmount: amount });
  const plan = billPlans.length === 1 ? billPlans[0].name : `${billPlans.length} plans`;
  const reference = billingPayment?.providerPaymentId || billingPayment?.checkoutSessionId || billingPayment?.id || billing?.payment_id || billing?.provider_reference || billing?.plan_change_id || billing?.id || "";
  const transactionHref = `/dashboard/payment?paymentsView=transactions&paymentsSearch=${encodeURIComponent(reference || plan)}`;
  const subscriptionId = billingPayment?.metadata?.subscription_id || billing?.subscription_id || "";
  const invoiceHref = `mailto:?subject=${encodeURIComponent(`Invoice for ${plan}`)}&body=${encodeURIComponent(`Billing statement\n\nPlans:\n${billPlans.map((item) => `- ${item.name}${item.amount ? ` (${item.amount})` : ""}`).join("\n")}\n\nAmount: ${amount}\nPayment: ${paymentState}\nReference: ${reference}`)}`;
  const lifecycleStatus = billingPayment ? paymentStatusLabelForBilling(billingPayment.status) : billing ? billingStatusLabel(billing.status) : "-";
  const created = billingPayment?.createdAt || billing?.created_at || "";
  const billingID = billingPayment?.id || billing?.id || "";
  const billingTabHref = (tab: BillingDetailsTab) => `/dashboard/subscriptions?${new URLSearchParams({
    subscriptionsView: "billing-events",
    dialog: "billing-details",
    billingId: billingID,
    billingDetailsTab: tab,
  }).toString()}`;
  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-normal text-teal-800">Billing Statement</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">{plan}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{billingPayment ? billingPaymentSummary(billingPayment) : billing ? billingEventSummary(billing, currentState, planBySubscription, planNames) : "Subscription billing statement"}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <SubscriptionDetailTile label="Amount due" value={amount} />
          <SubscriptionDetailTile label="Payment" value={paymentState} />
          <SubscriptionDetailTile label="Lifecycle" value={lifecycleStatus} />
          <SubscriptionDetailTile label="Created" value={created ? new Date(created).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"} />
        </div>
      </div>
      <TabControl
        activeValue={activeTab}
        ariaLabel="Billing details sections"
        items={[
          { value: "transaction", label: "Transaction", href: billingTabHref("transaction") },
          { value: "plans", label: "Plans", href: billingTabHref("plans") },
          { value: "invoice", label: "Invoice", href: billingTabHref("invoice") },
        ]}
      />
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        {activeTab === "transaction" ? (
          <div className="grid gap-3 text-sm text-slate-700">
            <h3 className="text-base font-black text-slate-950">Transaction</h3>
            <p><span className="font-bold">Payment transaction:</span> {billingPayment?.id || billing?.payment_id || "Not paid yet"}</p>
            <p><span className="font-bold">Payment state:</span> {paymentState}</p>
            <p><span className="font-bold">Provider:</span> {billingPayment?.provider || billing?.provider || "subscription-service"}</p>
            <p><span className="font-bold">Provider reference:</span> {reference || "Pending provider sync"}</p>
            <div>
              <Button href={transactionHref} variant="secondary" className="mt-2 min-h-11">Open Transaction</Button>
            </div>
          </div>
        ) : null}
        {activeTab === "plans" ? (
          <div className="grid gap-3 text-sm text-slate-700">
            <h3 className="text-base font-black text-slate-950">Plans</h3>
            <p className="font-semibold text-slate-600">This bill covers {billPlans.length} plan{billPlans.length === 1 ? "" : "s"}.</p>
            <div className="grid gap-3">
              {billPlans.map((billPlan, index) => {
                const planHref = billPlan.id
                  ? `/dashboard/subscriptions?subscriptionsView=plans&dialog=plan-details&planId=${encodeURIComponent(billPlan.id)}`
                  : `/dashboard/subscriptions?subscriptionsView=plans&plansSearch=${encodeURIComponent(billPlan.name)}`;
                return (
                  <div key={`${billPlan.id || billPlan.name}-${index}`} className="rounded-lg border border-stone-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-teal-800">Plan {index + 1}</p>
                        <p className="mt-1 text-lg font-black text-slate-950">{billPlan.name}</p>
                        {billPlan.amount ? <p className="mt-1 text-sm font-bold text-slate-700">{billPlan.amount}</p> : null}
                      </div>
                      <Button href={planHref} variant="secondary" className="min-h-10 w-fit">Open Plan Details</Button>
                    </div>
                    <div className="mt-3 grid gap-1 text-sm font-semibold text-slate-600">
                      <p><span className="font-bold text-slate-800">Plan ID:</span> {billPlan.id || "Not linked"}</p>
                      <p><span className="font-bold text-slate-800">Lifecycle subscription:</span> {billPlan.subscriptionId || "Not linked"}</p>
                      <p><span className="font-bold text-slate-800">Plan change:</span> {billPlan.planChangeId || "None"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {activeTab === "invoice" ? (
          <div className="grid gap-3 text-sm text-slate-700">
            <h3 className="text-base font-black text-slate-950">Invoice</h3>
            <p><span className="font-bold">Bill to:</span> {billingPayment?.metadata?.owner_type && billingPayment?.metadata?.owner_id ? `${billingPayment.metadata.owner_type}: ${billingPayment.metadata.owner_id}` : subscriptionId ? subscriptionOwners.get(subscriptionId) ?? subscriptionId : "-"}</p>
            <div>
              <p className="font-bold">Plans:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {billPlans.map((billPlan, index) => <li key={`${billPlan.id || billPlan.name}-invoice-${index}`}>{billPlan.name}{billPlan.amount ? ` - ${billPlan.amount}` : ""}</li>)}
              </ul>
            </div>
            <p><span className="font-bold">Amount due:</span> {amount}</p>
            <p><span className="font-bold">Payment state:</span> {paymentState}</p>
            <p><span className="font-bold">Billing reference:</span> {billingID || "-"}</p>
            <div>
              <Button href={invoiceHref} variant="secondary" className="mt-2 min-h-11">Send Invoice Email</Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function localTablePage<T>(items: T[], page: number, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    currentPage,
    items: items.slice(start, start + pageSize),
    totalPages,
  };
}

function selectedMarketplacePlans(value: string | string[] | undefined) {
  const raw = firstParam(value) ?? "";
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

function marketplaceSelectionHref(planId: string, selectedPlanIds: string[], options: { billingPeriod?: "month" | "year"; paymentMode?: "subscription" | "one_time" } = {}) {
  const selected = new Set(selectedPlanIds);
  if (selected.has(planId)) {
    selected.delete(planId);
  } else {
    selected.add(planId);
  }
  return subscriptionHref({
    billingPeriod: options.billingPeriod,
    paymentMode: options.paymentMode,
    selectedPlans: Array.from(selected).join(",") || undefined,
  });
}

function marketplaceRemoveHref(planId: string, selectedPlanIds: string[], options: { billingPeriod?: "month" | "year"; paymentMode?: "subscription" | "one_time" } = {}) {
  return subscriptionHref({
    billingPeriod: options.billingPeriod,
    paymentMode: options.paymentMode,
    selectedPlans: selectedPlanIds.filter((id) => id !== planId).join(",") || undefined,
  });
}

function marketplaceRenewHref(planId: string, options: { billingPeriod?: "month" | "year"; paymentMode?: "subscription" | "one_time" } = {}) {
  return `/dashboard/subscriptions/checkout?${new URLSearchParams({
    billingPeriod: options.billingPeriod ?? "month",
    paymentMode: options.paymentMode ?? "subscription",
    selectedPlans: planId,
    renewal: "true",
  }).toString()}`;
}

function planProductNames(plan: SubscriptionPlan, products: SubscriptionProduct[]) {
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  return (plan.products ?? [])
    .map((product) => productNames.get(product.product_id))
    .filter((name): name is string => Boolean(name));
}

function marketplaceCategory(plan: SubscriptionPlan, products: SubscriptionProduct[]) {
  const names = planProductNames(plan, products);
  const text = [plan.name, plan.description, ...names].join(" ").toLowerCase();
  if (text.includes("analytics")) return "Analytics";
  if (text.includes("api")) return "API Access";
  if (text.includes("booking")) return "Bookings";
  if (text.includes("payment")) return "Payments";
  if (text.includes("academy")) return "Academy Management";
  return names[0] ?? "Core";
}

function marketplaceIcon(plan: SubscriptionPlan, products: SubscriptionProduct[]): SidePanelIcon {
  const category = marketplaceCategory(plan, products).toLowerCase();
  if (category.includes("analytics")) return "transactions";
  if (category.includes("api")) return "accessKeys";
  if (category.includes("booking")) return "bookings";
  if (category.includes("payment")) return "payments";
  if (category.includes("academy")) return "academies";
  if (category.includes("public")) return "map";
  return "products";
}

function marketplaceFeatureLabels(plan: SubscriptionPlan, features: SubscriptionFeature[]) {
  const featureNames = new Map(features.map((feature) => [feature.id, feature.name]));
  const labels = (plan.features ?? [])
    .map((feature) => featureNames.get(feature.feature_id))
    .filter((name): name is string => Boolean(name));
  if (labels.length) return labels.slice(0, 4);
  return ["Monthly access", "Module entitlement", "Dashboard access", "Can be changed anytime"];
}

function moneyMinor(amount: number, currency: string) {
  if (currency === "Points") return `${amount.toLocaleString("en-GB")} Points`;
  return `${currency || "GBP"} ${(amount / 100).toFixed(0)}`;
}

function moneyMinorPrecise(amount: number, currency: string) {
  if (currency === "Points") return `${amount.toLocaleString("en-GB")} Points`;
  return `${currency || "GBP"} ${(amount / 100).toFixed(2)}`;
}

function lowestRoleLevel(roles: AuthorisationRole[]) {
  const levels = roles.map((role) => role.level).filter((level) => Number.isFinite(level));
  return levels.length ? Math.min(...levels) : 100;
}

function currentUserLevel(roles: AuthorisationRole[], userRole: string) {
  const normalized = userRole.toLowerCase();
  const roleLevel = roles.find((role) => role.key.toLowerCase() === normalized || role.name.toLowerCase() === normalized)?.level;
  if (roleLevel !== undefined) return roleLevel;
  if (normalized === "super_admin" || normalized === "admin") return 1000;
  if (normalized === "platform_admin") return 900;
  if (normalized === "academy_owner") return 500;
  if (normalized === "academy_admin") return 400;
  return lowestRoleLevel(roles);
}

function roleNameForLevel(roles: AuthorisationRole[], level: number) {
  return roles
    .slice()
    .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name))
    .find((role) => role.level === level)?.name;
}

function planTargetLevel(plan: SubscriptionPlan, roles: AuthorisationRole[]) {
  return Number.isFinite(plan.target_user_level) && plan.target_user_level > 0 ? plan.target_user_level : lowestRoleLevel(roles);
}

function unavailableSubscriptionPlanStatus(status: string) {
  return ["active", "trial", "checkout_pending", "payment_confirmed", "past_due", "suspended", "scheduled_downgrade", "cancel_at_period_end"].includes(status.toLowerCase());
}

function unavailableBillingPlanStatus(status: string) {
  return ["active", "trialing", "succeeded", "checkout_pending", "payment_confirmed", "pending"].includes(status.toLowerCase());
}

function SubscriptionPlanSummary({ currentState, plans }: { currentState: CurrentSubscriptionState; plans: SubscriptionPlan[] }) {
  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));
  const activePlanIds = (currentState.subscriptions?.length ? currentState.subscriptions : currentState.subscription ? [currentState.subscription] : [])
    .map((subscription) => subscription.plan_id)
    .filter(Boolean);
  const pending = currentState.pending_change;
  const currentPlans = activePlanIds.map((planId) => planNames.get(planId) ?? planId);
  const pendingPlan = pending?.to_plan_id ? planNames.get(pending.to_plan_id) ?? pending.to_plan_id : "";

  return (
    <div className="mb-5 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <CheckCircle2 size={20} aria-hidden />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-slate-500">Current plans</p>
          <p className="mt-1 text-base font-black text-slate-950">{currentPlans.length ? currentPlans.join(", ") : "No active subscription yet"}</p>
          {currentState.subscriptions?.length ? <p className="mt-1 text-sm font-semibold text-slate-600">{currentState.subscriptions.length} active module{currentState.subscriptions.length === 1 ? "" : "s"} with union entitlements</p> : currentState.subscription?.status ? <p className="mt-1 text-sm font-semibold text-slate-600">{subscriptionStateLabel(currentState.subscription.status)}</p> : null}
        </div>
      </div>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <ArrowRight size={20} aria-hidden />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-slate-500">Pending checkout</p>
          <p className="mt-1 text-base font-black text-slate-950">{pendingPlan || "No pending plan change"}</p>
          {pending?.status ? <p className="mt-1 text-sm font-semibold text-slate-600">{subscriptionStateLabel(pending.status)}</p> : null}
        </div>
      </div>
    </div>
  );
}

function subscriptionStateLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SubscriptionMarketplace({
  activeBillingPeriod,
  activePaymentMode,
  currentState,
  currentSubscriptionId,
  features,
  billingSubscriptionPayments,
  selectedMarketplaceCategory,
  plans,
  products,
  roles,
  selectedPlanIds,
  subscriptions,
  userRole,
}: {
  activeBillingPeriod: "month" | "year";
  activePaymentMode: "subscription" | "one_time";
  currentState: CurrentSubscriptionState;
  currentSubscriptionId?: string;
  features: SubscriptionFeature[];
  billingSubscriptionPayments: PaymentRecord[];
  selectedMarketplaceCategory: string;
  plans: SubscriptionPlan[];
  products: SubscriptionProduct[];
  roles: AuthorisationRole[];
  selectedPlanIds: string[];
  subscriptions: OrganisationSubscription[];
  userRole: string;
}) {
  const activePlanIds = new Set([
    ...subscriptions.filter((subscription) => unavailableSubscriptionPlanStatus(subscription.status)).map((subscription) => subscription.plan_id),
    ...billingSubscriptionPayments.filter((payment) => unavailableBillingPlanStatus(payment.status)).map((payment) => payment.metadata?.plan_id ?? payment.resourceId ?? "").filter(Boolean),
  ]);
  const actorLevel = currentUserLevel(roles, userRole);
  const sortedPlans = plans.slice().sort((left, right) => left.name.localeCompare(right.name));
  const selectedIds = new Set(selectedPlanIds);
  const highlightedIds = new Set([...selectedPlanIds, ...Array.from(activePlanIds)]);
  const selectedPlans = sortedPlans.filter((plan) => selectedIds.has(plan.id) && !activePlanIds.has(plan.id));
  const selectableSelectedPlanIds = selectedPlanIds.filter((planId) => !activePlanIds.has(planId));
  const subtotal = selectedPlans.reduce((total, plan) => total + plan.price_minor, 0);
  const currency = selectedPlans[0]?.currency ?? sortedPlans[0]?.currency ?? "GBP";
  const levelVisiblePlans = sortedPlans.filter((plan) => activePlanIds.has(plan.id) || actorLevel >= planTargetLevel(plan, roles));
  const categories = ["All", ...Array.from(new Set(levelVisiblePlans.map((plan) => marketplaceCategory(plan, products))))];
  const continuePlan = selectedPlans[0];
  const checkoutHref = `/dashboard/subscriptions/checkout?${new URLSearchParams({
    selectedPlans: selectableSelectedPlanIds.join(","),
  }).toString()}`;
  const selectedCategory = categories.includes(selectedMarketplaceCategory) ? selectedMarketplaceCategory : "All";
  const visiblePlans = selectedCategory === "All" ? levelVisiblePlans : levelVisiblePlans.filter((plan) => marketplaceCategory(plan, products) === selectedCategory);
  const gridItems: SubscriptionMarketplaceGridItem[] = visiblePlans.map((plan, index) => {
    const selected = highlightedIds.has(plan.id);
    const active = activePlanIds.has(plan.id);
    const targetLevel = planTargetLevel(plan, roles);
    const badge = active ? "Active" : selected ? "Added" : index === 0 ? "Popular" : "";
    return {
      actionHref: active ? marketplaceRenewHref(plan.id, { billingPeriod: activeBillingPeriod, paymentMode: activePaymentMode }) : marketplaceSelectionHref(plan.id, selectedPlanIds, { billingPeriod: activeBillingPeriod, paymentMode: activePaymentMode }),
      actionLabel: active ? "Current Plan" : undefined,
      active,
      allowed: !active && actorLevel >= targetLevel,
      badge,
      billingLabel: planBillingLabel(plan.billing_cycle),
      description: plan.description || `Add ${plan.name} to your RollFinders subscription.`,
      features: marketplaceFeatureLabels(plan, features).slice(0, 3),
      href: plan.id,
      icon: marketplaceIcon(plan, products),
      label: plan.name,
      priceLabel: moneyMinor(plan.price_minor, plan.currency),
      selected,
      targetLevel,
      targetLevelName: roleNameForLevel(roles, targetLevel),
      unavailableLabel: active ? "Current Plan" : undefined,
    };
  });

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-normal text-slate-950">Build Your Subscription</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">Choose the tools your academy needs. Billing and payment options are handled in the next step.</p>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <div className="min-w-36">
            <p className="text-xs font-black uppercase tracking-normal text-slate-500">Total</p>
            <p className="text-lg font-black text-teal-800">{moneyMinor(subtotal, currency)} <span className="text-sm font-semibold text-slate-600">/ month</span></p>
          </div>
          {continuePlan ? (
            <Button href={checkoutHref} variant="primary" className="min-h-11 justify-center bg-teal-700 px-6 text-white hover:bg-teal-800">
              Continue to billing
              <ArrowRight size={18} aria-hidden />
            </Button>
          ) : (
            <Button href="/dashboard/subscriptions" variant="primary" disabled className="min-h-11 justify-center bg-teal-700 px-6 text-white opacity-60">
              Continue to billing
              <ArrowRight size={18} aria-hidden />
            </Button>
          )}
        </div>
      </div>
      <div className="mb-4">
        <SubscriptionCategoryCombobox categories={categories} selectedCategory={selectedCategory} />
      </div>
      <SubscriptionMarketplaceGrid items={gridItems} />
    </section>
  );
}

function AvailablePlansPanel({ currentPlanId, currentState, currentSubscriptionId, features, page, plans, products }: { currentPlanId?: string; currentState: CurrentSubscriptionState; currentSubscriptionId?: string; features: SubscriptionFeature[]; page: number; plans: SubscriptionPlan[]; products: SubscriptionProduct[] }) {
  const pageSize = 6;
  const sortedPlans = plans.slice().sort((left, right) => left.price_minor - right.price_minor || left.name.localeCompare(right.name));
  const currentPlan = currentPlanId ? sortedPlans.find((plan) => plan.id === currentPlanId) : undefined;
  const totalPages = Math.max(1, Math.ceil(sortedPlans.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visiblePlans = sortedPlans.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-950">Available Plans</h2>
      </div>
      <CurrentSubscriptionNotice currentState={currentState} plans={plans} />
      <PlanFeatureComparisonCard currentPlan={currentPlan} currentPlanId={currentPlanId} currentSubscriptionId={currentSubscriptionId} features={features} plans={visiblePlans} products={products} />
      {totalPages > 1 ? (
        <Pagination
          ariaLabel="Available plans pagination"
          className="mt-5 border-t border-stone-100 pt-4"
          currentPage={currentPage}
          totalPages={totalPages}
          getPageHref={(pageNumber) => subscriptionHref({ plansPage: pageNumber })}
          showPageNumbers={false}
          showSummary
        />
      ) : null}
    </section>
  );
}

function CurrentSubscriptionNotice({ currentState, plans }: { currentState: CurrentSubscriptionState; plans: SubscriptionPlan[] }) {
  const pending = currentState.pending_change;
  const cancellation = currentState.cancellation;
  if (!pending && !cancellation) {
    return null;
  }
  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));
  const pendingPlan = pending?.to_plan_id ? planNames.get(pending.to_plan_id) ?? pending.to_plan_id : "";
  return (
    <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
      {pending ? <p>{pending.change_type} to {pendingPlan || "target plan"} is {pending.status}{pending.effective_at ? ` for ${new Date(pending.effective_at).toLocaleDateString("en-GB")}` : ""}.</p> : null}
      {cancellation ? <p className={pending ? "mt-1" : ""}>Cancellation is scheduled{cancellation.cancel_at ? ` for ${new Date(cancellation.cancel_at).toLocaleDateString("en-GB")}` : ""}.</p> : null}
    </div>
  );
}

function planBillingLabel(cycle: string) {
  if (cycle === "month") return "month";
  if (cycle === "year") return "year";
  if (cycle === "manual") return "manual";
  return cycle || "plan";
}

function planFeatureIds(plan: SubscriptionPlan) {
  return new Set((plan.features ?? []).map((feature) => feature.feature_id));
}

type ComparisonFeatureGroup = {
  productId: string;
  productName: string;
  features: SubscriptionFeature[];
};

function comparisonFeatureGroups(features: SubscriptionFeature[], products: SubscriptionProduct[]) {
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  const grouped = new Map<string, SubscriptionFeature[]>();
  for (const feature of features) {
    const current = grouped.get(feature.product_id) ?? [];
    current.push(feature);
    grouped.set(feature.product_id, current);
  }
  return Array.from(grouped.entries())
    .map(([productId, groupFeatures]): ComparisonFeatureGroup => ({
      productId,
      productName: productNames.get(productId) ?? productId,
      features: groupFeatures.slice().sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => left.productName.localeCompare(right.productName));
}

function PlanSupportCell({ supported }: { supported: boolean }) {
  if (supported) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-teal-50 p-0.5 text-teal-700" aria-label="Supported">
        <CheckCircle2 size={16} aria-hidden />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-red-50 p-0.5 text-red-600" aria-label="Not supported">
      <XCircle size={16} aria-hidden />
    </span>
  );
}

function planActionLabel(plan: SubscriptionPlan, currentPlan?: SubscriptionPlan) {
  if (!currentPlan) return "Subscribe";
  if (plan.price_minor > currentPlan.price_minor) return "Upgrade";
  if (plan.price_minor < currentPlan.price_minor) return "Downgrade";
  return "Switch Plan";
}

function PlanActionButton({ currentPlan, currentPlanId, currentSubscriptionId, plan }: { currentPlan?: SubscriptionPlan; currentPlanId?: string; currentSubscriptionId?: string; plan: SubscriptionPlan }) {
  if (plan.id === currentPlanId) {
    return null;
  }
  if (currentSubscriptionId) {
    return (
      <form action={startPlanCheckoutAction} className="mx-auto">
        <input type="hidden" name="subscriptionId" value={currentSubscriptionId} />
        <input type="hidden" name="planId" value={plan.id} />
        <Button type="submit" variant="primary" className="mx-auto min-h-9 justify-center px-3 text-xs">
          {planActionLabel(plan, currentPlan)}
        </Button>
      </form>
    );
  }
  return (
    <Button href={`/dashboard/subscriptions?subscriptionsView=subscribers&dialog=new-subscriber&planId=${encodeURIComponent(plan.id)}`} variant="primary" className="mx-auto min-h-9 justify-center px-3 text-xs">
      {planActionLabel(plan, currentPlan)}
    </Button>
  );
}

function PlanFeatureComparisonCard({ currentPlan, currentPlanId, currentSubscriptionId, features, plans, products }: { currentPlan?: SubscriptionPlan; currentPlanId?: string; currentSubscriptionId?: string; features: SubscriptionFeature[]; plans: SubscriptionPlan[]; products: SubscriptionProduct[] }) {
  const groups = comparisonFeatureGroups(features, products);
  const supportByPlan = new Map(plans.map((plan) => [plan.id, planFeatureIds(plan)]));
  if (!plans.length) {
    return <p className="mt-5 rounded-md border border-stone-200 p-4 text-sm text-slate-600">No plans found.</p>;
  }
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
      <table className="w-full min-w-[54rem] text-left text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="w-64 border-b border-r border-stone-200 px-3 py-3 align-top">
              <p className="text-lg font-black text-slate-950">Our Plans</p>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-600">Sorted by price. Services list their features.</p>
            </th>
            {plans.map((plan) => (
              <th key={plan.id} className={`min-w-36 border-b border-r border-stone-200 px-3 py-3 text-center last:border-r-0 ${plan.id === currentPlanId ? "bg-teal-50" : "bg-white"}`}>
                <p className="text-sm font-black text-slate-950">{plan.name}</p>
                <p className="mt-1 text-xl font-black text-teal-700">
                  {plan.currency} {(plan.price_minor / 100).toFixed(0)}
                  <span className="ml-1 text-xs font-semibold text-slate-500">/ {planBillingLabel(plan.billing_cycle)}</span>
                </p>
                <div className="mt-2">
                  <PlanActionButton currentPlan={currentPlan} currentPlanId={currentPlanId} currentSubscriptionId={currentSubscriptionId} plan={plan} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {groups.map((group) => (
            <tr key={group.productId} className="hover:bg-stone-50/70">
              <th className="border-r border-stone-200 px-3 py-3 text-left align-top">
                <span className="block text-[19px] font-black leading-tight text-slate-950">{group.productName}</span>
                <ul className="mt-2 grid gap-1.5">
                  {group.features.map((feature) => (
                    <li key={feature.id} className="flex items-start gap-2 text-[14px] font-semibold leading-5 text-slate-700">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-100 ring-1 ring-teal-500" aria-hidden />
                      <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>
              </th>
              {plans.map((plan) => (
                <td key={`${plan.id}:${group.productId}`} className="border-r border-stone-100 px-3 py-3 text-center align-top last:border-r-0">
                  <div className="grid gap-1.5">
                    {group.features.map((feature) => (
                      <span key={`${plan.id}:${feature.id}`} className="flex min-h-5 items-center justify-center">
                        <PlanSupportCell supported={supportByPlan.get(plan.id)?.has(feature.id) ?? false} />
                      </span>
                    ))}
                  </div>
                </td>
              ))}
            </tr>
          ))}
          {!groups.length ? (
            <tr>
              <td colSpan={plans.length + 1} className="px-4 py-8 text-center text-sm font-semibold text-slate-600">No features found.</td>
            </tr>
          ) : null}
          <tr className="bg-white">
            <th className="border-r border-t border-stone-200 px-3 py-4 text-left align-middle">
              <span className="text-sm font-black text-slate-950">Choose Plan</span>
            </th>
            {plans.map((plan) => (
              <td key={`${plan.id}:action`} className={`border-r border-t border-stone-100 px-3 py-4 text-center align-middle last:border-r-0 ${plan.id === currentPlanId ? "bg-teal-50" : "bg-white"}`}>
                <PlanActionButton currentPlan={currentPlan} currentPlanId={currentPlanId} currentSubscriptionId={currentSubscriptionId} plan={plan} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CreateSubscriptionPanel({
  applicationId,
  applications,
  billingPeriod,
  entitlements,
  features,
  organisations,
  paymentMode,
  plans,
}: {
  applicationId: string;
  applications: OrganisationApplicationRecord[];
  billingPeriod: "month" | "year";
  entitlements: ApplicationEntitlements;
  features: SubscriptionFeature[];
  organisations: OrganisationRecord[];
  paymentMode: "subscription" | "one_time";
  plans: SubscriptionPlan[];
}) {
  const entitlementFeatures = entitlementFeatureLabels(entitlements, features);
  const entitlementPlan = entitlementPlanLabel(entitlements, plans);
  const activeFeatureNames = Array.from(new Set(entitlementFeatures)).filter(Boolean);
  const firstSelectablePlanId = plans[0]?.id ?? "";
  const defaultSelectedPlanId = firstSelectablePlanId;
  const planFeatureNames = (plan: SubscriptionPlan) => {
    const featureById = new Map(features.map((feature) => [feature.id, feature.name]));
    const ids = [...(plan.included_feature_ids ?? []), ...(plan.features ?? []).map((feature) => feature.feature_id)];
    return Array.from(new Set(ids.map((id) => featureById.get(id)).filter((name): name is string => Boolean(name))));
  };
  const previewFeatureNames = Array.from(new Set([...activeFeatureNames, ...plans.flatMap(planFeatureNames)]));
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Create subscription</h2>
      <form action={createSubscriptionAction} className="mt-4 grid gap-3">
        <input type="hidden" name="paymentMode" value={paymentMode} />
        <input type="hidden" name="billingPeriod" value={billingPeriod} />
        <ComboboxField
          defaultValue={applicationId}
          label="Application"
          listId="subscription-application-options"
          name="applicationId"
          options={applications.map((application) => ({ label: `${application.name} (${application.id})`, value: application.id }))}
        />
        <ComboboxField
          defaultValue={organisations[0]?.id ?? "org_rollfinders"}
          label="Organisation"
          listId="subscription-organisation-options"
          name="organisationId"
          options={organisations.map((organisation) => ({ label: `${organisation.name} (${organisation.id})`, value: organisation.id }))}
        />
        <fieldset className="grid gap-2">
          <legend className="text-sm font-bold text-slate-700">Plans</legend>
          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border border-stone-200 bg-white p-2">
            {plans.map((plan) => {
              const featureNames = planFeatureNames(plan);
              return (
                <label key={plan.id} className="flex items-start gap-3 rounded-md border border-stone-200 bg-white p-3 text-sm text-slate-700">
                  <input className="mt-1 h-4 w-4 accent-teal-700" type="checkbox" name="planIds" value={plan.id} defaultChecked={plan.id === defaultSelectedPlanId} />
                  <span className="grid gap-1">
                    <span className="font-black text-slate-950">{plan.name}</span>
                    <span>{plan.currency} {(plan.price_minor / 100).toFixed(2)} / {plan.billing_cycle}</span>
                    {featureNames.length ? <span className="text-xs text-slate-500">{featureNames.join(", ")}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button type="submit" variant="primary" className="min-h-11 justify-center">
          <Plus size={18} aria-hidden />
          Create subscriptions
        </Button>
      </form>
      <div className="mt-6">
        <h3 className="text-sm font-black uppercase text-slate-500">Active entitlement feed</h3>
        <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          {entitlements.plan_id ? `${entitlementPlan}: ${activeFeatureNames.join(", ") || "No features."}` : "No active entitlement set for this application."}
        </p>
        <h3 className="mt-4 text-sm font-black uppercase text-slate-500">Available union preview</h3>
        <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          {previewFeatureNames.length ? previewFeatureNames.join(", ") : "No features available from the listed plans."}
        </p>
      </div>
    </section>
  );
}

function SubscriberForm({ plans, subscription }: { plans: SubscriptionPlan[]; subscription: OrganisationSubscription }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Edit subscriber</h2>
      <form action={updateSubscriberAction} className="mt-4 grid gap-3">
        <input type="hidden" name="subscriptionId" value={subscription.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadOnlyField label="Owner Type" value={subscription.owner_type} />
          <ReadOnlyField label="Owner ID" value={subscription.owner_id} />
        </div>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Plan
          <select name="planId" defaultValue={subscription.plan_id} className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2">
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
        </label>
        <SubscriberStatusField defaultValue={subscription.status} />
        <SubscriptionSubmitButton label="Save subscriber" pendingLabel="Saving..." />
      </form>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <div className="flex min-h-11 items-center rounded-md border border-stone-200 bg-stone-100 px-3 py-2 font-medium text-slate-700">{value}</div>
    </div>
  );
}

function SubscriberStatusField({ defaultValue = "ACTIVE" }: { defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      Status
      <select name="status" defaultValue={defaultValue} className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2">
        <option value="ACTIVE">Active</option>
        <option value="TRIAL">Trial</option>
        <option value="PAST_DUE">Past due</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="EXPIRED">Expired</option>
      </select>
    </label>
  );
}

function ComboboxField({ defaultValue = "", label, listId, name, options }: { defaultValue?: string; label: string; listId: string; name: string; options: { label: string; value: string }[] }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <input name={name} list={listId} defaultValue={defaultValue} className="min-h-11 rounded-md border border-stone-300 px-3 py-2" />
      <datalist id={listId}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </datalist>
    </label>
  );
}

function EmptyOperationalPanel({ description, title }: { description: string; title: string }) {
  return (
    <section className="mt-7 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
    </section>
  );
}

function Field({ defaultValue = "", label, name, type = "text" }: { defaultValue?: string; label: string; name: string; type?: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className="min-h-11 rounded-md border border-stone-300 px-3 py-2" />
    </label>
  );
}

function StatusField({ defaultValue = "ACTIVE" }: { defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      Status
      <select name="status" defaultValue={defaultValue} className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2">
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Suspended</option>
        <option value="RETIRED">Retired</option>
      </select>
    </label>
  );
}

function CurrencyField() {
  return (
    <div className="grid gap-1 text-sm font-bold text-slate-700">
      <span>Currency</span>
      <input type="hidden" name="currency" value="GBP" />
      <div className="flex min-h-11 items-center rounded-md border border-stone-200 bg-stone-100 px-3 py-2 text-slate-700">
        GBP
      </div>
    </div>
  );
}

function billingCycleLabel(cycle: string) {
  return cycle.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function BillingCycleField({ cycles, defaultValue = "month" }: { cycles: SubscriptionBillingCycle[]; defaultValue?: string }) {
  const fallback = [
    { key: "free", name: "Free" },
    { key: "month", name: "Month" },
    { key: "year", name: "Year" },
    { key: "manual", name: "Manual" },
  ];
  const seen = new Set<string>();
  const options = (cycles.length ? cycles : fallback).filter((cycle) => {
    if (!cycle.key || seen.has(cycle.key)) return false;
    seen.add(cycle.key);
    return true;
  });
  const selected = options.some((cycle) => cycle.key === defaultValue) ? defaultValue : options[0]?.key ?? "month";
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      Billing cycle
      <select name="billingCycle" defaultValue={selected} className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2">
        {options.map((cycle) => <option key={cycle.key} value={cycle.key}>{cycle.name || billingCycleLabel(cycle.key)}</option>)}
      </select>
    </label>
  );
}

function TargetUserLevelField({ defaultValue, roles }: { defaultValue: string; roles: AuthorisationRole[] }) {
  const options = roles
    .slice()
    .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name))
    .filter((role, index, sorted) => sorted.findIndex((item) => item.level === role.level) === index);
  const fallbackLevel = lowestRoleLevel(roles);
  const selected = options.some((role) => String(role.level) === defaultValue) ? defaultValue : String(fallbackLevel);
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      Target user level
      <input type="hidden" name="lowestUserLevel" value={fallbackLevel} />
      <select name="targetUserLevel" defaultValue={selected} className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2">
        {options.length ? options.map((role) => (
          <option key={role.id} value={role.level}>Level {role.level} ({role.name})</option>
        )) : (
          <option value={fallbackLevel}>Level {fallbackLevel}</option>
        )}
      </select>
      <span className="text-xs font-semibold leading-5 text-slate-500">Only users with this role level or higher can add the plan.</span>
    </label>
  );
}

function InternalPlanField({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-slate-700">
      <input
        name="isInternal"
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 rounded border-stone-300 text-teal-700"
      />
      <span>
        <span className="block font-black text-slate-800">Internal plan</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
          Hide this plan from academy and user plan selection, but keep it available for admin assignment.
        </span>
      </span>
    </label>
  );
}

function serviceOptions(features: AssignableUserFeature[]): AutoCompleteTextFieldOption[] {
  return features
    .map((feature) => ({
      id: feature.key,
      label: feature.name,
      meta: feature.key,
      description: `${feature.permissions.length} permissions`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

const productCurrencyOptions: AutoCompleteTextFieldOption[] = [
  { id: "GBP", label: "GBP", description: "British Pound" },
  { id: "Points", label: "Points", description: "RollFinders points" },
];

function CreateProductForm({ assignableFeatures, productFeatures }: { assignableFeatures: AssignableUserFeature[]; productFeatures: SubscriptionFeature[] }) {
  return <ProductForm action={createProductAction} assignableFeatures={assignableFeatures} buttonLabel="Create product" productFeatures={productFeatures} />;
}

function ProductForm({ action, assignableFeatures, buttonLabel, product, productFeatures }: { action: (formData: FormData) => void | Promise<void>; assignableFeatures: AssignableUserFeature[]; buttonLabel: string; product?: SubscriptionProduct; productFeatures: SubscriptionFeature[] }) {
  return (
    <form action={action} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      <h2 className="text-lg font-black text-slate-950">{product ? "Edit product" : "New product"}</h2>
      <div className="mt-4 grid gap-3">
        <Field name="name" label="Product Name" defaultValue={product?.name ?? ""} />
        <ProductFeatureFields assignableFeatures={assignableFeatures} existingFeatures={productFeatures} selectedServiceId={product?.service_id ?? assignableFeatures[0]?.key ?? ""} />
        <div className="grid gap-1">
          <div className="grid items-start gap-3 sm:grid-cols-[10rem_12rem]">
            <AutoCompleteTextField
              emptyMessage="No currency found."
              label="Currency"
              maxResults={5}
              name="currency"
              options={productCurrencyOptions}
              placeholder="Search currency"
              selectedId={product?.currency ?? "GBP"}
            />
            <label className="grid min-w-0 gap-1 text-sm font-bold text-slate-700">
              Product monthly price minor
              <input
                type="number"
                min="0"
                name="priceMinor"
                defaultValue={String(product?.price_minor ?? 0)}
                className="min-h-11 w-32 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium focus:border-teal-700 focus:outline-none"
              />
            </label>
          </div>
          <span className="text-xs font-semibold leading-5 text-slate-500">Minor units, for example GBP 29.00 is 2900.</span>
        </div>
        <Field name="description" label="Description" defaultValue={product?.description ?? ""} />
        {product ? <StatusField defaultValue={product.status} /> : null}
        <Button type="submit" variant="primary" className="min-h-11 justify-center"><Plus size={18} aria-hidden />{buttonLabel}</Button>
      </div>
    </form>
  );
}

function CreateFeatureForm({ features, products }: { features: SubscriptionFeature[]; products: SubscriptionProduct[] }) {
  return <FeatureForm action={createFeatureAction} buttonLabel="Create plan feature" features={features} products={products} />;
}

function FeatureForm({ action, buttonLabel, feature, features, products }: { action: (formData: FormData) => void | Promise<void>; buttonLabel: string; feature?: SubscriptionFeature; features: SubscriptionFeature[]; products: SubscriptionProduct[] }) {
  return (
    <form action={action} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {feature ? <input type="hidden" name="featureId" value={feature.id} /> : null}
      <h2 className="text-lg font-black text-slate-950">{feature ? "Edit plan feature" : "New plan feature"}</h2>
      <div className="mt-4 grid gap-3">
        <PlanFeatureEditFields feature={feature} features={features} products={products} />
        {feature ? <StatusField defaultValue={feature.status} /> : null}
        <Button type="submit" variant="primary" className="min-h-11 justify-center"><Plus size={18} aria-hidden />{buttonLabel}</Button>
      </div>
    </form>
  );
}

function planProductIds(plan: SubscriptionPlan) {
  return plan.included_product_ids ?? plan.products?.map((product) => product.product_id) ?? [];
}

function planFeatureIdsForForm(plan: SubscriptionPlan) {
  return plan.included_feature_ids ?? plan.features?.map((feature) => feature.feature_id) ?? [];
}

function importPlanOptions(plans: SubscriptionPlan[], currentPlanId?: string) {
  return plans
    .filter((plan) => plan.id !== currentPlanId)
    .map((plan) => ({ id: plan.id, name: plan.name, featureIds: planFeatureIdsForForm(plan) }))
    .filter((plan) => plan.featureIds.length > 0);
}

function CreatePlanForm({ billingCycles, compact = false, features, importPlans, roles }: { billingCycles: SubscriptionBillingCycle[]; compact?: boolean; features: SubscriptionFeature[]; importPlans: SubscriptionPlan[]; roles: AuthorisationRole[] }) {
  return <PlanForm action={createPlanAction} billingCycles={billingCycles} buttonLabel="Create" compact={compact} features={features} importPlans={importPlans} pendingLabel="Creating..." roles={roles} />;
}

function PlanForm({ action, billingCycles, buttonLabel, compact = false, features, importPlans, pendingLabel, plan, roles }: { action: (formData: FormData) => void | Promise<void>; billingCycles: SubscriptionBillingCycle[]; buttonLabel: string; compact?: boolean; features: SubscriptionFeature[]; importPlans: SubscriptionPlan[]; pendingLabel: string; plan?: SubscriptionPlan; roles: AuthorisationRole[] }) {
  const selectedFeatureIds = new Set(plan ? planFeatureIdsForForm(plan) : []);
  const availableImportPlans = importPlanOptions(importPlans, plan?.id);
  const planValue = plan ? { ...plan, target_user_level: planTargetLevel(plan, roles) } : undefined;
  return <PlanWizardForm action={action} billingCycles={billingCycles} buttonLabel={buttonLabel} features={features} importPlans={availableImportPlans} pendingLabel={pendingLabel} plan={planValue} roles={roles} selectedFeatureIds={Array.from(selectedFeatureIds)} />;
}

function PlansTable({ pagination, plans, search }: { pagination: { page: number; previousHref: string; nextHref: string; totalPages: number }; plans: SubscriptionPlan[]; search: string }) {
  const rows = plans.map((plan) => ({
    id: plan.id,
    planId: plan.id,
    name: plan.name,
    description: plan.description || "No description",
    price: currencyLabel(plan),
    billing: plan.billing_cycle,
    products: String(plan.products?.length ?? plan.included_product_ids?.length ?? 0),
    visibility: plan.is_internal ? "Internal" : "Public",
    status: plan.status,
  }));
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "name", title: "Plan" },
    { key: "description", title: "Description" },
    { key: "price", title: "Price" },
    { key: "billing", title: "Billing" },
    { key: "products", title: "Products" },
    { key: "visibility", title: "Visibility" },
    { key: "status", title: "Status" },
    { key: "actions", title: "Actions", headerClassName: "text-right", className: "text-right", render: (_value, row) => <PlanActions planId={String(row.planId)} status={String(row.status)} /> },
  ];
  return (
    <DataTableWithSearch
      title="Plans"
      description="Each plan grants only the selected feature IDs."
      search={{
        action: "/dashboard/subscriptions",
        name: "plansSearch",
        value: search,
        placeholder: "Search plans",
        hiddenFields: { subscriptionsView: "plans" },
      }}
      headerActions={
        <Button href="/dashboard/subscriptions?subscriptionsView=plans&dialog=new-plan" variant="primary" className="min-h-12 shadow-sm">
          <Plus size={18} aria-hidden />
          New Plan
        </Button>
      }
      columns={columns}
      data={rows}
      emptyMessage="No plans found."
      getRowDoubleClickHref={(row) => `/dashboard/subscriptions?subscriptionsView=plans&dialog=plan-details&planId=${encodeURIComponent(String(row.planId))}`}
      getRowHref={() => undefined}
      pagination={pagination}
      minWidthClassName="min-w-[760px]"
    />
  );
}

function PlanDetailsPanel({ features, plan, products, roles }: { features: SubscriptionFeature[]; plan: SubscriptionPlan; products: SubscriptionProduct[]; roles: AuthorisationRole[] }) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const featureById = new Map(features.map((feature) => [feature.id, feature]));
  const planProductIDs = planProductIds(plan);
  const productNames = planProductIDs.map((productID) => productById.get(productID)?.name ?? productID);
  const featureRows = (plan.features ?? []).map((feature) => {
    const fullFeature = featureById.get(feature.feature_id);
    return {
      id: feature.feature_id,
      name: fullFeature?.name ?? feature.feature_id,
      description: fullFeature?.description || "No description",
      service: fullFeature?.service_id ?? feature.service_id ?? "-",
    };
  });
  const targetLevel = planTargetLevel(plan, roles);
  const targetRole = roles.slice().sort((left, right) => left.level - right.level).find((role) => role.level >= targetLevel);

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-normal text-teal-800">Subscription plan</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">{plan.name}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{plan.description || "No description has been added for this plan."}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <SubscriptionDetailTile label="Price" value={currencyLabel(plan)} />
          <SubscriptionDetailTile label="Billing" value={planBillingLabel(plan.billing_cycle)} />
          <SubscriptionDetailTile label="Visibility" value={plan.is_internal ? "Internal" : "Public"} />
          <SubscriptionDetailTile label="Status" value={subscriptionStateLabel(plan.status)} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="text-base font-black text-slate-950">Access Level</h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">Users need level {targetLevel} or higher to add this plan.</p>
          <p className="mt-1 text-sm font-bold text-teal-800">{targetRole?.name ?? "Lowest configured user level"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="text-base font-black text-slate-950">Products</h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">{productNames.length ? productNames.join(", ") : "No products attached."}</p>
        </div>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="text-base font-black text-slate-950">Feature Grants</h3>
        {featureRows.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-normal text-slate-500">
                <tr>
                  <th className="px-3 py-2">Feature</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {featureRows.map((feature) => (
                  <tr key={feature.id}>
                    <td className="px-3 py-3 font-bold text-slate-950">{feature.name}</td>
                    <td className="px-3 py-3 text-slate-600">{feature.description}</td>
                    <td className="px-3 py-3 text-slate-600">{feature.service}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm font-semibold text-slate-600">No feature grants are attached to this plan.</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button href={`/dashboard/subscriptions?subscriptionsView=plans&dialog=edit-plan&planId=${encodeURIComponent(plan.id)}`} variant="primary" className="min-h-11">
          <Edit3 size={18} aria-hidden />
          Edit Plan
        </Button>
      </div>
    </section>
  );
}

function PlanActions({ planId, status }: { planId: string; status: string }) {
  const suspended = status === "INACTIVE";
  return (
    <ActionMenu label="Open plan actions">
      <Link href={`/dashboard/subscriptions?subscriptionsView=plans&dialog=edit-plan&planId=${encodeURIComponent(planId)}`} className={menuItemClass}>
        <Edit3 size={18} aria-hidden />
        Edit Plan
      </Link>
      <form action={suspendPlanAction}>
        <input type="hidden" name="planId" value={planId} />
        <button type="submit" disabled={suspended} className={menuItemClass}>
          <PauseCircle size={18} aria-hidden />
          Suspend Plan
        </button>
      </form>
      <form action={deletePlanAction}>
        <input type="hidden" name="planId" value={planId} />
        <button type="submit" className={dangerMenuItemClass}>
          <Trash2 size={18} aria-hidden />
          Delete Plan
        </button>
      </form>
    </ActionMenu>
  );
}

function ProductsTable({ features, pagination, products, search }: { features: SubscriptionFeature[]; pagination: { page: number; previousHref: string; nextHref: string; totalPages: number }; products: SubscriptionProduct[]; search: string }) {
  const rows = products.map((product) => ({
    id: product.id,
    productId: product.id,
    product: product.name,
    service: product.service_id,
    price: product.currency === "Points" ? `${product.price_minor.toLocaleString("en-GB")} Points` : `${product.currency || "GBP"} ${((product.price_minor ?? 0) / 100).toFixed(2)}`,
    status: product.status,
    features: features.filter((feature) => feature.product_id === product.id).length.toString(),
  }));
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "product", title: "Product" },
    { key: "service", title: "Service" },
    { key: "price", title: "Price" },
    { key: "features", title: "Features" },
    { key: "status", title: "Status" },
    { key: "actions", title: "Actions", headerClassName: "text-right", className: "text-right", render: (_value, row) => <ProductActions productId={String(row.productId)} status={String(row.status)} /> },
  ];
  return (
    <DataTableWithSearch
      title="Products"
      description="Manage products that group subscription features."
      search={{
        action: "/dashboard/subscriptions",
        name: "productsSearch",
        value: search,
        placeholder: "Search products",
        hiddenFields: { subscriptionsView: "products" },
      }}
      headerActions={
        <Button href="/dashboard/subscriptions?subscriptionsView=products&dialog=new-product" variant="primary" className="min-h-12 shadow-sm">
          <Plus size={18} aria-hidden />
          New Product
        </Button>
      }
      columns={columns}
      data={rows}
      emptyMessage="No subscription products found."
      getRowHref={() => undefined}
      pagination={pagination}
    />
  );
}

function ProductActions({ productId, status }: { productId: string; status: string }) {
  const suspended = status === "INACTIVE";
  return (
    <ActionMenu label="Open product actions">
      <Link href={`/dashboard/subscriptions?subscriptionsView=products&dialog=edit-product&productId=${encodeURIComponent(productId)}`} className={menuItemClass}>
        <Edit3 size={18} aria-hidden />
        Edit Product
      </Link>
      <form action={suspendProductAction}>
        <input type="hidden" name="productId" value={productId} />
        <button type="submit" disabled={suspended} className={menuItemClass}>
          <PauseCircle size={18} aria-hidden />
          Suspend Product
        </button>
      </form>
      <form action={deleteProductAction}>
        <input type="hidden" name="productId" value={productId} />
        <button type="submit" className={dangerMenuItemClass}>
          <Trash2 size={18} aria-hidden />
          Delete Product
        </button>
      </form>
    </ActionMenu>
  );
}

function FeaturesTable({ features, pagination, search }: { features: SubscriptionFeature[]; pagination: { page: number; previousHref: string; nextHref: string; totalPages: number }; search: string }) {
  const rows = features.map((feature) => ({
    id: feature.id,
    featureId: feature.id,
    name: feature.name,
    description: feature.description || "No description",
    controlled: feature.subscription_controlled ? "Subscription" : "IAM only",
    status: feature.status,
  }));
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "name", title: "Name" },
    { key: "description", title: "Description" },
    { key: "controlled", title: "Access" },
    { key: "status", title: "Status" },
    { key: "actions", title: "Action", headerClassName: "text-right", className: "text-right", render: (_value, row) => <FeatureActions featureId={String(row.featureId)} status={String(row.status)} /> },
  ];
  return (
    <DataTableWithSearch
      title="Plan Features"
      description="Manage product entitlement features that plans can grant."
      search={{
        action: "/dashboard/subscriptions",
        name: "featuresSearch",
        value: search,
        placeholder: "Search features",
        hiddenFields: { subscriptionsView: "features" },
      }}
      headerActions={
        <Button href="/dashboard/subscriptions?subscriptionsView=features&dialog=new-feature" variant="primary" className="min-h-12 shadow-sm">
          <Plus size={18} aria-hidden />
          New Plan Feature
        </Button>
      }
      columns={columns}
      data={rows}
      emptyMessage="No plan features found."
      getRowHref={() => undefined}
      pagination={pagination}
    />
  );
}

function FeatureActions({ featureId, status }: { featureId: string; status: string }) {
  const disabled = status === "INACTIVE";
  return (
    <ActionMenu label="Open feature actions">
      <Link href={`/dashboard/subscriptions?subscriptionsView=features&dialog=edit-feature&featureId=${encodeURIComponent(featureId)}`} className={menuItemClass}>
        <Edit3 size={18} aria-hidden />
        Edit Plan Feature
      </Link>
      <form action={disableFeatureAction}>
        <input type="hidden" name="featureId" value={featureId} />
        <button type="submit" disabled={disabled} className={menuItemClass}>
          <PauseCircle size={18} aria-hidden />
          Disable Feature
        </button>
      </form>
      <form action={deleteFeatureAction}>
        <input type="hidden" name="featureId" value={featureId} />
        <button type="submit" className={dangerMenuItemClass}>
          <Trash2 size={18} aria-hidden />
          Delete Feature
        </button>
      </form>
    </ActionMenu>
  );
}

function SubscriptionsTable({ billingSubscriptionPayments, pagination, plans, search, subscriptions }: { billingSubscriptionPayments: PaymentRecord[]; pagination: { page: number; previousHref: string; nextHref: string; totalPages: number }; plans: SubscriptionPlan[]; search: string; subscriptions: OrganisationSubscription[] }) {
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const lifecycleRows = subscriptions.map((subscription) => ({
    id: subscription.id,
    actionsEnabled: true,
    source: "Lifecycle",
    subscriptionId: subscription.id,
    amount: subscriptionPlanAmount(planById.get(subscription.plan_id)),
    billing: subscriptionPlanBilling(planById.get(subscription.plan_id)),
    owner: subscriptionOwnerLabel(subscription),
    plan: planById.get(subscription.plan_id)?.name ?? subscription.plan_id,
    renews: formatSubscriptionDate(subscription.billing_period_end),
    started: formatSubscriptionDate(subscription.billing_period_start),
    status: subscription.status,
  }));
  const billingRows = billingSubscriptionPayments.map((payment) => ({
    id: `billing-${payment.id}`,
    actionsEnabled: false,
    source: "Payment billing",
    subscriptionId: payment.id,
    amount: `${payment.currency} ${(payment.amount / 100).toFixed(2)}`,
    billing: payment.metadata?.billing_interval === "year" ? "Yearly" : payment.metadata?.billing_interval === "month" ? "Monthly" : payment.metadata?.billing_interval ?? "-",
    owner: payment.metadata?.owner_type && payment.metadata?.owner_id ? `${payment.metadata.owner_type}: ${payment.metadata.owner_id}` : payment.clientId ?? "-",
    plan: payment.metadata?.plan_name ?? payment.resourceLabel ?? payment.resourceId ?? "Subscription plan",
    renews: "-",
    started: formatSubscriptionDate(payment.createdAt),
    status: payment.status,
  }));
  const billingIds = new Set(billingRows.map((row) => row.subscriptionId));
  const rows = [...billingRows, ...lifecycleRows.filter((row) => !billingIds.has(row.subscriptionId))];
  const visibleRows = filterSubscriptionRows(rows, search);
  const activeCount = visibleRows.filter((subscription) => ["active", "succeeded"].includes(subscription.status.toLowerCase())).length;
  const pendingCount = visibleRows.filter((subscription) => ["pending", "checkout_pending", "trial", "trialing", "incomplete"].includes(subscription.status.toLowerCase())).length;
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "plan", title: "Subscription", render: (_value, row) => (
      <div className="grid gap-1">
        <span className="font-black text-slate-950">{String(row.plan)}</span>
        <span className="font-mono text-xs font-semibold text-slate-500">{String(row.subscriptionId)}</span>
      </div>
    ) },
    { key: "owner", title: "Owner" },
    { key: "amount", title: "Amount" },
    { key: "billing", title: "Billing" },
    { key: "status", title: "Status" },
    { key: "started", title: "Started" },
    { key: "renews", title: "Renews / Ends" },
    { key: "source", title: "Source" },
    { key: "actions", title: "Action", headerClassName: "text-right", className: "text-right", render: (_value, row) => row.actionsEnabled ? <SubscriberActions status={String(row.status)} subscriptionId={String(row.subscriptionId)} /> : <span className="text-xs font-bold text-slate-500">Billing record</span> },
  ];
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SubscriptionSummaryTile label="Total subscriptions" value={visibleRows.length.toLocaleString("en-GB")} />
        <SubscriptionSummaryTile label="Active" value={activeCount.toLocaleString("en-GB")} />
        <SubscriptionSummaryTile label="Pending / trial" value={pendingCount.toLocaleString("en-GB")} />
      </div>
      <DataTableWithSearch
        title="Active Subscriptions"
        description="Review subscriptions by application, plan, billing period, and lifecycle state."
        search={{
          action: "/dashboard/subscriptions",
          name: "subscribersSearch",
          value: search,
          placeholder: "Search subscriptions by owner, plan or status",
          hiddenFields: { subscriptionsView: "subscribers" },
        }}
        headerActions={
          <Button href="/dashboard/subscriptions?subscriptionsView=subscribers&dialog=new-subscriber" variant="primary" className="min-h-12 shadow-sm">
            <Plus size={18} aria-hidden />
            Assign Subscription
          </Button>
        }
        columns={columns}
        data={visibleRows}
        emptyMessage="No subscriptions found."
        getRowDoubleClickHref={(row) => `/dashboard/subscriptions?subscriptionsView=subscribers&dialog=subscription-details&subscriptionId=${encodeURIComponent(String(row.subscriptionId))}`}
        getRowHref={() => undefined}
        pagination={pagination}
      />
    </div>
  );
}

function SubscriptionSummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function subscriptionOwnerLabel(subscription: OrganisationSubscription) {
  return `${subscription.owner_type}: ${subscription.owner_id}`;
}

function subscriptionPlanAmount(plan?: SubscriptionPlan) {
  if (!plan) return "-";
  return `${plan.currency} ${(plan.price_minor / 100).toFixed(2)}`;
}

function subscriptionPlanBilling(plan?: SubscriptionPlan) {
  if (!plan) return "-";
  return plan.billing_cycle === "year" ? "Yearly" : plan.billing_cycle === "month" ? "Monthly" : plan.billing_cycle || "-";
}

function formatSubscriptionDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function filterSubscriptionRows<T extends { amount: string; billing: string; owner: string; plan: string; source: string; status: string; subscriptionId: string }>(rows: T[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter((row) => [row.subscriptionId, row.owner, row.plan, row.amount, row.billing, row.status, row.source].join(" ").toLowerCase().includes(normalized));
}

function SubscriptionDetailsPanel({ billingSubscription, features, lifecycleSubscription, plans }: { billingSubscription?: PaymentRecord; features: SubscriptionFeature[]; lifecycleSubscription?: OrganisationSubscription; plans: SubscriptionPlan[] }) {
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const billingPlanId = billingSubscription?.metadata?.plan_id ?? billingSubscription?.resourceId;
  const plan = billingPlanId ? planById.get(billingPlanId) : lifecycleSubscription ? planById.get(lifecycleSubscription.plan_id) : undefined;
  const planName = billingSubscription?.metadata?.plan_name ?? billingSubscription?.resourceLabel ?? plan?.name ?? lifecycleSubscription?.plan_id ?? "Subscription plan";
  const amount = billingSubscription ? `${billingSubscription.currency} ${(billingSubscription.amount / 100).toFixed(2)}` : subscriptionPlanAmount(plan);
  const billing = billingSubscription ? (billingSubscription.metadata?.billing_interval === "year" ? "Yearly" : billingSubscription.metadata?.billing_interval === "month" ? "Monthly" : billingSubscription.metadata?.billing_interval ?? "-") : subscriptionPlanBilling(plan);
  const paymentMode = billingSubscription?.metadata?.payment_mode === "one_time" ? "One-time payment" : billingSubscription?.metadata?.payment_mode === "subscription" ? "Recurring subscription" : "Subscription";
  const status = billingSubscription?.status ?? lifecycleSubscription?.status ?? "-";
  const featureNames = subscriptionPlanFeatureNames(plan, features);
  const transactionHref = `/dashboard/payment?paymentsView=transactions&paymentsSearch=${encodeURIComponent(billingSubscription?.id ?? billingSubscription?.providerPaymentId ?? planName)}`;
  const billingEventsHref = `/dashboard/subscriptions?subscriptionsView=billing-events`;
  const planHref = `/dashboard/subscriptions?subscriptionsView=plans&plansSearch=${encodeURIComponent(planName)}`;
  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-normal text-teal-800">Subscribed plan</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">{planName}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{plan?.description || "Subscription access purchased for this application."}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <SubscriptionDetailTile label="Amount" value={amount} />
          <SubscriptionDetailTile label="Billing" value={billing} />
          <SubscriptionDetailTile label="Payment type" value={paymentMode} />
          <SubscriptionDetailTile label="Status" value={subscriptionStateLabel(status)} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Button href={transactionHref} variant="secondary" className="min-h-11 justify-center">View Payment Transaction</Button>
        <Button href={billingEventsHref} variant="secondary" className="min-h-11 justify-center">View Billings</Button>
        <Button href={planHref} variant="secondary" className="min-h-11 justify-center">View Plan Details</Button>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="text-base font-black text-slate-950">What This Subscription Includes</h3>
        {featureNames.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {featureNames.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                <CheckCircle2 className="mt-0.5 shrink-0 text-teal-700" size={16} aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm font-semibold text-slate-600">No feature list is attached to this plan yet.</p>
        )}
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="text-base font-black text-slate-950">Billing And Provider References</h3>
        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          <p><span className="font-bold">Paid for:</span> {planName} ({billing}, {paymentMode.toLowerCase()})</p>
          <p><span className="font-bold">Payment transaction:</span> {billingSubscription?.id ?? "Not recorded yet"}</p>
          <p><span className="font-bold">Lifecycle subscription:</span> {lifecycleSubscription?.id ?? "Not linked"}</p>
          <p><span className="font-bold">Billing subscription:</span> {billingSubscription?.id ?? "Not linked"}</p>
          <p><span className="font-bold">Provider:</span> {billingSubscription?.provider ?? "subscription-service"}</p>
          <p><span className="font-bold">Provider reference:</span> {billingSubscription?.providerPaymentId ?? billingSubscription?.checkoutSessionId ?? "Pending webhook sync"}</p>
          <p><span className="font-bold">Owner:</span> {billingSubscription?.metadata?.owner_type && billingSubscription?.metadata?.owner_id ? `${billingSubscription.metadata.owner_type}: ${billingSubscription.metadata.owner_id}` : lifecycleSubscription ? subscriptionOwnerLabel(lifecycleSubscription) : "-"}</p>
          <p><span className="font-bold">Started:</span> {formatSubscriptionDate(billingSubscription?.createdAt ?? lifecycleSubscription?.billing_period_start ?? "")}</p>
          <p><span className="font-bold">Renews / ends:</span> {formatSubscriptionDate(lifecycleSubscription?.billing_period_end ?? "")}</p>
        </div>
      </div>
    </section>
  );
}

function subscriptionPlanFeatureNames(plan: SubscriptionPlan | undefined, features: SubscriptionFeature[]) {
  if (!plan) return [];
  const featureById = new Map(features.map((feature) => [feature.id, feature.name]));
  return (plan.features ?? [])
    .map((feature) => featureById.get(feature.feature_id) ?? feature.feature_id)
    .filter(Boolean)
    .slice(0, 12);
}

function SubscriptionDetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function SubscriberActions({ status, subscriptionId }: { status: string; subscriptionId: string }) {
  const normalizedStatus = status.toLowerCase();
  const suspended = normalizedStatus === "suspended";
  const pendingCancellation = normalizedStatus === "cancel_at_period_end";
  const terminal = normalizedStatus === "cancelled" || normalizedStatus === "failed";
  return (
    <ActionMenu label="Open subscriber actions">
      <Link href={`/dashboard/subscriptions?subscriptionsView=subscribers&dialog=edit-subscriber&subscriptionId=${encodeURIComponent(subscriptionId)}`} className={menuItemClass}>
        <Edit3 size={18} aria-hidden />
        Edit Subscription
      </Link>
      <form action={suspendSubscriberAction}>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <button type="submit" disabled={suspended} className={menuItemClass}>
          <PauseCircle size={18} aria-hidden />
          Suspend Subscription
        </button>
      </form>
      <form action={cancelSubscriberAction}>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <button type="submit" disabled={pendingCancellation || terminal} className={menuItemClass}>
          <PauseCircle size={18} aria-hidden />
          Cancel At Period End
        </button>
      </form>
      <form action={reactivateSubscriberAction}>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <button type="submit" disabled={!pendingCancellation} className={menuItemClass}>
          <CheckCircle2 size={18} aria-hidden />
          Reactivate Subscription
        </button>
      </form>
      <form action={deleteSubscriberAction}>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <button type="submit" className={dangerMenuItemClass}>
          <Trash2 size={18} aria-hidden />
          Delete Subscription
        </button>
      </form>
    </ActionMenu>
  );
}
