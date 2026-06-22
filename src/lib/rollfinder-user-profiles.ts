import { AcademyMemberRole, Role, UserStatus } from "@prisma/client";
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

function academyMemberRoleFor(role: Role) {
  if (role === Role.ACADEMY_OWNER) return AcademyMemberRole.OWNER;
  if (role === Role.ACADEMY_ADMIN) return AcademyMemberRole.ADMIN;
  return null;
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

export async function syncRollfinderUserProfile(user: RollfinderUserInput, academyIdOverride?: string | null) {
  const existingAcademyId = academyIdOverride === undefined ? await localUserAcademyId(user.id) : null;
  const academyId = await validAcademyId(academyIdOverride === undefined ? existingAcademyId ?? user.academyId ?? null : academyIdOverride);
  const role = normalizeRole(user.role);
  const memberRole = academyMemberRoleFor(role);

  await prisma.$transaction(async (tx) => {
    await tx.academyMember.deleteMany({ where: { userId: user.id } });
    if (academyId && memberRole) {
      await tx.academyMember.create({
        data: {
          academyId,
          userId: user.id,
          role: memberRole,
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
  const fallbackAcademyId = user.academyId ?? await localUserAcademyId(user.id);
  return {
    ...user,
    academyId: fallbackAcademyId ?? null,
    role: user.role ?? Role.STANDARD_USER,
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
  const membershipByUserId = new Map<string, string>();
  for (const membership of memberships) {
    if (!membershipByUserId.has(membership.userId)) membershipByUserId.set(membership.userId, membership.academyId);
  }

  return users.map((user) => {
    return {
      ...user,
      academyId: user.academyId ?? membershipByUserId.get(user.id) ?? null,
      role: user.role ?? Role.STANDARD_USER,
      status: normalizeStatus(user.status),
      disabled: user.disabled ?? normalizeStatus(user.status) === UserStatus.DISABLED,
      isProtected: user.isProtected ?? false,
    };
  });
}

export async function academyMemberProfiles(academyId: string, query = ""): Promise<Array<{
  id: string;
  academyId: string;
  userId: string;
  role: AcademyMemberRole;
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
