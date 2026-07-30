import { NextResponse } from "next/server";
import { AcademyVerificationStatus } from "@prisma/client";
import { deleteAcademyInAcademyService, getAcademyFromAcademyService, listAcademiesForActorFromAcademyService, updateAcademyInAcademyService } from "@/lib/academyService";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isSuperAdminRole, requireAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { authorizeThroughService } from "@/lib/authorisation-service";
import { legacySocialUrlsFromLinks, parseAcademySocialLinksJson, socialLinksFromLegacy, type AcademySocialLinkInput } from "@/lib/academy-social-links";
import { academySchema } from "@/lib/validators";

async function academyExists(id: string, name: string, address: string, postcode: string) {
  const normalized = { name: name.trim().toLowerCase(), address: address.trim().toLowerCase(), postcode: postcode.trim().toLowerCase() };
  return (await listAcademiesForActorFromAcademyService({ id: "__system__", role: "SUPER_ADMIN" })).find((academy) =>
    academy.id !== id
    && academy.name.trim().toLowerCase() === normalized.name
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

function socialLinksFromBody(data: ReturnType<typeof academySchema.parse>, body: unknown) {
  const hasSubmittedSocialLinks = typeof body === "object" && body !== null && "socialLinksJson" in body;
  const submitted = hasSubmittedSocialLinks
    ? (body as { socialLinksJson?: unknown }).socialLinksJson
    : data.socialLinksJson;
  const parsed = parseAcademySocialLinksJson(submitted);
  if (parsed.error) return parsed;
  if (parsed.links.length > 0) return parsed;
  if (hasSubmittedSocialLinks || data.socialLinksJson !== undefined) return { links: [] };
  return { links: socialLinksFromLegacy(data) };
}

function academyData(data: ReturnType<typeof academySchema.parse>, socialLinks: AcademySocialLinkInput[]) {
  const legacySocialUrls = legacySocialUrlsFromLinks(socialLinks);
  return {
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
  };
}

function canAccessAcademy(actor: { role?: string; academyId?: string | null } | null, academyId: string) {
  return !isAcademyAdminRole(actor?.role) || actor?.academyId === academyId;
}

function academyScope(actor: { academyId?: string | null }, academyId: string) {
  return {
    organisationId: actor.academyId ?? academyId,
    applicationId: process.env.ROLLFINDERS_APPLICATION_ID ?? "app_rollfinders",
    resourceType: "academy",
    resourceId: academyId,
  };
}

async function academyUpdateActor(academyId: string) {
  const actor = await getCurrentUser();
  if (!actor) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Sign in to manage academies." }, { status: 401 }),
    };
  }
  const allowed = await authorizeThroughService(actor, "academy.update", academyScope(actor, academyId));
  return allowed
    ? { actor, response: null }
    : {
        actor: null,
        response: NextResponse.json(
          { error: "You are not authorised to update this academy." },
          { status: 403 },
        ),
      };
}

const locationFields = ["address", "city", "postcode", "borough", "country", "latitude", "longitude"] as const;

function changedLocationFields(
  existing: Awaited<ReturnType<typeof getAcademyFromAcademyService>>,
  next: ReturnType<typeof academySchema.parse>,
) {
  if (!existing) return [...locationFields];
  return locationFields.filter((field) => String(existing[field] ?? "") !== String(next[field] ?? ""));
}

