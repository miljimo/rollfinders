import { NextResponse } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { getCurrentUser, isProtectedSuperAdmin, requireAdminApi, requireSuperAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function normalizeRole(value?: string) {
  if (value === Role.PLATFORM_ADMIN) return Role.PLATFORM_ADMIN;
  return Role.STANDARD_USER;
}

function normalizeStatus(value?: string) {
  return value === UserStatus.DISABLED ? UserStatus.DISABLED : UserStatus.ACTIVE;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true, disabled: true, isProtected: true, emailStatus: true, lastLoginAt: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response, user: actor } = await requireSuperAdminApi();
  if (response) return response;

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json().catch(() => null) as { name?: string; email?: string; role?: string; status?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

  const protectedUser = isProtectedSuperAdmin(target);
  const role = protectedUser ? target.role : normalizeRole(body?.role);
  const status = protectedUser ? target.status : normalizeStatus(body?.status);
  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: body?.name?.trim() || null,
      email,
      role,
      status,
      disabled: status === UserStatus.DISABLED,
    },
    select: { id: true, name: true, email: true, role: true, status: true, disabled: true, isProtected: true, emailStatus: true, createdAt: true },
  });

  await writeAdminAuditLog({
    actorUserId: actor!.id,
    targetUserId: id,
    action: "USER_EDITED",
    metadata: {
      previous: { name: target.name, email: target.email, role: target.role, status: target.status },
      next: { name: updated.name, email: updated.email, role: updated.role, status: updated.status },
    },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response, user: actor } = await requireSuperAdminApi();
  if (response) return response;

  const { id } = await params;
  const current = await getCurrentUser();
  if (current?.id === id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (isProtectedSuperAdmin(target)) return NextResponse.json({ error: "Protected super admin cannot be deleted" }, { status: 400 });

  await prisma.user.delete({ where: { id } });
  await writeAdminAuditLog({
    actorUserId: actor!.id,
    targetUserId: null,
    action: "USER_DELETED",
    metadata: { email: target.email, deletedUserId: id },
  });

  return NextResponse.json({ ok: true });
}
