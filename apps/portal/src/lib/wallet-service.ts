import "server-only";

import { apiGatewayUrl } from "./apiGateway";

if (typeof window !== "undefined") {
  throw new Error("Wallet service calls are server-only.");
}

export type WalletType = "internal" | "external";
export type WalletCurrency = "GBP" | "Points";
export type LinkedAccountProvider = "STRIPE" | "PAYPAL" | "CARD" | "BANK";
export type LinkedAccountConnectionType = "TOPUP" | "PAYOUT" | "BOTH";
export type LinkedAccountStatus = "PENDING" | "CONNECTED" | "FAILED" | "DISABLED";

export type WalletRecord = {
  id: string;
  walletType: WalletType;
  ownerId: string;
  currency: WalletCurrency;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletBalance = {
  walletId: string;
  currency: WalletCurrency;
  balance: number;
};
type TransactionStatus  = "Pending" | "Approved" | "Cancelled" | "Processing"
export type WalletTransaction = {
  id: string;
  type: string;
  status: TransactionStatus;
  amount: number;
  currency: WalletCurrency;
  sourceWalletId?: string;
  destinationWalletId?: string;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey?: string;
  originalTransactionId?: string;
  createdAt: string;
};

export type LinkedWalletAccount = {
  id: string;
  walletId: string;
  provider: LinkedAccountProvider;
  providerAccountId?: string;
  connectionType: LinkedAccountConnectionType;
  status: LinkedAccountStatus;
  displayName?: string;
  externalReference?: string;
  currency: WalletCurrency;
  createdAt: string;
  updatedAt: string;
};

export type WalletPaginationMeta = {
  limit: number;
  offset: number;
  count: number;
  total: number;
  has_more: boolean;
  next_offset?: number;
};

export type PaginatedWallets = {
  wallets: WalletRecord[];
  pagination: WalletPaginationMeta;
};

type WalletRecordResponse = {
  id: string;
  wallet_type: WalletType;
  owner_id: string;
  currency: WalletCurrency;
  status: string;
  created_at: string;
  updated_at: string;
};

type WalletBalanceResponse = {
  wallet_id: string;
  currency: WalletCurrency;
  available_balance: number;
};

type WalletTransactionResponse = {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: WalletCurrency;
  source_wallet_id?: string;
  destination_wallet_id?: string;
  reference_type?: string;
  reference_id?: string;
  idempotency_key?: string;
  original_transaction_id?: string;
  created_at: string;
};

type LinkedWalletAccountResponse = {
  id: string;
  wallet_id: string;
  provider: LinkedAccountProvider;
  provider_account_id?: string;
  connection_type: LinkedAccountConnectionType;
  status: LinkedAccountStatus;
  display_name?: string;
  external_reference?: string;
  currency: WalletCurrency;
  created_at: string;
  updated_at: string;
};

type WalletPageResponse = {
  wallets?: WalletRecordResponse[];
  pagination?: WalletPaginationMeta;
};

type WalletTransactionsResponse = {
  data?: WalletTransactionResponse[];
};

type LinkedWalletAccountsResponse = {
  data?: LinkedWalletAccountResponse[];
};

type ErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class WalletServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "WalletServiceError";
  }
}

function walletServiceUrl() {
  return apiGatewayUrl();
}

function authHeaders(accessToken?: string, extra?: HeadersInit) {
  const headers = new Headers(extra);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.json().catch(() => ({} as ErrorResponse));
  if (!response.ok) {
    const errorBody = body as ErrorResponse;
    throw new WalletServiceError(errorBody.error?.message ?? fallbackMessage, response.status, errorBody.error?.code);
  }
  return body as T;
}

function mapWallet(record: WalletRecordResponse): WalletRecord {
  return {
    id: record.id,
    walletType: record.wallet_type,
    ownerId: record.owner_id,
    currency: record.currency,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapBalance(balance: WalletBalanceResponse): WalletBalance {
  return {
    walletId: balance.wallet_id,
    currency: balance.currency,
    balance: balance.available_balance
  };
}

function mapTransaction(transaction: WalletTransactionResponse): WalletTransaction {
  return {
    id: transaction.id,
    type: transaction.type,
    status:  transaction.status as TransactionStatus,
    amount: transaction.amount,
    currency: transaction.currency,
    sourceWalletId: transaction.source_wallet_id,
    destinationWalletId: transaction.destination_wallet_id,
    referenceType: transaction.reference_type,
    referenceId: transaction.reference_id,
    idempotencyKey: transaction.idempotency_key,
    originalTransactionId: transaction.original_transaction_id,
    createdAt: transaction.created_at,
  };
}

function mapLinkedAccount(account: LinkedWalletAccountResponse): LinkedWalletAccount {
  return {
    id: account.id,
    walletId: account.wallet_id,
    provider: account.provider,
    providerAccountId: account.provider_account_id,
    connectionType: account.connection_type,
    status: account.status,
    displayName: account.display_name,
    externalReference: account.external_reference,
    currency: account.currency,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  };
}

export async function listWalletsPage(input: {
  accessToken?: string;
  limit?: number;
  offset?: number;
  currency?: WalletCurrency;
  ownerId?: string;
  walletType?: WalletType;
} = {}): Promise<PaginatedWallets> {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit ?? 10));
  params.set("offset", String(input.offset ?? 0));
  if (input.walletType) params.set("wallet_type", input.walletType);
  if (input.ownerId) params.set("owner_id", input.ownerId);
  if (input.currency) params.set("currency", input.currency);
  const response = await fetch(`${walletServiceUrl()}/v1/wallets?${params.toString()}`, {
    cache: "no-store",
    headers: authHeaders(input.accessToken),
  });
  const body = await parseResponse<WalletPageResponse>(response, "Wallet service request failed.");
  return {
    wallets: (body.wallets ?? []).map(mapWallet),
    pagination: body.pagination ?? { count: 0, has_more: false, limit: input.limit ?? 10, offset: input.offset ?? 0, total: 0 },
  };
}

export async function getWalletBalance(walletId: string, accessToken?: string): Promise<WalletBalance> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets/${encodeURIComponent(walletId)}/balance`, {
    cache: "no-store",
    headers: authHeaders(accessToken),
  });
  return mapBalance(await parseResponse<WalletBalanceResponse>(response, "Wallet balance request failed."));
}

export async function listWalletTransactions(walletId: string, accessToken?: string): Promise<WalletTransaction[]> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets/${encodeURIComponent(walletId)}/transactions`, {
    cache: "no-store",
    headers: authHeaders(accessToken),
  });
  const body = await parseResponse<WalletTransactionsResponse>(response, "Wallet transaction request failed.");
  return (body.data ?? []).map(mapTransaction);
}

export async function listLinkedWalletAccounts(walletId: string, accessToken?: string): Promise<LinkedWalletAccount[]> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets/${encodeURIComponent(walletId)}/linked-accounts`, {
    cache: "no-store",
    headers: authHeaders(accessToken),
  });
  const body = await parseResponse<LinkedWalletAccountsResponse>(response, "Wallet linked account request failed.");
  return (body.data ?? []).map(mapLinkedAccount);
}

export async function createWallet(input: {
  accessToken?: string;
  walletType: WalletType;
  ownerId: string;
  currency: WalletCurrency;
}): Promise<WalletRecord> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets`, {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(input.accessToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      wallet_type: input.walletType,
      owner_id: input.ownerId,
      currency: input.currency,
    }),
  });
  return mapWallet(await parseResponse<WalletRecordResponse>(response, "Wallet creation request failed."));
}
