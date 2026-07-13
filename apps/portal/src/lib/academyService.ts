import { AcademyVerificationStatus, ClaimStatus, type Academy, type AcademySocialLink } from "@prisma/client";
import { normalizeBaseUrl } from "@rollfinders/api-client";
import { apiGatewayUrl } from "./apiGateway";
import { getEnvVariable } from "./environments";
import type { AcademySocialLinkInput } from "./academy-social-links";

if (typeof window !== "undefined") {
  throw new Error("Academy service calls are server-only.");
}

type AcademyServiceAcademy = {
  id: string;
  organisation_id?: string;
  application_id?: string;
  name: string;
  slug: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  image_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  listing_status?: string;
  verification_status?: string;
  is_featured?: boolean;
  settings?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

type AcademyServiceMember = {
  id: string;
  academy_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type AcademyServiceErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export class AcademyServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AcademyServiceError";
  }
}

export type AcademyMembershipRecord = {
  id: string;
  academyId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AcademyServiceRecord = Academy & {
  bookingVerified: boolean;
  members: { id: string; academyId?: string; userId?: string }[];
  paymentsVerified: boolean;
  publicListingVerified: boolean;
  claims: { status: ClaimStatus }[];
  socialLinks: Pick<AcademySocialLink, "id" | "academyId" | "platform" | "url" | "createdAt" | "updatedAt">[];
};

export type AcademyWriteInput = {
  id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  affiliation?: string | null;
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  borough?: string | null;
  categories?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  dropInPrice?: number | null;
  giAvailable?: boolean | null;
  nogiAvailable?: boolean | null;
  beginnerFriendly?: boolean | null;
  competitionFocused?: boolean | null;
  bookingVerified?: boolean | null;
  paymentsVerified?: boolean | null;
  publicListingVerified?: boolean | null;
  verificationStatus?: AcademyVerificationStatus | string | null;
  featured?: boolean | null;
  verified?: boolean | null;
  createdById?: string | null;
  socialLinks?: AcademySocialLinkInput[];
};

const academyServiceUrl = apiGatewayUrl;

function directAcademyServiceUrl() {
  const value = getEnvVariable("ACADEMY_PUBLIC_BASE_URL", "");
  if (!value.trim()) {
    throw new AcademyServiceError("Academy service URL is not configured.", 503);
  }
  return normalizeBaseUrl(value);
}

type ServiceActor = {
  id: string;
  role?: string | null;
  email?: string | null;
  academyId?: string | null;
  accessToken?: string;
};

function serviceHeaders(actor?: ServiceActor) {
  return {
    "Content-Type": "application/json",
    ...(actor?.accessToken ? { Authorization: `Bearer ${actor.accessToken}` } : {}),
    ...(actor?.id ? { "X-Actor-User-ID": actor.id, "X-Actor": JSON.stringify(actor) } : {}),
  };
}

async function parseResponse(response: Response) {
  if (response.status === 204) return {};
  const body = await response.json().catch(() => ({})) as AcademyServiceErrorBody | Record<string, unknown>;
  if (!response.ok) {
    const errorBody = body as AcademyServiceErrorBody;
    const bodyRecord = body as Record<string, unknown>;
    const fallbackMessage = typeof bodyRecord.message === "string" ? bodyRecord.message : undefined;
    const message = typeof errorBody.error?.message === "string"
      ? errorBody.error.message
      : fallbackMessage ?? `Academy service request failed with status ${response.status}.`;
    throw new AcademyServiceError(message, response.status);
  }
  return body;
}

async function request(path: string, init: RequestInit = {}, actor?: ServiceActor) {
  const response = await fetch(`${academyServiceUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...serviceHeaders(actor),
      ...init.headers,
    },
  });
  return parseResponse(response);
}

async function directRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${directAcademyServiceUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  return parseResponse(response);
}

function stringSetting(settings: Record<string, unknown>, key: string, fallback = "") {
  const legacy = settings.legacy;
  const legacyValue = legacy && typeof legacy === "object" ? (legacy as Record<string, unknown>)[key] : undefined;
  const value = settings[key] ?? legacyValue;
  return typeof value === "string" ? value : fallback;
}

function numberSetting(settings: Record<string, unknown>, key: string, fallback: number | null = null) {
  const legacy = settings.legacy;
  const legacyValue = legacy && typeof legacy === "object" ? (legacy as Record<string, unknown>)[key] : undefined;
  const value = settings[key] ?? legacyValue;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanSetting(settings: Record<string, unknown>, key: string, fallback: boolean) {
  const legacy = settings.legacy;
  const legacyValue = legacy && typeof legacy === "object" ? (legacy as Record<string, unknown>)[key] : undefined;
  const value = settings[key] ?? legacyValue;
  return typeof value === "boolean" ? value : fallback;
}

function dateValue(value?: string) {
  if (!value) return new Date(0);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function verificationStatusFromService(value?: string): AcademyVerificationStatus {
  if (value === "verified") return AcademyVerificationStatus.VERIFIED;
  if (value === "rejected") return AcademyVerificationStatus.REJECTED;
  return AcademyVerificationStatus.PENDING;
}

function verificationStatusToService(value?: AcademyVerificationStatus | string | null) {
  if (value === AcademyVerificationStatus.VERIFIED || value === "verified") return "verified";
  if (value === AcademyVerificationStatus.REJECTED || value === "rejected") return "rejected";
  return "submitted";
}

function legacySettings(input: AcademyWriteInput) {
  const publicListingVerified = input.publicListingVerified ?? input.verificationStatus === AcademyVerificationStatus.VERIFIED;
  return {
    legacy: {
      affiliation: input.affiliation ?? null,
      borough: input.borough ?? null,
      categories: input.categories ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      dropInPrice: input.dropInPrice ?? null,
      facebookUrl: input.facebookUrl ?? null,
      giAvailable: input.giAvailable ?? true,
      instagramUrl: input.instagramUrl ?? null,
      nogiAvailable: input.nogiAvailable ?? true,
      beginnerFriendly: input.beginnerFriendly ?? true,
      competitionFocused: input.competitionFocused ?? false,
      publicListingVerified,
      bookingVerified: input.bookingVerified ?? false,
      paymentsVerified: input.paymentsVerified ?? false,
      verified: input.verified ?? publicListingVerified,
      createdById: input.createdById ?? null,
      xUrl: input.xUrl ?? null,
      socialLinks: input.socialLinks ?? [],
    },
  };
}

function socialLinksFromSettings(settings: Record<string, unknown>, academyId: string, updatedAt: Date) {
  const legacy = settings.legacy;
  const legacyRecord = legacy && typeof legacy === "object" ? legacy as Record<string, unknown> : {};
  const value = settings.socialLinks ?? legacyRecord.socialLinks;
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is { platform: string; url: string } =>
      typeof item === "object"
      && item !== null
      && typeof (item as { platform?: unknown }).platform === "string"
      && typeof (item as { url?: unknown }).url === "string",
    )
    .map((link, index) => ({
      id: `${academyId}-social-${index}`,
      academyId,
      platform: link.platform as AcademySocialLink["platform"],
      url: link.url,
      createdAt: updatedAt,
      updatedAt,
    }));
}

function academyFromService(item: AcademyServiceAcademy, members: AcademyMembershipRecord[] = []): AcademyServiceRecord {
  const settings = item.settings ?? {};
  const verificationStatus = verificationStatusFromService(item.verification_status);
  const publicListingVerified = booleanSetting(settings, "publicListingVerified", verificationStatus === AcademyVerificationStatus.VERIFIED);
  const bookingVerified = booleanSetting(settings, "bookingVerified", false);
  const paymentsVerified = booleanSetting(settings, "paymentsVerified", false);
  const verified = booleanSetting(settings, "verified", publicListingVerified);
  const createdAt = dateValue(item.created_at);
  const updatedAt = dateValue(item.updated_at);
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description ?? "",
    affiliation: stringSetting(settings, "affiliation") || null,
    website: item.website_url || null,
    email: item.contact_email || null,
    phone: item.contact_phone || null,
    address: [item.address_line1, item.address_line2].filter(Boolean).join(", "),
    city: item.city ?? "",
    postcode: item.postcode ?? "",
    borough: item.region || stringSetting(settings, "borough") || null,
    country: item.country ?? "United Kingdom",
    latitude: Number(item.latitude ?? 0),
    longitude: Number(item.longitude ?? 0),
    logoUrl: item.image_url || null,
    coverImageUrl: stringSetting(settings, "coverImageUrl") || null,
    categories: stringSetting(settings, "categories") || null,
    facebookUrl: stringSetting(settings, "facebookUrl") || null,
    instagramUrl: stringSetting(settings, "instagramUrl") || null,
    xUrl: stringSetting(settings, "xUrl") || null,
    dropInPrice: numberSetting(settings, "dropInPrice"),
    giAvailable: booleanSetting(settings, "giAvailable", true),
    nogiAvailable: booleanSetting(settings, "nogiAvailable", true),
    beginnerFriendly: booleanSetting(settings, "beginnerFriendly", true),
    competitionFocused: booleanSetting(settings, "competitionFocused", false),
    publicListingVerified,
    bookingVerified,
    paymentsVerified,
    verificationStatus,
    featured: item.is_featured ?? false,
    verified,
    createdAt,
    updatedAt,
    createdById: stringSetting(settings, "createdById") || null,
    members: members.map((member) => ({ id: member.id, academyId: member.academyId, userId: member.userId })),
    claims: [],
    socialLinks: socialLinksFromSettings(settings, item.id, updatedAt),
  };
}

function academyPayload(input: AcademyWriteInput) {
  return {
    organisation_id: input.id,
    application_id: process.env.ROLLFINDERS_APPLICATION_ID ?? "app_rollfinders",
    name: input.name,
    slug: input.slug,
    description: input.description ?? "",
    contact_email: input.email ?? "",
    contact_phone: input.phone ?? "",
    website_url: input.website ?? "",
    image_url: input.logoUrl ?? input.coverImageUrl ?? "",
    address_line1: input.address ?? "",
    address_line2: "",
    city: input.city ?? "",
    region: input.borough ?? "",
    postcode: input.postcode ?? "",
    country: input.country ?? "United Kingdom",
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    verification_status: verificationStatusToService(input.verificationStatus),
    is_featured: input.featured ?? false,
    settings: legacySettings(input),
  };
}

function membershipFromService(item: AcademyServiceMember): AcademyMembershipRecord {
  return {
    id: item.id,
    academyId: item.academy_id,
    userId: item.user_id,
    createdAt: dateValue(item.created_at),
    updatedAt: dateValue(item.updated_at),
  };
}

export async function listAcademiesFromAcademyService({ q, limit = 100, offset = 0, actor }: { q?: string; limit?: number; offset?: number; actor?: ServiceActor } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (q?.trim()) params.set("q", q.trim());
  const response = await request(`/v1/academies?${params.toString()}`, {}, actor) as { academies?: AcademyServiceAcademy[] };
  return (response.academies ?? []).map((academy) => academyFromService(academy));
}

export async function listAllAcademiesFromAcademyService({ q, batchSize = 100, actor }: { q?: string; batchSize?: number; actor?: ServiceActor } = {}) {
  const academies: AcademyServiceRecord[] = [];
  let offset = 0;
  while (true) {
    const batch = await listAcademiesFromAcademyService({ q, limit: batchSize, offset, actor });
    academies.push(...batch);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }
  return academies;
}

export function academyMatchesSearch(academy: AcademyServiceRecord, search: string) {
  const value = search.trim().toLowerCase();
  if (!value) return true;
  return [
    academy.name,
    academy.slug,
    academy.city,
    academy.postcode,
    academy.email ?? "",
    academy.phone ?? "",
    academy.website ?? "",
  ].some((field) => field.toLowerCase().includes(value));
}

export function academyClaimPlaceholder(status: ClaimStatus) {
  return { status };
}

export async function getAcademyFromAcademyService(id: string, actor?: ServiceActor) {
  try {
    const academy = await request(`/v1/academies/${encodeURIComponent(id)}`, {}, actor) as AcademyServiceAcademy;
    const members = await listAcademyMembersFromAcademyService(id, actor);
    return academyFromService(academy, members);
  } catch (error) {
    if (error instanceof AcademyServiceError && error.status === 404) return null;
    throw error;
  }
}

export async function findAcademyBySlugFromAcademyService(slug: string) {
  const academies = await listAcademiesFromAcademyService({ q: slug, limit: 100 });
  const academy = academies.find((item) => item.slug === slug);
  return academy ?? null;
}

export async function createAcademyInAcademyService(input: AcademyWriteInput, actor?: ServiceActor) {
  const academy = await request("/v1/academies", {
    method: "POST",
    body: JSON.stringify(academyPayload(input)),
  }, actor) as AcademyServiceAcademy;
  return academyFromService(academy);
}

export async function updateAcademyInAcademyService(id: string, input: AcademyWriteInput, actor?: ServiceActor) {
  const academy = await request(`/v1/academies/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(academyPayload(input)),
  }, actor) as AcademyServiceAcademy;
  return academyFromService(academy);
}

