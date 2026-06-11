import { NextResponse } from "next/server";
import { GiType, type Prisma } from "@prisma/client";
import { getCurrentUser, isStandardUserRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function pageNumber(value: string | null) {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function pageSizeNumber(value: string | null) {
  const parsed = Number(value ?? "20");
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(Math.floor(parsed), 100);
}

function rollSearchWhere(academyId: string, query: string): Prisma.EventWhereInput {
  const search = query.trim();
  const giTypeSearch = search.toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
  const matchingGiType = Object.values(GiType).includes(giTypeSearch as GiType) ? giTypeSearch as GiType : null;
  return {
    academyId,
    active: true,
    eventDate: { gte: startOfToday() },
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            ...(matchingGiType ? [{ giType: matchingGiType }] : []),
          ],
        }
      : {}),
  };
}

async function assignedAcademyId(user: { id: string; academyId?: string | null }) {
  if (user.academyId) return user.academyId;
  const membership = await prisma.academyMember.findFirst({
    where: { userId: user.id },
    select: { academyId: true },
    orderBy: { createdAt: "asc" },
  });
  return membership?.academyId ?? null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStandardUserRole(user.role)) {
    return NextResponse.json({ error: "Standard dashboard access required" }, { status: 403 });
  }

  const academyId = await assignedAcademyId(user);
  if (!academyId) return NextResponse.json({ rolls: [] });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = pageNumber(url.searchParams.get("page"));
  const pageSize = pageSizeNumber(url.searchParams.get("pageSize"));
  const where = rollSearchWhere(academyId, q);
  const rolls = await prisma.event.findMany({
    where,
    select: {
      id: true,
      academyId: true,
      title: true,
      description: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      giType: true,
      price: true,
      audience: true,
      createdAt: true,
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { title: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({ rolls });
}
