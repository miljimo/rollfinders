import { NextResponse } from "next/server";

import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { refreshStripePaymentAccountSetting } from "@/lib/payments";
import { browserUrl } from "@/lib/stripe-connect";
import { createLinkedWalletAccount, type WalletCurrency } from "@/lib/wallet-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (!isPlatformAdminRole(user.role) && !isAcademyAdminRole(user.role))) {
    return NextResponse.redirect(browserUrl(request, "/login"));
  }

  const requestUrl = new URL(request.url);
  const walletId = requestUrl.searchParams.get("walletId")?.trim();
  const currency = normalizeCurrency(requestUrl.searchParams.get("currency"));
  const ownerType = normalizeOwnerType(requestUrl.searchParams.get("owner"), user);
  if (!walletId || !currency || !ownerType) {
    return redirectToWallet(request, { walletError: "Wallet account refresh could not identify the wallet or provider account." });
  }

  try {
    const ownerId = ownerType === "academy" ? user.academyId! : "rollfinders";
    const account = await refreshStripePaymentAccountSetting({
      actorUserId: user.id,
      organisationId: user.academyId,
      ownerId,
      ownerType,
    });
    await createLinkedWalletAccount({
      accessToken: user.accessToken,
      actorUserId: user.id,
      walletId,
      provider: "STRIPE",
      providerAccountId: account.providerAccountId,
      connectionType: "BOTH",
      status: account.status === "verified" ? "CONNECTED" : "PENDING",
      displayName: "Stripe Connect",
      externalReference: account.providerAccountId,
      currency,
    });

    return redirectToWallet(request, {
      walletDialog: "wallet-details",
      walletId,
      walletResult: requestUrl.searchParams.get("complete") ? "linked-account-connected" : "linked-account-refreshed",
    });
  } catch (error) {
    return redirectToWallet(request, {
      walletDialog: "wallet-details",
      walletId,
      walletError: error instanceof Error ? error.message : "Wallet account status could not be refreshed.",
    });
  }
}

function normalizeCurrency(value: string | null): WalletCurrency | null {
  if (!value) return null;
  if (value.toLowerCase() === "points") return "Points";
  if (value.toUpperCase() === "GBP") return "GBP";
  return null;
}

function normalizeOwnerType(value: string | null, user: { academyId?: string | null; role?: string }) {
  if (value === "platform") return isPlatformAdminRole(user.role) ? "platform" : null;
  if (value === "academy") return user.academyId ? "academy" : null;
  if (user.academyId && !isPlatformAdminRole(user.role)) return "academy";
  return "platform";
}

function redirectToWallet(request: Request, params: Record<string, string | undefined>) {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) urlParams.set(key, value);
  });
  const query = urlParams.toString();
  return NextResponse.redirect(browserUrl(request, query ? `/dashboard/wallet?${query}` : "/dashboard/wallet"));
}
