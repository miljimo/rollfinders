import "server-only";

import { apiGatewayUrl } from "./apiGateway";

if (typeof window !== "undefined") {
  throw new Error("Wallet service calls are server-only.");
}

export type WalletOwnerType = "platform" | "academy" | "user" | "event" | "system";

export type WalletRecord = {
  id: string;
  ownerType: WalletOwnerType;
  ownerId: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletBalance = {
  walletId: string;
  currency: string;
  availableBalance: number;
  reservedBalance: number;
  ledgerBalance: number;
};

export type WalletTransaction = {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  sourceWalletId?: string;
  destinationWalletId?: string;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey?: string;
  originalTransactionId?: string;
  createdAt: string;
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
  owner_type: WalletOwnerType;
  owner_id: string;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type WalletBalanceResponse = {
  wallet_id: string;
  currency: string;
  available_balance: number;
  reserved_balance: number;
  ledger_balance: number;
};

type WalletTransactionResponse = {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  source_wallet_id?: string;
  destination_wallet_id?: string;
  reference_type?: string;
  reference_id?: string;
  idempotency_key?: string;
  original_transaction_id?: string;
  created_at: string;
};

type WalletPageResponse = {
  wallets?: WalletRecordResponse[];
  pagination?: WalletPaginationMeta;
};

type WalletTransactionsResponse = {
  data?: WalletTransactionResponse[];
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
    ownerType: record.owner_type,
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
    availableBalance: balance.available_balance,
    reservedBalance: balance.reserved_balance,
    ledgerBalance: balance.ledger_balance,
  };
}

function mapTransaction(transaction: WalletTransactionResponse): WalletTransaction {
  return {
    id: transaction.id,
    type: transaction.type,
    status: transaction.status,
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

export async function listWalletsPage(input: {
  accessToken?: string;
  limit?: number;
  offset?: number;
  ownerId?: string;
  ownerType?: WalletOwnerType;
} = {}): Promise<PaginatedWallets> {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit ?? 10));
  params.set("offset", String(input.offset ?? 0));
  if (input.ownerType) params.set("owner_type", input.ownerType);
  if (input.ownerId) params.set("owner_id", input.ownerId);
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

export async function createWallet(input: {
  accessToken?: string;
  ownerType: WalletOwnerType;
  ownerId: string;
  currency: string;
}): Promise<WalletRecord> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets`, {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(input.accessToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      currency: input.currency,
    }),
  });
  return mapWallet(await parseResponse<WalletRecordResponse>(response, "Wallet creation request failed."));
}
