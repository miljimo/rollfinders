import { NextResponse } from "next/server";
import { approveAcademyClaim, queueClaimApprovedEmail } from "@/lib/claim-requests";
import { getCurrentUser, requirePlatformAdminApi } from "@/lib/admin";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requirePlatformAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const { id } = await params;
  const result = await approveAcademyClaim(id, actor.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await recordAnalyticsEventBestEffort({
    eventName: "claim_approved",
    academyId: result.claim.academyId,
    source: "admin_claims",
    metadata: {
      claimId: result.claim.id,
      actorUserId: actor.id,
      createdUser: result.createdUser ?? false,
    },
  });

  let setupEmailQueued = false;
  if (result.user) {
    try {
      await queueClaimApprovedEmail(result.user);
      setupEmailQueued = true;
    } catch {
      setupEmailQueued = false;
    }
  }

  return NextResponse.json({
    claim: {
      id: result.claim.id,
      academyId: result.claim.academyId,
      status: result.claim.status,
      reviewedAt: result.claim.reviewedAt?.toISOString() ?? null,
      linkedUserId: result.claim.linkedUserId,
    },
    linkedUser: result.user ? { id: result.user.id, email: result.user.email } : null,
    createdUser: result.createdUser ?? false,
    setupEmailQueued,
  });
}
