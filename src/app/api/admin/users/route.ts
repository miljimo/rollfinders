import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role, UserStatus } from "@prisma/client";
import { requireAdminApi, requireSuperAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, status: true, disabled: true, isProtected: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const { response, user: actor } = await requireSuperAdminApi();
  if (response) return response;

  const body = await request.json().catch(() => null) as { name?: string; email?: string; password?: string; role?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const role = body?.role === Role.PLATFORM_ADMIN ? Role.PLATFORM_ADMIN : Role.STANDARD_USER;
  const passwordHash = await bcrypt.hash(body?.password || "rollfinder-user", 10);
  const created = await prisma.user.create({
    data: {
      name: body?.name?.trim() || null,
      email,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  await writeAdminAuditLog({
    actorUserId: actor!.id,
    targetUserId: created.id,
    action: "USER_CREATED",
    metadata: { email, role },
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
