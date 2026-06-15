import { NextResponse } from "next/server";
import { canSendManagedUserPasswordReset, getCurrentUser, requireAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { queuePasswordResetEmail } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!canSendManagedUserPasswordReset(actor, user)) {
    return NextResponse.json({ error: "Password reset is not allowed for this account" }, { status: 403 });
  }

  const { expiresAt } = await queuePasswordResetEmail(user);
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: id,
    action: "USER_PASSWORD_RESET_EMAIL_SENT",
    metadata: { email: user.email, expiresAt: expiresAt.toISOString() },
  });

  return NextResponse.json({ ok: true, expiresAt });
}
