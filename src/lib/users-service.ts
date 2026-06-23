import { apiGatewayUrl } from "./apiGateway";
import { listEffectiveUserPermissions, replaceUserAuthorisationRole, type AuthorisationPermission, type AuthorisationScope } from "./authorisation-service";
import { getEnvVariable } from "./environments";
import {
  enrichManagedUserWithRollfinderProfile,
  enrichManagedUsersWithRollfinderProfiles,
  removeRollfinderUserProfile,
  syncRollfinderUserProfile,
} from "./rollfinder-user-profiles";

type ActorContext = {
  id: string;
  role?: string;
  email?: string;
  academyId?: string | null;
  privileges?: string[];
};

export type ManagedUser = {
  id: string;
  name: string | null;
  email: string;
  username?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role: string;
  academyId: string | null;
  status: string;
  disabled: boolean;
  isProtected: boolean;
  emailStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AssignableUserPermission = {
  code: string;
  name: string;
  description?: string | null;
  assigned: boolean;
  assignable?: boolean;
  source?: "assignable" | "role";
};

export type AssignableUserFeature = {
  key: string;
  name: string;
  permissions: AssignableUserPermission[];
};

type AuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export class UserServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UserServiceError";
  }
}

const userServiceUrl = apiGatewayUrl;

function headers(actor?: ActorContext) {
  return {
    "Content-Type": "application/json",
    ...(actor ? { "X-Actor": JSON.stringify(actor), "X-Actor-User-ID": actor.id } : {}),
  };
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : `User service request failed with status ${response.status}.`;
    throw new UserServiceError(message, response.status);
  }
  return body;
}

function splitRollfinderAcademyInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { serviceInput: input, academyId: undefined as string | null | undefined, role: undefined as string | undefined };
  }

  const serviceInput = { ...(input as Record<string, unknown>) };
  const academyId = serviceInput.academyId;
  const role = serviceInput.role;
  return {
    serviceInput,
    academyId: typeof academyId === "string" ? academyId.trim() || null : academyId === null ? null : undefined,
    role: typeof role === "string" ? role.trim() || undefined : undefined,
  };
}

export async function authenticateUserCredentials(email: string, password: string) {
  const response = await fetch(`${userServiceUrl()}/auth/login`, {
    method: "POST",
    cache: "no-store",
    headers: headers(),
    body: JSON.stringify({ identifier: email, password }),
  });
  return parseResponse(response) as Promise<{
    user: { id: string; email: string; name: string | null; role: string };
  } & AuthTokens>;
}

export async function getUserAccount(id: string) {
  const response = await fetch(`${userServiceUrl()}/v1/accounts/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
    headers: headers({ id }),
  });
  const result = await parseResponse(response) as { user: { id: string; email: string; role: string; academyId: string | null; privileges: string[] } };
  return { user: await enrichManagedUserWithRollfinderProfile(result.user, { id }) };
}

export async function logoutUserSession(refreshToken?: string | null) {
  if (!refreshToken) return { ok: true };
  const response = await fetch(`${userServiceUrl()}/auth/logout`, {
    method: "POST",
    cache: "no-store",
    headers: headers(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return parseResponse(response) as Promise<{ ok: boolean }>;
}

export async function changeUserPassword(userId: string, newPassword: string, oldPassword?: string) {
  const response = await fetch(`${userServiceUrl()}/auth/change-password`, {
    method: "POST",
    cache: "no-store",
    headers: headers(),
    body: JSON.stringify({ user_id: userId, old_password: oldPassword ?? "", new_password: newPassword }),
  });
  return parseResponse(response) as Promise<{ ok: boolean }>;
}

export async function requestPasswordResetToken(email: string) {
  const response = await fetch(`${userServiceUrl()}/auth/forgot-password`, {
    method: "POST",
    cache: "no-store",
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  return parseResponse(response) as Promise<{
    ok: boolean;
    token?: string;
    expiresAt?: string;
    user?: { id: string; email: string; name: string | null };
  }>;
}

export async function confirmPasswordResetToken(token: string, password: string) {
  const response = await fetch(`${userServiceUrl()}/auth/reset-password`, {
    method: "POST",
    cache: "no-store",
    headers: headers(),
    body: JSON.stringify({ token, password }),
  });
  return parseResponse(response) as Promise<{ ok: boolean; user: { id: string; email: string; name: string | null } }>;
}

export async function validatePasswordResetToken(token: string) {
  const response = await fetch(`${userServiceUrl()}/v1/auth/password-reset/validate`, {
    method: "POST",
    cache: "no-store",
    headers: headers(),
    body: JSON.stringify({ token }),
  });
  return parseResponse(response) as Promise<{ valid: boolean }>;
}

export async function listManagedUsers(actor: ActorContext, query: string) {
  const response = await fetch(`${userServiceUrl()}/v1/users${query ? `?${query}` : ""}`, {
    method: "GET",
    cache: "no-store",
    headers: headers(actor),
  });
  const result = await parseResponse(response) as { users: ManagedUser[]; page: number; pageSize: number; totalItems: number; totalPages: number };
  return { ...result, users: await enrichManagedUsersWithRollfinderProfiles(result.users, actor) };
}

export async function createManagedUser(actor: ActorContext, input: unknown) {
  const { serviceInput, academyId, role } = splitRollfinderAcademyInput(input);
  const response = await fetch(`${userServiceUrl()}/v1/users`, {
    method: "POST",
    cache: "no-store",
    headers: headers(actor),
    body: JSON.stringify(serviceInput),
  });
  const result = await parseResponse(response) as { user: ManagedUser };
  const user = await syncRollfinderUserProfile(result.user, academyId, actor);
  if (role) {
    await replaceUserAuthorisationRole(actor, result.user.id, role, { organisationId: academyId ?? undefined });
  }
  return { user: await enrichManagedUserWithRollfinderProfile(user, actor) as ManagedUser };
}

export async function getManagedUser(actor: ActorContext, id: string) {
  const response = await fetch(`${userServiceUrl()}/v1/users/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
    headers: headers(actor),
  });
  const result = await parseResponse(response) as { user: ManagedUser };
  return { user: await enrichManagedUserWithRollfinderProfile(result.user, actor) as ManagedUser };
}

