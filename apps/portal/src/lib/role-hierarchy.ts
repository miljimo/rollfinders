import { Role } from "@prisma/client";

export const roleLevels: Record<string, number> = {
  [Role.USER]: 100,
  [Role.STANDARD_USER]: 100,
  MEMBER: 200,
  COACH: 300,
  [Role.ACADEMY_ADMIN]: 400,
  [Role.ACADEMY_OWNER]: 500,
  APPLICATION_ADMIN: 600,
  ORGANISATION_ADMIN: 700,
  ORGANISATION_OWNER: 800,
  [Role.PLATFORM_ADMIN]: 900,
  [Role.ADMIN]: 1000,
  [Role.SUPER_ADMIN]: 1000,
};

export function roleLevel(role?: string | null) {
  return role ? roleLevels[role] ?? 0 : 0;
}

export function canSeeRole(actorRole: string | null | undefined, targetRole: string | null | undefined, targetLevel?: number | null) {
  const actorLevel = roleLevel(actorRole);
  const comparableTargetLevel = typeof targetLevel === "number" ? targetLevel : roleLevel(targetRole);
  return comparableTargetLevel <= actorLevel;
}
