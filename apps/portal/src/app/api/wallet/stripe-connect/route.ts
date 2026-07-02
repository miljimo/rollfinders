import { NextResponse } from "next/server";

import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { createStripeConnectAccountLink } from "@/lib/payments";
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
  const provider = requestUrl.searchParams.get("provider")?.trim().toUpperCase();
  if (!walletId || !currency) {
    return redirectToWallet(request, { walletError: "Choose an external wallet before linking an account." });
  }
  if (provider && provider !== "STRIPE") {
    return redirectToWallet(request, { walletDialog: "wallet-details", walletId, walletError: "Only Stripe Connect linking is available right now." });
  }

  try {
    const ownerType = user.academyId && !isPlatformAdminRole(user.role) ? "academy" : "platform";
    const ownerId = ownerType === "academy" ? user.academyId! : "rollfinders";
    const walletReturnParams = new URLSearchParams({ walletId, currency, owner: ownerType });
    const refreshUrl = browserUrl(request, `/api/wallet/stripe-connect/refresh?${walletReturnParams.toString()}`).toString();
    walletReturnParams.set("complete", "1");
    const returnUrl = browserUrl(request, `/api/wallet/stripe-connect/refresh?${walletReturnParams.toString()}`).toString();
    const accountLink = await createStripeConnectAccountLink({
      actorUserId: user.id,
      email: user.email,
      organisationId: user.academyId,
      ownerId,
      ownerType,
      refreshUrl,
      returnUrl,
    });

    await createLinkedWalletAccount({
      accessToken: user.accessToken,
      actorUserId: user.id,
      walletId,
      provider: "STRIPE",
      providerAccountId: accountLink.account.providerAccountId,
      connectionType: "BOTH",
      status: accountLink.account.status === "verified" ? "CONNECTED" : "PENDING",
      displayName: "Stripe Connect",
      externalReference: accountLink.account.providerAccountId,
      currency,
    });

    return NextResponse.redirect(accountLink.redirectUrl);
  } catch (error) {
    return redirectToWallet(request, {
      walletDialog: "wallet-details",
      walletId,
      walletError: error instanceof Error ? error.message : "Wallet account linking could not be started.",
    });
  }
}

function normalizeCurrency(value: string | null): WalletCurrency | null {
  if (!value) return null;
  if (value.toLowerCase() === "points") return "Points";
  if (value.toUpperCase() === "GBP") return "GBP";
  return null;
}

function redirectToWallet(request: Request, params: Record<string, string | undefined>) {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) urlParams.set(key, value);
  });
  const query = urlParams.toString();
  return NextResponse.redirect(browserUrl(request, query ? `/dashboard/wallet?${query}` : "/dashboard/wallet"));
}
