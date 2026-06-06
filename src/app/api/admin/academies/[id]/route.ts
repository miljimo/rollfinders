import { NextResponse } from "next/server";
import { AcademyVerificationStatus } from "@prisma/client";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isSuperAdminRole, requireAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { academySchema } from "@/lib/validators";

async function academyExists(id: string, name: string, address: string, postcode: string) {
  return prisma.academy.findFirst({
    where: {
      id: { not: id },
      name: { equals: name.trim(), mode: "insensitive" },
      address: { equals: address.trim(), mode: "insensitive" },
      postcode: { equals: postcode.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
}

function toNullable(value: string | null | undefined) {
  return value ? value : null;
}

function toNullableNumber(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : value;
}

function academyData(data: ReturnType<typeof academySchema.parse>) {
  return {
    ...data,
    borough: toNullable(data.borough),
    website: toNullable(data.website),
    email: toNullable(data.email),
    logoUrl: toNullable(data.logoUrl),
    coverImageUrl: toNullable(data.coverImageUrl),
    categories: toNullable(data.categories),
    facebookUrl: toNullable(data.facebookUrl),
    instagramUrl: toNullable(data.instagramUrl),
    xUrl: toNullable(data.xUrl),
    dropInPrice: toNullableNumber(data.dropInPrice),
    verified: data.verificationStatus === AcademyVerificationStatus.VERIFIED,
  };
}

function canAccessAcademy(actor: { role?: string; academyId?: string | null } | null, academyId: string) {
  return !isAcademyAdminRole(actor?.role) || actor?.academyId === academyId;
}

async function canDeleteAcademy(actor: { id: string; role?: string } | null, academyId: string) {
  if (!actor || !isPlatformAdminRole(actor.role)) return false;
  if (isSuperAdminRole(actor.role)) return true;
  const academy = await prisma.academy.findUnique({
    where: { id: academyId },
    select: { createdById: true },
  });
  return academy?.createdById === actor.id;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();

  const { id } = await params;
  if (!canAccessAcademy(actor, id)) return NextResponse.json({ error: "Academy access denied" }, { status: 403 });
  const academy = await prisma.academy.findUnique({ where: { id } });
  if (!academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  return NextResponse.json(academy);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();

  const { id } = await params;
  if (!canAccessAcademy(actor, id) || isAcademyAdminRole(actor?.role)) return NextResponse.json({ error: "Academy access denied" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = academySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid academy" }, { status: 400 });

  const data = parsed.data;
  const duplicate = await academyExists(id, data.name, data.address, data.postcode);
  if (duplicate) {
    return NextResponse.json({ error: "Academy already exists for this name, address, and postcode" }, { status: 409 });
  }

  const academy = await prisma.academy.update({
    where: { id },
    data: academyData(data),
  });
  if (actor) {
    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "ACADEMY_UPDATED",
      metadata: { academyId: id, academyName: academy.name },
    });
  }

  return NextResponse.json(academy);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!(await canDeleteAcademy(actor, id))) return NextResponse.json({ error: "Academy delete access denied" }, { status: 403 });
  const academy = await prisma.academy.delete({ where: { id } });
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
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();

  const { id } = await params;
  if (!canAccessAcademy(actor, id)) return NextResponse.json({ error: "Academy access denied" }, { status: 403 });
  const formData = await request.formData();

  if (formData.get("_method") === "DELETE") {
    const actor = await getCurrentUser();
    if (!(await canDeleteAcademy(actor, id))) return NextResponse.json({ error: "Academy delete access denied" }, { status: 403 });
    const academy = await prisma.academy.delete({ where: { id } });
    if (actor) {
      await writeAdminAuditLog({
        actorUserId: actor.id,
        action: "ACADEMY_DELETED",
        metadata: { academyId: id, academyName: academy.name },
      });
    }
    return NextResponse.redirect(new URL("/admin?panel=academies", request.url), { status: 303 });
  }
  if (isAcademyAdminRole(actor?.role)) return NextResponse.json({ error: "Academy access denied" }, { status: 403 });

  const parsed = academySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return NextResponse.json({ error: "Invalid academy" }, { status: 400 });
  const data = parsed.data;
  const duplicate = await academyExists(id, data.name, data.address, data.postcode);
  if (duplicate) {
    return NextResponse.json({ error: "Academy already exists for this name, address, and postcode" }, { status: 409 });
  }

  const academy = await prisma.academy.update({
    where: { id },
    data: academyData(data),
  });
  if (actor) {
    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "ACADEMY_UPDATED",
      metadata: { academyId: id, academyName: academy.name },
    });
  }

  return NextResponse.redirect(new URL("/admin?panel=academies", request.url), { status: 303 });
}
