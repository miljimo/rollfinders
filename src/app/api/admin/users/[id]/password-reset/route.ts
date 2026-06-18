import { NextResponse } from "next/server";
import { canSendManagedUserPasswordReset, getCurrentUser, requireAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { managedUsersReturnPath } from "@/lib/managed-user-return-path";
import { requestPasswordResetForEmail } from "@/lib/password-reset";
import { getManagedUser } from "@/lib/users-service";
import { Role } from "@prisma/client";

async function formReturnTo(request: Request) {
  const url = new URL(request.url);
  const queryReturnTo = url.searchParams.get("returnTo") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return queryReturnTo;
  }

  try {
    const formData = await request.formData();
    return String(formData.get("returnTo") ?? queryReturnTo);
  } catch {
    return queryReturnTo;
  }
}

function resultRedirect(request: Request, returnTo: string, result: "password_reset_sent" | "password_reset_failed", email?: string) {
  const publicOrigin = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  const url = new URL(managedUsersReturnPath(returnTo), publicOrigin);
  url.searchParams.set("userResult", result);
  if (email) url.searchParams.set("email", email);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const returnTo = await formReturnTo(request);
  const wantsRedirect = Boolean(returnTo);
  const forbidden = await requireAdminApi();
  if (forbidden && wantsRedirect) return resultRedirect(request, returnTo, "password_reset_failed");
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor && wantsRedirect) return resultRedirect(request, returnTo, "password_reset_failed");
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const { user } = await getManagedUser(actor, id).catch(() => ({ user: null }));
  if (!user && wantsRedirect) return resultRedirect(request, returnTo, "password_reset_failed");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!canSendManagedUserPasswordReset(actor, { ...user, role: user.role as Role })) {
    if (wantsRedirect) return resultRedirect(request, returnTo, "password_reset_failed", user.email);
    return NextResponse.json({ error: "Password reset is not allowed for this account" }, { status: 403 });
  }

  let expiresAt: Date | undefined;
  try {
    ({ expiresAt } = await requestPasswordResetForEmail(user.email));
  } catch {
    if (wantsRedirect) return resultRedirect(request, returnTo, "password_reset_failed", user.email);
    return NextResponse.json({ error: "Password reset email could not be sent" }, { status: 500 });
  }
  if (!expiresAt && wantsRedirect) return resultRedirect(request, returnTo, "password_reset_failed", user.email);
  if (!expiresAt) return NextResponse.json({ error: "Password reset email could not be sent" }, { status: 500 });
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: id,
    action: "USER_PASSWORD_RESET_EMAIL_SENT",
    metadata: { email: user.email, expiresAt: expiresAt.toISOString() },
  });

  if (wantsRedirect) return resultRedirect(request, returnTo, "password_reset_sent", user.email);
  return NextResponse.json({ ok: true, expiresAt });
}
