import { ClaimStatus, type ClaimRequesterRole } from "@prisma/client";
import { getAcademyClaim, listAcademyClaims } from "@/lib/academy-domain-data";
import { getAcademyFromAcademyService } from "@/lib/academyService";

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

  const result = await listAcademyClaims({ page, pageSize, search, status });

  return {
    ok: true,
    data: {
      items: result.claims.map((claim) => {
        const academy = result.academyById.get(claim.academyId);
        return {
          id: claim.id,
          academy: {
            id: academy?.id ?? claim.academyId,
            name: academy?.name ?? "Unknown academy",
            city: academy?.city ?? null,
            postcode: academy?.postcode ?? null,
          },
          requester: {
            name: claim.requesterName,
            email: claim.requesterEmail,
            role: claim.requesterRole,
          },
          status: claim.status,
          createdAt: claim.createdAt.toISOString(),
        };
      }),
      page: result.page,
      pageSize,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    },
  };
}

export async function fetchAcademyClaim(id: string): Promise<AdminApiResult<AcademyClaimDetail>> {
  const claim = await getAcademyClaim(id);

  if (!claim) return { ok: false, status: 404, message: "Claim request was not found." };
  const academy = await getAcademyFromAcademyService(claim.academyId);

  return {
    ok: true,
    data: {
      id: claim.id,
      academy: {
        id: academy?.id ?? claim.academyId,
        name: academy?.name ?? "Unknown academy",
        slug: academy?.slug ?? null,
        address: academy?.address ?? null,
        city: academy?.city ?? null,
        postcode: academy?.postcode ?? null,
        website: academy?.website ?? null,
        email: academy?.email ?? null,
        phone: academy?.phone ?? null,
      },
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
