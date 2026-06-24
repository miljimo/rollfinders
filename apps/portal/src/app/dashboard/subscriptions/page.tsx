import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, CheckCircle2, ClipboardList, Layers3, Plus, ShieldCheck } from "lucide-react";
import { Role } from "@prisma/client";
import { Button } from "@/components/Button";
import { SidePanelControl, type SidePanelItem } from "@/components/SidePanelControl";
import { StatsPanel, type StatsPanelItem } from "@/components/StatsPanel";
import { Table, type TableColumn, type TableRecord } from "@/components/Table";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import {
  getApplicationEntitlements,
  listApplicationSubscriptions,
  listSubscriptionFeatures,
  listSubscriptionPlans,
  listSubscriptionProducts,
  type ApplicationEntitlements,
  SubscriptionServiceError,
  type SubscriptionFeature,
  type SubscriptionPlan,
  type SubscriptionProduct,
} from "@/lib/subscriptions-service";
import { createFeatureAction, createPlanAction, createProductAction, createSubscriptionAction, replacePlanFeaturesAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Subscriptions",
  description: "Manage subscription products, features, plans, and entitlements.",
};

type SearchParams = Record<string, string | string[] | undefined>;
type SubscriptionView = "overview" | "plans" | "products" | "entitlements" | "subscribers" | "downgrade-requests" | "billing-events" | "usage-limits";

const subscriptionSections: { href: string; label: string; view: SubscriptionView }[] = [
  { href: "/dashboard/subscriptions", label: "Subscription Overview", view: "overview" },
  { href: "/dashboard/subscriptions?subscriptionsView=plans", label: "Plans", view: "plans" },
  { href: "/dashboard/subscriptions?subscriptionsView=products", label: "Products", view: "products" },
  { href: "/dashboard/subscriptions?subscriptionsView=entitlements", label: "Entitlements", view: "entitlements" },
  { href: "/dashboard/subscriptions?subscriptionsView=subscribers", label: "Subscribers", view: "subscribers" },
  { href: "/dashboard/subscriptions?subscriptionsView=downgrade-requests", label: "Downgrade Requests", view: "downgrade-requests" },
  { href: "/dashboard/subscriptions?subscriptionsView=billing-events", label: "Billing Events", view: "billing-events" },
  { href: "/dashboard/subscriptions?subscriptionsView=usage-limits", label: "Usage Limits", view: "usage-limits" },
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  const applicationId = firstParam(params.applicationId) || process.env.ROLLFINDERS_APPLICATION_ID || "app_rollfinders";
  const actor = { id: user.id, role: user.role, email: user.email, academyId: user.academyId };

  let error: string | null = null;
  const [products, features, plans, subscriptions, entitlements] = await Promise.all([
    listSubscriptionProducts(actor).catch((err) => {
      error = serviceErrorMessage(err);
      return [];
    }),
    listSubscriptionFeatures(actor).catch(() => []),
    listSubscriptionPlans(actor).catch(() => []),
    listApplicationSubscriptions(applicationId, actor).catch(() => []),
    getApplicationEntitlements(applicationId, actor).catch((): ApplicationEntitlements => ({ application_id: applicationId, features: [] })),
  ]);

  const stats: StatsPanelItem[] = [
    { id: "products", label: "Products", value: products.length, icon: <Box size={32} aria-hidden />, iconTone: "blue" },
    { id: "features", label: "Features", value: features.length, icon: <Layers3 size={32} aria-hidden />, iconTone: "violet" },
    { id: "plans", label: "Plans", value: plans.length, icon: <ClipboardList size={32} aria-hidden />, iconTone: "teal" },
    { id: "entitlements", label: "Active entitlements", value: entitlements.features?.length ?? 0, icon: <CheckCircle2 size={32} aria-hidden />, iconTone: "teal" },
  ];

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
          <h1 className="mt-1 text-3xl font-black text-slate-950">Products, Plans & Entitlements</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Create commercial products and feature allowlists, then assign application subscriptions without changing existing feature flows.</p>
        </header>
        <section className="px-4 py-8 sm:px-8">
          {error ? <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}
          <StatsPanel className="hidden rounded-lg border border-teal-200 bg-white p-4 shadow-sm md:block" items={stats} title="Subscription catalogue" />

          <SubscriptionViewPanel activeView={activeView} applicationId={applicationId} entitlements={entitlements} features={features} plans={plans} products={products} subscriptions={subscriptions} />
        </section>
      </main>
    </div>
  );
}

function serviceErrorMessage(err: unknown) {
  if (err instanceof SubscriptionServiceError) return err.message;
  return "Subscription Service is unavailable.";
}

