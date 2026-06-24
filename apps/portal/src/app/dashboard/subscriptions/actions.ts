"use server";

import { revalidatePath } from "next/cache";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import {
  createApplicationSubscription,
  createSubscriptionFeature,
  createSubscriptionPlan,
  createSubscriptionProduct,
  replaceSubscriptionPlanFeatures,
} from "@/lib/subscriptions-service";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function actor() {
  const { user } = await requireDashboardUser();
  return { id: user.id, role: user.role, email: user.email, academyId: user.academyId };
}

export async function createProductAction(formData: FormData) {
  await createSubscriptionProduct({
    key: value(formData, "key"),
    service_key: value(formData, "serviceKey"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    status: "ACTIVE",
    plan_selectable: true,
  }, await actor());
  revalidatePath("/dashboard/subscriptions");
}

export async function createFeatureAction(formData: FormData) {
  await createSubscriptionFeature({
    key: value(formData, "key"),
    product_key: value(formData, "productKey"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    status: "ACTIVE",
    plan_selectable: true,
  }, await actor());
  revalidatePath("/dashboard/subscriptions");
}

export async function createPlanAction(formData: FormData) {
  await createSubscriptionPlan({
    key: value(formData, "key"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    status: "ACTIVE",
    currency: value(formData, "currency") || "GBP",
    price_minor: Number(value(formData, "priceMinor") || "0"),
    billing_cycle: value(formData, "billingCycle") || "month",
  }, await actor());
  revalidatePath("/dashboard/subscriptions");
}

export async function replacePlanFeaturesAction(formData: FormData) {
  const planKey = value(formData, "planKey");
  const featureKeys = formData.getAll("featureKeys").map((item) => String(item)).filter(Boolean);
  await replaceSubscriptionPlanFeatures(planKey, featureKeys, await actor());
  revalidatePath("/dashboard/subscriptions");
}

export async function createSubscriptionAction(formData: FormData) {
  await createApplicationSubscription({
    applicationId: value(formData, "applicationId"),
    organisationId: value(formData, "organisationId"),
    planKey: value(formData, "planKey"),
  }, await actor());
  revalidatePath("/dashboard/subscriptions");
}

