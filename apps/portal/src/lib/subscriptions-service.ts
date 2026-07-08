import "server-only";

import { apiGatewayPath } from "./apiGateway";
import { getEnvVariable } from "./environments";

export type SubscriptionActor = {
  id: string;
  role?: string;
  email?: string | null;
  academyId?: string | null;
  accessToken?: string;
};

export type SubscriptionProduct = {
  id: string;
  service_id: string;
  name: string;
  description: string;
  status: string;
  is_selectable: boolean;
  currency: string;
  price_minor: number;
  created_at: string;
  updated_at: string;
};

export type SubscriptionFeature = {
  id: string;
  product_id: string;
  service_id?: string;
  feature_key: string;
  name: string;
  description: string;
  status: string;
  is_selectable: boolean;
  subscription_controlled: boolean;
  currency: string;
  base_price_minor: number;
  metadata?: Record<string, unknown>;
};

export type SubscriptionPlanFeature = {
  id: string;
  plan_id: string;
  feature_id: string;
  product_id?: string;
  service_id?: string;
  limit_value?: Record<string, unknown>;
};

export type SubscriptionPlanProduct = {
  id: string;
  plan_id: string;
  product_id: string;
  service_id?: string;
  price_adjustment_percent: number;
};

export type SubscriptionQuote = {
  currency: string;
  billing_period: "month" | "year";
  subtotal_minor: number;
  adjustment_minor: number;
  duplicate_feature_savings_minor: number;
  total_minor: number;
  products: Array<{
    plan_id: string;
    plan_name: string;
    product_id: string;
    product_name: string;
    base_minor: number;
    price_adjustment_percent: number;
    adjustment_minor: number;
    total_minor: number;
  }>;
  features: Array<{
    feature_id: string;
    feature_name: string;
    product_id: string;
    product_name: string;
    base_price_minor: number;
    currency: string;
  }>;
  skipped_duplicate_features: Array<{
    feature_id: string;
    feature_name: string;
    product_id: string;
    product_name: string;
    base_price_minor: number;
    currency: string;
  }>;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  status: string;
  currency: string;
  price_minor: number;
  billing_cycle: string;
  is_internal: boolean;
  target_user_level: number;
  features?: SubscriptionPlanFeature[];
  products?: SubscriptionPlanProduct[];
  included_feature_ids?: string[];
  included_product_ids?: string[];
};

export type SubscriptionBillingCycle = {
  key: string;
  name: string;
};

export type SubscriptionBillingEvent = {
  id: string;
  subscription_id: string;
  plan_change_id?: string;
  payment_id?: string;
  event_type: string;
  status: string;
  amount_minor: number;
  currency: string;
  provider: string;
  provider_reference?: string;
  metadata?: Record<string, string>;
  created_at: string;
};

export type SubscriptionPlanChange = {
  id: string;
  subscription_id: string;
  from_plan_id?: string;
  to_plan_id?: string;
  change_type: string;
  status: string;
  effective_at?: string | null;
  checkout_id?: string;
  payment_id?: string;
  created_at: string;
};

export type OrganisationSubscription = {
  id: string;
  owner_type: string;
  owner_id: string;
  plan_id: string;
  status: string;
  billing_period_start: string;
  billing_period_end: string;
};

export type CurrentSubscriptionState = {
  subscription?: OrganisationSubscription | null;
  subscriptions?: OrganisationSubscription[];
  pending_change?: SubscriptionPlanChange | null;
  billing_events?: SubscriptionBillingEvent[];
  cancellation?: {
    status?: string;
    cancel_at?: string | null;
  } | null;
};

export type SubscriptionCheckoutResponse = {
  checkout_required: boolean;
  checkout?: {
    checkout_url?: string;
    session_id?: string;
    provider?: string;
  };
  subscription?: OrganisationSubscription;
};

export type CreateSubscriptionResponse = {
  checkout_required?: boolean;
  subscription?: OrganisationSubscription;
};

export type ApplicationEntitlements = {
  owner_type?: string;
  owner_id?: string;
  application_id: string;
  subscription_id?: string;
  plan_id?: string;
  plan_ids?: string[];
  subscriptions?: OrganisationSubscription[];
  status?: string;
  features?: SubscriptionPlanFeature[];
};

export type SubscriptionPagination = {
  limit: number;
  offset: number;
  count: number;
  has_more: boolean;
};

export class SubscriptionServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "",
  ) {
    super(message);
    this.name = "SubscriptionServiceError";
  }
}

const defaultApplicationId = () => getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders");

function headers(actor?: SubscriptionActor | null) {
  return {
    "Content-Type": "application/json",
    ...(actor?.accessToken ? { Authorization: `Bearer ${actor.accessToken}` } : {}),
    ...(actor?.id ? { "X-Actor-User-ID": actor.id } : {}),
  };
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof body?.error?.code === "string" ? body.error.code : "";
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : typeof body?.error === "string"
          ? body.error
          : typeof body?.message === "string"
            ? body.message
        : `Subscription service request failed with status ${response.status}.`;
    throw new SubscriptionServiceError(message, response.status, code);
  }
  return body;
}

