import "server-only";

import { getStripePaymentAccountSetting } from "@/lib/payments";

export type AcademyPaymentAccountReadiness = {
  chargesEnabled: boolean;
  connected: boolean;
  payoutsEnabled: boolean;
  providerAccountId: string | null;
  ready: boolean;
  status: string | null;
};

export async function academyPaymentAccountReadiness(academyId: string): Promise<AcademyPaymentAccountReadiness> {
  const account = await getStripePaymentAccountSetting({
    ownerId: academyId,
    ownerType: "academy",
  });

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