function SubscriptionViewPanel({
  activeView,
  applicationId,
  entitlements,
  features,
  plans,
  products,
  subscriptions,
}: {
  activeView: SubscriptionView;
  applicationId: string;
  entitlements: ApplicationEntitlements;
  features: SubscriptionFeature[];
  plans: SubscriptionPlan[];
  products: SubscriptionProduct[];
  subscriptions: { id: string; organisation_id: string; application_id: string; plan_key: string; status: string }[];
}) {
  if (activeView === "plans") {
    return (
      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Plans</h2>
            <p className="mt-1 text-sm text-slate-600">Each plan grants only the selected feature keys.</p>
          </div>
          <CreatePlanForm compact />
        </div>
        <div className="mt-4 grid gap-4">
          {plans.map((plan) => <PlanCard key={plan.key} plan={plan} features={features} />)}
          {!plans.length ? <p className="rounded-md border border-stone-200 p-4 text-sm text-slate-600">No plans found.</p> : null}
        </div>
      </section>
    );
  }

  if (activeView === "products") {
    return (
      <div className="mt-7 grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="grid content-start gap-5">
          <CreateProductForm />
          <CreateFeatureForm products={products} />
        </div>
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Products & Features</h2>
          <ProductsTable products={products} features={features} />
        </section>
      </div>
    );
  }

  if (activeView === "entitlements") {
    return (
      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Entitlements</h2>
        <p className="mt-1 text-sm text-slate-600">Active feature grants loaded for application {applicationId}.</p>
        <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
          {entitlements.plan_key ? (
            <div className="grid gap-2">
              <p><span className="font-bold">Plan:</span> {entitlements.plan_key}</p>
              <p><span className="font-bold">Status:</span> {entitlements.status ?? "ACTIVE"}</p>
              <p className="break-all"><span className="font-bold">Features:</span> {(entitlements.features ?? []).map((feature) => feature.feature_key).join(", ") || "No feature keys."}</p>
            </div>
          ) : "No active entitlement set for this application."}
        </div>
      </section>
    );
  }

  if (activeView === "subscribers") {
    return (
      <div className="mt-7 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <CreateSubscriptionPanel applicationId={applicationId} entitlements={entitlements} plans={plans} />
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Subscribers</h2>
          <SubscriptionsTable subscriptions={subscriptions} />
        </section>
      </div>
    );
  }

  if (activeView === "downgrade-requests") return <EmptyOperationalPanel title="Downgrade Requests" description="Downgrade request workflow storage and approvals are not connected yet." />;
  if (activeView === "billing-events") return <EmptyOperationalPanel title="Billing Events" description="Billing event ingestion is not connected yet." />;
  if (activeView === "usage-limits") return <EmptyOperationalPanel title="Usage Limits" description="Usage metering and limit enforcement are not connected yet." />;

  return (
    <>
      <div className="mt-7 grid gap-5 xl:grid-cols-3">
        <CreateProductForm />
        <CreateFeatureForm products={products} />
        <CreatePlanForm />
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Plans</h2>
          <p className="mt-1 text-sm text-slate-600">Each plan grants only the selected feature keys.</p>
          <div className="mt-4 grid gap-4">
            {plans.map((plan) => <PlanCard key={plan.key} plan={plan} features={features} />)}
            {!plans.length ? <p className="rounded-md border border-stone-200 p-4 text-sm text-slate-600">No plans found.</p> : null}
          </div>
        </section>
        <CreateSubscriptionPanel applicationId={applicationId} entitlements={entitlements} plans={plans} />
      </div>

      <div className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Products & Features</h2>
        <ProductsTable products={products} features={features} />
      </div>

      <div className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Subscribers</h2>
        <SubscriptionsTable subscriptions={subscriptions} />
      </div>
    </>
  );
}

