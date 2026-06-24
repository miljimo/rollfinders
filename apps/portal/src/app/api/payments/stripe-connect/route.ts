import { NextResponse } from "next/server";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { createStripeConnectAccountLink } from "@/lib/payments";
import {
  browserUrl,
  getPaymentAccountOwner,
  paymentSettingsHref,
} from "@/lib/stripe-connect";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (!isPlatformAdminRole(user.role) && !isAcademyAdminRole(user.role))) {
    return NextResponse.redirect(browserUrl(request, "/login"));
  }

  const requestUrl = new URL(request.url);
  const owner = await getPaymentAccountOwner(user, requestUrl.searchParams.get("owner"));
  if (!owner) {
    return redirectToSettings(request, { stripeConnectError: "No academy account is available for Stripe Connect setup." });
  }
  if (owner.ownerType === "platform" && !isPlatformAdminRole(user.role)) {
    return redirectToSettings(request, { stripeConnectError: "Platform payment account access is required." });
  }

  try {
    const ownerQuery = owner.ownerType === "academy" ? "academy" : "platform";
    const refreshUrl = browserUrl(request, `/api/payments/stripe-connect/refresh?owner=${ownerQuery}`).toString();
    const returnUrl = browserUrl(request, `/api/payments/stripe-connect/refresh?owner=${ownerQuery}&complete=1`).toString();
    const accountLink = await createStripeConnectAccountLink({
      actorUserId: user.id,
      email: user.email,
      organisationId: user.academyId,
      ownerId: owner.ownerId,
      ownerType: owner.ownerType,
      refreshUrl,
      returnUrl,
    });

    return NextResponse.redirect(accountLink.redirectUrl);
  } catch (error) {
    return redirectToSettings(request, {
      stripeConnectError: error instanceof Error ? error.message : "Stripe Connect setup could not be started.",
    });
  }
}

function redirectToSettings(request: Request, params: Record<string, string>) {
  return NextResponse.redirect(browserUrl(request, paymentSettingsHref(params)));
}