async function canDeleteAcademy(actor: { id: string; role?: string } | null, academyId: string) {
  if (!actor || !isPlatformAdminRole(actor.role)) return false;
  if (isSuperAdminRole(actor.role)) return true;
  const academy = await getAcademyFromAcademyService(academyId);
  return academy?.createdById === actor.id;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();

  const { id } = await params;
  if (!canAccessAcademy(actor, id)) return NextResponse.json({ error: "Academy access denied" }, { status: 403 });
  const academy = await getAcademyFromAcademyService(id);
  if (!academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  return NextResponse.json(academy);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, response } = await academyUpdateActor(id);
  if (response || !actor) return response;
  const body = await request.json().catch(() => null);
  const parsed = academySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid academy" }, { status: 400 });

  const data = parsed.data;
  const socialLinksResult = socialLinksFromBody(data, body);
  if (socialLinksResult.error) return NextResponse.json({ error: socialLinksResult.error }, { status: 400 });
  const socialLinks = socialLinksResult.links;
  const duplicate = await academyExists(id, data.name, data.address, data.postcode);
  if (duplicate) {
    return NextResponse.json({ error: "Academy already exists for this name, address, and postcode" }, { status: 409 });
  }

  const existingAcademy = await getAcademyFromAcademyService(id, actor);
  const canManagePlatformFields = await authorizeThroughService(actor, "academy.verify", academyScope(actor, id));
  const nextVerificationStatus = canManagePlatformFields
    ? data.verificationStatus
    : existingAcademy?.verificationStatus ?? data.verificationStatus;
  const academy = await updateAcademyInAcademyService(id, {
    ...academyData(data, socialLinks),
    verificationStatus: nextVerificationStatus,
    featured: canManagePlatformFields ? data.featured : existingAcademy?.featured ?? data.featured,
    verified: nextVerificationStatus === AcademyVerificationStatus.VERIFIED,
  }, actor);
  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "ACADEMY_UPDATED",
    metadata: {
      academyId: id,
      academyName: academy.name,
      changedLocationFields: changedLocationFields(existingAcademy, data),
    },
  });

  return NextResponse.json(academy);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!(await canDeleteAcademy(actor, id))) return NextResponse.json({ error: "Academy delete access denied" }, { status: 403 });
  const academy = await deleteAcademyInAcademyService(id, actor ?? undefined);
  if (actor) {
    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "ACADEMY_DELETED",
      metadata: { academyId: id, academyName: academy.name },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await request.formData();

  if (formData.get("_method") === "DELETE") {
    const actor = await getCurrentUser();
    if (!(await canDeleteAcademy(actor, id))) return NextResponse.json({ error: "Academy delete access denied" }, { status: 403 });
    const academy = await deleteAcademyInAcademyService(id, actor ?? undefined);
    if (actor) {
      await writeAdminAuditLog({
        actorUserId: actor.id,
        action: "ACADEMY_DELETED",
        metadata: { academyId: id, academyName: academy.name },
      });
    }
    return NextResponse.redirect(new URL("/admin?panel=academies", request.url), { status: 303 });
  }
  const { actor, response } = await academyUpdateActor(id);
  if (response || !actor) return response;
  const parsed = academySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return NextResponse.json({ error: "Invalid academy" }, { status: 400 });
  const data = parsed.data;
  const socialLinksResult = socialLinksFromBody(data, { socialLinksJson: formData.get("socialLinksJson") });
  if (socialLinksResult.error) return NextResponse.json({ error: socialLinksResult.error }, { status: 400 });
  const socialLinks = socialLinksResult.links;
  const duplicate = await academyExists(id, data.name, data.address, data.postcode);
  if (duplicate) {
    return NextResponse.json({ error: "Academy already exists for this name, address, and postcode" }, { status: 409 });
  }

  const existingAcademy = await getAcademyFromAcademyService(id, actor);
  const canManagePlatformFields = await authorizeThroughService(actor, "academy.verify", academyScope(actor, id));
  const nextVerificationStatus = canManagePlatformFields
    ? data.verificationStatus
    : existingAcademy?.verificationStatus ?? data.verificationStatus;
  const academy = await updateAcademyInAcademyService(id, {
    ...academyData(data, socialLinks),
    verificationStatus: nextVerificationStatus,
    featured: canManagePlatformFields ? data.featured : existingAcademy?.featured ?? data.featured,
    verified: nextVerificationStatus === AcademyVerificationStatus.VERIFIED,
  }, actor);
  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "ACADEMY_UPDATED",
    metadata: {
      academyId: id,
      academyName: academy.name,
      changedLocationFields: changedLocationFields(existingAcademy, data),
    },
  });

  return NextResponse.redirect(new URL("/admin?panel=academies", request.url), { status: 303 });
}
