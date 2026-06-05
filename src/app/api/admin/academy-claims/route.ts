import { NextResponse } from "next/server";
import { ClaimStatus, type Prisma } from "@prisma/client";
import { getCurrentUser, requirePlatformAdminApi } from "@/lib/admin";
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

function parseClaimStatus(value: string) {
  if (!value) return null;
  return Object.values(ClaimStatus).includes(value as ClaimStatus) ? value as ClaimStatus : undefined;
}

export async function GET(request: Request) {
  const forbidden = await requirePlatformAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const url = new URL(request.url);
  const page = parsePositiveInt(param(url, "page"), 1);
  const pageSize = parsePageSize(param(url, "pageSize"));
  const search = param(url, "search");
  const status = parseClaimStatus(param(url, "status"));

  if (status === undefined) {
    return NextResponse.json({ error: "Invalid claim status" }, { status: 400 });
  }

  const where: Prisma.ClaimRequestWhereInput = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { requesterName: { contains: search, mode: "insensitive" } },
            { requesterEmail: { contains: search, mode: "insensitive" } },
            { academy: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const totalItems = await prisma.claimRequest.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const claims = await prisma.claimRequest.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      academyId: true,
      requesterName: true,
      requesterEmail: true,
      requesterRole: true,
      status: true,
      createdAt: true,
      academy: { select: { id: true, name: true, slug: true, city: true, postcode: true } },
    },
  });

  return NextResponse.json({
    claims: claims.map((claim) => ({
      id: claim.id,
      academyId: claim.academyId,
      academy: claim.academy,
      requesterName: claim.requesterName,
      requesterEmail: claim.requesterEmail,
      requesterRole: claim.requesterRole,
      status: claim.status,
      createdAt: claim.createdAt.toISOString(),
    })),
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
  });
}