async function request(path: string, actor?: SubscriptionActor | null, init: RequestInit = {}) {
  const response = await fetch(apiGatewayPath(path), {
    cache: "no-store",
    ...init,
    headers: {
      ...headers(actor),
      ...(init.headers ?? {}),
    },
  });
  return parseResponse(response);
}

export async function listSubscriptionProducts(actor?: SubscriptionActor | null) {
  const result = await request("/v1/products?limit=100", actor) as { products?: SubscriptionProduct[] };
  return result.products ?? [];
}

export async function listSubscriptionFeatures(actor?: SubscriptionActor | null) {
  const result = await request("/v1/product-features?limit=100", actor) as { features?: SubscriptionFeature[] };
  return result.features ?? [];
}

export async function listSubscriptionFeaturesPage(actor?: SubscriptionActor | null, options: { limit?: number; offset?: number } = {}) {
  const limit = options.limit ?? 10;
  const offset = options.offset ?? 0;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const result = await request(`/v1/product-features?${params.toString()}`, actor) as { features?: SubscriptionFeature[]; pagination?: SubscriptionPagination };
  const features = result.features ?? [];
  return {
    features,
    pagination: result.pagination ?? { limit, offset, count: features.length, has_more: false },
  };
}

export async function listSubscriptionPlansPage(actor?: SubscriptionActor | null, options: { limit?: number; offset?: number } = {}) {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const result = await request(`/v1/plans?${params.toString()}`, actor) as { plans?: SubscriptionPlan[]; pagination?: SubscriptionPagination };
  const plans = result.plans ?? [];
  const detailed = await Promise.all(plans.map((plan) => getSubscriptionPlan(plan.id, actor).catch(() => plan)));
  return {
    plans: detailed.filter((plan): plan is SubscriptionPlan => Boolean(plan)),
    pagination: result.pagination ?? { limit, offset, count: plans.length, has_more: false },
  };
}

export async function listSubscriptionPlans(actor?: SubscriptionActor | null) {
  const result = await listSubscriptionPlansPage(actor, { limit: 100, offset: 0 });
  return result.plans;
}

export async function listSubscriptionBillingCycles(actor?: SubscriptionActor | null) {
  const result = await request("/v1/plans/billing-cycles", actor) as { billing_cycles?: SubscriptionBillingCycle[] };
  return result.billing_cycles ?? [];
}

export async function getSubscriptionPlan(planId: string, actor?: SubscriptionActor | null) {
  const result = await request(`/v1/plans/${encodeURIComponent(planId)}`, actor) as { plan?: SubscriptionPlan };
  return result.plan ?? null;
}

export async function listApplicationSubscriptions(applicationId = defaultApplicationId(), actor?: SubscriptionActor | null) {
  const result = await request(`/v1/applications/${encodeURIComponent(applicationId)}/subscriptions?limit=100`, actor) as { subscriptions?: OrganisationSubscription[] };
  return result.subscriptions ?? [];
}

export async function getApplicationEntitlements(applicationId = defaultApplicationId(), actor?: SubscriptionActor | null) {
  return request(`/v1/applications/${encodeURIComponent(applicationId)}/entitlements`, actor) as Promise<ApplicationEntitlements>;
}

export async function createSubscriptionProduct(input: Partial<SubscriptionProduct>, actor?: SubscriptionActor | null) {
  return request("/v1/products", actor, { method: "POST", body: JSON.stringify(input) });
}

export async function updateSubscriptionProduct(productId: string, input: Partial<SubscriptionProduct>, actor?: SubscriptionActor | null) {
  return request(`/v1/products/${encodeURIComponent(productId)}`, actor, { method: "PUT", body: JSON.stringify(input) });
}

export async function suspendSubscriptionProduct(productId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/products/${encodeURIComponent(productId)}/suspend`, actor, { method: "POST" });
}

export async function deleteSubscriptionProduct(productId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/products/${encodeURIComponent(productId)}`, actor, { method: "DELETE" });
}

export async function createSubscriptionFeature(input: Partial<SubscriptionFeature>, actor?: SubscriptionActor | null) {
  return request("/v1/product-features", actor, { method: "POST", body: JSON.stringify(input) });
}

export async function updateSubscriptionFeature(featureId: string, input: Partial<SubscriptionFeature>, actor?: SubscriptionActor | null) {
  return request(`/v1/product-features/${encodeURIComponent(featureId)}`, actor, { method: "PUT", body: JSON.stringify(input) });
}

export async function disableSubscriptionFeature(featureId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/product-features/${encodeURIComponent(featureId)}/disable`, actor, { method: "POST" });
}

export async function deleteSubscriptionFeature(featureId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/product-features/${encodeURIComponent(featureId)}`, actor, { method: "DELETE" });
}

export async function createSubscriptionPlan(input: Partial<SubscriptionPlan>, actor?: SubscriptionActor | null) {
  return request("/v1/plans", actor, { method: "POST", body: JSON.stringify(input) });
}

export async function updateSubscriptionPlan(planId: string, input: Partial<SubscriptionPlan>, actor?: SubscriptionActor | null) {
  return request(`/v1/plans/${encodeURIComponent(planId)}`, actor, { method: "PUT", body: JSON.stringify(input) });
}

