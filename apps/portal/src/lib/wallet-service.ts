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

export type WalletTransferRecord = {
  id: string;
  status: string;
  amount: number;
  currency: WalletCurrency;
  sourceWalletId: string;
  destinationWalletId: string;
  referenceType?: string;
  referenceId?: string;
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

type WalletTransferResponse = {
  id: string;
  status: string;
  amount: number;
  currency: WalletCurrency;
  source_wallet_id: string;
  destination_wallet_id: string;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
  updated_at?: string;
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

type WalletTransfersResponse = {
  data?: WalletTransferResponse[];
};

type LinkedWalletAccountsResponse = {
  data?: LinkedWalletAccountResponse[];
};

type ErrorResponse = {
  error?: string | {
    code?: string;
    message?: string;
  };
  error_code?: string;
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

function authHeaders(accessToken?: string, actorUserId?: string, extra?: HeadersInit) {
  const headers = new Headers(extra);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (actorUserId) headers.set("X-Actor-User-ID", actorUserId);
  return headers;
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.json().catch(() => ({} as ErrorResponse));
  if (!response.ok) {
    const errorBody = body as ErrorResponse;
    const nestedError = typeof errorBody.error === "object" && errorBody.error !== null ? errorBody.error : undefined;
    const flatError = typeof errorBody.error === "string" ? errorBody.error : undefined;
    throw new WalletServiceError(nestedError?.message ?? flatError ?? fallbackMessage, response.status, nestedError?.code ?? errorBody.error_code);
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

function mapTransfer(transfer: WalletTransferResponse): WalletTransferRecord {
  return {
    id: transfer.id,
    status: transfer.status,
    amount: transfer.amount,
    currency: transfer.currency,
    sourceWalletId: transfer.source_wallet_id,
    destinationWalletId: transfer.destination_wallet_id,
    referenceType: transfer.reference_type,
    referenceId: transfer.reference_id,
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
  actorUserId?: string;
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
    headers: authHeaders(input.accessToken, input.actorUserId),
  });
  const body = await parseResponse<WalletPageResponse>(response, "Wallet service request failed.");
  return {
    wallets: (body.wallets ?? []).map(mapWallet),
    pagination: body.pagination ?? { count: 0, has_more: false, limit: input.limit ?? 10, offset: input.offset ?? 0, total: 0 },
  };
}

export async function getWallet(walletId: string, accessToken?: string, actorUserId?: string): Promise<WalletRecord> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets/${encodeURIComponent(walletId)}`, {
    cache: "no-store",
    headers: authHeaders(accessToken, actorUserId),
  });
  return mapWallet(await parseResponse<WalletRecordResponse>(response, "Wallet request failed."));
}

export async function getWalletBalance(walletId: string, accessToken?: string, actorUserId?: string): Promise<WalletBalance> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets/${encodeURIComponent(walletId)}/balance`, {
    cache: "no-store",
    headers: authHeaders(accessToken, actorUserId),
  });
  return mapBalance(await parseResponse<WalletBalanceResponse>(response, "Wallet balance request failed."));
}

export async function listWalletTransactions(walletId: string, accessToken?: string, actorUserId?: string): Promise<WalletTransaction[]> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets/${encodeURIComponent(walletId)}/transactions`, {
    cache: "no-store",
    headers: authHeaders(accessToken, actorUserId),
  });
  const body = await parseResponse<WalletTransactionsResponse>(response, "Wallet transaction request failed.");
  return (body.data ?? []).map(mapTransaction);
}

export async function listWalletTransfers(input: {
  actorUserId?: string;
  accessToken?: string;
  limit?: number;
  offset?: number;
  walletId?: string;
} = {}): Promise<WalletTransaction[]> {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit ?? 100));
  params.set("offset", String(input.offset ?? 0));
  if (input.walletId) params.set("wallet_id", input.walletId);
  const response = await fetch(`${walletServiceUrl()}/v1/transfers?${params.toString()}`, {
    cache: "no-store",
    headers: authHeaders(input.accessToken, input.actorUserId),
  });
  const body = await parseResponse<WalletTransfersResponse>(response, "Transfer service request failed.");
  return (body.data ?? []).map((transfer) => ({
    id: transfer.id,
    type: "TRANSFER",
    status: transfer.status as TransactionStatus,
    amount: transfer.amount,
    currency: transfer.currency,
    sourceWalletId: transfer.source_wallet_id,
    destinationWalletId: transfer.destination_wallet_id,
    referenceType: transfer.reference_type,
    referenceId: transfer.reference_id,
    createdAt: transfer.created_at,
  }));
}

export async function listLinkedWalletAccounts(walletId: string, accessToken?: string, actorUserId?: string): Promise<LinkedWalletAccount[]> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets/${encodeURIComponent(walletId)}/linked-accounts`, {
    cache: "no-store",
    headers: authHeaders(accessToken, actorUserId),
  });
  const body = await parseResponse<LinkedWalletAccountsResponse>(response, "Wallet linked account request failed.");
  return (body.data ?? []).map(mapLinkedAccount);
}

export async function createLinkedWalletAccount(input: {
  actorUserId?: string;
  accessToken?: string;
  walletId: string;
  provider: LinkedAccountProvider;
  providerAccountId?: string;
  connectionType: LinkedAccountConnectionType;
  status: LinkedAccountStatus;
  displayName?: string;
  externalReference?: string;
  currency: WalletCurrency;
}): Promise<LinkedWalletAccount> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets/${encodeURIComponent(input.walletId)}/linked-accounts`, {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(input.accessToken, input.actorUserId, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      provider: input.provider,
      provider_account_id: input.providerAccountId,
      connection_type: input.connectionType,
      status: input.status,
      display_name: input.displayName,
      external_reference: input.externalReference,
      currency: input.currency,
    }),
  });
  return mapLinkedAccount(await parseResponse<LinkedWalletAccountResponse>(response, "Wallet linked account creation failed."));
}

export async function createWallet(input: {
  actorUserId?: string;
  accessToken?: string;
  walletType: WalletType;
  ownerId: string;
  currency: WalletCurrency;
}): Promise<WalletRecord> {
  const response = await fetch(`${walletServiceUrl()}/v1/wallets`, {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(input.accessToken, input.actorUserId, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      wallet_type: input.walletType,
      owner_id: input.ownerId,
      currency: input.currency,
    }),
  });
  return mapWallet(await parseResponse<WalletRecordResponse>(response, "Wallet creation request failed."));
}

export async function createWalletTransfer(input: {
  actorUserId?: string;
  accessToken?: string;
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  currency: WalletCurrency;
  referenceId?: string;
  description?: string;
  idempotencyKey: string;
}): Promise<WalletTransferRecord> {
  const response = await fetch(`${walletServiceUrl()}/v1/transfers`, {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(input.accessToken, input.actorUserId, {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    }),
    body: JSON.stringify({
      source_wallet_id: input.sourceWalletId,
      destination_wallet_id: input.destinationWalletId,
      amount: input.amount,
      currency: input.currency,
      reference_type: input.referenceId ? "dashboard" : undefined,
      reference_id: input.referenceId || undefined,
      description: input.description || undefined,
    }),
  });
  const body = await parseResponse<{ transfer?: WalletTransferResponse }>(response, "Wallet transfer request failed.");
  if (!body.transfer) throw new WalletServiceError("Wallet transfer response did not include a transfer record.", response.status);
  return mapTransfer(body.transfer);
}
