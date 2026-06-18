import { ClaimStatus, type ClaimRequesterRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AcademyClaimListItem = {
  id: string;
  academy: {
    id: string;
    name: string;
    city: string | null;
    postcode: string | null;
  };
  requester: {
    name: string;
    email: string;
    role: ClaimRequesterRole;
  };
  status: ClaimStatus;
  createdAt: string;
};

export type AcademyClaimListResponse = {
  items: AcademyClaimListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AcademyClaimDetail = AcademyClaimListItem & {
  academy: AcademyClaimListItem["academy"] & {
    slug: string | null;
    address: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
  };
  requester: AcademyClaimListItem["requester"] & {
    phone: string | null;
    beltRank: string | null;
    beltStripes: number | null;
  };
  verificationNotes: string;
  publicProofLink: string | null;
  reviewedAt: string | null;
  reviewedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  rejectionReason: string | null;
  linkedUserId: string | null;
};

export type AdminApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function claimStatus(value: string | null) {
  if (!value || value === "all") return null;
  return Object.values(ClaimStatus).includes(value as ClaimStatus) ? value as ClaimStatus : undefined;
}

export async function fetchAcademyClaims(params: URLSearchParams): Promise<AdminApiResult<AcademyClaimListResponse>> {
  const page = positiveInt(params.get("page"), 1);
  const pageSize = positiveInt(params.get("pageSize"), 20);
  const status = claimStatus(params.get("status"));
  const search = params.get("search")?.trim() ?? "";

  if (status === undefined) {
    return { ok: false, status: 400, message: "Invalid claim status." };
  }

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { requesterName: { contains: search, mode: "insensitive" as const } },
            { requesterEmail: { contains: search, mode: "insensitive" as const } },
            { academy: { name: { contains: search, mode: "insensitive" as const } } },
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
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requesterName: true,
      requesterEmail: true,
      requesterRole: true,
      status: true,
      createdAt: true,
      academy: { select: { id: true, name: true, city: true, postcode: true } },
    },
  });

  return {
    ok: true,
    data: {
      items: claims.map((claim) => ({
        id: claim.id,
        academy: claim.academy,
        requester: {
          name: claim.requesterName,
          email: claim.requesterEmail,
          role: claim.requesterRole,
        },
        status: claim.status,
        createdAt: claim.createdAt.toISOString(),
      })),
      page: currentPage,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

export async function fetchAcademyClaim(id: string): Promise<AdminApiResult<AcademyClaimDetail>> {
  const claim = await prisma.claimRequest.findUnique({
    where: { id },
    select: {
      id: true,
      requesterName: true,
      requesterEmail: true,
      requesterPhone: true,
      requesterRole: true,
      requesterBeltRank: true,
      requesterBeltStripes: true,
      verificationNotes: true,
      publicProofLink: true,
      status: true,
      reviewedAt: true,
      reviewedById: true,
      rejectionReason: true,
      linkedUserId: true,
      createdAt: true,
      academy: { select: { id: true, name: true, slug: true, address: true, city: true, postcode: true, website: true, email: true, phone: true } },
    },
  });

  if (!claim) return { ok: false, status: 404, message: "Claim request was not found." };

  return {
    ok: true,
    data: {
      id: claim.id,
      academy: claim.academy,
      requester: {
        name: claim.requesterName,
        email: claim.requesterEmail,
        role: claim.requesterRole,
        phone: claim.requesterPhone,
        beltRank: claim.requesterBeltRank,
        beltStripes: claim.requesterBeltStripes,
      },
      status: claim.status,
      createdAt: claim.createdAt.toISOString(),
      verificationNotes: claim.verificationNotes,
      publicProofLink: claim.publicProofLink,
      reviewedAt: claim.reviewedAt?.toISOString() ?? null,
      reviewedBy: claim.reviewedById ? { id: claim.reviewedById, name: null, email: claim.reviewedById } : null,
      rejectionReason: claim.rejectionReason,
      linkedUserId: claim.linkedUserId,
    },
  };
}
