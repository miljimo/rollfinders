import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role, UserEmailStatus, UserStatus, type Prisma } from "@prisma/client";
import { isSuperAdminRole, requireAdminApi, writeAdminAuditLog, getCurrentUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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

function parseRole(value: string) {
  return Object.values(Role).includes(value as Role) ? value as Role : null;
}

function parseStatus(value: string) {
  return Object.values(UserStatus).includes(value as UserStatus) ? value as UserStatus : null;
}

function parseEmailStatus(value: string) {
  return Object.values(UserEmailStatus).includes(value as UserEmailStatus) ? value as UserEmailStatus : null;
}

export async function GET(request: Request) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const page = parsePositiveInt(param(url, "page"), 1);
  const pageSize = parsePageSize(param(url, "pageSize"));
  const search = param(url, "search");
  const role = parseRole(param(url, "role"));
  const status = parseStatus(param(url, "status"));
  const emailStatus = parseEmailStatus(param(url, "emailStatus"));

  const where: Prisma.UserWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(emailStatus ? { emailStatus } : {}),
  };

  const totalItems = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const users = await prisma.user.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    select: { id: true, name: true, email: true, role: true, status: true, disabled: true, isProtected: true, emailStatus: true, lastLoginAt: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
  });

  return NextResponse.json({ users, page: currentPage, pageSize, totalItems, totalPages });
}

export async function POST(request: Request) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await request.json().catch(() => null) as { name?: string; email?: string; password?: string; role?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const role = isSuperAdminRole(actor.role) && body?.role === Role.PLATFORM_ADMIN ? Role.PLATFORM_ADMIN : Role.STANDARD_USER;
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
    actorUserId: actor.id,
    targetUserId: created.id,
    action: "USER_CREATED",
    metadata: { email, role },
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
