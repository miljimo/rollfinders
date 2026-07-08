"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import {
  createApplicationSubscription,
  createSubscriptionCheckout,
  createSubscriptionFeature,
  createSubscriptionPlan,
  createSubscriptionProduct,
  listApplicationSubscriptions,
  cancelApplicationSubscription,
  deleteApplicationSubscription,
  deleteSubscriptionFeature,
  deleteSubscriptionPlan,
  deleteSubscriptionProduct,
  disableSubscriptionFeature,
  reactivateApplicationSubscription,
  replaceSubscriptionPlanFeatures,
  replaceSubscriptionPlanProducts,
  SubscriptionServiceError,
  suspendApplicationSubscription,
  suspendSubscriptionPlan,
  suspendSubscriptionProduct,
  updateApplicationSubscription,
  updateSubscriptionFeature,
  updateSubscriptionPlan,
  updateSubscriptionProduct,
} from "@/lib/subscriptions-service";
import { createWalletTransfer, listWalletsPage, WalletServiceError } from "@/lib/wallet-service";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function paymentMode(formData: FormData): "subscription" | "one_time" {
  return value(formData, "paymentMode") === "one_time" ? "one_time" : "subscription";
}

function billingPeriod(formData: FormData): "month" | "year" {
  return value(formData, "billingPeriod") === "year" ? "year" : "month";
}

function selectedPlanIds(formData: FormData) {
  const repeated = formData
    .getAll("planIds")
    .map((item) => String(item).trim())
    .filter(Boolean);
  const selected = value(formData, "selectedPlans")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const primary = value(formData, "planId");
  return Array.from(new Set(primary ? [primary, ...repeated, ...selected] : [...repeated, ...selected]));
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
  if (err instanceof SubscriptionServiceError) {
    if (err.status === 409) return "A feature with this name already exists for the selected product service.";
    return err.message;
  }
  if (err instanceof WalletServiceError) return err.message;
  return "Subscription service request failed.";
}

function actionErrorCode(err: unknown) {
  if (err instanceof WalletServiceError) return err.code ?? "";
  return err instanceof SubscriptionServiceError ? err.code : "";
}

function redirectWithActionError(view: string, err: unknown) {
  const params = new URLSearchParams({
    subscriptionsView: view,
    actionError: actionErrorMessage(err),
  });
  const code = actionErrorCode(err);
  if (code) {
    params.set("actionErrorCode", code);
  }
  redirect(`/dashboard/subscriptions?${params.toString()}`);
}

function redirectCheckoutWithActionError(formData: FormData, err: unknown) {
  const params = new URLSearchParams({
    actionError: actionErrorMessage(err),
    billingPeriod: billingPeriod(formData),
    paymentMode: paymentMode(formData),
    selectedPlans: value(formData, "selectedPlans"),
  });
  const code = actionErrorCode(err);
  if (code) params.set("actionErrorCode", code);
  redirect(`/dashboard/subscriptions/checkout?${params.toString()}`);
}

async function subscriptionForPlan(applicationId: string, organisationId: string, planId: string, currentActor: Awaited<ReturnType<typeof actor>>) {
  const subscriptions = await listApplicationSubscriptions(applicationId, currentActor);
  const existing = subscriptions.find((subscription) => subscription.plan_id === planId && ["ACTIVE", "TRIAL", "active", "trial", "checkout_pending", "payment_confirmed", "past_due", "suspended", "scheduled_downgrade", "cancel_at_period_end"].includes(subscription.status));
  if (existing) return null;
  return (await createApplicationSubscription({ applicationId, organisationId, planId }, currentActor)).subscription ?? null;
}

