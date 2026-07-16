import { Role, UserStatus } from "@prisma/client";
import {
  AcademyServiceError,
  addAcademyMemberInAcademyService,
  getAcademyFromAcademyService,
  listAcademyMembersFromAcademyService,
  listAcademyMembershipsForUserFromAcademyService,
  removeAcademyMembershipInAcademyService,
} from "./academyService";
import { listUserAuthorisationRoles } from "./authorisation-service";

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

type ServiceActor = {
  id: string;
  role?: string;
  email?: string | null;
  academyId?: string | null;
  accessToken?: string;
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

function isAcademyReadForbidden(error: unknown) {
  return error instanceof AcademyServiceError && (error.status === 401 || error.status === 403);
}

async function readableAcademyMembershipsForUser(userId: string, actor?: ServiceActor) {
  try {
    return await listAcademyMembershipsForUserFromAcademyService(userId, actor);
  } catch (error) {
    if (isAcademyReadForbidden(error)) return [];
    throw error;
  }
}

async function readableAcademy(academyId: string, actor?: ServiceActor) {
  try {
    return await getAcademyFromAcademyService(academyId, actor);
  } catch (error) {
    if (isAcademyReadForbidden(error)) return null;
    throw error;
  }
}

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

async function authorisationProfileRole(userId: string, serviceRole: Role, actor?: ServiceActor) {
  const roles = (await listUserAuthorisationRoles(userId, actor))
    .map((assignment) => normalizeRole(assignment.role_key))
    .filter((role) => role !== Role.STANDARD_USER || serviceRole === Role.STANDARD_USER || serviceRole === Role.USER);
  return highestRole([serviceRole, ...roles]);
}

async function validAcademyId(academyId: string | null | undefined, actor?: ServiceActor) {
  if (!academyId) return null;
  const academy = await getAcademyFromAcademyService(academyId, actor);
  return academy?.id ?? null;
}

export async function localUserAcademyId(userId: string, actor?: ServiceActor) {
  const membership = (await readableAcademyMembershipsForUser(userId, actor))[0];
  return membership?.academyId ?? null;
}

async function localUserAcademyProfile(userId: string, actor?: ServiceActor) {
  const membership = (await readableAcademyMembershipsForUser(userId, actor))[0];
  return membership ?? null;
}

export async function syncRollfinderUserProfile(user: RollfinderUserInput, academyIdOverride?: string | null, actor?: ServiceActor) {
  const existingAcademyId = academyIdOverride === undefined ? await localUserAcademyId(user.id, actor) : null;
  const academyId = await validAcademyId(academyIdOverride === undefined ? existingAcademyId ?? user.academyId ?? null : academyIdOverride, actor);

  const existingMemberships = await listAcademyMembershipsForUserFromAcademyService(user.id, actor);
  await Promise.all(existingMemberships.map((membership) => removeAcademyMembershipInAcademyService(membership.id, actor)));
  if (academyId) await addAcademyMemberInAcademyService(academyId, user.id, actor);

  return { ...user, academyId };
}

export async function removeRollfinderUserProfile(userId: string, actor?: ServiceActor) {
  const memberships = await listAcademyMembershipsForUserFromAcademyService(userId, actor);
  await Promise.all(memberships.map((membership) => removeAcademyMembershipInAcademyService(membership.id, actor)));
}

export async function enrichManagedUserWithRollfinderProfile<T extends RollfinderUserInput>(user: T, actor?: ServiceActor): Promise<T & { academyId: string | null }> {
  const membership = await localUserAcademyProfile(user.id, actor);
  const fallbackAcademyId = user.academyId ?? membership?.academyId;
  const serviceRole = normalizeRole(user.role);
  const role = await authorisationProfileRole(user.id, serviceRole, actor);
  return {
    ...user,
    academyId: fallbackAcademyId ?? null,
    role,
    status: normalizeStatus(user.status),
    disabled: user.disabled ?? normalizeStatus(user.status) === UserStatus.DISABLED,
    isProtected: user.isProtected ?? false,
  };
}

export async function enrichManagedUsersWithRollfinderProfiles<T extends RollfinderUserInput>(users: T[], actor?: ServiceActor) {
  if (!users.length) return [] as Array<T & { academyId: string | null }>;
  const ids = users.map((user) => user.id);
  const memberships = (await Promise.all(ids.map((id) => readableAcademyMembershipsForUser(id, actor)))).flat();
  const membershipByUserId = new Map<string, { academyId: string }>();
  for (const membership of memberships) {
    if (!membershipByUserId.has(membership.userId)) membershipByUserId.set(membership.userId, { academyId: membership.academyId });
  }

  return Promise.all(users.map(async (user) => {
    const membership = membershipByUserId.get(user.id);
    const serviceRole = normalizeRole(user.role);
    const role = await authorisationProfileRole(user.id, serviceRole, actor);
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
  const members = (await listAcademyMembersFromAcademyService(academyId))
    .filter((member) => !search || member.userId.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (!members.length) return [];

  return members.map((member) => ({
    ...member,
    user: null,
  }));
}

export async function enrichUsersWithAcademyNames<T extends { academyId: string | null }>(users: T[], actor?: ServiceActor) {
  const academyIds = [...new Set(users.map((user) => user.academyId).filter((academyId): academyId is string => Boolean(academyId)))];
  if (!academyIds.length) return users.map((user) => ({ ...user, academy: null }));

  const academies = (await Promise.all(academyIds.map((academyId) => readableAcademy(academyId, actor))))
    .filter((academy): academy is NonNullable<typeof academy> => Boolean(academy));
  const academyById = new Map(academies.map((academy) => [academy.id, { name: academy.name }]));

  return users.map((user) => ({
    ...user,
    academy: user.academyId ? academyById.get(user.academyId) ?? null : null,
  }));
}
