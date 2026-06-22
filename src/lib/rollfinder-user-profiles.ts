import { Role, UserStatus } from "@prisma/client";
import { listUserAuthorisationRoles } from "./authorisation-service";
import { prisma } from "./prisma";

type RollfinderUserInput = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  academyId?: string | null;
  status?: string | null;
  disabled?: boolean | null;
  isProtected?: boolean | null;
  createdAt?: string | Date | null;
};

export type RollfinderProfileUser = RollfinderUserInput & {
  academyId: string | null;
};

type AcademyMemberProfileUser = {
  id: string;
  email: string;
  name: string | null;
  role?: string | null;
};

function normalizeRole(value?: string | null) {
  if (value === Role.SUPER_ADMIN) return Role.SUPER_ADMIN;
  if (value === Role.ADMIN) return Role.ADMIN;
  if (value === Role.PLATFORM_ADMIN) return Role.PLATFORM_ADMIN;
  if (value === Role.ACADEMY_OWNER) return Role.ACADEMY_OWNER;
  if (value === Role.ACADEMY_ADMIN) return Role.ACADEMY_ADMIN;
  if (value === Role.USER) return Role.USER;
  return Role.STANDARD_USER;
}

function normalizeStatus(value?: string | null) {
  return value === UserStatus.DISABLED ? UserStatus.DISABLED : UserStatus.ACTIVE;
}

const rolePriority: Record<Role, number> = {
  [Role.USER]: 10,
  [Role.STANDARD_USER]: 10,
  [Role.ACADEMY_ADMIN]: 40,
  [Role.ACADEMY_OWNER]: 50,
  [Role.PLATFORM_ADMIN]: 90,
  [Role.ADMIN]: 100,
  [Role.SUPER_ADMIN]: 100,
};

function highestRole(roles: Role[]) {
  return roles.reduce((highest, role) => rolePriority[role] > rolePriority[highest] ? role : highest, Role.STANDARD_USER);
}

async function authorisationProfileRole(userId: string, serviceRole: Role) {
  const roles = (await listUserAuthorisationRoles(userId))
    .map((assignment) => normalizeRole(assignment.role_key))
    .filter((role) => role !== Role.STANDARD_USER || serviceRole === Role.STANDARD_USER || serviceRole === Role.USER);
  return highestRole([serviceRole, ...roles]);
}

async function validAcademyId(academyId: string | null | undefined) {
  if (!academyId) return null;
  const academy = await prisma.academy.findUnique({ where: { id: academyId }, select: { id: true } });
  return academy?.id ?? null;
}

export async function localUserAcademyId(userId: string) {
  const membership = await prisma.academyMember.findFirst({
    where: { userId },
    select: { academyId: true },
    orderBy: { createdAt: "asc" },
  });
  return membership?.academyId ?? null;
}

async function localUserAcademyProfile(userId: string) {
  const membership = await prisma.academyMember.findFirst({
    where: { userId },
    select: { academyId: true },
    orderBy: { createdAt: "asc" },
  });
  return membership ?? null;
}

export async function syncRollfinderUserProfile(user: RollfinderUserInput, academyIdOverride?: string | null) {
  const existingAcademyId = academyIdOverride === undefined ? await localUserAcademyId(user.id) : null;
  const academyId = await validAcademyId(academyIdOverride === undefined ? existingAcademyId ?? user.academyId ?? null : academyIdOverride);

  await prisma.$transaction(async (tx) => {
    await tx.academyMember.deleteMany({ where: { userId: user.id } });
    if (academyId) {
      await tx.academyMember.create({
        data: {
          academyId,
          userId: user.id,
        },
      });
    }
  });

  return { ...user, academyId };
}

export async function removeRollfinderUserProfile(userId: string) {
  await prisma.academyMember.deleteMany({ where: { userId } });
}

export async function enrichManagedUserWithRollfinderProfile<T extends RollfinderUserInput>(user: T): Promise<T & { academyId: string | null }> {
  const membership = await localUserAcademyProfile(user.id);
  const fallbackAcademyId = user.academyId ?? membership?.academyId;
  const serviceRole = normalizeRole(user.role);
  const role = await authorisationProfileRole(user.id, serviceRole);
  return {
    ...user,
    academyId: fallbackAcademyId ?? null,
    role,
    status: normalizeStatus(user.status),
    disabled: user.disabled ?? normalizeStatus(user.status) === UserStatus.DISABLED,
    isProtected: user.isProtected ?? false,
  };
}

export async function enrichManagedUsersWithRollfinderProfiles<T extends RollfinderUserInput>(users: T[]) {
  if (!users.length) return [] as Array<T & { academyId: string | null }>;
  const ids = users.map((user) => user.id);
  const memberships = await prisma.academyMember.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, academyId: true },
    orderBy: { createdAt: "asc" },
  });
  const membershipByUserId = new Map<string, { academyId: string }>();
  for (const membership of memberships) {
    if (!membershipByUserId.has(membership.userId)) membershipByUserId.set(membership.userId, { academyId: membership.academyId });
  }

  return Promise.all(users.map(async (user) => {
    const membership = membershipByUserId.get(user.id);
    const serviceRole = normalizeRole(user.role);
    const role = await authorisationProfileRole(user.id, serviceRole);
    return {
      ...user,
      academyId: user.academyId ?? membership?.academyId ?? null,
      role,
      status: normalizeStatus(user.status),
      disabled: user.disabled ?? normalizeStatus(user.status) === UserStatus.DISABLED,
      isProtected: user.isProtected ?? false,
    };
  }));
}

export async function academyMemberProfiles(academyId: string, query = ""): Promise<Array<{
  id: string;
  academyId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: AcademyMemberProfileUser | null;
}>> {
  const search = query.trim();
  const members = await prisma.academyMember.findMany({
    where: {
      academyId,
      ...(search ? { userId: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
  });
  if (!members.length) return [];

  return members.map((member) => ({
    ...member,
    user: null,
  }));
}

export async function enrichUsersWithAcademyNames<T extends { academyId: string | null }>(users: T[]) {
  const academyIds = [...new Set(users.map((user) => user.academyId).filter((academyId): academyId is string => Boolean(academyId)))];
  if (!academyIds.length) return users.map((user) => ({ ...user, academy: null }));

  const academies = await prisma.academy.findMany({
    where: { id: { in: academyIds } },
    select: { id: true, name: true },
  });
  const academyById = new Map(academies.map((academy) => [academy.id, { name: academy.name }]));

  return users.map((user) => ({
    ...user,
    academy: user.academyId ? academyById.get(user.academyId) ?? null : null,
  }));
}
