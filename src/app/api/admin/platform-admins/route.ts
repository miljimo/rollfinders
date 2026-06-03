import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role, UserStatus } from "@prisma/client";
import { requireSuperAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { response } = await requireSuperAdminApi();
  if (response) return response;

  const platformAdmins = await prisma.user.findMany({
    where: { role: Role.PLATFORM_ADMIN },
    select: { id: true, name: true, email: true, status: true, disabled: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ platformAdmins });
}

export async function POST(request: Request) {
  const { response, user: actor } = await requireSuperAdminApi();
  if (response) return response;

  const body = await request.json().catch(() => null) as { name?: string; email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body?.password || "rollfinder-admin", 10);
  const platformAdmin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.PLATFORM_ADMIN, status: UserStatus.ACTIVE, disabled: false },
    create: {
      name: body?.name?.trim() || null,
      email,
      passwordHash,
      role: Role.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  await writeAdminAuditLog({
    actorUserId: actor!.id,
    targetUserId: platformAdmin.id,
    action: "PLATFORM_ADMIN_CREATED",
    metadata: { email },
  });

  return NextResponse.json({ platformAdmin }, { status: 201 });
}
