import { prisma } from "@/lib/prisma";

export type PaymentAccountOwner = {
  ownerId: string;
  ownerType: "academy" | "platform";
};

type StripeAccount = {
  charges_enabled?: boolean;
  created?: number;
  details_submitted?: boolean;
  id: string;
  metadata?: Record<string, string>;
  payouts_enabled?: boolean;
};

type StripeAccountLink = {
  url: string;
};

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || process.env.PAYMENT_GATEWAY_API_KEY || "";
}

export function isMissingStripeAccountError(error: unknown) {
  return error instanceof Error && /No such account|No such destination/i.test(error.message);
}

export function rollfindersPlatformPaymentAccountStatus() {
  if (!stripeSecretKey()) return null;

  return {
    chargesEnabled: true,
    payoutsEnabled: true,
    providerAccountId: "rollfinders-stripe-platform",
    status: "verified",
  };
}

export function paymentSettingsHref(params: Record<string, string | undefined> = {}) {
  const urlParams = new URLSearchParams({ panel: "payments", paymentsView: "settings" });
  Object.entries(params).forEach(([key, value]) => {
    if (value) urlParams.set(key, value);
  });
  return `/dashboard?${urlParams.toString()}`;
}

export function browserOrigin(request: Request) {
  const configuredUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) return new URL(configuredUrl).origin;

  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = forwardedProto || requestUrl.protocol.replace(":", "") || "http";
  const normalizedHost = host.replace(/^0\.0\.0\.0(?=(:|$))/, "localhost");

  return `${protocol}://${normalizedHost}`;
}

export function browserUrl(request: Request, path: string) {
  return new URL(path, browserOrigin(request));
}

export async function getPaymentAccountOwner(user: { academyId?: string | null; role?: string }, requestedOwner: string | null): Promise<PaymentAccountOwner | null> {
  const wantsAcademy = requestedOwner === "academy" || (requestedOwner !== "platform" && Boolean(user.academyId));
  if (wantsAcademy) {
    if (!user.academyId) return null;
    return { ownerId: user.academyId, ownerType: "academy" };
  }

  return { ownerId: "rollfinders", ownerType: "platform" };
}

export async function upsertPaymentAccountFromStripe(owner: PaymentAccountOwner, account: StripeAccount) {
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const status = account.details_submitted && chargesEnabled && payoutsEnabled ? "verified" : "verification_required";

  return prisma.paymentAccountSetting.upsert({
    create: {
      academyId: owner.ownerType === "academy" ? owner.ownerId : null,
      chargesEnabled,
      ownerId: owner.ownerId,
      ownerType: owner.ownerType,
      payoutsEnabled,
      provider: "stripe",
      providerAccountId: account.id,
      status,
    },
    update: {
      academyId: owner.ownerType === "academy" ? owner.ownerId : null,
      chargesEnabled,
      payoutsEnabled,
      providerAccountId: account.id,
      status,
    },
    where: {
      ownerType_ownerId_provider: {
        ownerId: owner.ownerId,
        ownerType: owner.ownerType,
        provider: "stripe",
      },
    },
  });
}

export async function createStripeConnectedAccount(email: string, owner: PaymentAccountOwner) {
  return stripeRequest<StripeAccount>("/v1/accounts", {
    "business_profile[product_description]": "RollFinders booking and event payments",
    "capabilities[card_payments][requested]": "true",
    "capabilities[transfers][requested]": "true",
    country: "GB",
    email,
    "metadata[owner_id]": owner.ownerId,
    "metadata[owner_type]": owner.ownerType,
    type: "express",
  }, owner);
}

export async function retrieveStripeConnectedAccount(accountId: string, owner: PaymentAccountOwner) {
  return stripeRequest<StripeAccount>(`/v1/accounts/${encodeURIComponent(accountId)}`, undefined, owner);
}

export async function findReusableStripeConnectedAccount(owner: PaymentAccountOwner) {
  const response = await stripeRequest<{ data?: StripeAccount[] }>("/v1/accounts?limit=100", undefined, owner);
  const ownerAccounts = (response.data ?? []).filter((account) => accountMatchesOwner(account, owner));
  const sortedAccounts = ownerAccounts.sort((left, right) => (right.created ?? 0) - (left.created ?? 0));

  return sortedAccounts.find(isReadyStripeAccount)
    ?? sortedAccounts.find((account) => account.details_submitted)
    ?? sortedAccounts[0]
    ?? null;
}

export async function deleteDuplicateStripeConnectedAccounts(owner: PaymentAccountOwner, retainedAccountId: string) {
  const response = await stripeRequest<{ data?: StripeAccount[] }>("/v1/accounts?limit=100", undefined, owner);
  const duplicates = (response.data ?? []).filter((account) => accountMatchesOwner(account, owner) && account.id !== retainedAccountId);

  await Promise.all(duplicates.map((account) => deleteStripeConnectedAccount(account.id, owner)));
}

export async function createStripeAccountLink({
  accountId,
  owner,
  refreshUrl,
  returnUrl,
  type,
}: {
  accountId: string;
  owner: PaymentAccountOwner;
  refreshUrl: string;
  returnUrl: string;
  type: "account_onboarding" | "account_update";
}) {
  return stripeRequest<StripeAccountLink>("/v1/account_links", {
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type,
  }, owner);
}

export async function deleteStripeConnectedAccount(accountId: string, owner: PaymentAccountOwner) {
  return stripeRequest<{ deleted?: boolean; id: string }>(`/v1/accounts/${encodeURIComponent(accountId)}`, undefined, owner, "DELETE");
}

async function stripeRequest<T>(path: string, body?: Record<string, string>, owner?: PaymentAccountOwner, method?: "DELETE" | "GET" | "POST"): Promise<T> {
  void owner;
  const key = stripeSecretKey();
  if (!key) throw new Error("Stripe API key is not configured.");

  const response = await fetch(`https://api.stripe.com${path}`, {
    body: body ? new URLSearchParams(body) : undefined,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    method: method ?? (body ? "POST" : "GET"),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({})) as { error?: { code?: string; message?: string } };
  if (!response.ok) {
    const message = payload.error?.message || `Stripe returned status ${response.status}.`;
    const error = new Error(message) as Error & { code?: string };
    error.code = payload.error?.code;
    throw error;
  }

  return payload as T;
}

function accountMatchesOwner(account: StripeAccount, owner: PaymentAccountOwner) {
  return account.metadata?.owner_id === owner.ownerId && account.metadata?.owner_type === owner.ownerType;
}

function isReadyStripeAccount(account: StripeAccount) {
  return Boolean(account.details_submitted && account.charges_enabled && account.payouts_enabled);
}
