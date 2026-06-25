"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import {
  createApplicationSubscription,
  createSubscriptionFeature,
  createSubscriptionPlan,
  createSubscriptionProduct,
  deleteSubscriptionFeature,
  deleteSubscriptionPlan,
  deleteSubscriptionProduct,
  disableSubscriptionFeature,
  replaceSubscriptionPlanFeatures,
  replaceSubscriptionPlanProducts,
  SubscriptionServiceError,
  suspendSubscriptionPlan,
  suspendSubscriptionProduct,
  updateSubscriptionFeature,
  updateSubscriptionPlan,
  updateSubscriptionProduct,
} from "@/lib/subscriptions-service";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function permissionMetadata(formData: FormData) {
  const permissionCode = value(formData, "permissionCode");
  return permissionCode ? { permission_code: permissionCode } : undefined;
}

type SelectedPermission = {
  code: string;
  name: string;
  description: string;
};

function selectedPermissions(formData: FormData): SelectedPermission[] {
  const raw = value(formData, "selectedPermissions");
  if (!raw) {
    const permissionCode = value(formData, "permissionCode");
    return permissionCode ? [{ code: permissionCode, name: value(formData, "name") || permissionCode, description: value(formData, "description") || permissionCode }] : [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): SelectedPermission[] => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const code = typeof record.code === "string" ? record.code.trim() : "";
      if (!code) return [];
      const name = typeof record.name === "string" && record.name.trim() ? record.name.trim() : code;
      const description = typeof record.description === "string" && record.description.trim() ? record.description.trim() : code;
      return [{ code, name, description }];
    });
  } catch {
    return [];
  }
}

async function actor() {
  const { user } = await requireDashboardUser();
  return { id: user.id, role: user.role, email: user.email, academyId: user.academyId };
}

function actionErrorMessage(err: unknown) {
  if (err instanceof SubscriptionServiceError) return err.message;
  return "Subscription service request failed.";
}

function redirectWithActionError(view: string, err: unknown) {
  const params = new URLSearchParams({
    subscriptionsView: view,
    actionError: actionErrorMessage(err),
  });
  redirect(`/dashboard/subscriptions?${params.toString()}`);
}

export async function createProductAction(formData: FormData) {
  try {
    await createSubscriptionProduct({
      service_id: value(formData, "serviceId"),
      name: value(formData, "name"),
      description: value(formData, "description"),
      status: "ACTIVE",
      is_selectable: true,
    }, await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("products", err);
  }
}

export async function updateProductAction(formData: FormData) {
  const productId = value(formData, "productId");
  try {
    await updateSubscriptionProduct(productId, {
      service_id: value(formData, "serviceId"),
      name: value(formData, "name"),
      description: value(formData, "description"),
      status: value(formData, "status") || "ACTIVE",
      is_selectable: true,
    }, await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("products", err);
  }
}

export async function suspendProductAction(formData: FormData) {
  try {
    await suspendSubscriptionProduct(value(formData, "productId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("products", err);
  }
}

export async function deleteProductAction(formData: FormData) {
  try {
    await deleteSubscriptionProduct(value(formData, "productId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("products", err);
  }
}

export async function createFeatureAction(formData: FormData) {
  try {
    const selected = selectedPermissions(formData);
    const currentActor = await actor();
    if (selected.length) {
      for (const permission of selected) {
        await createSubscriptionFeature({
          product_id: value(formData, "productId"),
          name: permission.name,
          description: permission.description,
          status: "ACTIVE",
          is_selectable: true,
          metadata: { permission_code: permission.code },
        }, currentActor);
      }
    } else {
      await createSubscriptionFeature({
        product_id: value(formData, "productId"),
        name: value(formData, "name"),
        description: value(formData, "description"),
        status: "ACTIVE",
        is_selectable: true,
        metadata: permissionMetadata(formData),
      }, currentActor);
    }
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("features", err);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=features");
}

export async function updateFeatureAction(formData: FormData) {
  const featureId = value(formData, "featureId");
  try {
    const selected = selectedPermissions(formData);
    const [primary, ...additional] = selected;
    const currentActor = await actor();
    await updateSubscriptionFeature(featureId, {
      product_id: value(formData, "productId"),
      name: primary?.name ?? value(formData, "name"),
      description: primary?.description ?? value(formData, "description"),
      status: value(formData, "status") || "ACTIVE",
      is_selectable: true,
      metadata: primary ? { permission_code: primary.code } : permissionMetadata(formData),
    }, currentActor);
    for (const permission of additional) {
      await createSubscriptionFeature({
        product_id: value(formData, "productId"),
        name: permission.name,
        description: permission.description,
        status: value(formData, "status") || "ACTIVE",
        is_selectable: true,
        metadata: { permission_code: permission.code },
      }, currentActor);
    }
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("features", err);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=features");
}

export async function disableFeatureAction(formData: FormData) {
  try {
    await disableSubscriptionFeature(value(formData, "featureId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("features", err);
  }
}

export async function deleteFeatureAction(formData: FormData) {
  try {
    await deleteSubscriptionFeature(value(formData, "featureId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("features", err);
  }
}

export async function createPlanAction(formData: FormData) {
  try {
    const result = await createSubscriptionPlan({
      name: value(formData, "name"),
      description: value(formData, "description"),
      status: "ACTIVE",
      currency: "GBP",
      price_minor: Number(value(formData, "priceMinor") || "0"),
      billing_cycle: value(formData, "billingCycle") || "month",
    }, await actor());
    const plan = result && typeof result === "object" && "plan" in result ? (result as { plan?: { id?: string } }).plan : null;
    const productIds = formData.getAll("productIds").map((item) => String(item)).filter(Boolean);
    if (plan?.id && productIds.length) {
      await replaceSubscriptionPlanProducts(plan.id, productIds, await actor());
    }
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("plans", err);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=plans");
}

export async function updatePlanAction(formData: FormData) {
  const planId = value(formData, "planId");
  try {
    await updateSubscriptionPlan(planId, {
      name: value(formData, "name"),
      description: value(formData, "description"),
      status: value(formData, "status") || "ACTIVE",
      currency: "GBP",
      price_minor: Number(value(formData, "priceMinor") || "0"),
      billing_cycle: value(formData, "billingCycle") || "month",
    }, await actor());
    const productIds = formData.getAll("productIds").map((item) => String(item)).filter(Boolean);
    await replaceSubscriptionPlanProducts(planId, productIds, await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("plans", err);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=plans");
}

export async function suspendPlanAction(formData: FormData) {
  try {
    await suspendSubscriptionPlan(value(formData, "planId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("plans", err);
  }
}

export async function deletePlanAction(formData: FormData) {
  try {
    await deleteSubscriptionPlan(value(formData, "planId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("plans", err);
  }
}

export async function replacePlanFeaturesAction(formData: FormData) {
  const planId = value(formData, "planId");
  const featureIds = formData.getAll("featureIds").map((item) => String(item)).filter(Boolean);
  await replaceSubscriptionPlanFeatures(planId, featureIds, await actor());
  revalidatePath("/dashboard/subscriptions");
}

export async function createSubscriptionAction(formData: FormData) {
  try {
    await createApplicationSubscription({
      applicationId: value(formData, "applicationId"),
      organisationId: value(formData, "organisationId"),
      planId: value(formData, "planId"),
    }, await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("subscribers", err);
  }
}
