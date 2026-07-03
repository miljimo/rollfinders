import "server-only";

import { prisma } from "@/lib/prisma";
import { getPlatformFeePolicy, PricingPolicyServiceError } from "@/lib/pricing-policy-service";

export type PaymentPlatformSettings = {
  currency: string;
  platformFeeBasisPoints: number;
  platformFeeFixedMinor: number;
  providerId: string;
};

export const defaultPaymentPlatformSettings: PaymentPlatformSettings = {
  currency: "GBP",
  platformFeeBasisPoints: 500,
  platformFeeFixedMinor: 0,
  providerId: "rollfinders-stripe-platform",
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

export async function getPaymentPlatformSettings(input: {
  accessToken?: string;
  actorUserId?: string;
  providerId?: string;
} = {}): Promise<PaymentPlatformSettings> {
  const providerId = input.providerId || defaultPaymentPlatformSettings.providerId;
  if (input.accessToken || input.actorUserId) {
    try {
      const policy = await getPlatformFeePolicy({
        accessToken: input.accessToken,
        actorUserId: input.actorUserId,
        providerId,
        currency: "GBP",
      });
      return {
        currency: policy.currency,
        platformFeeBasisPoints: policy.percentageBasisPoints,
        platformFeeFixedMinor: policy.fixedAmountMinor,
        providerId: policy.providerId,
      };
    } catch (error) {
      if (!(error instanceof PricingPolicyServiceError)) throw error;
    }
  }

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
    providerId,
  };
}
