import { NextResponse } from "next/server";
import { getCurrentUser, requirePlatformAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requirePlatformAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const { id } = await params;
  const claim = await prisma.claimRequest.findUnique({
    where: { id },
    select: {
      id: true,
      academyId: true,
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
      rejectionReason: true,
      linkedUserId: true,
      createdAt: true,
      academy: {
        select: {
          id: true,
          name: true,
          slug: true,
          website: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          postcode: true,
          verificationStatus: true,
          verified: true,
        },
      },
      reviewedBy: { select: { id: true, email: true, role: true } },
      linkedUser: { select: { id: true, name: true, email: true, role: true, academyId: true } },
    },
  });

  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  return NextResponse.json({
    claim: {
      ...claim,
      createdAt: claim.createdAt.toISOString(),
      reviewedAt: claim.reviewedAt?.toISOString() ?? null,
    },
  });
}
