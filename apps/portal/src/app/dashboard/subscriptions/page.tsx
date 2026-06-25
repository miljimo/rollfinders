import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Edit3, PauseCircle, Plus, Search, Trash2, XCircle } from "lucide-react";
import { Role } from "@prisma/client";
import { ActionMenu } from "../../admin/ActionMenu";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import { SidePanelControl, type SidePanelItem } from "@/components/SidePanelControl";
import { Table, type TableColumn, type TableRecord } from "@/components/Table";
import { listOrganisationApplications, listOrganisations, type OrganisationApplicationRecord, type OrganisationRecord } from "@/lib/organisation-service";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import { getUserPermissionPanelModel, type AssignableUserFeature } from "@/lib/users-service";
import {
  getApplicationEntitlements,
  listApplicationSubscriptions,
  listSubscriptionBillingCycles,
  listSubscriptionFeatures,
  listSubscriptionFeaturesPage,
  listSubscriptionPlansPage,
  listSubscriptionProducts,
  type ApplicationEntitlements,
  type OrganisationSubscription,
  type SubscriptionPagination,
  SubscriptionServiceError,
  type SubscriptionFeature,
  type SubscriptionBillingCycle,
  type SubscriptionPlan,
  type SubscriptionProduct,
} from "@/lib/subscriptions-service";
import {
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
  updateSubscriberAction,
  updateFeatureAction,
  updatePlanAction,
  updateProductAction,
} from "./actions";
import { FeaturePermissionFields } from "./FeaturePermissionFields";
import { PlanProductFields } from "./PlanProductFields";
import { SubscriptionSubmitButton } from "./SubscriptionSubmitButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Subscriptions",
  description: "Manage subscription products, features, plans, and entitlements.",
};

type SearchParams = Record<string, string | string[] | undefined>;
type SubscriptionView = "overview" | "plans" | "products" | "features" | "entitlements" | "subscribers" | "downgrade-requests" | "billing-events" | "usage-limits";

const subscriptionSections: { href: string; label: string; view: SubscriptionView }[] = [
  { href: "/dashboard/subscriptions", label: "Subscription Overview", view: "overview" },
  { href: "/dashboard/subscriptions?subscriptionsView=plans", label: "Plans", view: "plans" },
  { href: "/dashboard/subscriptions?subscriptionsView=products", label: "Products", view: "products" },
  { href: "/dashboard/subscriptions?subscriptionsView=features", label: "Features", view: "features" },
  { href: "/dashboard/subscriptions?subscriptionsView=entitlements", label: "Entitlements", view: "entitlements" },
  { href: "/dashboard/subscriptions?subscriptionsView=subscribers", label: "Subscribers", view: "subscribers" },
  { href: "/dashboard/subscriptions?subscriptionsView=downgrade-requests", label: "Downgrade Requests", view: "downgrade-requests" },
  { href: "/dashboard/subscriptions?subscriptionsView=billing-events", label: "Billing Events", view: "billing-events" },
  { href: "/dashboard/subscriptions?subscriptionsView=usage-limits", label: "Usage Limits", view: "usage-limits" },
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
  if (view === "entitlements") return "Entitlements";
  if (view === "subscribers") return "Subscribers";
  if (view === "downgrade-requests") return "Downgrade Requests";
  if (view === "billing-events") return "Billing Events";
  if (view === "usage-limits") return "Usage Limits";
  return "Subscriptions Dashboard";
}

