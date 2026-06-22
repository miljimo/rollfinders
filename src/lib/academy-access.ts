import { redirect } from "next/navigation";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isSuperAdminRole } from "./admin";
import { prisma } from "./prisma";

export type AcademyAccess = {
  userId: string;
  platformAdmin: boolean;
  superAdmin: boolean;
  academyAdmin: boolean;
  academyOwner: boolean;
};

export async function getAcademyAccess(academyId: string): Promise<AcademyAccess | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (isPlatformAdminRole(user.role)) {
    return { userId: user.id, platformAdmin: true, superAdmin: isSuperAdminRole(user.role), academyAdmin: false, academyOwner: false };
  }

  if (isAcademyAdminRole(user.role) && user.academyId === academyId) {
    return {
      userId: user.id,
      platformAdmin: false,
      superAdmin: false,
      academyAdmin: true,
      academyOwner: user.role === "ACADEMY_OWNER",
    };
  }

  const member = await prisma.academyMember.findUnique({
    where: { academyId_userId: { academyId, userId: user.id } },
  });

  if (!member) return null;
  return { userId: user.id, platformAdmin: false, superAdmin: false, academyAdmin: false, academyOwner: false };
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
  if (access.platformAdmin || access.academyOwner || access.academyAdmin) return true;
  return false;
}

export async function requireOpenMatAccess(event: { academyId: string; createdById?: string | null }, action: "edit" | "delete") {
  const allowed = await canManageOpenMat(event, action);
  if (!allowed) redirect("/admin/open-mats");
}

export async function requireAcademyOwner(academyId: string) {
  const access = await getAcademyAccess(academyId);
  if (!access || (!access.platformAdmin && !access.academyOwner)) {
    redirect(`/admin/academies/${academyId}`);
  }
  return access;
}

export async function requireAcademyTeamViewer(academyId: string) {
  const access = await getAcademyAccess(academyId);
  if (!access) redirect("/login");
  return access;
}

export function canViewAcademyTeam(access: AcademyAccess) {
  return access.platformAdmin || access.academyOwner || access.academyAdmin;
}

export function canManageAcademyTeam(access: AcademyAccess) {
  return access.platformAdmin || access.academyOwner;
}

export function canDeleteAcademy(access: AcademyAccess) {
  return access.superAdmin;
}

export function canDeleteAcademyRecord(access: AcademyAccess, academy: { createdById?: string | null }) {
  return access.superAdmin || (access.platformAdmin && academy.createdById === access.userId);
}

export function canTransferAcademyOwnership(access: AcademyAccess) {
  return access.superAdmin || access.academyOwner;
}
