import { NextResponse } from "next/server";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole, requireAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { Role } from "@prisma/client";
import { queuePasswordResetEmail } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const academyCanManage = isAcademyAdminRole(actor.role) && actor.id !== id && actor.academyId === user.academyId && (user.role === Role.STANDARD_USER || user.role === Role.USER || user.role === Role.ACADEMY_ADMIN);
  const platformCanManage = isPlatformAdminRole(actor.role) && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN && !isProtectedSuperAdmin(user);
  if (!isSuperAdminRole(actor.role) && !platformCanManage && !academyCanManage) {
    return NextResponse.json({ error: "Insufficient user management permissions" }, { status: 403 });
  }

  const { expiresAt } = await queuePasswordResetEmail(user);
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: id,
    action: "PASSWORD_CHANGE_EMAIL_SENT",
    metadata: { email: user.email, expiresAt: expiresAt.toISOString() },
  });

  return NextResponse.json({ ok: true, expiresAt });
}