export async function listAssignableUserFeatures(actor: ActorContext, id: string, search = "") {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const response = await fetch(`${userServiceUrl()}/v1/users/${encodeURIComponent(id)}/assignable-features${query}`, {
    method: "GET",
    cache: "no-store",
    headers: headers(actor),
  });
  return parseResponse(response) as Promise<{ features: { key: string; name: string }[] }>;
}

export async function getAssignableUserFeaturePrivileges(actor: ActorContext, id: string, featureKey: string) {
  const response = await fetch(`${userServiceUrl()}/v1/users/${encodeURIComponent(id)}/assignable-features/${encodeURIComponent(featureKey)}/privileges`, {
    method: "GET",
    cache: "no-store",
    headers: headers(actor),
  });
  return parseResponse(response) as Promise<{ feature: string; privileges: AssignableUserPermission[] }>;
}

export async function getAssignableUserPermissionModel(actor: ActorContext, id: string) {
  const { features } = await listAssignableUserFeatures(actor, id);
  const settled = await Promise.allSettled(
    features.map(async (feature) => {
      const result = await getAssignableUserFeaturePrivileges(actor, id, feature.key);
      return { key: feature.key, name: feature.name, permissions: result.privileges };
    }),
  );

  return settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
}

function permissionFeatureKey(code: string) {
  return code.split(".")[0]?.trim() || "permissions";
}

function formatFeatureName(key: string) {
  const knownNames: Record<string, string> = {
    academy: "Academy Management",
    authorisation: "Authorisation",
    booking: "Bookings",
    bookings: "Bookings",
    course: "Courses",
    courses: "Courses",
    payment: "Payments",
    payments: "Payments",
    stripe: "Stripe Connect",
    user: "User Management",
    users: "User Management",
    withdrawal: "Withdrawals",
    withdrawals: "Withdrawals",
  };
  return knownNames[key] ?? key.split(/[-_.\s]+/).filter(Boolean).map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ");
}

function rolePermissionFeatureModel(permissions: AuthorisationPermission[]) {
  const features = new Map<string, AssignableUserFeature>();
  for (const permission of permissions) {
    const key = permissionFeatureKey(permission.code);
    const feature = features.get(key) ?? { key, name: formatFeatureName(key), permissions: [] };
    feature.permissions.push({
      code: permission.code,
      name: permission.name,
      description: permission.description ?? null,
      assigned: true,
      assignable: false,
      source: "role",
    });
    features.set(key, feature);
  }

  return Array.from(features.values()).map((feature) => ({
    ...feature,
    permissions: feature.permissions.sort((left, right) => left.code.localeCompare(right.code)),
  })).sort((left, right) => left.name.localeCompare(right.name));
}

