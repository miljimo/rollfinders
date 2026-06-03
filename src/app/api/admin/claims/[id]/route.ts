import { AcademyMemberRole, ClaimStatus, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser, requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const formData = await request.formData();
  const status = formData.get("status");

  if (status !== ClaimStatus.APPROVED && status !== ClaimStatus.REJECTED) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const claim = await prisma.claimRequest.update({ where: { id }, data: { status } });

  if (status === ClaimStatus.APPROVED) {
    const user = await prisma.user.findUnique({ where: { email: claim.requesterEmail } });
    if (user) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { role: Role.ACADEMY_OWNER } }),
        prisma.academyMember.upsert({
          where: { academyId_userId: { academyId: claim.academyId, userId: user.id } },
          update: { role: AcademyMemberRole.OWNER },
          create: { academyId: claim.academyId, userId: user.id, role: AcademyMemberRole.OWNER },
        }),
      ]);
    } else {
      const admin = await getCurrentUser();
      if (admin) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);
        await prisma.academyInvitation.create({
          data: {
            academyId: claim.academyId,
            invitedEmail: claim.requesterEmail.toLowerCase(),
            invitedById: admin.id,
            token: randomBytes(24).toString("hex"),
            expiresAt,
          },
        });
      }
    }
  }

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
