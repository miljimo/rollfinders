"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/admin";
import { createWallet, type WalletOwnerType } from "@/lib/wallet-service";

const ownerTypes = new Set(["platform", "academy", "user", "event", "system"]);

export async function createDashboardWallet(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const ownerType = String(formData.get("ownerType") ?? "platform") as WalletOwnerType;
  const ownerId = String(formData.get("ownerId") ?? "").trim();
  const currency = String(formData.get("currency") ?? "GBP").trim().toUpperCase();
  const returnTo = safeWalletReturnPath(String(formData.get("returnTo") ?? "/dashboard/wallet"));

  const redirectUrl = new URL(returnTo, "http://localhost");
  const params = redirectUrl.searchParams;
  params.delete("walletDialog");
  params.delete("walletError");
  params.delete("walletResult");
  if (!ownerTypes.has(ownerType) || !ownerId || !/^[A-Z]{3}$/.test(currency)) {
    params.set("walletResult", "invalid");
    redirect(`${redirectUrl.pathname}?${params.toString()}`);
  }

  try {
    await createWallet({ accessToken: user.accessToken, ownerType, ownerId, currency });
    params.set("walletResult", "created");
  } catch (error) {
    params.set("walletResult", "failed");
    if (error instanceof Error) params.set("walletError", error.message);
  }

  revalidatePath("/dashboard/wallet");
  redirect(`${redirectUrl.pathname}?${params.toString()}`);
}

function safeWalletReturnPath(value: string) {
  if (!value.startsWith("/dashboard/wallet")) return "/dashboard/wallet";
  return value;
}
