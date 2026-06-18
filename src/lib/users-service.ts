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

const userServiceUrl = () => getEnvVariable("USER_SERVICE_URL", "http://localhost:3003").replace(/\/+$/, "");
const userServiceApiKey = () => getEnvVariable("USER_SERVICE_API_KEY", "local-user-dev-key");

function headers(actor?: ActorContext) {
  const apiKey = userServiceApiKey();
  if (!apiKey) throw new UserServiceError("User service API key is not configured.", 0);
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(actor ? { "X-Actor": JSON.stringify(actor) } : {}),
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
    return { serviceInput: input, academyId: undefined as string | null | undefined };
  }

  const { academyId, ...serviceInput } = input as Record<string, unknown>;
  return {
    serviceInput,
    academyId: typeof academyId === "string" ? academyId.trim() || null : academyId === null ? null : undefined,
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
    headers: headers(),
  });
  const result = await parseResponse(response) as { user: { id: string; email: string; role: string; academyId: string | null; privileges: string[] } };
  return { user: await enrichManagedUserWithRollfinderProfile(result.user) };
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
  return { ...result, users: await enrichManagedUsersWithRollfinderProfiles(result.users) };
}

export async function createManagedUser(actor: ActorContext, input: unknown) {
  const { serviceInput, academyId } = splitRollfinderAcademyInput(input);
  const response = await fetch(`${userServiceUrl()}/v1/users`, {
    method: "POST",
    cache: "no-store",
    headers: headers(actor),
    body: JSON.stringify(serviceInput),
  });
  const result = await parseResponse(response) as { user: ManagedUser };
  const user = await syncRollfinderUserProfile(result.user, academyId);
  return { user: await enrichManagedUserWithRollfinderProfile(user) as ManagedUser };
}

export async function getManagedUser(actor: ActorContext, id: string) {
  const response = await fetch(`${userServiceUrl()}/v1/users/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
    headers: headers(actor),
  });
  const result = await parseResponse(response) as { user: ManagedUser };
  return { user: await enrichManagedUserWithRollfinderProfile(result.user) as ManagedUser };
}

export async function updateManagedUser(actor: ActorContext, id: string, input: unknown) {
  const { serviceInput, academyId } = splitRollfinderAcademyInput(input);
  const response = await fetch(`${userServiceUrl()}/v1/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    cache: "no-store",
    headers: headers(actor),
    body: JSON.stringify(serviceInput),
  });
  const result = await parseResponse(response) as { user: ManagedUser };
  const user = await syncRollfinderUserProfile(result.user, academyId);
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
