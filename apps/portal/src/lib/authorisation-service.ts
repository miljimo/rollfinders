import { apiGatewayPath } from "./apiGateway";
import { normalizeBaseUrl } from "@rollfinders/api-client";
import { getEnvVariable } from "./environments";

export type AuthorisationActor = {
  id: string;
  role?: string;
  email?: string | null;
  academyId?: string | null;
  privileges?: string[];
  accessToken?: string;
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

export type AuthorisationRole = {
  id: string;
  key: string;
  name: string;
  description?: string;
  level: number;
  assignable: boolean;
  system_role: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type AuthorisationPagination = {
  limit: number;
  offset: number;
  count: number;
  has_more: boolean;
};

export type AuthorisationPermission = {
  id: string;
  code: string;
  name: string;
  description?: string;
  organisation_id?: string;
  application_id?: string;
  resource_id?: string;
  resource_type?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type AuthorisationResource = {
  id: string;
  resource_type: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
};

export type AuthorisationPermissionAssignment = {
  id: string;
  user_id: string;
  permission_id: string;
  permission_code?: string;
  effect: "ALLOW" | "DENY";
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

const authorisationServiceUrl = () => {
  const directBaseUrl = getEnvVariable("AUTHORISATION_PUBLIC_BASE_URL", "");
  if (directBaseUrl) return normalizeBaseUrl(directBaseUrl) + "/v1";
  return apiGatewayPath("/v1/authorisation");
};
const compatibilityFallbackEnabled = () =>
  getEnvVariable(
    "AUTHORISATION_COMPATIBILITY_FALLBACK",
    "false",
  ).toLowerCase() === "true";

function headers(actor?: AuthorisationActor | null) {
  return {
    "Content-Type": "application/json",
    ...(actor?.accessToken
      ? { Authorization: `Bearer ${actor.accessToken}` }
      : {}),
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
  if (actor.role === "SUPER_ADMIN" || actor.role === "ADMIN") return true;

  try {
    const response = await fetch(`${authorisationServiceUrl()}/authorize`, {
      method: "POST",
      cache: "no-store",
      headers: headers(actor),
      body: JSON.stringify({
        subjectId: actor.id,
        permission,
        organisationId: scope.organisationId ?? actor.academyId ?? undefined,
        applicationId:
          scope.applicationId ??
          getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders"),
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

const managedRoleKeys = new Set([
  "USER",
  "STANDARD_USER",
  "ACADEMY_ADMIN",
  "ACADEMY_OWNER",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
  "ADMIN",
]);

export async function listUserAuthorisationRoles(
  userId: string,
  actor?: AuthorisationActor | null,
) {
  try {
    const response = await fetch(
      `${authorisationServiceUrl()}/users/${encodeURIComponent(userId)}/roles`,
      {
        method: "GET",
        cache: "no-store",
        headers: headers(actor),
      },
    );
    const result = (await parseResponse(response)) as {
      role_assignments?: AuthorisationRoleAssignment[];
    };
    return result.role_assignments ?? [];
  } catch (error) {
    if (error instanceof AuthorisationServiceError) return [];
    throw error;
  }
}

export async function listAuthorisationRoles(
  actor?: AuthorisationActor | null,
) {
  const result = await listAuthorisationRolesPage(actor);
  return result.roles;
}

export async function listAuthorisationRolesPage(
  actor?: AuthorisationActor | null,
  options: { limit?: number; offset?: number } = {},
) {
  try {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined)
      params.set("offset", String(options.offset));
    const query = params.toString();
    const response = await fetch(
      `${authorisationServiceUrl()}/roles${query ? `?${query}` : ""}`,
      {
        method: "GET",
        cache: "no-store",
        headers: headers(actor),
      },
    );
    const result = (await parseResponse(response)) as {
      roles?: AuthorisationRole[];
      pagination?: AuthorisationPagination;
    };
    const roles = result.roles ?? [];
    return {
      roles,
      pagination: result.pagination ?? {
        limit: options.limit ?? 10,
        offset: options.offset ?? 0,
        count: roles.length,
        has_more: false,
      },
    };
  } catch (error) {
    if (error instanceof AuthorisationServiceError) {
      return {
        roles: [],
        pagination: {
          limit: options.limit ?? 10,
          offset: options.offset ?? 0,
          count: 0,
          has_more: false,
        },
      };
    }
    throw error;
  }
}

export async function createAuthorisationRole(
  actor: AuthorisationActor | null | undefined,
  input: {
    key: string;
    name: string;
    description?: string;
    level: number;
    assignable: boolean;
    systemRole: boolean;
  },
) {
  const response = await fetch(`${authorisationServiceUrl()}/roles`, {
    method: "POST",
    cache: "no-store",
    headers: headers(actor),
    body: JSON.stringify({
      key: input.key,
      name: input.name,
      description: input.description ?? "",
      level: input.level,
      assignable: input.assignable,
      system_role: input.systemRole,
    }),
  });
  return parseResponse(response) as Promise<AuthorisationRole>;
}

export async function listAuthorisationRolePermissions(
  roleId: string,
  actor?: AuthorisationActor | null,
) {
  try {
    const response = await fetch(
      `${authorisationServiceUrl()}/roles/${encodeURIComponent(roleId)}/permissions`,
      {
        method: "GET",
        cache: "no-store",
        headers: headers(actor),
      },
    );
    const result = (await parseResponse(response)) as {
      permissions?: AuthorisationPermission[];
    };
    return result.permissions ?? [];
  } catch (error) {
    if (error instanceof AuthorisationServiceError) return [];
    throw error;
  }
}

export async function listAuthorisationPermissions(
  actor?: AuthorisationActor | null,
) {
  const result = await listAuthorisationPermissionsPage(actor);
  return result.permissions;
}

export async function listAuthorisationPermissionsPage(
  actor?: AuthorisationActor | null,
  options: { limit?: number; offset?: number } = {},
) {
  try {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined)
      params.set("offset", String(options.offset));
    const query = params.toString();
    const response = await fetch(
      `${authorisationServiceUrl()}/permissions${query ? `?${query}` : ""}`,
      {
        method: "GET",
        cache: "no-store",
        headers: headers(actor),
      },
    );
    const result = (await parseResponse(response)) as {
      permissions?: AuthorisationPermission[];
      pagination?: AuthorisationPagination;
    };
    const permissions = result.permissions ?? [];
    return {
      permissions,
      pagination: result.pagination ?? {
        limit: options.limit ?? 10,
        offset: options.offset ?? 0,
        count: permissions.length,
        has_more: false,
      },
    };
  } catch (error) {
    if (error instanceof AuthorisationServiceError) {
      return {
        permissions: [],
        pagination: {
          limit: options.limit ?? 10,
          offset: options.offset ?? 0,
          count: 0,
          has_more: false,
        },
      };
    }
    throw error;
  }
}

export async function listAuthorisationResources(
  actor?: AuthorisationActor | null,
) {
  try {
    const response = await fetch(`${authorisationServiceUrl()}/resources`, {
      method: "GET",
      cache: "no-store",
      headers: headers(actor),
    });
    const result = (await parseResponse(response)) as {
      resources?: AuthorisationResource[];
    };
    return result.resources ?? [];
  } catch (error) {
    if (error instanceof AuthorisationServiceError) return [];
    throw error;
  }
}

export async function createAuthorisationPermission(
  actor: AuthorisationActor | null | undefined,
  input: {
    code: string;
    name: string;
    description?: string;
    organisationId?: string;
    applicationId?: string;
    resourceId?: string;
  },
) {
  const response = await fetch(`${authorisationServiceUrl()}/permissions`, {
    method: "POST",
    cache: "no-store",
    headers: headers(actor),
    body: JSON.stringify({
      code: input.code,
      name: input.name,
      description: input.description ?? "",
      organisation_id: input.organisationId ?? undefined,
      application_id: input.applicationId ?? undefined,
      resource_id: input.resourceId ?? undefined,
    }),
  });
  return parseResponse(response) as Promise<AuthorisationPermission>;
}

export async function updateAuthorisationPermission(
  actor: AuthorisationActor | null | undefined,
  permission: Pick<AuthorisationPermission, "id" | "code" | "name"> &
    Partial<
      Pick<
        AuthorisationPermission,
        "description" | "organisation_id" | "application_id" | "resource_id"
      >
    >,
) {
  const response = await fetch(
    `${authorisationServiceUrl()}/permissions/${encodeURIComponent(permission.id)}`,
    {
      method: "PUT",
      cache: "no-store",
      headers: headers(actor),
      body: JSON.stringify({
        code: permission.code,
        name: permission.name,
        description: permission.description ?? "",
        organisation_id: permission.organisation_id ?? undefined,
        application_id: permission.application_id ?? undefined,
        resource_id: permission.resource_id ?? undefined,
      }),
    },
  );
  return parseResponse(response) as Promise<AuthorisationPermission>;
}

export async function listEffectiveUserPermissions(
  userId: string,
  scope: AuthorisationScope = {},
  actor?: AuthorisationActor | null,
) {
  const params = new URLSearchParams();
  if (scope.organisationId) params.set("organisation_id", scope.organisationId);
  if (scope.applicationId) params.set("application_id", scope.applicationId);
  if (scope.resourceType) params.set("resource_type", scope.resourceType);
  if (scope.resourceId) params.set("resource_id", scope.resourceId);

  try {
    const query = params.toString();
    const response = await fetch(
      `${authorisationServiceUrl()}/users/${encodeURIComponent(userId)}/effective-permissions${query ? `?${query}` : ""}`,
      {
        method: "GET",
        cache: "no-store",
        headers: headers(actor),
      },
    );
    const result = (await parseResponse(response)) as {
      permissions?: AuthorisationPermission[];
    };
    return result.permissions ?? [];
  } catch (error) {
    if (error instanceof AuthorisationServiceError) return [];
    throw error;
  }
}

export async function listUserPermissionAssignments(
  userId: string,
  actor?: AuthorisationActor | null,
) {
  try {
    const response = await fetch(
      `${authorisationServiceUrl()}/users/${encodeURIComponent(userId)}/permissions`,
      {
        method: "GET",
        cache: "no-store",
        headers: headers(actor),
      },
    );
    const result = (await parseResponse(response)) as {
      permission_assignments?: AuthorisationPermissionAssignment[];
    };
    return result.permission_assignments ?? [];
  } catch (error) {
    if (error instanceof AuthorisationServiceError) return [];
    throw error;
  }
}

function scopeValue(value?: string | null) {
  return value?.trim() || "";
}

function sameScope(
  left: AuthorisationScope = {},
  right: AuthorisationScope = {},
) {
  return (
    scopeValue(left.organisationId) === scopeValue(right.organisationId) &&
    scopeValue(left.applicationId) === scopeValue(right.applicationId) &&
    scopeValue(left.resourceType) === scopeValue(right.resourceType) &&
    scopeValue(left.resourceId) === scopeValue(right.resourceId)
  );
}

export async function createUserPermissionAssignment(
  actor: AuthorisationActor | null | undefined,
  userId: string,
  permissionId: string,
  effect: "ALLOW" | "DENY",
  scope: AuthorisationScope,
) {
  const response = await fetch(
    `${authorisationServiceUrl()}/users/${encodeURIComponent(userId)}/permissions`,
    {
      method: "POST",
      cache: "no-store",
      headers: headers(actor),
      body: JSON.stringify({
        permission_id: permissionId,
        effect,
        organisation_id: scope.organisationId ?? undefined,
        application_id: scope.applicationId ?? undefined,
        resource_type: scope.resourceType ?? undefined,
        resource_id: scope.resourceId ?? undefined,
        assigned_by: actor?.id ?? "system",
      }),
    },
  );
  return parseResponse(response) as Promise<AuthorisationPermissionAssignment>;
}

export async function addAuthorisationRolePermission(
  actor: AuthorisationActor | null | undefined,
  roleId: string,
  permissionId: string,
) {
  const response = await fetch(
    `${authorisationServiceUrl()}/roles/${encodeURIComponent(roleId)}/permissions`,
    {
      method: "POST",
      cache: "no-store",
      headers: headers(actor),
      body: JSON.stringify({ permission_id: permissionId }),
    },
  );
  await parseResponse(response);
}

export async function removeAuthorisationRolePermission(
  actor: AuthorisationActor | null | undefined,
  roleId: string,
  permissionId: string,
) {
  const response = await fetch(
    `${authorisationServiceUrl()}/roles/${encodeURIComponent(roleId)}/permissions/${encodeURIComponent(permissionId)}`,
    {
      method: "DELETE",
      cache: "no-store",
      headers: headers(actor),
    },
  );
  if (!response.ok && response.status !== 404) await parseResponse(response);
}

export async function deleteUserPermissionAssignment(
  actor: AuthorisationActor | null | undefined,
  userId: string,
  assignmentId: string,
) {
  const response = await fetch(
    `${authorisationServiceUrl()}/users/${encodeURIComponent(userId)}/permissions/${encodeURIComponent(assignmentId)}`,
    {
      method: "DELETE",
      cache: "no-store",
      headers: headers(actor),
    },
  );
  if (!response.ok && response.status !== 404) await parseResponse(response);
}

export async function updateUserAuthorisationPermissions(
  actor: AuthorisationActor | null | undefined,
  userId: string,
  input: { grant: string[]; revoke: string[] },
  scope: AuthorisationScope = {},
) {
  const applicationId =
    scope.applicationId ??
    getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders");
  const assignmentScope = { ...scope, applicationId };
  const [permissions, assignments] = await Promise.all([
    listAuthorisationPermissions(actor),
    listUserPermissionAssignments(userId, actor),
  ]);
  const permissionIdByCode = new Map(
    permissions.map((permission) => [permission.code, permission.id]),
  );
  const directAssignments = assignments.filter((assignment) =>
    sameScope(
      {
        applicationId: assignment.scope?.application_id,
        organisationId: assignment.scope?.organisation_id,
        resourceId: assignment.scope?.resource_id,
        resourceType: assignment.scope?.resource_type,
      },
      assignmentScope,
    ),
  );
  const directAllows = directAssignments.filter(
    (assignment) => assignment.effect === "ALLOW",
  );
  const directDenies = directAssignments.filter(
    (assignment) => assignment.effect === "DENY",
  );

  const granted: string[] = [];
  for (const code of [...new Set(input.grant)]) {
    const permissionId = permissionIdByCode.get(code);
    if (!permissionId) continue;
    for (const assignment of directDenies.filter(
      (item) => item.permission_code === code,
    )) {
      await deleteUserPermissionAssignment(actor, userId, assignment.id);
    }
    if (directAllows.some((assignment) => assignment.permission_code === code))
      continue;
    await createUserPermissionAssignment(
      actor,
      userId,
      permissionId,
      "ALLOW",
      assignmentScope,
    );
    granted.push(code);
  }

  const revoked: string[] = [];
  const revokeCodes = new Set(input.revoke);
  for (const assignment of directAllows) {
    if (
      !assignment.permission_code ||
      !revokeCodes.has(assignment.permission_code)
    )
      continue;
    await deleteUserPermissionAssignment(actor, userId, assignment.id);
    revoked.push(assignment.permission_code);
  }
  const remainingEffectiveCodes = new Set(
    revokeCodes.size > 0
      ? (
          await listEffectiveUserPermissions(userId, assignmentScope, actor)
        ).map((permission) => permission.code)
      : [],
  );
  for (const code of revokeCodes) {
    const permissionId = permissionIdByCode.get(code);
    if (!permissionId || !remainingEffectiveCodes.has(code)) continue;
    if (directDenies.some((assignment) => assignment.permission_code === code))
      continue;
    await createUserPermissionAssignment(
      actor,
      userId,
      permissionId,
      "DENY",
      assignmentScope,
    );
    if (!revoked.includes(code)) revoked.push(code);
  }

  return { status: "updated", granted, revoked };
}

export async function replaceUserAuthorisationRole(
  actor: AuthorisationActor | null | undefined,
  userId: string,
  roleKey: string,
  scope: AuthorisationScope = {},
) {
  const roles = await listAuthorisationRoles(actor);
  const roleIdByKey = new Map(roles.map((role) => [role.key, role.id]));
  const roleId = roleIdByKey.get(roleKey);
  if (!roleId) return;

  const applicationId =
    scope.applicationId ??
    getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders");
  const organisationId = scope.organisationId ?? null;
  const existing = await listUserAuthorisationRoles(userId, actor);
  const managedRoleIds = new Set(
    roles
      .filter((role) => managedRoleKeys.has(role.key))
      .map((role) => role.id),
  );

  await Promise.all(
    existing
      .filter((assignment) => managedRoleIds.has(assignment.role_id))
      .filter((assignment) => assignment.role_id !== roleId)
      .filter((assignment) => {
        const assignmentScope = assignment.scope ?? {};
        const sameApplication =
          (assignmentScope.application_id ?? "") === applicationId;
        const sameOrganisation =
          (assignmentScope.organisation_id ?? "") === (organisationId ?? "");
        return sameApplication && sameOrganisation;
      })
      .map((assignment) =>
        deleteUserAuthorisationRole(actor, userId, assignment.id),
      ),
  );

  if (
    existing.some((assignment) => {
      const assignmentScope = assignment.scope ?? {};
      return (
        assignment.role_id === roleId &&
        (assignmentScope.application_id ?? "") === applicationId &&
        (assignmentScope.organisation_id ?? "") === (organisationId ?? "")
      );
    })
  ) {
    return;
  }

  const response = await fetch(
    `${authorisationServiceUrl()}/users/${encodeURIComponent(userId)}/roles`,
    {
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
    },
  );
  await parseResponse(response);
}

async function deleteUserAuthorisationRole(
  actor: AuthorisationActor | null | undefined,
  userId: string,
  assignmentId: string,
) {
  const response = await fetch(
    `${authorisationServiceUrl()}/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(assignmentId)}`,
    {
      method: "DELETE",
      cache: "no-store",
      headers: headers(actor),
    },
  );
  if (!response.ok && response.status !== 404) await parseResponse(response);
}

export async function requirePermission(
  actor: AuthorisationActor | null | undefined,
  permission: string,
  scope: AuthorisationScope = {},
) {
  return authorize(actor, permission, scope);
}

function legacyPermissionFallback(
  actor: AuthorisationActor,
  permission: string,
) {
  if (Array.isArray(actor.privileges) && actor.privileges.includes(permission))
    return true;

  const role = actor.role;
  if (!role) return false;
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;

  if (permission === "users.admin.access") {
    return (
      role === "PLATFORM_ADMIN" ||
      role === "ACADEMY_ADMIN" ||
      role === "ACADEMY_OWNER"
    );
  }

  if (
    permission.startsWith("academy.") ||
    permission.startsWith("course.") ||
    permission.startsWith("booking.")
  ) {
    return (
      role === "PLATFORM_ADMIN" ||
      role === "ACADEMY_ADMIN" ||
      role === "ACADEMY_OWNER"
    );
  }

  if (
    permission.startsWith("payment.") ||
    permission.startsWith("payout.") ||
    permission.startsWith("organisation.")
  ) {
    return role === "PLATFORM_ADMIN";
  }

  if (permission.startsWith("wallet.")) {
    return (
      role === "PLATFORM_ADMIN" ||
      role === "ACADEMY_ADMIN" ||
      role === "ACADEMY_OWNER"
    );
  }

  return false;
}
