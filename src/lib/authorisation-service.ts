import { getEnvVariable } from "./environments";

export type AuthorisationActor = {
  id: string;
  role?: string;
  academyId?: string | null;
  privileges?: string[];
};

export type AuthorisationScope = {
  organisationId?: string | null;
  applicationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
};

type AuthoriseResponse = {
  authorized: boolean;
  decision: "allow" | "deny";
  reason?: string;
};

export type AuthorisationRoleAssignment = {
  id: string;
  user_id: string;
  role_id: string;
  role_key?: string;
  scope?: {
    organisation_id?: string;
    application_id?: string;
    resource_type?: string;
    resource_id?: string;
  };
  assigned_by: string;
  created_at: string;
};

export class AuthorisationServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthorisationServiceError";
  }
}

const authorisationServiceUrl = () => getEnvVariable("AUTHORISATION_PUBLIC_BASE_URL", "http://localhost:8085").replace(/\/+$/, "");
const compatibilityFallbackEnabled = () => getEnvVariable("AUTHORISATION_COMPATIBILITY_FALLBACK", "false").toLowerCase() === "true";

function headers(actor?: AuthorisationActor | null) {
  return {
    "Content-Type": "application/json",
    ...(actor?.id ? { "X-Actor-User-ID": actor.id } : {}),
  };
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : `Authorisation service request failed with status ${response.status}.`;
    throw new AuthorisationServiceError(message, response.status);
  }
  return body;
}

export async function authorize(
  actor: AuthorisationActor | null | undefined,
  permission: string,
  scope: AuthorisationScope = {},
) {
  if (!actor?.id) return false;

  try {
    const response = await fetch(`${authorisationServiceUrl()}/v1/authorize`, {
      method: "POST",
      cache: "no-store",
      headers: headers(),
      body: JSON.stringify({
        subjectId: actor.id,
        permission,
        organisationId: scope.organisationId ?? actor.academyId ?? undefined,
        applicationId: scope.applicationId ?? getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders"),
        resourceType: scope.resourceType ?? undefined,
        resourceId: scope.resourceId ?? undefined,
      }),
    });
    const result = (await parseResponse(response)) as AuthoriseResponse;
    return result.authorized === true && result.decision === "allow";
  } catch (error) {
    if (!compatibilityFallbackEnabled()) {
      if (error instanceof AuthorisationServiceError) return false;
      throw error;
    }
    return legacyPermissionFallback(actor, permission);
  }
}

const roleIdsByKey: Record<string, string> = {
  USER: "role_user",
  STANDARD_USER: "role_standard_user",
  ACADEMY_ADMIN: "role_academy_admin",
  ACADEMY_OWNER: "role_academy_owner",
  PLATFORM_ADMIN: "role_platform_admin",
  SUPER_ADMIN: "role_super_admin",
  ADMIN: "role_admin",
};

export async function listUserAuthorisationRoles(userId: string) {
  try {
    const response = await fetch(`${authorisationServiceUrl()}/v1/users/${encodeURIComponent(userId)}/roles`, {
      method: "GET",
      cache: "no-store",
      headers: headers(),
    });
    const result = await parseResponse(response) as { role_assignments?: AuthorisationRoleAssignment[] };
    return result.role_assignments ?? [];
  } catch (error) {
    if (error instanceof AuthorisationServiceError) return [];
    throw error;
  }
}

export async function replaceUserAuthorisationRole(
  actor: AuthorisationActor | null | undefined,
  userId: string,
  roleKey: string,
  scope: AuthorisationScope = {},
) {
  const roleId = roleIdsByKey[roleKey];
  if (!roleId) return;

  const applicationId = scope.applicationId ?? getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders");
  const organisationId = scope.organisationId ?? null;
  const existing = await listUserAuthorisationRoles(userId);
  const managedRoleIds = new Set(Object.values(roleIdsByKey));

  await Promise.all(existing
    .filter((assignment) => managedRoleIds.has(assignment.role_id))
    .filter((assignment) => assignment.role_id !== roleId)
    .filter((assignment) => {
      const assignmentScope = assignment.scope ?? {};
      const sameApplication = (assignmentScope.application_id ?? "") === applicationId;
      const sameOrganisation = (assignmentScope.organisation_id ?? "") === (organisationId ?? "");
      return sameApplication && sameOrganisation;
    })
    .map((assignment) => deleteUserAuthorisationRole(actor, userId, assignment.id)));

  if (existing.some((assignment) => {
    const assignmentScope = assignment.scope ?? {};
    return assignment.role_id === roleId
      && (assignmentScope.application_id ?? "") === applicationId
      && (assignmentScope.organisation_id ?? "") === (organisationId ?? "");
  })) {
    return;
  }

  const response = await fetch(`${authorisationServiceUrl()}/v1/users/${encodeURIComponent(userId)}/roles`, {
    method: "POST",
    cache: "no-store",
    headers: headers(actor),
    body: JSON.stringify({
      role_id: roleId,
      organisation_id: organisationId ?? undefined,
      application_id: applicationId,
      resource_type: scope.resourceType ?? undefined,
      resource_id: scope.resourceId ?? undefined,
      assigned_by: actor?.id ?? "system",
    }),
  });
  await parseResponse(response);
}

async function deleteUserAuthorisationRole(actor: AuthorisationActor | null | undefined, userId: string, assignmentId: string) {
  const response = await fetch(`${authorisationServiceUrl()}/v1/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(assignmentId)}`, {
    method: "DELETE",
    cache: "no-store",
    headers: headers(actor),
  });
  if (!response.ok && response.status !== 404) await parseResponse(response);
}

export async function requirePermission(
  actor: AuthorisationActor | null | undefined,
  permission: string,
  scope: AuthorisationScope = {},
) {
  return authorize(actor, permission, scope);
}

function legacyPermissionFallback(actor: AuthorisationActor, permission: string) {
  if (Array.isArray(actor.privileges) && actor.privileges.includes(permission)) return true;

  const role = actor.role;
  if (!role) return false;
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;

  if (permission === "users.admin.access") {
    return role === "PLATFORM_ADMIN" || role === "ACADEMY_ADMIN" || role === "ACADEMY_OWNER";
  }

  if (permission.startsWith("academy.") || permission.startsWith("course.") || permission.startsWith("booking.")) {
    return role === "PLATFORM_ADMIN" || role === "ACADEMY_ADMIN" || role === "ACADEMY_OWNER";
  }

  if (permission.startsWith("payment.") || permission.startsWith("payout.") || permission.startsWith("organisation.")) {
    return role === "PLATFORM_ADMIN";
  }

  return false;
}
