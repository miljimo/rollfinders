import "server-only";

import { prisma } from "@/lib/prisma";

export type PaymentPlatformSettings = {
  currency: string;
  platformFeeBasisPoints: number;
  platformFeeFixedMinor: number;
};

export const defaultPaymentPlatformSettings: PaymentPlatformSettings = {
  currency: "GBP",
  platformFeeBasisPoints: 500,
  platformFeeFixedMinor: 0,
};

export function calculatePlatformFeeMinor(amountMinor: number, settings: PaymentPlatformSettings = defaultPaymentPlatformSettings) {
  const percentageFee = Math.round((amountMinor * settings.platformFeeBasisPoints) / 10000);
  return Math.min(amountMinor, Math.max(0, percentageFee + settings.platformFeeFixedMinor));
}

export function platformFeePercentage(settings: PaymentPlatformSettings = defaultPaymentPlatformSettings) {
  return settings.platformFeeBasisPoints / 100;
}

export function platformFeeLabel(settings: PaymentPlatformSettings = defaultPaymentPlatformSettings) {
  const percentage = platformFeePercentage(settings);
  const percentageLabel = `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(2)}%`;
  if (!settings.platformFeeFixedMinor) return percentageLabel;
  return `${percentageLabel} + ${new Intl.NumberFormat("en-GB", { currency: settings.currency, style: "currency" }).format(settings.platformFeeFixedMinor / 100)}`;
}

export async function getPaymentPlatformSettings(): Promise<PaymentPlatformSettings> {
  const setting = await prisma.paymentPlatformSetting.upsert({
    create: {
      id: "rollfinders",
      ...defaultPaymentPlatformSettings,
    },
    update: {},
    where: { id: "rollfinders" },
  });

  return {
    currency: setting.currency,
    platformFeeBasisPoints: setting.platformFeeBasisPoints,
    platformFeeFixedMinor: setting.platformFeeFixedMinor,
  };
}
