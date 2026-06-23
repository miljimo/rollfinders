import { NextResponse } from "next/server";
import { AcademyVerificationStatus } from "@prisma/client";
import { createAcademyInAcademyService, listAcademiesForActorFromAcademyService } from "@/lib/academyService";
import { getCurrentUser, isPlatformAdminRole, requireAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { legacySocialUrlsFromLinks, parseAcademySocialLinksJson, socialLinksFromLegacy } from "@/lib/academy-social-links";
import { recordAcademyCreatedActivity } from "@/lib/platform-admin-activity";
import { academySchema } from "@/lib/validators";

const supportedPageSizes = [20, 50, 100];

function param(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() ?? "";
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number(value || fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parsePageSize(value: string) {
  const parsed = parsePositiveInt(value, 20);
  return supportedPageSizes.includes(parsed) ? parsed : 20;
}

function parseVerificationStatus(value: string) {
  return Object.values(AcademyVerificationStatus).includes(value as AcademyVerificationStatus)
    ? value as AcademyVerificationStatus
    : null;
}

async function academyExists(name: string, address: string, postcode: string) {
  const normalized = { name: name.trim().toLowerCase(), address: address.trim().toLowerCase(), postcode: postcode.trim().toLowerCase() };
  return (await listAcademiesForActorFromAcademyService({ id: "__system__", role: "SUPER_ADMIN" })).find((academy) =>
    academy.name.trim().toLowerCase() === normalized.name
    && academy.address.trim().toLowerCase() === normalized.address
    && academy.postcode.trim().toLowerCase() === normalized.postcode,
  );
}

function toNullable(value: string | null | undefined) {
  return value ? value : null;
}

function toNullableNumber(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : value;
}

export async function GET(request: Request) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const url = new URL(request.url);
  const page = parsePositiveInt(param(url, "page"), 1);
  const pageSize = parsePageSize(param(url, "pageSize"));
  const search = param(url, "search");
  const verificationStatus = parseVerificationStatus(param(url, "verificationStatus"));
  const featured = param(url, "featured");
  const city = param(url, "city");
  const postcode = param(url, "postcode");

  const matchingAcademies = (await listAcademiesForActorFromAcademyService(actor))
    .filter((academy) => !search || academy.name.toLowerCase().includes(search.toLowerCase()))
    .filter((academy) => !verificationStatus || academy.verificationStatus === verificationStatus)
    .filter((academy) => featured !== "featured" || academy.featured)
    .filter((academy) => featured !== "not-featured" || !academy.featured)
    .filter((academy) => !city || academy.city.toLowerCase().includes(city.toLowerCase()))
    .filter((academy) => !postcode || academy.postcode.toLowerCase().includes(postcode.toLowerCase()))
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime() || left.name.localeCompare(right.name));
  const totalItems = matchingAcademies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const items = matchingAcademies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return NextResponse.json({
    items,
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
  });
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !isPlatformAdminRole(actor.role)) {
    return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  }

  const formData = await request.formData();
  const parsed = academySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return NextResponse.json({ error: "Invalid academy" }, { status: 400 });

  const data = parsed.data;
  const submittedSocialLinks = formData.get("socialLinksJson");
  const socialLinksResult = parseAcademySocialLinksJson(submittedSocialLinks);
  if (socialLinksResult.error) return NextResponse.json({ error: socialLinksResult.error }, { status: 400 });
  const socialLinks = socialLinksResult.links.length || submittedSocialLinks !== null ? socialLinksResult.links : socialLinksFromLegacy(data);
  const legacySocialUrls = legacySocialUrlsFromLinks(socialLinks);
  const duplicate = await academyExists(data.name, data.address, data.postcode);
  if (duplicate) {
    return NextResponse.json({ error: "Academy already exists for this name, address, and postcode" }, { status: 409 });
  }

  const academy = await createAcademyInAcademyService({
    name: data.name,
    slug: data.slug,
    description: data.description,
    affiliation: data.affiliation,
    address: data.address,
    city: data.city,
    postcode: data.postcode,
    country: data.country,
    latitude: data.latitude,
    longitude: data.longitude,
    phone: data.phone,
    giAvailable: data.giAvailable,
    nogiAvailable: data.nogiAvailable,
    beginnerFriendly: data.beginnerFriendly,
    competitionFocused: data.competitionFocused,
    verificationStatus: data.verificationStatus,
    featured: data.featured,
    borough: toNullable(data.borough),
    website: toNullable(data.website),
    email: toNullable(data.email),
    logoUrl: toNullable(data.logoUrl),
    coverImageUrl: toNullable(data.coverImageUrl),
    categories: toNullable(data.categories),
    facebookUrl: toNullable(legacySocialUrls.facebookUrl || data.facebookUrl),
    instagramUrl: toNullable(legacySocialUrls.instagramUrl || data.instagramUrl),
    xUrl: toNullable(legacySocialUrls.xUrl || data.xUrl),
    dropInPrice: toNullableNumber(data.dropInPrice),
    socialLinks,
    verified: data.verificationStatus === AcademyVerificationStatus.VERIFIED,
    createdById: actor.id,
  });
  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "ACADEMY_CREATED",
    metadata: { academyId: academy.id, academyName: academy.name },
  });
  await recordAcademyCreatedActivity(actor.id, academy.id);

  return NextResponse.redirect(new URL("/admin?panel=academies", request.url), { status: 303 });
}
