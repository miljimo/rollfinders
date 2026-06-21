import { NextResponse } from "next/server";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { browserUrl, getPaymentAccountOwner, paymentSettingsHref, retrieveStripeConnectedAccount, upsertPaymentAccountFromStripe } from "@/lib/stripe-connect";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (!isPlatformAdminRole(user.role) && !isAcademyAdminRole(user.role))) {
    return NextResponse.redirect(browserUrl(request, "/login"));
  }

  const requestUrl = new URL(request.url);
  const owner = await getPaymentAccountOwner(user, requestUrl.searchParams.get("owner"));
  if (!owner) {
    return redirectToSettings(request, { stripeConnectError: "No payment account was found to refresh." });
  }
  if (owner.ownerType === "platform" && !isPlatformAdminRole(user.role)) {
    return redirectToSettings(request, { stripeConnectError: "Platform payment account access is required." });
  }

  try {
    const setting = await prisma.paymentAccountSetting.findUnique({
      where: {
        ownerType_ownerId_provider: {
          ownerId: owner.ownerId,
          ownerType: owner.ownerType,
          provider: "stripe",
        },
      },
    });
    if (!setting?.providerAccountId) {
      return redirectToSettings(request, { stripeConnectError: "Stripe account setup has not been started." });
    }

    const account = await retrieveStripeConnectedAccount(setting.providerAccountId, owner);
    await upsertPaymentAccountFromStripe(owner, account);

    return redirectToSettings(request, {
      stripeConnect: requestUrl.searchParams.get("complete") ? "connected" : "refreshed",
    });
  } catch (error) {
    return redirectToSettings(request, {
      stripeConnectError: error instanceof Error ? error.message : "Stripe account status could not be refreshed.",
    });
  }
}

function redirectToSettings(request: Request, params: Record<string, string>) {
  return NextResponse.redirect(browserUrl(request, paymentSettingsHref(params)));
}
