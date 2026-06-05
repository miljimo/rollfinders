import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Change Password",
  description: "Change your RollFinders dashboard password.",
};

export default async function StandardChangePasswordPage() {
  await requireDashboardUser();

  return (
    <PageShell>
      <section className="mx-auto max-w-md px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Change Password</h1>
        <p className="mt-3 text-stone-700">Set a new password for your RollFinders account.</p>
        <ChangePasswordForm />
      </section>
    </PageShell>
  );
}
