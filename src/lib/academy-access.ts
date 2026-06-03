import { AcademyMemberRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser, isPlatformAdminRole, isSuperAdminRole } from "./admin";
import { prisma } from "./prisma";

export type AcademyAccess = {
  userId: string;
  platformAdmin: boolean;
  superAdmin: boolean;
  memberRole: AcademyMemberRole | null;
};

export async function getAcademyAccess(academyId: string): Promise<AcademyAccess | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (isPlatformAdminRole(user.role)) {
    return { userId: user.id, platformAdmin: true, superAdmin: isSuperAdminRole(user.role), memberRole: null };
  }

  const member = await prisma.academyMember.findUnique({
    where: { academyId_userId: { academyId, userId: user.id } },
  });

  if (!member) return null;
  return { userId: user.id, platformAdmin: false, superAdmin: false, memberRole: member.role };
}

export async function requireAcademyEditor(academyId: string) {
  const access = await getAcademyAccess(academyId);
  if (!access) redirect("/login");
  return access;
}

export async function requireAcademyOpenMatCreator(academyId: string) {
  return requireAcademyEditor(academyId);
}

export async function canManageOpenMat(event: { academyId: string; createdById?: string | null }, action: "edit" | "delete") {
  const user = await getCurrentUser();
  if (!user) return false;
  if (action === "edit" && event.createdById === user.id) return true;

  const access = await getAcademyAccess(event.academyId);
  if (!access) return false;
  if (access.platformAdmin || access.memberRole === AcademyMemberRole.OWNER || access.memberRole === AcademyMemberRole.ADMIN) return true;
  return false;
}

export async function requireOpenMatAccess(event: { academyId: string; createdById?: string | null }, action: "edit" | "delete") {
  const allowed = await canManageOpenMat(event, action);
  if (!allowed) redirect("/admin/open-mats");
}

export async function requireAcademyOwner(academyId: string) {
  const access = await getAcademyAccess(academyId);
  if (!access || (!access.platformAdmin && access.memberRole !== AcademyMemberRole.OWNER)) {
    redirect(`/admin/academies/${academyId}`);
  }
  return access;
}

export function canManageAcademyTeam(access: AcademyAccess) {
  return access.platformAdmin || access.memberRole === AcademyMemberRole.OWNER;
}

export function canDeleteAcademy(access: AcademyAccess) {
  return access.superAdmin;
}

export function canTransferAcademyOwnership(access: AcademyAccess) {
  return access.superAdmin || access.memberRole === AcademyMemberRole.OWNER;
}
