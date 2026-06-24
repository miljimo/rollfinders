import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Change Password",
  description: "Change your RollFinders dashboard password.",
};

export default async function StandardChangePasswordPage() {
  redirect("/dashboard?panel=settings&settingsAction=change-password");
}
