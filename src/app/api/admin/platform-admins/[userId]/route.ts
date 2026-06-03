import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSuperAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { response, user: actor } = await requireSuperAdminApi();
  if (response) return response;

  const { userId } = await params;
  const target = await prisma.user.findUnique({ where: { id: userId } });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.role === Role.SUPER_ADMIN || target.role === Role.ADMIN) {
    return NextResponse.json({ error: "Super admins cannot be removed by platform admins" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: Role.STANDARD_USER },
  });

  await writeAdminAuditLog({
    actorUserId: actor!.id,
    targetUserId: userId,
    action: "PLATFORM_ADMIN_REMOVED",
    metadata: { email: target.email },
  });

  return NextResponse.json({ success: true });
}