export async function deleteAcademyInAcademyService(id: string, actor?: ServiceActor) {
  const academy = await request(`/v1/academies/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, actor) as AcademyServiceAcademy;
  return academyFromService(academy);
}

export async function listAcademyMembersFromAcademyService(academyId: string, actor?: ServiceActor) {
  let response: { members?: AcademyServiceMember[] };
  try {
    response = await request(`/v1/academies/${encodeURIComponent(academyId)}/members`, {}, actor) as { members?: AcademyServiceMember[] };
  } catch (error) {
    if (error instanceof AcademyServiceError && error.status === 404) return [];
    if (!actor && error instanceof AcademyServiceError && (error.status === 401 || error.status === 403)) return [];
    throw error;
  }
  return (response.members ?? []).map(membershipFromService);
}

export async function listAcademyMembershipsForUserFromAcademyService(userId: string, actor?: ServiceActor) {
  const response = await request(`/v1/memberships?user_id=${encodeURIComponent(userId)}`, {}, actor) as { memberships?: AcademyServiceMember[] };
  return (response.memberships ?? []).map(membershipFromService);
}

export async function listAcademiesForActorFromAcademyService(actor: { id: string; role?: string; academyId?: string | null }) {
  if (actor.role === "SUPER_ADMIN" || actor.role === "ADMIN" || actor.role === "PLATFORM_ADMIN") {
    return listAllAcademiesFromAcademyService({ actor });
  }
  if ((actor.role === "ACADEMY_ADMIN" || actor.role === "ACADEMY_OWNER") && actor.academyId) {
    const academy = await getAcademyFromAcademyService(actor.academyId, actor);
    return academy ? [academy] : [];
  }
  const memberships = await listAcademyMembershipsForUserFromAcademyService(actor.id, actor);
  const academies = await Promise.all(memberships.map((membership) => getAcademyFromAcademyService(membership.academyId, actor)));
  return academies.filter((academy): academy is AcademyServiceRecord => Boolean(academy));
}

export async function addAcademyMemberInAcademyService(academyId: string, userId: string, actor?: ServiceActor) {
  const member = await request("/v1/memberships", {
    method: "POST",
    body: JSON.stringify({ academy_id: academyId, user_id: userId }),
  }, actor) as AcademyServiceMember;
  return membershipFromService(member);
}

export async function addPublicRegistrationAcademyMember(academyId: string, userId: string) {
  const member = await directRequest(`/v1/academies/${encodeURIComponent(academyId)}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  }) as AcademyServiceMember;
  return membershipFromService(member);
}

export async function removeAcademyMemberInAcademyService(academyId: string, userId: string, actor?: ServiceActor) {
  await request(`/v1/academies/${encodeURIComponent(academyId)}/members/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  }, actor);
}

export async function removeAcademyMembershipInAcademyService(membershipId: string, actor?: ServiceActor) {
  await request(`/v1/memberships/${encodeURIComponent(membershipId)}`, {
    method: "DELETE",
  }, actor);
}
