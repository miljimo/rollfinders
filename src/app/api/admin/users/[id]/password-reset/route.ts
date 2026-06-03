import { NextResponse } from "next/server";
import { requireSuperAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { queuePasswordResetEmail } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response, user: actor } = await requireSuperAdminApi();
  if (response) return response;

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { expiresAt } = await queuePasswordResetEmail(user);
  await writeAdminAuditLog({
    actorUserId: actor!.id,
    targetUserId: id,
    action: "PASSWORD_CHANGE_EMAIL_SENT",
    metadata: { email: user.email, expiresAt: expiresAt.toISOString() },
  });

  return NextResponse.json({ ok: true, expiresAt });
}
