import "server-only";

import { getStripePaymentAccountSetting, PaymentServiceError } from "@/lib/payments";

export type AcademyPaymentAccountReadiness = {
  chargesEnabled: boolean;
  connected: boolean;
  payoutsEnabled: boolean;
  providerAccountId: string | null;
  ready: boolean;
  status: string | null;
};

const unavailablePaymentAccount: AcademyPaymentAccountReadiness = {
  chargesEnabled: false,
  connected: false,
  payoutsEnabled: false,
  providerAccountId: null,
  ready: false,
  status: null,
};

export async function academyPaymentAccountReadiness(academyId: string): Promise<AcademyPaymentAccountReadiness> {
  let account;
  try {
    account = await getStripePaymentAccountSetting({
      ownerId: academyId,
      ownerType: "academy",
    });
  } catch (error) {
    if (error instanceof PaymentServiceError && (error.status === 401 || error.status === 403)) {
      return unavailablePaymentAccount;
    }
    throw error;
  }

  const connected = Boolean(account?.providerAccountId);
  const chargesEnabled = Boolean(account?.chargesEnabled);
  const payoutsEnabled = Boolean(account?.payoutsEnabled);
  const status = account?.status ?? null;
  const providerAccountId = account?.providerAccountId ?? null;

  return {
    chargesEnabled,
    connected,
    payoutsEnabled,
    providerAccountId,
    ready: connected && chargesEnabled && payoutsEnabled && status === "verified",
    status,
  };
}
