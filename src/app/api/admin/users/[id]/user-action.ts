import { NextResponse } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole, requireAdminApi, writeAdminAuditLog } from "@/lib/admin";
import { ensurePlatformAdminProfile } from "@/lib/platform-admin-activity";
import { prisma } from "@/lib/prisma";

function isSuperUser(user: { role: Role }) {
  return user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
}

async function hasAnotherActiveSuperUser(userId: string) {
  const count = await prisma.user.count({
    where: {
      id: { not: userId },
      role: { in: [Role.SUPER_ADMIN, Role.ADMIN] },
      status: UserStatus.ACTIVE,
      disabled: false,
    },
  });
  return count > 0;
}

export async function mutateUser(
  id: string,
  mutation: "disable" | "enable" | "promote" | "demote",
) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (isProtectedSuperAdmin(target)) return NextResponse.json({ error: "Protected super admin cannot be modified" }, { status: 400 });
  const academyCanManage = isAcademyAdminRole(actor.role) && actor.id !== id && actor.academyId === target.academyId && (target.role === Role.STANDARD_USER || target.role === Role.USER || target.role === Role.ACADEMY_ADMIN);
  const platformCanManage = isPlatformAdminRole(actor.role) && target.role !== Role.SUPER_ADMIN && target.role !== Role.ADMIN && target.role !== Role.PLATFORM_ADMIN;
  const superCanManage = isSuperAdminRole(actor.role);
  if (!superCanManage && (!platformCanManage && !academyCanManage || mutation === "promote" || mutation === "demote")) {
    return NextResponse.json({ error: "Insufficient user management permissions" }, { status: 403 });
  }
  if (mutation === "demote" && (actor.id === id || isSuperUser(target))) {
    return NextResponse.json({ error: "Super admin accounts cannot be demoted" }, { status: 403 });
  }
  if (mutation === "disable" && actor.id === id && isSuperUser(target) && !(await hasAnotherActiveSuperUser(id))) {
    return NextResponse.json({ error: "You cannot disable the last active super admin account" }, { status: 400 });
  }

  const data =
    mutation === "disable" ? { status: UserStatus.DISABLED, disabled: true } :
    mutation === "enable" ? { status: UserStatus.ACTIVE, disabled: false } :
    mutation === "promote" ? { role: Role.PLATFORM_ADMIN } :
    { role: Role.STANDARD_USER };

  const updated = await prisma.user.update({ where: { id }, data });
  if (mutation === "promote") {
    await ensurePlatformAdminProfile(id);
  }
  const action =
    mutation === "disable" ? "USER_DISABLED" :
    mutation === "enable" && target.role === Role.SUPER_ADMIN ? "SUPER_USER_ENABLED" :
    mutation === "enable" ? "USER_ENABLED" :
    mutation === "promote" ? "USER_PROMOTED" :
    "USER_DEMOTED";

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: id,
    action,
    metadata: { email: target.email, previousRole: target.role, role: updated.role, status: updated.status },
  });

  return NextResponse.json({ user: updated });
}
