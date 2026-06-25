"use server";

import { revalidatePath } from "next/cache";
import {
  addAuthorisationRolePermission,
  authorize,
  createAuthorisationPermission,
  createAuthorisationRole,
  createUserPermissionAssignment,
  deleteUserPermissionAssignment,
  listAuthorisationPermissionsPage,
  listAuthorisationRolePermissions,
  listAuthorisationRolesPage,
  updateAuthorisationPermission,
  type AuthorisationPagination,
  type AuthorisationPermission,
  type AuthorisationRole,
} from "@/lib/authorisation-service";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import { isAnyAdminRole, isStandardUserRole } from "@/lib/admin";

export type EditProfileState = {
  message: string;
  success: boolean;
};

export type PermissionMutationResult<T = unknown> = {
  data?: T;
  message: string;
  success: boolean;
};

export type AuthorisationRolePageResult = {
  pagination: AuthorisationPagination;
  rolePermissions: { roleId: string; permissions: AuthorisationPermission[] }[];
  roles: AuthorisationRole[];
};

export type AuthorisationPermissionPageResult = {
  pagination: AuthorisationPagination;
  permissions: AuthorisationPermission[];
};

export async function updateStandardUserProfile(
  _state: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const { user } = await requireDashboardUser();
  if (!isStandardUserRole(user.role) && !isAnyAdminRole(user.role)) {
    return { success: false, message: "Profile editing is only available for self-service dashboard users here." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length > 120) {
    return { success: false, message: "Name must be 120 characters or fewer." };
  }

  console.warn(`Profile display name update for ${user.id} is managed by the users service. Requested name: ${name}`);
  return { success: true, message: "Profile updates are managed by the users service." };
}

export async function removeCurrentUserPermissionAssignment(assignmentId: string) {
  const { user } = await requireDashboardUser();
  await deleteUserPermissionAssignment(user, user.id, assignmentId);
  revalidatePath("/dashboard");
}

export async function loadAuthorisationRolesPage(page: number, limit = 10): Promise<AuthorisationRolePageResult> {
  const { user } = await requireDashboardUser();
  const cleanLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const cleanPage = Math.max(Math.floor(page), 1);
  const offset = (cleanPage - 1) * cleanLimit;
  const result = await listAuthorisationRolesPage(user, { limit: cleanLimit, offset });
  const rolePermissions = await Promise.all(result.roles.map(async (role) => ({
    roleId: role.id,
    permissions: await listAuthorisationRolePermissions(role.id, user),
  })));
  return { ...result, rolePermissions };
}

export async function loadAuthorisationPermissionsPage(page: number, limit = 10): Promise<AuthorisationPermissionPageResult> {
  const { user } = await requireDashboardUser();
  const cleanLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const cleanPage = Math.max(Math.floor(page), 1);
  const offset = (cleanPage - 1) * cleanLimit;
  return listAuthorisationPermissionsPage(user, { limit: cleanLimit, offset });
}

export async function updatePermissionDescription(input: {
  permissionId: string;
  code: string;
  name: string;
  description: string;
  organisationId?: string;
  applicationId?: string;
  resourceId?: string;
}): Promise<PermissionMutationResult<AuthorisationPermission>> {
  const { user } = await requireDashboardUser();
  const allowed = await authorize(user, "authorisation.permission.update", {
    applicationId: input.applicationId || undefined,
    organisationId: input.organisationId || user.academyId || undefined,
  }) || await authorize(user, "authorisation.manage", {
    applicationId: input.applicationId || undefined,
    organisationId: input.organisationId || user.academyId || undefined,
  });
  if (!allowed) {
    return { success: false, message: "You do not have permission to edit permission definitions." };
  }

  try {
    const updated = await updateAuthorisationPermission(user, {
      id: input.permissionId,
      code: input.code,
      name: input.name,
      description: input.description,
      organisation_id: input.organisationId,
      application_id: input.applicationId,
      resource_id: input.resourceId,
    });
    revalidatePath("/dashboard");
    return { success: true, message: `${updated.code} updated.`, data: updated };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to update permission." };
  }
}

export async function createPermissionWithOptionalAssignments(input: {
  code: string;
  name: string;
  description: string;
  organisationId?: string;
  applicationId?: string;
  resourceId?: string;
  roleId?: string;
  userId?: string;
}): Promise<PermissionMutationResult<AuthorisationPermission>> {
  if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(input.code.trim())) {
    return { success: false, message: "Permission code must use resource.action naming, for example academy.archive or academy.claim.approve." };
  }

  const { user } = await requireDashboardUser();
  const scope = {
    applicationId: input.applicationId || undefined,
    organisationId: input.organisationId || user.academyId || undefined,
  };
  const canCreate = await authorize(user, "authorisation.permission.create", scope) || await authorize(user, "authorisation.manage", scope);
  if (!canCreate) return { success: false, message: "You do not have permission to create permission definitions." };

  try {
    const permission = await createAuthorisationPermission(user, {
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description.trim(),
      organisationId: input.organisationId,
      applicationId: input.applicationId,
      resourceId: input.resourceId,
    });

    if (input.roleId) {
      const canAssignRole = await authorize(user, "authorisation.role_permission.add", scope)
        || await authorize(user, "authorisation.role_permission.assign", scope)
        || await authorize(user, "authorisation.manage", scope);
      if (!canAssignRole) return { success: false, message: "Permission created, but you do not have permission to assign it to a role.", data: permission };
      await addAuthorisationRolePermission(user, input.roleId, permission.id);
    }

    if (input.userId) {
      const canAssignUser = await authorize(user, "authorisation.user_permission.assign", scope) || await authorize(user, "authorisation.manage", scope);
      if (!canAssignUser) return { success: false, message: "Permission created, but you do not have permission to assign it to a user.", data: permission };
      await createUserPermissionAssignment(user, input.userId, permission.id, "ALLOW", scope);
    }

    revalidatePath("/dashboard");
    return { success: true, message: `${permission.code} created.`, data: permission };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to create permission." };
  }
}

