import { headers } from "next/headers";
import { ClaimStatus } from "@prisma/client";

export type ClaimRequesterRole = "OWNER" | "HEAD_COACH" | "MANAGER" | "STAFF" | "OTHER" | string;

export type AcademyClaimListItem = {
  id: string;
  academy: {
    id?: string;
    name: string;
    city?: string | null;
    postcode?: string | null;
  };
  requester: {
    name: string;
    email: string;
    role: ClaimRequesterRole;
  };
  status: ClaimStatus;
  createdAt: string;
};

export type AcademyClaimListResponse = {
  items: AcademyClaimListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AcademyClaimDetail = AcademyClaimListItem & {
  academy: AcademyClaimListItem["academy"] & {
    slug?: string | null;
    address?: string | null;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  requester: AcademyClaimListItem["requester"] & {
    phone?: string | null;
    beltRank?: string | null;
    beltStripes?: number | null;
  };
  verificationNotes?: string | null;
  publicProofLink?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
  rejectionReason?: string | null;
  linkedUserId?: string | null;
};

export type AdminApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function pickRecord(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) return value;
  }
  return {};
}

function pickString(source: UnknownRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function pickNullableString(source: UnknownRecord, keys: string[]) {
  const value = pickString(source, keys);
  return value || null;
}

function pickNumber(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function statusValue(value: unknown): ClaimStatus {
  return Object.values(ClaimStatus).includes(value as ClaimStatus) ? value as ClaimStatus : ClaimStatus.PENDING;
}

function normalizeListItem(value: unknown): AcademyClaimListItem | null {
  if (!isRecord(value)) return null;
  const academy = pickRecord(value, ["academy"]);
  const requester = pickRecord(value, ["requester"]);
  const id = pickString(value, ["id", "claimId"]);
  if (!id) return null;

  return {
    id,
    academy: {
      id: pickString(academy, ["id", "academyId"]) || pickString(value, ["academyId"]) || undefined,
      name: pickString(academy, ["name", "academyName"], pickString(value, ["academyName"], "Unknown academy")),
      city: pickNullableString(academy, ["city"]),
      postcode: pickNullableString(academy, ["postcode"]),
    },
    requester: {
      name: pickString(requester, ["name", "requesterName"], pickString(value, ["requesterName"], "Unknown requester")),
      email: pickString(requester, ["email", "requesterEmail"], pickString(value, ["requesterEmail"], "No email supplied")),
      role: pickString(requester, ["role", "requesterRole"], pickString(value, ["requesterRole"], "OTHER")),
    },
    status: statusValue(value.status),
    createdAt: pickString(value, ["createdAt", "submittedAt"], new Date().toISOString()),
  };
}

function normalizeDetail(value: unknown): AcademyClaimDetail | null {
  if (!isRecord(value)) return null;
  const listItem = normalizeListItem(value);
  if (!listItem) return null;

  const academy = pickRecord(value, ["academy"]);
  const requester = pickRecord(value, ["requester"]);
  const reviewedBy = pickRecord(value, ["reviewedBy", "reviewer", "reviewedByAdmin"]);

  return {
    ...listItem,
    academy: {
      ...listItem.academy,
      slug: pickNullableString(academy, ["slug"]),
      address: pickNullableString(academy, ["address"]),
      website: pickNullableString(academy, ["website"]),
      email: pickNullableString(academy, ["email"]),
      phone: pickNullableString(academy, ["phone"]),
    },
    requester: {
      ...listItem.requester,
      phone: pickNullableString(requester, ["phone", "requesterPhone"]) ?? pickNullableString(value, ["requesterPhone"]),
      beltRank: pickNullableString(requester, ["beltRank", "requesterBeltRank", "requesterBjjBeltRank"]) ?? pickNullableString(value, ["requesterBeltRank", "requesterBjjBeltRank"]),
      beltStripes: pickNumber(requester, ["beltStripes", "requesterBeltStripes", "requesterBjjBeltStripes"]) ?? pickNumber(value, ["requesterBeltStripes", "requesterBjjBeltStripes"]),
    },
    verificationNotes: pickNullableString(value, ["verificationNotes", "verificationEvidence", "evidence"]),
    publicProofLink: pickNullableString(value, ["publicProofLink", "proofLink"]),
    reviewedAt: pickNullableString(value, ["reviewedAt"]),
    reviewedBy: Object.keys(reviewedBy).length ? {
      id: pickString(reviewedBy, ["id"]) || undefined,
      name: pickNullableString(reviewedBy, ["name"]),
      email: pickNullableString(reviewedBy, ["email"]),
    } : null,
    rejectionReason: pickNullableString(value, ["rejectionReason"]),
    linkedUserId: pickNullableString(value, ["linkedUserId"]),
  };
}

async function apiOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return {
    cookie: headerList.get("cookie") ?? "",
    origin: `${proto}://${host}`,
  };
}

async function adminFetch(path: string, init?: RequestInit) {
  const { cookie, origin } = await apiOrigin();
  const requestHeaders = new Headers(init?.headers);
  if (cookie) requestHeaders.set("cookie", cookie);
  requestHeaders.set("accept", "application/json");
  return fetch(`${origin}${path}`, {
    ...init,
    cache: "no-store",
    headers: requestHeaders,
  });
}

async function parseError(response: Response) {
  const body = await response.json().catch(() => null);
  if (isRecord(body)) {
    const message = pickString(body, ["error", "message"]);
    if (message) return message;
  }
  if (response.status === 403) return "Platform admin access is required.";
  if (response.status === 404) return "Claim request was not found.";
  return "Claim data could not be loaded.";
}

export async function fetchAcademyClaims(params: URLSearchParams): Promise<AdminApiResult<AcademyClaimListResponse>> {
  const query = params.toString();
  const response = await adminFetch(`/api/admin/academy-claims${query ? `?${query}` : ""}`);
  if (!response.ok) return { ok: false, status: response.status, message: await parseError(response) };

  const body = await response.json().catch(() => null);
  if (!isRecord(body)) return { ok: false, status: 500, message: "Claim list response was not valid." };
  const rawItems = Array.isArray(body.items) ? body.items : Array.isArray(body.claims) ? body.claims : [];
  const items = rawItems.map(normalizeListItem).filter((item): item is AcademyClaimListItem => Boolean(item));
  const page = pickNumber(body, ["page", "currentPage"]) ?? 1;
  const pageSize = pickNumber(body, ["pageSize", "limit"]) ?? 20;
  const totalItems = pickNumber(body, ["totalItems", "total", "count"]) ?? items.length;
  const totalPages = pickNumber(body, ["totalPages"]) ?? Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    ok: true,
    data: {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

export async function fetchAcademyClaim(id: string): Promise<AdminApiResult<AcademyClaimDetail>> {
  const response = await adminFetch(`/api/admin/academy-claims/${encodeURIComponent(id)}`);
  if (!response.ok) return { ok: false, status: response.status, message: await parseError(response) };
  const body = await response.json().catch(() => null);
  const detail = normalizeDetail(isRecord(body) && "claim" in body ? body.claim : body);
  if (!detail) return { ok: false, status: 500, message: "Claim detail response was not valid." };
  return { ok: true, data: detail };
}

export async function postClaimDecision(id: string, decision: "approve" | "reject", body?: unknown) {
  const headers = new Headers();
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await adminFetch(`/api/admin/academy-claims/${encodeURIComponent(id)}/${decision}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (response.ok) return { ok: true as const };
  return { ok: false as const, status: response.status, message: await parseError(response) };
}
