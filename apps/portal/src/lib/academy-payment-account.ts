import "server-only";

import { normalizeBaseUrl } from "@rollfinders/api-client";
import {
  getStripePaymentAccountSetting,
  PaymentServiceError,
} from "@/lib/payments";
import { getEnvVariable } from "@/lib/environments";
import type {
  LinkedAccountConnectionType,
  LinkedAccountProvider,
  LinkedAccountStatus,
  WalletCurrency,
  WalletType,
} from "@/lib/wallet-service";

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

type WalletRecordResponse = {
  id: string;
  wallet_type: WalletType;
  owner_id: string;
  currency: WalletCurrency;
  status: string;
};

type WalletsResponse = {
  wallets?: WalletRecordResponse[];
};

type LinkedWalletAccountResponse = {
  provider?: LinkedAccountProvider;
  provider_account_id?: string;
  connection_type?: LinkedAccountConnectionType;
  status?: LinkedAccountStatus;
};

type LinkedWalletAccountsResponse = {
  data?: LinkedWalletAccountResponse[];
};

function walletInternalBaseUrl() {
  const value = getEnvVariable("WALLET_INTERNAL_BASE_URL", "");
  return value ? normalizeBaseUrl(value) : null;
}

async function academyStripeWalletReadiness(
  ownerId: string,
): Promise<AcademyPaymentAccountReadiness | null> {
  const baseUrl = walletInternalBaseUrl();
  if (!baseUrl) return null;

  const params = new URLSearchParams({
    currency: "GBP",
    limit: "50",
    owner_id: ownerId,
    wallet_type: "external",
  });
  const walletResponse = await fetch(
    `${baseUrl}/v1/wallets?${params.toString()}`,
    {
      cache: "no-store",
    },
  );
  if (!walletResponse.ok) return null;

  const walletBody = (await walletResponse.json()) as WalletsResponse;
  const wallet = (walletBody.wallets ?? []).find(
    (candidate) =>
      candidate.wallet_type === "external" &&
      candidate.owner_id === ownerId &&
      candidate.currency === "GBP" &&
      candidate.status.toLowerCase() === "active",
  );
  if (!wallet) return null;

  const linkedAccountResponse = await fetch(
    `${baseUrl}/v1/wallets/${encodeURIComponent(wallet.id)}/linked-accounts`,
    {
      cache: "no-store",
    },
  );
  if (!linkedAccountResponse.ok) return null;

  const linkedAccountBody =
    (await linkedAccountResponse.json()) as LinkedWalletAccountsResponse;
  const stripeAccount = (linkedAccountBody.data ?? []).find(
    (account) =>
      account.provider === "STRIPE" &&
      account.status === "CONNECTED" &&
      (account.connection_type === "BOTH" ||
        account.connection_type === "PAYOUT") &&
      Boolean(account.provider_account_id),
  );
  if (!stripeAccount?.provider_account_id) return null;

  return {
    chargesEnabled: true,
    connected: true,
    payoutsEnabled: true,
    providerAccountId: stripeAccount.provider_account_id,
    ready: true,
    status: "verified",
  };
}

export async function academyPaymentAccountReadiness(
  academyId: string,
  walletOwnerIds: string[] = [],
): Promise<AcademyPaymentAccountReadiness> {
  const walletBaseUrl = walletInternalBaseUrl();
  const ownerCandidates = Array.from(
    new Set([academyId, ...walletOwnerIds.filter(Boolean)]),
  );
  if (walletBaseUrl) {
    for (const ownerId of ownerCandidates) {
      const walletReadiness = await academyStripeWalletReadiness(ownerId);
      if (walletReadiness?.ready) return walletReadiness;
    }
    return unavailablePaymentAccount;
  }

  let account;
  try {
    account = await getStripePaymentAccountSetting({
      ownerId: academyId,
      ownerType: "academy",
    });
  } catch (error) {
    if (
      error instanceof PaymentServiceError &&
      (error.status === 401 || error.status === 403)
    ) {
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
    ready:
      connected && chargesEnabled && payoutsEnabled && status === "verified",
    status,
  };
}
