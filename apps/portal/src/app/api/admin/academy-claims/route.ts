import { NextResponse } from "next/server";
import { ClaimStatus } from "@prisma/client";
import { listAcademyClaims } from "@/lib/academy-domain-data";
import { getCurrentUser, requirePlatformAdminApi } from "@/lib/admin";

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

  const result = await listAcademyClaims({ page, pageSize, search, status });

  return NextResponse.json({
    claims: result.claims.map((claim) => {
      const academy = result.academyById.get(claim.academyId);
      return {
      id: claim.id,
      academyId: claim.academyId,
      academy: academy ? { id: academy.id, name: academy.name, slug: academy.slug, city: academy.city, postcode: academy.postcode } : null,
      requesterName: claim.requesterName,
      requesterEmail: claim.requesterEmail,
      requesterRole: claim.requesterRole,
      status: claim.status,
      createdAt: claim.createdAt.toISOString(),
      };
    }),
    page: result.page,
    pageSize,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  });
}
