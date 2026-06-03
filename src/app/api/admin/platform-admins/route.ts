import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSuperAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { response } = await requireSuperAdminApi();
  if (response) return response;

  const users = await prisma.user.findMany({
    where: { role: Role.PLATFORM_ADMIN },
    select: { id: true, name: true, email: true, role: true, disabled: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const { response, user: actor } = await requireSuperAdminApi();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { email } });

  if (target) {
    if (target.role === Role.SUPER_ADMIN || target.role === Role.ADMIN) {
      return NextResponse.json({ error: "Super admins cannot be changed here" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role: Role.PLATFORM_ADMIN, disabled: false },
      select: { id: true, email: true, role: true },
    });

    await writeAdminAuditLog({
      actorUserId: actor!.id,
      targetUserId: updated.id,
      action: "PLATFORM_ADMIN_PROMOTED",
      metadata: { email },
    });

    return NextResponse.json({ success: true, user: updated });
  }

  await writeAdminAuditLog({
    actorUserId: actor!.id,
    action: "PLATFORM_ADMIN_INVITED",
    metadata: { email },
  });

  return NextResponse.json({ success: true, invited: true });
}
