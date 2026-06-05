import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { getValidPasswordResetToken } from "@/lib/password-reset";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resetToken = await getValidPasswordResetToken(token);
  if (!resetToken) notFound();

  return (
    <PageShell>
      <section className="mx-auto max-w-md px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Change password</h1>
        <p className="mt-3 text-stone-700">Set a new password for {resetToken.user.email}.</p>
        <ResetPasswordForm token={token} />
      </section>
    </PageShell>
  );
}
