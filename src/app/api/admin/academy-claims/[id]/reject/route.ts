import { NextResponse } from "next/server";
import { claimRejectionSchema } from "@/lib/validators";
import { getCurrentUser, requirePlatformAdminApi } from "@/lib/admin";
import { queueClaimRejectedEmail, rejectAcademyClaim, zodFieldErrors } from "@/lib/claim-requests";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requirePlatformAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = claimRejectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: zodFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await rejectAcademyClaim(id, actor.id, parsed.data.rejectionReason ?? null);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  let notificationEmailQueued = false;
  if (result.notification) {
    try {
      await queueClaimRejectedEmail(result.notification);
      notificationEmailQueued = true;
    } catch {
      notificationEmailQueued = false;
    }
  }

  return NextResponse.json({
    claim: {
      id: result.claim.id,
      academyId: result.claim.academyId,
      status: result.claim.status,
      reviewedAt: result.claim.reviewedAt?.toISOString() ?? null,
      rejectionReason: result.claim.rejectionReason,
    },
    notificationEmailQueued,
  });
}
