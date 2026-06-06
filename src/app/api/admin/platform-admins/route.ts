import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role, UserStatus } from "@prisma/client";
import { getCurrentUser, isSuperAdminRole, writeAdminAuditLog } from "@/lib/admin";
import { ensurePlatformAdminProfile } from "@/lib/platform-admin-activity";
import { prisma } from "@/lib/prisma";

type PlatformAdminRequest = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

const platformAdminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  disabled: true,
  createdAt: true,
};

function forbiddenResponse() {
  return NextResponse.json({ error: "Not authorized" }, { status: 403 });
}

async function requireSuperAdminForPlatformAdmins() {
  const user = await getCurrentUser();
  if (!isSuperAdminRole(user?.role)) {
    return { response: forbiddenResponse(), user: null };
  }
  return { response: null, user };
}

function normaliseString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  const { response } = await requireSuperAdminForPlatformAdmins();
  if (response) return response;

  const platformAdmins = await prisma.user.findMany({
    where: { role: Role.PLATFORM_ADMIN },
    select: platformAdminSelect,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ platformAdmins });
}

export async function POST(request: Request) {
  const { response, user: actor } = await requireSuperAdminForPlatformAdmins();
  if (response) return response;

  const body = await request.json().catch(() => null) as PlatformAdminRequest | null;
  const email = normaliseString(body?.email).toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const name = normaliseString(body?.name);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existingUser && isSuperAdminRole(existingUser.role)) {
    return NextResponse.json({ error: "User cannot be converted to platform admin" }, { status: 409 });
  }

  const platformAdmin = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          ...(name ? { name } : {}),
          role: Role.PLATFORM_ADMIN,
          academyId: null,
          status: UserStatus.ACTIVE,
          disabled: false,
        },
        select: platformAdminSelect,
      })
    : await prisma.user.create({
        data: {
          name: name || null,
          email,
          passwordHash: await bcrypt.hash(normaliseString(body?.password) || "rollfinder-admin", 10),
          role: Role.PLATFORM_ADMIN,
          status: UserStatus.ACTIVE,
          disabled: false,
        },
        select: platformAdminSelect,
      });

  await ensurePlatformAdminProfile(platformAdmin.id);

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: platformAdmin.id,
    action: "PLATFORM_ADMIN_CREATED",
    metadata: { email, promotedExistingUser: Boolean(existingUser) },
  });

  return NextResponse.json({ platformAdmin }, { status: 201 });
}