export async function suspendSubscriptionPlan(planId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/plans/${encodeURIComponent(planId)}/suspend`, actor, { method: "POST" });
}

export async function deleteSubscriptionPlan(planId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/plans/${encodeURIComponent(planId)}`, actor, { method: "DELETE" });
}

export async function replaceSubscriptionPlanFeatures(planId: string, featureIds: string[], actor?: SubscriptionActor | null) {
  return request(`/v1/plans/${encodeURIComponent(planId)}/features`, actor, {
    method: "PUT",
    body: JSON.stringify({ feature_ids: featureIds }),
  });
}

export async function replaceSubscriptionPlanProducts(planId: string, products: Array<string | { product_id: string; price_adjustment_percent?: number }>, actor?: SubscriptionActor | null) {
  const productRows = products.map((product) => typeof product === "string" ? { product_id: product, price_adjustment_percent: 0 } : product);
  return request(`/v1/plans/${encodeURIComponent(planId)}/products`, actor, {
    method: "PUT",
    body: JSON.stringify({ products: productRows }),
  });
}

export async function quoteSubscriptionPlans(planIds: string[], billingPeriod: "month" | "year", actor?: SubscriptionActor | null) {
  const result = await request("/v1/plans/quote", actor, {
    method: "POST",
    body: JSON.stringify({ plan_ids: planIds, billing_period: billingPeriod }),
  }) as { quote?: SubscriptionQuote };
  return result.quote ?? {
    currency: "GBP",
    billing_period: billingPeriod,
    subtotal_minor: 0,
    adjustment_minor: 0,
    duplicate_feature_savings_minor: 0,
    total_minor: 0,
    products: [],
    features: [],
    skipped_duplicate_features: [],
  };
}

export async function createApplicationSubscription(input: {
  applicationId?: string;
  organisationId?: string;
  planId: string;
}, actor?: SubscriptionActor | null) {
  const applicationId = input.applicationId || defaultApplicationId();
  return request(`/v1/applications/${encodeURIComponent(applicationId)}/subscriptions`, actor, {
    method: "POST",
    body: JSON.stringify({ owner_type: "application", owner_id: applicationId, organisation_id: input.organisationId, plan_id: input.planId }),
  }) as Promise<CreateSubscriptionResponse>;
}

export async function getCurrentApplicationSubscription(applicationId = defaultApplicationId(), actor?: SubscriptionActor | null) {
  return request(`/v1/applications/${encodeURIComponent(applicationId)}/subscriptions/current`, actor) as Promise<CurrentSubscriptionState>;
}

export async function updateApplicationSubscription(subscriptionId: string, input: { planId: string; status: string }, actor?: SubscriptionActor | null) {
  return request(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, actor, {
    method: "PUT",
    body: JSON.stringify({ plan_id: input.planId, status: input.status }),
  });
}

export async function suspendApplicationSubscription(subscriptionId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}/suspend`, actor, { method: "POST" });
}

export async function cancelApplicationSubscription(subscriptionId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, actor, { method: "POST" });
}

export async function reactivateApplicationSubscription(subscriptionId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}/reactivate`, actor, { method: "POST" });
}

export async function deleteApplicationSubscription(subscriptionId: string, actor?: SubscriptionActor | null) {
  return request(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, actor, { method: "DELETE" });
}

export async function listSubscriptionBillingEvents(subscriptionId: string, actor?: SubscriptionActor | null) {
  const result = await request(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}/billing-events?limit=100`, actor) as { billing_events?: SubscriptionBillingEvent[] };
  return result.billing_events ?? [];
}

export async function createSubscriptionCheckout(subscriptionId: string, input: {
  billingPeriod?: "month" | "year";
  paymentMode?: "subscription" | "one_time";
  planId: string;
  planIds?: string[];
  organisationId?: string;
}, actor?: SubscriptionActor | null) {
  return request(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}/checkout`, actor, {
    method: "POST",
    body: JSON.stringify({
      plan_id: input.planId,
      plan_ids: input.planIds,
      organisation_id: input.organisationId,
      payment_mode: input.paymentMode,
      billing_period: input.billingPeriod,
      requested_by: actor?.id,
      customer_email: actor?.email ?? undefined,
    }),
  }) as Promise<SubscriptionCheckoutResponse>;
}

export async function recordSubscriptionPlanChangePaymentResult(planChangeId: string, input: {
  status: "success" | "succeeded" | "failed" | "cancelled" | "canceled" | "expired";
  paymentId?: string;
  provider?: string;
  providerReference?: string;
}, actor?: SubscriptionActor | null) {
  return request(`/v1/subscriptions/plan-changes/${encodeURIComponent(planChangeId)}/payment-result`, actor, {
    method: "POST",
    body: JSON.stringify({
      status: input.status,
      payment_id: input.paymentId,
      provider: input.provider,
      provider_reference: input.providerReference,
    }),
  }) as Promise<{
    plan_change?: SubscriptionPlanChange;
    subscription?: OrganisationSubscription;
    billing_event?: SubscriptionBillingEvent;
  }>;
}
