import "server-only";

import { prisma } from "@/lib/prisma";

export type AcademyPaymentAccountReadiness = {
  chargesEnabled: boolean;
  connected: boolean;
  payoutsEnabled: boolean;
  ready: boolean;
  status: string | null;
};

export async function academyPaymentAccountReadiness(academyId: string): Promise<AcademyPaymentAccountReadiness> {
  const account = await prisma.paymentAccountSetting.findFirst({
    where: {
      academyId,
      ownerId: academyId,
      ownerType: "academy",
      provider: "stripe",
    },
    select: {
      chargesEnabled: true,
      payoutsEnabled: true,
      providerAccountId: true,
      status: true,
    },
  });

  const connected = Boolean(account?.providerAccountId);
  const chargesEnabled = Boolean(account?.chargesEnabled);
  const payoutsEnabled = Boolean(account?.payoutsEnabled);
  const status = account?.status ?? null;

  return {
    chargesEnabled,
    connected,
    payoutsEnabled,
    ready: connected && chargesEnabled && payoutsEnabled && status === "verified",
    status,
  };
}
