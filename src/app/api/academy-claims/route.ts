import { NextResponse } from "next/server";
import { ClaimStatus } from "@prisma/client";
import { analyticsCountryFromRequest } from "@/lib/analytics/country";
import { analyticsIdentityFromRequest, hashRequestIp } from "@/lib/analytics/identity";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { isAcademyManaged, isDuplicatePendingClaimError, nullableString, publicClaimResponse, zodFieldErrors } from "@/lib/claim-requests";
import { prisma } from "@/lib/prisma";
import { claimRequestSchema } from "@/lib/validators";

const maxBodyBytes = 12_000;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBodyBytes) {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = claimRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: zodFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const academy = await prisma.academy.findUnique({
    where: { id: data.academyId },
    select: { id: true },
  });
  if (!academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  if (await isAcademyManaged(data.academyId)) {
    return NextResponse.json({ error: "Academy is already managed" }, { status: 409 });
  }

  const duplicatePendingClaim = await prisma.claimRequest.findFirst({
    where: {
      academyId: data.academyId,
      requesterEmail: data.requesterEmail,
      status: ClaimStatus.PENDING,
    },
    select: { id: true },
  });
  if (duplicatePendingClaim) {
    return NextResponse.json({ error: "A pending claim already exists for this academy and email" }, { status: 409 });
  }

  try {
    const claim = await prisma.claimRequest.create({
      data: {
        academyId: data.academyId,
        requesterName: data.requesterName,
        requesterEmail: data.requesterEmail,
        requesterPhone: nullableString(data.requesterPhone),
        requesterRole: data.requesterRole,
        requesterBeltRank: data.requesterBeltRank ?? null,
        requesterBeltStripes: data.requesterBeltStripes ?? null,
        verificationNotes: data.verificationNotes,
        publicProofLink: nullableString(data.publicProofLink),
        status: ClaimStatus.PENDING,
      },
      select: { id: true, academyId: true, status: true, createdAt: true },
    });
    const identity = analyticsIdentityFromRequest(request);
    const country = analyticsCountryFromRequest(request);
    await recordAnalyticsEventBestEffort({
      eventName: "claim_profile_submitted",
      academyId: claim.academyId,
      source: "public_academy_claim",
      visitorId: identity.visitorId,
      sessionId: identity.sessionId,
      countryCode: country.countryCode,
      countryName: country.countryName,
      ipHash: hashRequestIp(request),
      metadata: { claimId: claim.id },
    });

    return NextResponse.json({ claim: publicClaimResponse(claim) }, { status: 201 });
  } catch (error) {
    if (isDuplicatePendingClaimError(error)) {
      return NextResponse.json({ error: "A pending claim already exists for this academy and email" }, { status: 409 });
    }
    throw error;
  }
}
