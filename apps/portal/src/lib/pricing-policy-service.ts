import "server-only";

import { apiGatewayUrl } from "./apiGateway";

export type PricingPolicy = {
  id: string;
  policyType: "PLATFORM_FEE";
  providerId: string;
  percentageBasisPoints: number;
  fixedAmountMinor: number;
  currency: string;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PricingPolicyResponse = {
  id: string;
  policy_type: "PLATFORM_FEE";
  provider_id: string;
  percentage_basis_points: number;
  fixed_amount_minor: number;
  currency: string;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
};

type PlatformFeePolicyResponse = {
  policy?: PricingPolicyResponse;
};

type ErrorResponse = {
  error?: string | {
    code?: string;
    message?: string;
  };
  error_code?: string;
};

export class PricingPolicyServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "PricingPolicyServiceError";
  }
}

function pricingServiceUrl() {
  return apiGatewayUrl();
}

function authHeaders(accessToken?: string, actorUserId?: string, extra?: HeadersInit) {
  const headers = new Headers(extra);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (actorUserId) headers.set("X-Actor-User-ID", actorUserId);
  return headers;
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.json().catch(() => ({} as ErrorResponse));
  if (!response.ok) {
    const errorBody = body as ErrorResponse;
    const nestedError = typeof errorBody.error === "object" && errorBody.error !== null ? errorBody.error : undefined;
    const flatError = typeof errorBody.error === "string" ? errorBody.error : undefined;
    throw new PricingPolicyServiceError(nestedError?.message ?? flatError ?? fallbackMessage, response.status, nestedError?.code ?? errorBody.error_code);
  }
  return body as T;
}

function mapPolicy(policy: PricingPolicyResponse): PricingPolicy {
  return {
    id: policy.id,
    policyType: policy.policy_type,
    providerId: policy.provider_id,
    percentageBasisPoints: policy.percentage_basis_points,
    fixedAmountMinor: policy.fixed_amount_minor,
    currency: policy.currency,
    status: policy.status,
    version: policy.version,
    createdBy: policy.created_by,
    updatedBy: policy.updated_by,
    createdAt: policy.created_at,
    updatedAt: policy.updated_at,
  };
}

export async function getPlatformFeePolicy(input: {
  accessToken?: string;
  actorUserId?: string;
  providerId: string;
  currency?: string;
}): Promise<PricingPolicy> {
  const params = new URLSearchParams({
    provider_id: input.providerId,
    currency: input.currency ?? "GBP",
  });
  const response = await fetch(`${pricingServiceUrl()}/v1/pricing/policies/platform-fee?${params.toString()}`, {
    cache: "no-store",
    headers: authHeaders(input.accessToken, input.actorUserId),
  });
  const body = await parseResponse<PlatformFeePolicyResponse>(response, "Pricing policy request failed.");
  if (!body.policy) throw new PricingPolicyServiceError("Pricing policy response did not include a policy.", response.status);
  return mapPolicy(body.policy);
}

export async function updatePlatformFeePolicy(input: {
  accessToken?: string;
  actorUserId?: string;
  providerId: string;
  percentageBasisPoints: number;
  fixedAmountMinor: number;
  currency?: string;
}): Promise<PricingPolicy> {
  const response = await fetch(`${pricingServiceUrl()}/v1/pricing/policies/platform-fee`, {
    method: "PUT",
    cache: "no-store",
    headers: authHeaders(input.accessToken, input.actorUserId, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      provider_id: input.providerId,
      percentage_basis_points: input.percentageBasisPoints,
      fixed_amount_minor: input.fixedAmountMinor,
      currency: input.currency ?? "GBP",
    }),
  });
  const body = await parseResponse<PlatformFeePolicyResponse>(response, "Pricing policy update failed.");
  if (!body.policy) throw new PricingPolicyServiceError("Pricing policy response did not include a policy.", response.status);
  return mapPolicy(body.policy);
}
