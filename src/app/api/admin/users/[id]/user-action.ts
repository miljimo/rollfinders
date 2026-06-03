import { NextResponse } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { isProtectedSuperAdmin, requireSuperAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function mutateUser(
  id: string,
  mutation: "disable" | "enable" | "promote" | "demote",
) {
  const { response, user: actor } = await requireSuperAdminApi();
  if (response) return response;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (isProtectedSuperAdmin(target)) return NextResponse.json({ error: "Protected super admin cannot be modified" }, { status: 400 });

  const data =
    mutation === "disable" ? { status: UserStatus.DISABLED, disabled: true } :
    mutation === "enable" ? { status: UserStatus.ACTIVE, disabled: false } :
    mutation === "promote" ? { role: Role.PLATFORM_ADMIN } :
    { role: Role.STANDARD_USER };

  const updated = await prisma.user.update({ where: { id }, data });
  const action =
    mutation === "disable" ? "USER_DISABLED" :
    mutation === "enable" ? "USER_ENABLED" :
    mutation === "promote" ? "USER_PROMOTED" :
    "USER_DEMOTED";

  await writeAdminAuditLog({
    actorUserId: actor!.id,
    targetUserId: id,
    action,
    metadata: { email: target.email, previousRole: target.role, role: updated.role, status: updated.status },
  });

  return NextResponse.json({ user: updated });
}
