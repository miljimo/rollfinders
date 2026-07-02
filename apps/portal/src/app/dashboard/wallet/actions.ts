"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";
import { authorize } from "@/lib/authorisation-service";
import { disconnectStripePaymentAccountSetting } from "@/lib/payments";
import { createLinkedWalletAccount, createWallet, createWalletTransfer, type LinkedAccountConnectionType, type LinkedAccountProvider, type WalletCurrency, type WalletType } from "@/lib/wallet-service";

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
    await createWallet({ accessToken: user.accessToken, actorUserId: user.id, walletType, ownerId, currency });
    params.set("walletResult", "created");
  } catch (error) {
    params.set("walletResult", "failed");
    if (error instanceof Error) params.set("walletError", error.message);
  }

  revalidatePath("/dashboard/wallet");
  redirect(`${redirectUrl.pathname}?${params.toString()}`);
}

export async function createDashboardWalletTransfer(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const returnTo = safeWalletReturnPath(String(formData.get("returnTo") ?? "/dashboard/wallet?walletView=transactions"));
  const redirectUrl = new URL(returnTo, "http://localhost");
  const params = redirectUrl.searchParams;
  params.set("walletView", "transactions");
  params.delete("walletDialog");
  params.delete("walletError");
  params.delete("walletResult");

  const allowed = await authorize(user, "wallet.transfer", { applicationId: process.env.ROLLFINDERS_APPLICATION_ID ?? "app_rollfinders" });
  if (!allowed) {
    params.set("walletResult", "transfer-unauthorized");
    params.set("walletError", "You do not have permission to create wallet transfers.");
    redirect(`${redirectUrl.pathname}?${params.toString()}`);
  }

  const sourceWalletId = String(formData.get("sourceWalletId") ?? "").trim();
  const destinationWalletId = String(formData.get("destinationWalletId") ?? "").trim();
  const currencyValue = String(formData.get("currency") ?? "GBP").trim();
  const currency = (currencyValue.toLowerCase() === "points" ? "Points" : currencyValue.toUpperCase()) as WalletCurrency;
  const referenceId = String(formData.get("reference") ?? "").trim();
  const amountResult = parseTransferAmount(String(formData.get("amount") ?? ""), currency);

  if (!sourceWalletId || !destinationWalletId || sourceWalletId === destinationWalletId || !walletCurrencies.has(currency) || !amountResult.ok) {
    params.set("walletResult", "transfer-invalid");
    params.set("walletError", amountResult.ok ? "Choose two different wallets and enter a valid transfer amount." : amountResult.message);
    redirect(`${redirectUrl.pathname}?${params.toString()}`);
  }

  try {
    await createWalletTransfer({
      accessToken: user.accessToken,
      actorUserId: user.id,
      sourceWalletId,
      destinationWalletId,
      amount: amountResult.amount,
      currency,
      referenceId,
      description: referenceId ? `Dashboard transfer ${referenceId}` : "Dashboard wallet transfer",
      idempotencyKey: crypto.randomUUID(),
    });
    params.set("walletResult", "transfer-created");
  } catch (error) {
    params.set("walletResult", "transfer-failed");
    if (error instanceof Error) params.set("walletError", error.message);
  }

  revalidatePath("/dashboard/wallet");
  redirect(`${redirectUrl.pathname}?${params.toString()}`);
}

export async function disconnectDashboardWalletLinkedAccount(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const returnTo = safeWalletReturnPath(String(formData.get("returnTo") ?? "/dashboard/wallet"));
  const redirectUrl = new URL(returnTo, "http://localhost");
  const params = redirectUrl.searchParams;
  params.delete("walletDialog");
  params.delete("walletError");
  params.delete("walletResult");

  const walletId = String(formData.get("walletId") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim().toUpperCase() as LinkedAccountProvider;
  const providerAccountId = String(formData.get("providerAccountId") ?? "").trim();
  const connectionType = String(formData.get("connectionType") ?? "").trim().toUpperCase() as LinkedAccountConnectionType;
  const displayName = String(formData.get("displayName") ?? "").trim();
  const externalReference = String(formData.get("externalReference") ?? "").trim();
  const currencyValue = String(formData.get("currency") ?? "GBP").trim();
  const currency = (currencyValue.toLowerCase() === "points" ? "Points" : currencyValue.toUpperCase()) as WalletCurrency;

  if (!walletId || !provider || !connectionType || !walletCurrencies.has(currency)) {
    params.set("walletResult", "disconnect-invalid");
    params.set("walletError", "Wallet linked account could not be disconnected.");
    redirect(`${redirectUrl.pathname}?${params.toString()}`);
  }

  try {
    if (provider === "STRIPE") {
      const ownerType = user.academyId && !isPlatformAdminRole(user.role) ? "academy" : "platform";
      await disconnectStripePaymentAccountSetting({
        accessToken: user.accessToken,
        actorUserId: user.id,
        organisationId: user.academyId,
        ownerId: ownerType === "academy" ? user.academyId! : "rollfinders",
        ownerType,
      });
    }
    await createLinkedWalletAccount({
      accessToken: user.accessToken,
      actorUserId: user.id,
      walletId,
      provider,
      providerAccountId,
      connectionType,
      status: "DISABLED",
      displayName,
      externalReference,
      currency,
    });
    params.set("walletResult", "linked-account-disconnected");
  } catch (error) {
    params.set("walletResult", "disconnect-failed");
    if (error instanceof Error) params.set("walletError", error.message);
  }

  revalidatePath("/dashboard/wallet");
  redirect(`${redirectUrl.pathname}?${params.toString()}`);
}

function safeWalletReturnPath(value: string) {
  if (!value.startsWith("/dashboard/wallet")) return "/dashboard/wallet";
  return value;
}

function parseTransferAmount(value: string, currency: WalletCurrency): { ok: true; amount: number } | { ok: false; message: string } {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return { ok: false, message: "Enter a transfer amount." };

  if (currency === "Points") {
    if (!/^\d+$/.test(normalized)) return { ok: false, message: "Points transfers must use a whole number amount." };
    const amount = Number.parseInt(normalized, 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, message: "Enter a transfer amount greater than zero." };
    return { ok: true, amount };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return { ok: false, message: "Money transfers must use up to two decimal places." };
  const [pounds, pence = ""] = normalized.split(".");
  const amount = Number.parseInt(pounds, 10) * 100 + Number.parseInt(pence.padEnd(2, "0") || "0", 10);
  if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, message: "Enter a transfer amount greater than zero." };
  return { ok: true, amount };
}
