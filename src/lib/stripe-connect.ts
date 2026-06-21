import { prisma } from "@/lib/prisma";

export type PaymentAccountOwner = {
  ownerId: string;
  ownerType: "academy" | "platform";
};

type StripeAccount = {
  charges_enabled?: boolean;
  details_submitted?: boolean;
  id: string;
  payouts_enabled?: boolean;
};

type StripeAccountLink = {
  url: string;
};

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || process.env.PAYMENT_GATEWAY_API_KEY || "";
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

async function stripeRequest<T>(path: string, body?: Record<string, string>, owner?: PaymentAccountOwner): Promise<T> {
  void owner;
  const key = stripeSecretKey();
  if (!key) throw new Error("Stripe API key is not configured.");

  const response = await fetch(`https://api.stripe.com${path}`, {
    body: body ? new URLSearchParams(body) : undefined,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    method: body ? "POST" : "GET",
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Stripe returned status ${response.status}.`);
  }

  return payload as T;
}
