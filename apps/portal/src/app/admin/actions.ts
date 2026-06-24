"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdminPage, requireSuperAdminPage, writeAdminAuditLog } from "@/lib/admin";
import { processEmailDeliveryJob } from "@/lib/reliable-email";

export async function toggleUserDisabled(userId: string) {
  await requireSuperAdminPage();
  console.warn(`toggleUserDisabled(${userId}) is managed by the users service.`);
  revalidatePath("/admin");
}

export async function createUser(formData: FormData) {
  await requireSuperAdminPage();
  console.warn(`createUser(${String(formData.get("email") ?? "")}) is managed by the users service.`);
  revalidatePath("/admin");
}

export async function updateUserRole(userId: string, formData: FormData) {
  await requireSuperAdminPage();
  console.warn(`updateUserRole(${userId}, ${String(formData.get("role") ?? "")}) is managed by the users service.`);
  revalidatePath("/admin");
}

export async function deleteInvalidEmailRecord(invalidEmailId: string) {
  const actor = await requireSuperAdminPage();
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: null,
    action: "INVALID_EMAIL_RECORD_DELETE_SKIPPED",
    metadata: { invalidEmailId, reason: "notification_service_owns_email_state" },
  });

  revalidatePath("/admin");
}

export async function deleteInvalidEmailUser(invalidEmailId: string) {
  const actor = await requireSuperAdminPage();
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: null,
    action: "INVALID_EMAIL_USER_DELETE_SKIPPED",
    metadata: { invalidEmailId, reason: "notification_service_owns_email_state" },
  });

  revalidatePath("/admin");
}

export async function processEmailQueue(formData: FormData) {
  const actor = await requirePlatformAdminPage();
  const limit = Number(formData.get("limit") ?? "20");
  const result = await processEmailDeliveryJob(Number.isFinite(limit) ? limit : 20, {
    source: "Admin Settings",
    userId: actor.id,
    email: actor.email,
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: null,
    action: "EMAIL_DELIVERY_JOB_TRIGGERED",
    metadata: {
      failedCount: result.run.failedCount,
      invalidCount: result.run.invalidCount,
      processedCount: result.run.processedCount,
      retryPendingCount: result.run.retryPendingCount,
      runId: result.run.id,
      sentCount: result.run.sentCount,
      status: result.run.status,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
}
