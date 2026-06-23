"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role, UserStatus } from "@prisma/client";
import { canAssignManagedUserRole, getCurrentUser, requireAdminPage } from "@/lib/admin";
import { updateUserAuthorisationPermissions } from "@/lib/authorisation-service";
import { getEnvVariable } from "@/lib/environments";
import { managedUsersReturnPath } from "@/lib/managed-user-return-path";
import { requestPasswordResetForEmail } from "@/lib/password-reset";
import {
  createManagedUser as createUserInService,
  deleteManagedUser as deleteUserInService,
  getManagedUser,
  mutateManagedUser,
  updateManagedUser as updateUserInService,
} from "@/lib/users-service";

function normalizeRole(value: string) {
  if (value === Role.SUPER_ADMIN) return Role.SUPER_ADMIN;
  if (value === Role.ADMIN) return Role.ADMIN;
  if (value === Role.ACADEMY_ADMIN) return Role.ACADEMY_ADMIN;
  if (value === Role.ACADEMY_OWNER) return Role.ACADEMY_OWNER;
  if (value === Role.PLATFORM_ADMIN) return Role.PLATFORM_ADMIN;
  return Role.STANDARD_USER;
}

function normalizeStatus(value: string) {
  return value === UserStatus.DISABLED ? UserStatus.DISABLED : UserStatus.ACTIVE;
}

async function requireUserManager() {
  await requireAdminPage();
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Admin access required");
  return actor;
}

function revalidateUserSurfaces() {
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function createManagedUser(formData: FormData) {
  const actor = await requireUserManager();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = normalizeRole(String(formData.get("role") ?? Role.STANDARD_USER));
  const password = String(formData.get("password") ?? "rollfinder-user");
  const academyId = String(formData.get("academyId") ?? "").trim() || null;
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const redirectTo = managedUsersReturnPath(returnTo);

  if (!email || !email.includes("@")) return;
  if (!canAssignManagedUserRole(actor, { role, academyId })) {
    throw new Error("You do not have permission to assign that role.");
  }

  try {
    await createUserInService(actor, { name, email, password, role, academyId });
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 409) {
      const url = new URL(redirectTo, "http://localhost");
      url.searchParams.set("userResult", "duplicate_email");
      url.searchParams.set("email", email);
      redirect(`${url.pathname}${url.search}`);
    }
    throw error;
  }

  revalidateUserSurfaces();
  redirect(redirectTo);
}

export async function updateManagedUser(userId: string, formData: FormData) {
  const actor = await requireUserManager();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = normalizeRole(String(formData.get("role") ?? Role.STANDARD_USER));
  const status = normalizeStatus(String(formData.get("status") ?? UserStatus.ACTIVE));
  const academyId = String(formData.get("academyId") ?? "").trim() || null;
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const redirectTo = managedUsersReturnPath(returnTo);

  if (!email || !email.includes("@")) return;
  if (!canAssignManagedUserRole(actor, { role, academyId })) {
    throw new Error("You do not have permission to assign that role.");
  }

  try {
    await updateUserInService(actor, userId, { name, email, phone, role, status, academyId });
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 409) {
      const url = new URL(redirectTo, "http://localhost");
      url.searchParams.set("userResult", "duplicate_email");
      url.searchParams.set("email", email);
      redirect(`${url.pathname}${url.search}`);
    }
    throw error;
  }

  revalidateUserSurfaces();
  redirect(redirectTo);
}

export async function applyManagedUserPrivileges(userId: string, input: { feature: string; grant: string[]; revoke: string[] }) {
  const actor = await requireUserManager();
  await updateUserAuthorisationPermissions(actor, userId, input, {
    applicationId: getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders"),
    organisationId: actor.academyId ?? undefined,
  });
  revalidateUserSurfaces();
}

export async function toggleManagedUserDisabled(userId: string) {
  const actor = await requireUserManager();
  const { user } = await getManagedUser(actor, userId);
  await mutateManagedUser(actor, userId, user.disabled || user.status === UserStatus.DISABLED ? "enable" : "disable");
  revalidateUserSurfaces();
}

export async function promoteManagedUser(userId: string) {
  const actor = await requireUserManager();
  await mutateManagedUser(actor, userId, "promote", Role.PLATFORM_ADMIN);
  revalidateUserSurfaces();
}

export async function demoteManagedUser(userId: string) {
  const actor = await requireUserManager();
  await mutateManagedUser(actor, userId, "demote");
  revalidateUserSurfaces();
}

export async function deleteManagedUser(userId: string) {
  const actor = await requireUserManager();
  await deleteUserInService(actor, userId);
  revalidateUserSurfaces();
}

export async function sendPasswordChangeEmail(userId: string, formData?: FormData) {
  const actor = await requireUserManager();
  const returnTo = managedUsersReturnPath(String(formData?.get("returnTo") ?? "/dashboard?panel=users"));
  const { user } = await getManagedUser(actor, userId);

  try {
    const result = await requestPasswordResetForEmail(user.email);
    if (!result.expiresAt) throw new Error("Password reset email was not sent.");
  } catch {
    const url = new URL(returnTo, "http://localhost");
    url.searchParams.set("userResult", "password_reset_failed");
    url.searchParams.set("email", user.email);
    redirect(`${url.pathname}${url.search}`);
  }

  revalidateUserSurfaces();
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.set("userResult", "password_reset_sent");
  url.searchParams.set("email", user.email);
  redirect(`${url.pathname}${url.search}`);
}
