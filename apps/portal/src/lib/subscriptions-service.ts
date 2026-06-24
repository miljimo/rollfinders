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
  key: string;
  service_key: string;
  name: string;
  description: string;
  status: string;
  plan_selectable: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionFeature = {
  key: string;
  product_key: string;
  service_key?: string;
  name: string;
  description: string;
  status: string;
  plan_selectable: boolean;
  limit_metadata?: Record<string, unknown>;
};

export type SubscriptionPlanFeature = {
  plan_key: string;
  feature_key: string;
  product_key?: string;
  service_key?: string;
  limits?: Record<string, unknown>;
};

export type SubscriptionPlan = {
  key: string;
  name: string;
  description: string;
  status: string;
  currency: string;
  price_minor: number;
  billing_cycle: string;
  features?: SubscriptionPlanFeature[];
  included_feature_keys?: string[];
};

export type OrganisationSubscription = {
  id: string;
  organisation_id: string;
  application_id: string;
  plan_key: string;
  status: string;
  billing_period_start: string;
  billing_period_end: string;
};

export type ApplicationEntitlements = {
  organisation_id?: string;
  application_id: string;
  subscription_id?: string;
  plan_key?: string;
  status?: string;
  features?: SubscriptionPlanFeature[];
};

export class SubscriptionServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
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
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : `Subscription service request failed with status ${response.status}.`;
    throw new SubscriptionServiceError(message, response.status);
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

export async function listSubscriptionPlans(actor?: SubscriptionActor | null) {
  const result = await request("/v1/plans?limit=100", actor) as { plans?: SubscriptionPlan[] };
  const plans = result.plans ?? [];
  const detailed = await Promise.all(plans.map((plan) => getSubscriptionPlan(plan.key, actor).catch(() => plan)));
  return detailed.filter((plan): plan is SubscriptionPlan => Boolean(plan));
}

export async function getSubscriptionPlan(planKey: string, actor?: SubscriptionActor | null) {
  const result = await request(`/v1/plans/${encodeURIComponent(planKey)}`, actor) as { plan?: SubscriptionPlan };
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

export async function createSubscriptionFeature(input: Partial<SubscriptionFeature>, actor?: SubscriptionActor | null) {
  return request("/v1/product-features", actor, { method: "POST", body: JSON.stringify(input) });
}

export async function createSubscriptionPlan(input: Partial<SubscriptionPlan>, actor?: SubscriptionActor | null) {
  return request("/v1/plans", actor, { method: "POST", body: JSON.stringify(input) });
}

export async function replaceSubscriptionPlanFeatures(planKey: string, featureKeys: string[], actor?: SubscriptionActor | null) {
  return request(`/v1/plans/${encodeURIComponent(planKey)}/features`, actor, {
    method: "PUT",
    body: JSON.stringify({ feature_keys: featureKeys }),
  });
}

export async function createApplicationSubscription(input: {
  applicationId?: string;
  organisationId: string;
  planKey: string;
}, actor?: SubscriptionActor | null) {
  const applicationId = input.applicationId || defaultApplicationId();
  return request(`/v1/applications/${encodeURIComponent(applicationId)}/subscriptions`, actor, {
    method: "POST",
    body: JSON.stringify({ organisation_id: input.organisationId, plan_key: input.planKey }),
  });
}