export async function createRoleWithPrivileges(input: {
  key: string;
  name: string;
  description: string;
  level: number;
  assignable: boolean;
  systemRole: boolean;
  permissionIds: string[];
}): Promise<PermissionMutationResult<AuthorisationRole>> {
  const { user } = await requireDashboardUser();
  const canCreate = await authorize(user, "authorisation.role.create") || await authorize(user, "authorisation.manage");
  if (!canCreate) return { success: false, message: "You do not have permission to create role bundles." };

  const cleanKey = input.key.trim().toUpperCase();
  if (!cleanKey || !input.name.trim()) {
    return { success: false, message: "Role key and name are required." };
  }

  try {
    const role = await createAuthorisationRole(user, {
      key: cleanKey,
      name: input.name.trim(),
      description: input.description.trim(),
      level: input.level,
      assignable: input.assignable,
      systemRole: input.systemRole,
    });

    const uniquePermissionIds = [...new Set(input.permissionIds.filter(Boolean))];
    if (uniquePermissionIds.length) {
      const canAssign = await authorize(user, "authorisation.role_permission.add")
        || await authorize(user, "authorisation.role_permission.assign")
        || await authorize(user, "authorisation.manage");
      if (!canAssign) {
        revalidatePath("/dashboard");
        return { success: false, message: "Role created, but you do not have permission to add privileges.", data: role };
      }
      for (const permissionId of uniquePermissionIds) {
        await addAuthorisationRolePermission(user, role.id, permissionId);
      }
    }

    revalidatePath("/dashboard");
    return { success: true, message: `${role.name} created.`, data: role };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to create role." };
  }
}

export async function addPrivilegeToRole(input: {
  roleId: string;
  permissionId: string;
}): Promise<PermissionMutationResult> {
  const { user } = await requireDashboardUser();
  const canAssign = await authorize(user, "authorisation.role_permission.add")
    || await authorize(user, "authorisation.role_permission.assign")
    || await authorize(user, "authorisation.manage");
  if (!canAssign) return { success: false, message: "You do not have permission to add privileges to roles." };
  if (!input.roleId || !input.permissionId) return { success: false, message: "Select a privilege before adding it to the role." };

  try {
    await addAuthorisationRolePermission(user, input.roleId, input.permissionId);
    revalidatePath("/dashboard");
    return { success: true, message: "Privilege added to role." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to add privilege to role." };
  }
}
