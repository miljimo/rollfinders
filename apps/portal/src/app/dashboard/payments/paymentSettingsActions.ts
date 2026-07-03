"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, isPlatformAdminRole, isSuperAdminRole } from "@/lib/admin";
import { updatePlatformFeePolicy } from "@/lib/pricing-policy-service";

function settingsRedirect(params: Record<string, string>): never {
  const urlParams = new URLSearchParams({ paymentsView: "settings", ...params });
  redirect(`/dashboard/payment?${urlParams.toString()}`);
}

function decimalPercentToBasisPoints(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

function poundsToMinor(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export async function updatePlatformPaymentFees(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (!isSuperAdminRole(user.role) && !isPlatformAdminRole(user.role))) {
    settingsRedirect({ paymentSettingsError: "Platform payment settings access is required." });
  }

  const platformFeeBasisPoints = decimalPercentToBasisPoints(String(formData.get("platformFeePercent") ?? ""));
  const platformFeeFixedMinor = poundsToMinor(String(formData.get("platformFeeFixed") ?? "0"));
  const providerId = String(formData.get("providerId") ?? "").trim();

  if (platformFeeBasisPoints === null || platformFeeBasisPoints < 0 || platformFeeBasisPoints > 10000) {
    settingsRedirect({ paymentSettingsError: "Platform fee percentage must be between 0 and 100." });
  }

  if (platformFeeFixedMinor === null || platformFeeFixedMinor < 0 || platformFeeFixedMinor > 100000) {
    settingsRedirect({ paymentSettingsError: "Fixed platform fee must be between £0.00 and £1,000.00." });
  }

  if (!providerId) {
    settingsRedirect({ paymentSettingsError: "Select a wallet or provider account before saving platform fees." });
  }

  try {
    await updatePlatformFeePolicy({
      accessToken: user.accessToken,
      actorUserId: user.id,
      currency: "GBP",
      fixedAmountMinor: platformFeeFixedMinor,
      percentageBasisPoints: platformFeeBasisPoints,
      providerId,
    });
  } catch (error) {
    settingsRedirect({ paymentSettingsError: error instanceof Error ? error.message : "Platform fee policy could not be updated." });
  }

  settingsRedirect({ paymentSettingsMessage: "platform-fees-updated", pricingProviderId: providerId });
}