function CreateSubscriptionPanel({ applicationId, entitlements, plans }: { applicationId: string; entitlements: ApplicationEntitlements; plans: SubscriptionPlan[] }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Create subscription</h2>
      <form action={createSubscriptionAction} className="mt-4 grid gap-3">
        <Field name="applicationId" label="Application ID" defaultValue={applicationId} />
        <Field name="organisationId" label="Organisation ID" defaultValue="org_rollfinders" />
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Plan
          <select name="planKey" className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2">
            {plans.map((plan) => <option key={plan.key} value={plan.key}>{plan.name}</option>)}
          </select>
        </label>
        <Button type="submit" variant="primary" className="min-h-11 justify-center">
          <Plus size={18} aria-hidden />
          Create subscription
        </Button>
      </form>
      <div className="mt-6">
        <h3 className="text-sm font-black uppercase text-slate-500">Active entitlement feed</h3>
        <p className="mt-2 break-all rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          {entitlements.plan_key ? `${entitlements.plan_key}: ${(entitlements.features ?? []).map((feature) => feature.feature_key).join(", ")}` : "No active entitlement set for this application."}
        </p>
      </div>
    </section>
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

function CreateProductForm() {
  return (
    <form action={createProductAction} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">New product</h2>
      <div className="mt-4 grid gap-3">
        <Field name="key" label="Product key" />
        <Field name="serviceKey" label="Service key" />
        <Field name="name" label="Name" />
        <Field name="description" label="Description" />
        <Button type="submit" variant="primary" className="min-h-11 justify-center"><Plus size={18} aria-hidden />Create product</Button>
      </div>
    </form>
  );
}

function CreateFeatureForm({ products }: { products: SubscriptionProduct[] }) {
  return (
    <form action={createFeatureAction} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">New feature</h2>
      <div className="mt-4 grid gap-3">
        <Field name="key" label="Feature key" />
        <label className="grid gap-1 text-sm font-bold text-slate-700">Product<select name="productKey" className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2">{products.map((product) => <option key={product.key} value={product.key}>{product.name}</option>)}</select></label>
        <Field name="name" label="Name" />
        <Field name="description" label="Description" />
        <Button type="submit" variant="primary" className="min-h-11 justify-center"><Plus size={18} aria-hidden />Create feature</Button>
      </div>
    </form>
  );
}

function CreatePlanForm({ compact = false }: { compact?: boolean }) {
  return (
    <form action={createPlanAction} className={compact ? "grid w-full gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:w-80" : "rounded-lg border border-stone-200 bg-white p-4 shadow-sm"}>
      <h2 className="text-lg font-black text-slate-950">New plan</h2>
      <div className={compact ? "grid gap-3" : "mt-4 grid gap-3"}>
        <Field name="key" label="Plan key" />
        <Field name="name" label="Name" />
        <Field name="description" label="Description" />
        <Field name="priceMinor" label="Price minor" type="number" />
        <Field name="currency" label="Currency" defaultValue="GBP" />
        <Field name="billingCycle" label="Billing cycle" defaultValue="month" />
        <Button type="submit" variant="primary" className="min-h-11 justify-center"><Plus size={18} aria-hidden />Create plan</Button>
      </div>
    </form>
  );
}

function PlanCard({ features, plan }: { features: SubscriptionFeature[]; plan: SubscriptionPlan }) {
  const selected = new Set((plan.features ?? []).map((feature) => feature.feature_key));
  return (
    <form action={replacePlanFeaturesAction} className="rounded-lg border border-stone-200 p-4">
      <input type="hidden" name="planKey" value={plan.key} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">{plan.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{currencyLabel(plan)}</p>
        </div>
        <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">{plan.status}</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {features.map((feature) => (
          <label key={feature.key} className="flex items-start gap-2 rounded-md border border-stone-200 p-2 text-sm">
            <input name="featureKeys" value={feature.key} type="checkbox" defaultChecked={selected.has(feature.key)} className="mt-1" />
            <span><span className="font-bold text-slate-800">{feature.name}</span><span className="block break-all text-xs text-slate-500">{feature.key}</span></span>
          </label>
        ))}
      </div>
      <Button type="submit" variant="secondary" className="mt-4 min-h-10"><ShieldCheck size={17} aria-hidden />Save features</Button>
    </form>
  );
}

function ProductsTable({ features, products }: { features: SubscriptionFeature[]; products: SubscriptionProduct[] }) {
  const rows = products.map((product) => ({
    id: product.key,
    product: product.name,
    service: product.service_key,
    status: product.status,
    features: features.filter((feature) => feature.product_key === product.key).length.toString(),
  }));
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "product", title: "Product" },
    { key: "service", title: "Service" },
    { key: "features", title: "Features" },
    { key: "status", title: "Status" },
  ];
  return <Table columns={columns} data={rows} emptyMessage="No subscription products found." getRowHref={() => undefined} />;
}

function SubscriptionsTable({ subscriptions }: { subscriptions: { id: string; organisation_id: string; application_id: string; plan_key: string; status: string }[] }) {
  const rows = subscriptions.map((subscription) => ({
    id: subscription.id,
    organisation: subscription.organisation_id,
    application: subscription.application_id,
    plan: subscription.plan_key,
    status: subscription.status,
  }));
  const columns: TableColumn<(typeof rows)[number] & TableRecord>[] = [
    { key: "organisation", title: "Organisation" },
    { key: "application", title: "Application" },
    { key: "plan", title: "Plan" },
    { key: "status", title: "Status" },
  ];
  return <Table columns={columns} data={rows} emptyMessage="No application subscriptions found." getRowHref={() => undefined} />;
}