function viewDescription(view: SubscriptionView) {
  if (view === "plans") return "Create commercial plans and choose which product features each plan can grant.";
  if (view === "products") return "Manage the products and features that can be packaged into subscription plans.";
  if (view === "features") return "Manage product-level feature flags and privileges that plans can include.";
  if (view === "entitlements") return "Review active feature grants loaded for the selected application.";
  if (view === "subscribers") return "Create and review organisation subscriptions for the selected application.";
  if (view === "downgrade-requests") return "Review requested plan downgrades before they affect application access.";
  if (view === "billing-events") return "Review subscription billing events and lifecycle changes.";
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

function navItems(activeView: SubscriptionView): SidePanelItem[] {
  return [
    {
      active: true,
      children: subscriptionSections.map((section) => ({ active: section.view === activeView, href: section.href, label: section.label })),
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
  const applicationId = firstParam(params.applicationId) || process.env.ROLLFINDERS_APPLICATION_ID || "app_rollfinders";
  const actor = { id: user.id, role: user.role, email: user.email, academyId: user.academyId };

  let error: string | null = actionError || null;
  const [products, features, featureResult, planResult, subscriptions, entitlements, organisations, applications, assignableFeatures, billingCycles] = await Promise.all([
    listSubscriptionProducts(actor).catch((err) => {
      error = serviceErrorMessage(err);
      return [];
    }),
    listSubscriptionFeatures(actor).catch(() => []),
    listSubscriptionFeaturesPage(actor, { limit: featuresPageSize, offset: featuresOffset }).catch(() => ({ features: [], pagination: { limit: featuresPageSize, offset: featuresOffset, count: 0, has_more: false } })),
    listSubscriptionPlansPage(actor, { limit: plansPageSize, offset: plansOffset }).catch(() => ({ plans: [], pagination: { limit: plansPageSize, offset: plansOffset, count: 0, has_more: false } })),
    listApplicationSubscriptions(applicationId, actor).catch(() => []),
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
  ]);
  const plans = planResult.plans;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedFeature = features.find((feature) => feature.id === selectedFeatureId);
  const selectedSubscription = subscriptions.find((subscription) => subscription.id === selectedSubscriptionId);

  return (
    <div className="min-h-screen bg-[#f8faf7] text-slate-900">
      <SidePanelControl
        accountLabel={user.name ?? user.email}
        footerNavigationItems={footerNavItems()}
        mobileNavigationItems={navItems(activeView)}
        navigationItems={navItems(activeView)}
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

          <SubscriptionViewPanel activeView={activeView} applicationId={applicationId} applications={applications} entitlements={entitlements} featurePagination={featureResult.pagination} features={features} featuresSearch={featuresSearch} featureTableRows={featureResult.features} organisations={organisations} planPagination={planResult.pagination} plans={plans} plansPage={plansPage} plansSearch={plansSearch} products={products} productsPage={productsPage} productsSearch={productsSearch} subscribersPage={subscribersPage} subscribersSearch={subscribersSearch} subscriptions={subscriptions} />
        </section>
      </main>
      {dialog === "new-plan" ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=plans" description="Create a subscription plan without leaving the dashboard." title="New Plan">
          <div className="mt-5">
            <CreatePlanForm billingCycles={billingCycles} importPlans={plans} products={products} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "edit-plan" && selectedPlan ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=plans" description="Update this subscription plan." title="Edit Plan">
          <div className="mt-5">
            <PlanForm action={updatePlanAction} billingCycles={billingCycles} buttonLabel="Update" importPlans={plans} pendingLabel="Updating..." plan={selectedPlan} products={products} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "new-product" ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=products" description="Create a subscription product without leaving the dashboard." title="New Product">
          <div className="mt-5">
            <CreateProductForm features={assignableFeatures} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "edit-product" && selectedProduct ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=products" description="Update this subscription product." title="Edit Product">
          <div className="mt-5">
            <ProductForm action={updateProductAction} buttonLabel="Save product" product={selectedProduct} features={assignableFeatures} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "new-feature" ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=features" description="Create a product feature without leaving the dashboard." title="New Feature">
          <div className="mt-5">
            <CreateFeatureForm assignableFeatures={assignableFeatures} products={products} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "edit-feature" && selectedFeature ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=features" description="Update this product feature." title="Edit Feature">
          <div className="mt-5">
            <FeatureForm action={updateFeatureAction} assignableFeatures={assignableFeatures} buttonLabel="Save feature" feature={selectedFeature} products={products} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "new-subscriber" ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=subscribers" description="Create a subscriber record without leaving the dashboard." title="New Subscriber">
          <div className="mt-5">
            <CreateSubscriptionPanel applicationId={applicationId} applications={applications} entitlements={entitlements} features={features} organisations={organisations} plans={plans} />
          </div>
        </DialogShell>
      ) : null}
      {dialog === "edit-subscriber" && selectedSubscription ? (
        <DialogShell closeHref="/dashboard/subscriptions?subscriptionsView=subscribers" description="Update this subscriber record." title="Edit Subscriber">
          <div className="mt-5">
            <SubscriberForm plans={plans} subscription={selectedSubscription} />
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

function SubscriptionViewPanel({
  activeView,
  applicationId,
  applications,
  entitlements,
  featurePagination,
  features,
  featuresSearch,
  featureTableRows,
  organisations,
  planPagination,
  plans,
  plansPage,
  plansSearch,
  products,
  productsPage,
  productsSearch,
  subscribersPage,
  subscribersSearch,
  subscriptions,
}: {
  activeView: SubscriptionView;
  applicationId: string;
  applications: OrganisationApplicationRecord[];
  entitlements: ApplicationEntitlements;
  featurePagination: SubscriptionPagination;
  features: SubscriptionFeature[];
  featuresSearch: string;
  featureTableRows: SubscriptionFeature[];
  organisations: OrganisationRecord[];
  planPagination: SubscriptionPagination;
  plans: SubscriptionPlan[];
  plansPage: number;
  plansSearch: string;
  products: SubscriptionProduct[];
  productsPage: number;
  productsSearch: string;
  subscribersPage: number;
  subscribersSearch: string;
  subscriptions: OrganisationSubscription[];
}) {
  if (activeView === "plans") {
    const filteredPlans = filterPlans(plans, plansSearch);
    const pageFromOffset = Math.floor(planPagination.offset / Math.max(planPagination.limit, 1)) + 1;
    const currentPage = Math.max(1, pageFromOffset);
    const totalPages = planPagination.has_more ? currentPage + 1 : currentPage;
    return (
      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Plans</h2>
            <p className="mt-1 text-sm text-slate-600">Each plan grants only the selected feature IDs.</p>
          </div>
          <Button href="/dashboard/subscriptions?subscriptionsView=plans&dialog=new-plan" variant="primary" className="min-h-12 shadow-sm">
            <Plus size={18} aria-hidden />
            New Plan
          </Button>
        </div>
        <PlansSearch search={plansSearch} />
        <div className="mt-4">
          <PlansTable
            plans={filteredPlans}
            pagination={{
              page: currentPage,
              previousHref: subscriptionHref({ subscriptionsView: "plans", plansPage: currentPage - 1, plansSearch: plansSearch || undefined }),
              nextHref: subscriptionHref({ subscriptionsView: "plans", plansPage: currentPage + 1, plansSearch: plansSearch || undefined }),
              totalPages,
            }}
          />
        </div>
      </section>
    );
  }

  if (activeView === "products") {
    const filteredProducts = filterProducts(products, productsSearch);
    const pagedProducts = localTablePage(filteredProducts, productsPage);
    return (
      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Products</h2>
            <p className="mt-1 text-sm text-slate-600">Manage products that group subscription features.</p>
          </div>
          <Button href="/dashboard/subscriptions?subscriptionsView=products&dialog=new-product" variant="primary" className="min-h-12 shadow-sm">
            <Plus size={18} aria-hidden />
            New Product
          </Button>
        </div>
        <SubscriptionSearch name="productsSearch" placeholder="Search products" search={productsSearch} view="products" />
        <div className="mt-4">
          <ProductsTable
            products={pagedProducts.items}
            features={features}
            pagination={{
              page: pagedProducts.currentPage,
              previousHref: subscriptionHref({ subscriptionsView: "products", productsPage: pagedProducts.currentPage - 1, productsSearch: productsSearch || undefined }),
              nextHref: subscriptionHref({ subscriptionsView: "products", productsPage: pagedProducts.currentPage + 1, productsSearch: productsSearch || undefined }),
              totalPages: pagedProducts.totalPages,
            }}
          />
        </div>
      </section>
    );
  }

  if (activeView === "features") {
    const filteredFeatures = filterFeatures(featureTableRows, featuresSearch);
    const pageFromOffset = Math.floor(featurePagination.offset / Math.max(featurePagination.limit, 1)) + 1;
    const currentPage = Math.max(1, pageFromOffset);
    const totalPages = featurePagination.has_more ? currentPage + 1 : currentPage;
    return (
      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Features</h2>
            <p className="mt-1 text-sm text-slate-600">Manage product privileges that plans can grant.</p>
          </div>
          <Button href="/dashboard/subscriptions?subscriptionsView=features&dialog=new-feature" variant="primary" className="min-h-12 shadow-sm">
            <Plus size={18} aria-hidden />
            New Feature
          </Button>
        </div>
        <SubscriptionSearch name="featuresSearch" placeholder="Search features" search={featuresSearch} view="features" />
        <div className="mt-4">
          <FeaturesTable
            features={filteredFeatures}
            pagination={{
              page: currentPage,
              previousHref: subscriptionHref({ subscriptionsView: "features", featuresPage: currentPage - 1, featuresSearch: featuresSearch || undefined }),
              nextHref: subscriptionHref({ subscriptionsView: "features", featuresPage: currentPage + 1, featuresSearch: featuresSearch || undefined }),
              totalPages,
            }}
            products={products}
          />
        </div>
      </section>
    );
  }

  if (activeView === "entitlements") {
    const currentPlan = plans.find((plan) => plan.id === entitlements.plan_id);
    const entitlementFeatureNames = entitlementFeatureLabels(entitlements, features);
    return (
      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Entitlements</h2>
        <p className="mt-1 text-sm text-slate-600">Active feature grants loaded for application {applicationId}.</p>
        <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
          {entitlements.plan_id ? (
            <div className="grid gap-2">
              <p><span className="font-bold">Plan:</span> {currentPlan?.name ?? "Unknown plan"}</p>
              <p><span className="font-bold">Status:</span> {entitlements.status ?? "ACTIVE"}</p>
              <p><span className="font-bold">Features:</span> {entitlementFeatureNames.join(", ") || "No features."}</p>
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
      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Subscribers</h2>
            <p className="mt-1 text-sm text-slate-600">Create and review subscriptions by organisation and application.</p>
          </div>
          <Button href="/dashboard/subscriptions?subscriptionsView=subscribers&dialog=new-subscriber" variant="primary" className="min-h-12 shadow-sm">
            <Plus size={18} aria-hidden />
            New Subscriber
          </Button>
        </div>
        <SubscriptionSearch name="subscribersSearch" placeholder="Search subscribers" search={subscribersSearch} view="subscribers" />
        <div className="mt-4">
          <SubscriptionsTable
            plans={plans}
            subscriptions={pagedSubscriptions.items}
            pagination={{
              page: pagedSubscriptions.currentPage,
              previousHref: subscriptionHref({ subscriptionsView: "subscribers", subscribersPage: pagedSubscriptions.currentPage - 1, subscribersSearch: subscribersSearch || undefined }),
              nextHref: subscriptionHref({ subscriptionsView: "subscribers", subscribersPage: pagedSubscriptions.currentPage + 1, subscribersSearch: subscribersSearch || undefined }),
              totalPages: pagedSubscriptions.totalPages,
            }}
          />
        </div>
      </section>
    );
  }

  if (activeView === "downgrade-requests") return <EmptyOperationalPanel title="Downgrade Requests" description="Downgrade request workflow storage and approvals are not connected yet." />;
  if (activeView === "billing-events") return <EmptyOperationalPanel title="Billing Events" description="Billing event ingestion is not connected yet." />;
  if (activeView === "usage-limits") return <EmptyOperationalPanel title="Usage Limits" description="Usage metering and limit enforcement are not connected yet." />;

  return <AvailablePlansPanel currentPlanId={entitlements.plan_id} currentSubscriptionId={entitlements.subscription_id} features={features} page={plansPage} plans={plans.filter((plan) => !plan.is_internal)} products={products} />;
}

function filterPlans(plans: SubscriptionPlan[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return plans;
  return plans.filter((plan) => [plan.id, plan.name, plan.description, plan.status, plan.billing_cycle, plan.currency].join(" ").toLowerCase().includes(normalized));
}

function filterProducts(products: SubscriptionProduct[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return products;
  return products.filter((product) => [product.id, product.service_id, product.name, product.description, product.status].join(" ").toLowerCase().includes(normalized));
}

function filterFeatures(features: SubscriptionFeature[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return features;
  return features.filter((feature) => [feature.id, feature.product_id, feature.service_id ?? "", feature.name, feature.description, feature.status].join(" ").toLowerCase().includes(normalized));
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

function PlansSearch({ search }: { search: string }) {
  return (
    <form action="/dashboard/subscriptions" className="mt-4 flex min-w-0 gap-2">
      <input type="hidden" name="subscriptionsView" value="plans" />
      <input
        name="plansSearch"
        defaultValue={search}
        placeholder="Search plans"
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm"
      />
      <Button type="submit" size="icon" variant="primary" className="min-h-12 w-14" aria-label="Search plans">
        <Search size={20} aria-hidden />
      </Button>
    </form>
  );
}

function SubscriptionSearch({ name, placeholder, search, view }: { name: string; placeholder: string; search: string; view: SubscriptionView }) {
  return (
    <form action="/dashboard/subscriptions" className="mt-4 flex min-w-0 gap-2">
      <input type="hidden" name="subscriptionsView" value={view} />
      <input
        name={name}
        defaultValue={search}
        placeholder={placeholder}
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm"
      />
      <Button type="submit" size="icon" variant="primary" className="min-h-12 w-14" aria-label={placeholder}>
        <Search size={20} aria-hidden />
      </Button>
    </form>
  );
}

function AvailablePlansPanel({ currentPlanId, currentSubscriptionId, features, page, plans, products }: { currentPlanId?: string; currentSubscriptionId?: string; features: SubscriptionFeature[]; page: number; plans: SubscriptionPlan[]; products: SubscriptionProduct[] }) {
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
      <PlanFeatureComparisonCard currentPlan={currentPlan} currentPlanId={currentPlanId} currentSubscriptionId={currentSubscriptionId} features={features} plans={visiblePlans} products={products} />
      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-100 pt-4 text-sm font-bold">
          <span className="text-slate-600">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <PaginationAnchor disabled={currentPage <= 1} href={subscriptionHref({ plansPage: currentPage - 1 })}>Previous</PaginationAnchor>
            <PaginationAnchor disabled={currentPage >= totalPages} href={subscriptionHref({ plansPage: currentPage + 1 })}>Next</PaginationAnchor>
          </div>
        </div>
      ) : null}
    </section>
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

function PaginationAnchor({ children, disabled, href }: { children: ReactNode; disabled: boolean; href: string }) {
  if (disabled) return <span className="inline-flex min-h-10 items-center rounded-md border border-stone-200 px-4 text-stone-400">{children}</span>;
  return <Button href={href} variant="secondary" className="min-h-10">{children}</Button>;
}

function CreateSubscriptionPanel({
  applicationId,
  applications,
  entitlements,
  features,
  organisations,
  plans,
}: {
  applicationId: string;
  applications: OrganisationApplicationRecord[];
  entitlements: ApplicationEntitlements;
  features: SubscriptionFeature[];
  organisations: OrganisationRecord[];
  plans: SubscriptionPlan[];
}) {
  const entitlementFeatures = entitlementFeatureLabels(entitlements, features);
  const entitlementPlan = entitlementPlanLabel(entitlements, plans);
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Create subscription</h2>
      <form action={createSubscriptionAction} className="mt-4 grid gap-3">
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
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Plan
          <select name="planId" className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2">
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
        </label>
        <Button type="submit" variant="primary" className="min-h-11 justify-center">
          <Plus size={18} aria-hidden />
          Create subscription
        </Button>
      </form>
      <div className="mt-6">
        <h3 className="text-sm font-black uppercase text-slate-500">Active entitlement feed</h3>
        <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          {entitlements.plan_id ? `${entitlementPlan}: ${entitlementFeatures.join(", ") || "No features."}` : "No active entitlement set for this application."}
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

function CreateProductForm({ features }: { features: AssignableUserFeature[] }) {
  return <ProductForm action={createProductAction} buttonLabel="Create product" features={features} />;
}

function ProductForm({ action, buttonLabel, product, features }: { action: (formData: FormData) => void | Promise<void>; buttonLabel: string; product?: SubscriptionProduct; features: AssignableUserFeature[] }) {
  const options = serviceOptions(features);
  return (
    <form action={action} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      <h2 className="text-lg font-black text-slate-950">{product ? "Edit product" : "New product"}</h2>
      <div className="mt-4 grid gap-3">
        <Field name="name" label="Product Name" defaultValue={product?.name ?? ""} />
        <AutoCompleteTextField
          emptyMessage="No services found."
          label="Service"
          name="serviceId"
          options={options}
          placeholder="Search features"
          selectedId={product?.service_id ?? ""}
        />
        <Field name="description" label="Description" defaultValue={product?.description ?? ""} />
        {product ? <StatusField defaultValue={product.status} /> : null}
        <Button type="submit" variant="primary" className="min-h-11 justify-center"><Plus size={18} aria-hidden />{buttonLabel}</Button>
      </div>
    </form>
  );
}

function CreateFeatureForm({ assignableFeatures, products }: { assignableFeatures: AssignableUserFeature[]; products: SubscriptionProduct[] }) {
  return <FeatureForm action={createFeatureAction} assignableFeatures={assignableFeatures} buttonLabel="Create feature" products={products} />;
}

function FeatureForm({ action, assignableFeatures, buttonLabel, feature, products }: { action: (formData: FormData) => void | Promise<void>; assignableFeatures: AssignableUserFeature[]; buttonLabel: string; feature?: SubscriptionFeature; products: SubscriptionProduct[] }) {
  return (
    <form action={action} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {feature ? <input type="hidden" name="featureId" value={feature.id} /> : null}
      <h2 className="text-lg font-black text-slate-950">{feature ? "Edit feature" : "New feature"}</h2>
      <div className="mt-4 grid gap-3">
        <FeaturePermissionFields assignableFeatures={assignableFeatures} feature={feature} products={products} />
        {feature ? <StatusField defaultValue={feature.status} /> : null}
        <Button type="submit" variant="primary" className="min-h-11 justify-center"><Plus size={18} aria-hidden />{buttonLabel}</Button>
      </div>
    </form>
  );
}

function planProductIds(plan: SubscriptionPlan) {
  return plan.included_product_ids ?? plan.products?.map((product) => product.product_id) ?? [];
}

function importPlanOptions(plans: SubscriptionPlan[], currentPlanId?: string) {
  return plans
    .filter((plan) => plan.id !== currentPlanId)
    .map((plan) => ({ id: plan.id, name: plan.name, productIds: planProductIds(plan) }))
    .filter((plan) => plan.productIds.length > 0);
}

function CreatePlanForm({ billingCycles, compact = false, importPlans, products }: { billingCycles: SubscriptionBillingCycle[]; compact?: boolean; importPlans: SubscriptionPlan[]; products: SubscriptionProduct[] }) {
  return <PlanForm action={createPlanAction} billingCycles={billingCycles} buttonLabel="Create" compact={compact} importPlans={importPlans} pendingLabel="Creating..." products={products} />;
}

function PlanForm({ action, billingCycles, buttonLabel, compact = false, importPlans, pendingLabel, plan, products }: { action: (formData: FormData) => void | Promise<void>; billingCycles: SubscriptionBillingCycle[]; buttonLabel: string; compact?: boolean; importPlans: SubscriptionPlan[]; pendingLabel: string; plan?: SubscriptionPlan; products: SubscriptionProduct[] }) {
  const selectedProductIds = new Set(plan ? planProductIds(plan) : []);
  const availableImportPlans = importPlanOptions(importPlans, plan?.id);
  return (
    <form action={action} className={compact ? "grid w-full gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:w-80" : "rounded-lg border border-stone-200 bg-white p-4 shadow-sm"}>
      {plan ? <input type="hidden" name="planId" value={plan.id} /> : null}
      <h2 className="text-lg font-black text-slate-950">{plan ? "Edit plan" : "New plan"}</h2>
      <div className={compact ? "grid gap-3" : "mt-4 grid gap-3"}>
        <Field name="name" label="Name" defaultValue={plan?.name ?? ""} />
        <Field name="description" label="Description" defaultValue={plan?.description ?? ""} />
        <Field name="priceMinor" label="Price minor" type="number" defaultValue={plan ? String(plan.price_minor) : ""} />
        <CurrencyField />
        <BillingCycleField cycles={billingCycles} defaultValue={plan?.billing_cycle ?? "month"} />
        <InternalPlanField defaultChecked={plan?.is_internal ?? false} />
        <PlanProductFields importPlans={availableImportPlans} products={products} selectedProductIds={Array.from(selectedProductIds)} />
        {plan ? <StatusField defaultValue={plan.status} /> : null}
        <SubscriptionSubmitButton label={buttonLabel} pendingLabel={pendingLabel} />
      </div>
    </form>
  );
}

function PlansTable({ pagination, plans }: { pagination: { page: number; previousHref: string; nextHref: string; totalPages: number }; plans: SubscriptionPlan[] }) {
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
    <Table
      columns={columns}
      data={rows}
      emptyMessage="No plans found."
      getRowHref={() => undefined}
      pagination={pagination}
      minWidthClassName="min-w-[760px]"
    />
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

function ProductsTable({ features, pagination, products }: { features: SubscriptionFeature[]; pagination: { page: number; previousHref: string; nextHref: string; totalPages: number }; products: SubscriptionProduct[] }) {
  const rows = products.map((product) => ({
    id: product.id,
    productId: product.id,
    product: product.name,
    service: product.service_id,
    status: product.status,
    features: features.filter((feature) => feature.product_id === product.id).length.toString(),
  }));
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "product", title: "Product" },
    { key: "service", title: "Service" },
    { key: "features", title: "Features" },
    { key: "status", title: "Status" },
    { key: "actions", title: "Actions", headerClassName: "text-right", className: "text-right", render: (_value, row) => <ProductActions productId={String(row.productId)} status={String(row.status)} /> },
  ];
  return <Table columns={columns} data={rows} emptyMessage="No subscription products found." getRowHref={() => undefined} pagination={pagination} />;
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

function FeaturesTable({ features, pagination, products }: { features: SubscriptionFeature[]; pagination: { page: number; previousHref: string; nextHref: string; totalPages: number }; products: SubscriptionProduct[] }) {
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  const rows = features.map((feature) => ({
    id: feature.id,
    featureId: feature.id,
    product: productNames.get(feature.product_id) ?? feature.product_id,
    name: feature.name,
    description: feature.description || "No description",
    status: feature.status,
  }));
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "product", title: "Product" },
    { key: "name", title: "Name" },
    { key: "description", title: "Description" },
    { key: "status", title: "Status" },
    { key: "actions", title: "Action", headerClassName: "text-right", className: "text-right", render: (_value, row) => <FeatureActions featureId={String(row.featureId)} status={String(row.status)} /> },
  ];
  return <Table columns={columns} data={rows} emptyMessage="No subscription features found." getRowHref={() => undefined} pagination={pagination} />;
}

function FeatureActions({ featureId, status }: { featureId: string; status: string }) {
  const disabled = status === "INACTIVE";
  return (
    <ActionMenu label="Open feature actions">
      <Link href={`/dashboard/subscriptions?subscriptionsView=features&dialog=edit-feature&featureId=${encodeURIComponent(featureId)}`} className={menuItemClass}>
        <Edit3 size={18} aria-hidden />
        Edit Feature
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

function SubscriptionsTable({ pagination, plans, subscriptions }: { pagination: { page: number; previousHref: string; nextHref: string; totalPages: number }; plans: SubscriptionPlan[]; subscriptions: OrganisationSubscription[] }) {
  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));
  const rows = subscriptions.map((subscription) => ({
    id: subscription.id,
    subscriptionId: subscription.id,
    ownerType: subscription.owner_type,
    owner: subscription.owner_id,
    plan: planNames.get(subscription.plan_id) ?? subscription.plan_id,
    status: subscription.status,
  }));
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "ownerType", title: "Owner Type" },
    { key: "owner", title: "Owner ID" },
    { key: "plan", title: "Plan" },
    { key: "status", title: "Status" },
    { key: "actions", title: "Action", headerClassName: "text-right", className: "text-right", render: (_value, row) => <SubscriberActions status={String(row.status)} subscriptionId={String(row.subscriptionId)} /> },
  ];
  return <Table columns={columns} data={rows} emptyMessage="No application subscriptions found." getRowHref={() => undefined} pagination={pagination} />;
}

function SubscriberActions({ status, subscriptionId }: { status: string; subscriptionId: string }) {
  const suspended = status === "SUSPENDED";
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
