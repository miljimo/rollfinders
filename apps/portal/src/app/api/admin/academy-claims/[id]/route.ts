import { NextResponse } from "next/server";
import { getAcademyClaim } from "@/lib/academy-domain-data";
import { getAcademyFromAcademyService } from "@/lib/academyService";
import { getCurrentUser, requirePlatformAdminApi } from "@/lib/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requirePlatformAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const { id } = await params;
  const claim = await getAcademyClaim(id);

  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  const academy = await getAcademyFromAcademyService(claim.academyId);

  return NextResponse.json({
    claim: {
      ...claim,
      academy: academy ? {
        id: academy.id,
        name: academy.name,
        slug: academy.slug,
        website: academy.website,
        email: academy.email,
        phone: academy.phone,
        address: academy.address,
        city: academy.city,
        postcode: academy.postcode,
        verificationStatus: academy.verificationStatus,
        verified: academy.verified,
      } : null,
      reviewedBy: claim.reviewedById ? { id: claim.reviewedById, email: claim.reviewedById } : null,
      linkedUser: claim.linkedUserId ? { id: claim.linkedUserId } : null,
      createdAt: claim.createdAt.toISOString(),
      reviewedAt: claim.reviewedAt?.toISOString() ?? null,
    },
  });
}