async function subscriptionsForSelectedPlans(applicationId: string, organisationId: string, planIds: string[], currentActor: Awaited<ReturnType<typeof actor>>) {
  const created = [];
  for (const planId of planIds) {
    const subscription = await subscriptionForPlan(applicationId, organisationId, planId, currentActor);
    if (subscription?.id) created.push(subscription);
  }
  return created;
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
          feature_key: permission.code,
          name: permission.name,
          description: permission.description,
          status: "ACTIVE",
          is_selectable: true,
          subscription_controlled: formData.get("subscriptionControlled") === "on",
          metadata: { permission_code: permission.code },
        }, currentActor);
      }
    } else {
      await createSubscriptionFeature({
        product_id: value(formData, "productId"),
        feature_key: value(formData, "featureKey"),
        name: value(formData, "name"),
        description: value(formData, "description"),
        status: "ACTIVE",
        is_selectable: true,
        subscription_controlled: formData.get("subscriptionControlled") === "on",
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
      feature_key: primary?.code ?? value(formData, "featureKey"),
      name: primary?.name ?? value(formData, "name"),
      description: primary?.description ?? value(formData, "description"),
      status: value(formData, "status") || "ACTIVE",
      is_selectable: true,
      subscription_controlled: formData.get("subscriptionControlled") === "on",
      metadata: primary ? { permission_code: primary.code } : permissionMetadata(formData),
    }, currentActor);
    for (const permission of additional) {
      await createSubscriptionFeature({
        product_id: value(formData, "productId"),
        feature_key: permission.code,
        name: permission.name,
        description: permission.description,
        status: value(formData, "status") || "ACTIVE",
        is_selectable: true,
        subscription_controlled: formData.get("subscriptionControlled") === "on",
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
      is_internal: formData.get("isInternal") === "on",
      target_user_level: Number(value(formData, "targetUserLevel") || "100"),
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
      is_internal: formData.get("isInternal") === "on",
      target_user_level: Number(value(formData, "targetUserLevel") || "100"),
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

export async function startPlanCheckoutAction(formData: FormData) {
  let checkoutUrl = "";
  try {
    const currentActor = await actor();
    const result = await createSubscriptionCheckout(value(formData, "subscriptionId"), {
      billingPeriod: billingPeriod(formData),
      planId: value(formData, "planId"),
      paymentMode: paymentMode(formData),
      organisationId: value(formData, "organisationId"),
    }, currentActor);
    checkoutUrl = result.checkout?.checkout_url ?? "";
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("overview", err);
  }
  if (checkoutUrl) {
    redirect(checkoutUrl);
  }
  redirect("/dashboard/subscriptions?billing=applied");
}

export async function startSubscriptionCardCheckoutAction(formData: FormData) {
  let checkoutUrl = "";
  try {
    const currentActor = await actor();
    const planIds = selectedPlanIds(formData);
    const planId = planIds[0] ?? "";
    const applicationId = value(formData, "applicationId");
    const organisationId = value(formData, "organisationId");
    if (!planId) throw new SubscriptionServiceError("Select at least one plan before checkout.", 400, "plan_required");
    const subscriptions = await subscriptionsForSelectedPlans(applicationId, organisationId, planIds, currentActor);
    const subscription = subscriptions[0];
    if (!subscription?.id) {
      revalidatePath("/dashboard/subscriptions");
      redirect("/dashboard/subscriptions?billing=applied");
    }
    const result = await createSubscriptionCheckout(subscription.id, {
      billingPeriod: billingPeriod(formData),
      planId,
      planIds,
      paymentMode: paymentMode(formData),
      organisationId,
    }, currentActor);
    checkoutUrl = result.checkout?.checkout_url ?? "";
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectCheckoutWithActionError(formData, err);
  }
  if (checkoutUrl) redirect(checkoutUrl);
  redirect("/dashboard/subscriptions?billing=applied");
}

export async function startSubscriptionWalletCheckoutAction(formData: FormData) {
  try {
    const currentActor = await actor();
    const planIds = selectedPlanIds(formData);
    const planId = planIds[0] ?? "";
    const applicationId = value(formData, "applicationId");
    const organisationId = value(formData, "organisationId");
    const walletId = value(formData, "walletId");
    const amount = Number(value(formData, "amountMinor") || "0");
    if (!planId) throw new SubscriptionServiceError("Select at least one plan before checkout.", 400, "plan_required");
    if (!walletId || amount <= 0) throw new SubscriptionServiceError("A funded wallet is required for wallet payment.", 400, "wallet_required");
    const platformWallets = await listWalletsPage({
      actorUserId: currentActor.id,
      ownerId: "rollfinders_platform",
      walletType: "internal",
      currency: "GBP",
      limit: 1,
    });
    const platformWallet = platformWallets.wallets[0];
    if (!platformWallet) throw new WalletServiceError("RollFinders platform wallet is not configured.", 400, "platform_wallet_missing");
    const subscriptions = await subscriptionsForSelectedPlans(applicationId, organisationId, planIds, currentActor);
    const subscription = subscriptions[0];
    if (!subscription?.id) throw new SubscriptionServiceError("Subscription record could not be created.", 500, "subscription_missing");
    await createWalletTransfer({
      actorUserId: currentActor.id,
      sourceWalletId: walletId,
      destinationWalletId: platformWallet.id,
      amount,
      currency: "GBP",
      referenceId: subscription.id,
      description: `Subscription ${paymentMode(formData)} ${billingPeriod(formData)} payment`,
      idempotencyKey: `subscription-wallet:${subscription.id}:${planIds.join("+")}:${paymentMode(formData)}:${billingPeriod(formData)}`,
    });
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectCheckoutWithActionError(formData, err);
  }
  redirect("/dashboard/subscriptions?billing=applied");
}

export async function createSubscriptionAction(formData: FormData) {
  let checkoutUrl = "";
  try {
    const applicationId = value(formData, "applicationId");
    const organisationId = value(formData, "organisationId");
    const planIds = selectedPlanIds(formData);
    const planId = planIds[0];
    if (!planId) throw new SubscriptionServiceError("Select at least one plan.", 400, "plan_required");
    const currentActor = await actor();
    const subscriptions = await subscriptionsForSelectedPlans(applicationId, organisationId, planIds, currentActor);
    const subscription = subscriptions[0];
    if (planIds.length === 1 && subscription?.id) {
      const checkout = await createSubscriptionCheckout(subscription.id, {
        billingPeriod: billingPeriod(formData),
        planId,
        paymentMode: paymentMode(formData),
        organisationId,
      }, currentActor);
      checkoutUrl = checkout.checkout?.checkout_url ?? "";
    }
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("subscribers", err);
  }
  if (checkoutUrl) {
    redirect(checkoutUrl);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=subscribers");
}

export async function updateSubscriberAction(formData: FormData) {
  try {
    await updateApplicationSubscription(value(formData, "subscriptionId"), {
      planId: value(formData, "planId"),
      status: value(formData, "status") || "ACTIVE",
    }, await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("subscribers", err);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=subscribers");
}

export async function suspendSubscriberAction(formData: FormData) {
  try {
    await suspendApplicationSubscription(value(formData, "subscriptionId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("subscribers", err);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=subscribers");
}

export async function cancelSubscriberAction(formData: FormData) {
  try {
    await cancelApplicationSubscription(value(formData, "subscriptionId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("subscribers", err);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=subscribers");
}

export async function reactivateSubscriberAction(formData: FormData) {
  try {
    await reactivateApplicationSubscription(value(formData, "subscriptionId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    redirectWithActionError("subscribers", err);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=subscribers");
}

export async function deleteSubscriberAction(formData: FormData) {
  try {
    await deleteApplicationSubscription(value(formData, "subscriptionId"), await actor());
    revalidatePath("/dashboard/subscriptions");
  } catch (err) {
    if (err instanceof SubscriptionServiceError && (err.status === 404 || err.code === "not_found")) {
      revalidatePath("/dashboard/subscriptions");
      redirect("/dashboard/subscriptions?subscriptionsView=subscribers");
    }
    redirectWithActionError("subscribers", err);
  }
  redirect("/dashboard/subscriptions?subscriptionsView=subscribers");
}
