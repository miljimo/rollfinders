"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, isPlatformAdminRole, isSuperAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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

  if (platformFeeBasisPoints === null || platformFeeBasisPoints < 0 || platformFeeBasisPoints > 10000) {
    settingsRedirect({ paymentSettingsError: "Platform fee percentage must be between 0 and 100." });
  }

  if (platformFeeFixedMinor === null || platformFeeFixedMinor < 0 || platformFeeFixedMinor > 100000) {
    settingsRedirect({ paymentSettingsError: "Fixed platform fee must be between £0.00 and £1,000.00." });
  }

  await prisma.paymentPlatformSetting.upsert({
    create: {
      currency: "GBP",
      id: "rollfinders",
      platformFeeBasisPoints,
      platformFeeFixedMinor,
    },
    update: {
      currency: "GBP",
      platformFeeBasisPoints,
      platformFeeFixedMinor,
    },
    where: { id: "rollfinders" },
  });

  settingsRedirect({ paymentSettingsMessage: "platform-fees-updated" });
}
