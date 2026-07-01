"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/admin";
import { createWallet, type WalletCurrency, type WalletType } from "@/lib/wallet-service";

const walletTypes = new Set<WalletType>(["internal", "external"]);
const walletCurrencies = new Set<WalletCurrency>(["GBP", "Points"]);

export async function createDashboardWallet(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const walletType = String(formData.get("walletType") ?? "external").toLowerCase() as WalletType;
  const ownerId = String(formData.get("ownerId") ?? "").trim();
  const currencyValue = String(formData.get("currency") ?? "GBP").trim();
  const currency = (currencyValue.toLowerCase() === "points" ? "Points" : currencyValue.toUpperCase()) as WalletCurrency;
  const returnTo = safeWalletReturnPath(String(formData.get("returnTo") ?? "/dashboard/wallet"));

  const redirectUrl = new URL(returnTo, "http://localhost");
  const params = redirectUrl.searchParams;
  params.delete("walletDialog");
  params.delete("walletError");
  params.delete("walletResult");
  if (!walletTypes.has(walletType) || !ownerId || !walletCurrencies.has(currency)) {
    params.set("walletResult", "invalid");
    redirect(`${redirectUrl.pathname}?${params.toString()}`);
  }

  try {
    await createWallet({ accessToken: user.accessToken, walletType, ownerId, currency });
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