function mergePermissionModels(assignableFeatures: AssignableUserFeature[], roleFeatures: AssignableUserFeature[]) {
  const features = new Map<string, AssignableUserFeature>();
  for (const feature of roleFeatures) {
    features.set(feature.key, {
      ...feature,
      permissions: feature.permissions.map((permission) => ({ ...permission })),
    });
  }

  for (const feature of assignableFeatures) {
    const mergedFeature = features.get(feature.key) ?? { key: feature.key, name: feature.name, permissions: [] };
    const permissions = new Map(mergedFeature.permissions.map((permission) => [permission.code, permission]));
    for (const permission of feature.permissions) {
      const existing = permissions.get(permission.code);
      permissions.set(permission.code, {
        ...existing,
        ...permission,
        assigned: permission.assigned || existing?.assigned === true,
        assignable: true,
        source: "assignable",
      });
    }
    features.set(feature.key, {
      key: feature.key,
      name: feature.name || mergedFeature.name,
      permissions: Array.from(permissions.values()).sort((left, right) => left.code.localeCompare(right.code)),
    });
  }

  return Array.from(features.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export async function getUserPermissionPanelModel(actor: ActorContext, id: string, scope: AuthorisationScope = {}) {
  const applicationId = scope.applicationId ?? getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders");
  const panelScope = { ...scope, applicationId };
  const [apiAssignableFeatures, targetEffectivePermissions] = await Promise.all([
    getAssignableUserPermissionModel(actor, id).catch(() => []),
    listEffectiveUserPermissions(id, panelScope).catch(() => []),
  ]);
  const targetRoleFeatures = rolePermissionFeatureModel(targetEffectivePermissions);

  if (apiAssignableFeatures.length) {
    return mergePermissionModels(apiAssignableFeatures, targetRoleFeatures);
  }

  const actorEffectivePermissions = await listEffectiveUserPermissions(actor.id, {
    ...panelScope,
    organisationId: scope.organisationId ?? actor.academyId ?? undefined,
  }).catch(() => []);
  const targetAssigned = new Set(targetEffectivePermissions.map((permission) => permission.code));
  const actorAssignableFeatures = rolePermissionFeatureModel(actorEffectivePermissions).map((feature) => ({
    ...feature,
    permissions: feature.permissions.map((permission) => ({
      ...permission,
      assigned: targetAssigned.has(permission.code),
      assignable: true,
      source: "assignable" as const,
    })),
  }));

  return mergePermissionModels(actorAssignableFeatures, targetRoleFeatures);
}

export async function updateManagedUserPrivileges(
  actor: ActorContext,
  id: string,
  input: { feature: string; grant: string[]; revoke: string[] },
) {
  const response = await fetch(`${userServiceUrl()}/v1/users/${encodeURIComponent(id)}/privileges`, {
    method: "PUT",
    cache: "no-store",
    headers: headers(actor),
    body: JSON.stringify(input),
  });
  return parseResponse(response) as Promise<{ status: string; feature: string; granted: string[]; revoked: string[] }>;
}

export async function updateManagedUser(actor: ActorContext, id: string, input: unknown) {
  const { serviceInput, academyId, role } = splitRollfinderAcademyInput(input);
  const response = await fetch(`${userServiceUrl()}/v1/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    cache: "no-store",
    headers: headers(actor),
    body: JSON.stringify(serviceInput),
  });
  const result = await parseResponse(response) as { user: ManagedUser };
  const user = await syncRollfinderUserProfile(result.user, academyId);
  if (role) {
    await replaceUserAuthorisationRole(actor, result.user.id, role, { organisationId: academyId ?? undefined });
  }
  return { user: await enrichManagedUserWithRollfinderProfile(user) as ManagedUser };
}

export async function deleteManagedUser(actor: ActorContext, id: string) {
  const response = await fetch(`${userServiceUrl()}/v1/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
    headers: headers(actor),
  });
  const result = await parseResponse(response);
  await removeRollfinderUserProfile(id);
  return result;
}

export async function mutateManagedUser(actor: ActorContext, id: string, mutation: "disable" | "enable" | "promote" | "demote", role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  const response = await fetch(`${userServiceUrl()}/v1/users/${encodeURIComponent(id)}/${mutation}${query}`, {
    method: "POST",
    cache: "no-store",
    headers: headers(actor),
  });
  const result = await parseResponse(response) as { user: ManagedUser };
  await syncRollfinderUserProfile(result.user);
  return { user: await enrichManagedUserWithRollfinderProfile(result.user) as ManagedUser };
}
