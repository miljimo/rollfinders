export type PaymentAccountOwner = {
  ownerId: string;
  ownerType: "academy" | "platform";
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
