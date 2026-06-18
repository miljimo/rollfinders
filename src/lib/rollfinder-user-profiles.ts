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

function dateFrom(value?: string | Date | null) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function validAcademyId(academyId: string | null | undefined) {
  if (!academyId) return null;
  const academy = await prisma.academy.findUnique({ where: { id: academyId }, select: { id: true } });
  return academy?.id ?? null;
}

export async function localUserAcademyId(userId: string) {
  const profile = await prisma.user.findUnique({ where: { id: userId }, select: { academyId: true } });
  if (profile?.academyId) return profile.academyId;

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
  const status = normalizeStatus(user.status);
  const memberRole = academyMemberRoleFor(role);
  const createdAt = dateFrom(user.createdAt);

  const profile = await prisma.$transaction(async (tx) => {
    const saved = await tx.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.toLowerCase(),
        name: user.name ?? null,
        role,
        academyId,
        status,
        disabled: user.disabled ?? status === UserStatus.DISABLED,
        isProtected: user.isProtected ?? false,
        ...(createdAt ? { createdAt } : {}),
      },
      update: {
        email: user.email.toLowerCase(),
        name: user.name ?? null,
        role,
        academyId,
        status,
        disabled: user.disabled ?? status === UserStatus.DISABLED,
        isProtected: user.isProtected ?? false,
      },
    });

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

    return saved;
  });

  return { ...user, academyId: profile.academyId };
}

export async function removeRollfinderUserProfile(userId: string) {
  await prisma.$transaction([
    prisma.academyMember.deleteMany({ where: { userId } }),
    prisma.user.deleteMany({ where: { id: userId } }),
  ]);
}

export async function enrichManagedUserWithRollfinderProfile<T extends RollfinderUserInput>(user: T): Promise<T & { academyId: string | null }> {
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { academyId: true, role: true, status: true, disabled: true, isProtected: true },
  });
  const fallbackAcademyId = profile?.academyId ?? await localUserAcademyId(user.id);
  return {
    ...user,
    academyId: fallbackAcademyId ?? null,
    role: profile?.role ?? user.role ?? Role.STANDARD_USER,
    status: profile?.status ?? user.status ?? UserStatus.ACTIVE,
    disabled: profile?.disabled ?? user.disabled ?? false,
    isProtected: profile?.isProtected ?? user.isProtected ?? false,
  };
}

export async function enrichManagedUsersWithRollfinderProfiles<T extends RollfinderUserInput>(users: T[]) {
  if (!users.length) return [] as Array<T & { academyId: string | null }>;
  const ids = users.map((user) => user.id);
  const [profiles, memberships] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, academyId: true, role: true, status: true, disabled: true, isProtected: true },
    }),
    prisma.academyMember.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, academyId: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const membershipByUserId = new Map<string, string>();
  for (const membership of memberships) {
    if (!membershipByUserId.has(membership.userId)) membershipByUserId.set(membership.userId, membership.academyId);
  }

  return users.map((user) => {
    const profile = profileById.get(user.id);
    return {
      ...user,
      academyId: profile?.academyId ?? membershipByUserId.get(user.id) ?? null,
      role: profile?.role ?? user.role ?? Role.STANDARD_USER,
      status: profile?.status ?? user.status ?? UserStatus.ACTIVE,
      disabled: profile?.disabled ?? user.disabled ?? false,
      isProtected: profile?.isProtected ?? user.isProtected ?? false,
    };
  });
}

export async function academyMemberProfiles(academyId: string, query = "") {
  const search = query.trim();
  const matchingUsers = search
    ? await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { id: { contains: search, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      })
    : null;

  if (matchingUsers && matchingUsers.length === 0) return [];

  const members = await prisma.academyMember.findMany({
    where: {
      academyId,
      ...(matchingUsers ? { userId: { in: matchingUsers.map((user) => user.id) } } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
  });
  if (!members.length) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: members.map((member) => member.userId) } },
    select: { id: true, email: true, name: true, role: true },
  });
  const userById = new Map(users.map((user) => [user.id, user]));

  return members.map((member) => ({
    ...member,
    user: userById.get(member.userId) ?? null,
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
