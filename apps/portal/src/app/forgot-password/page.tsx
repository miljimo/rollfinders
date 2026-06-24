import type { Metadata } from "next";
import { PageShell } from "@/components/Page";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "RollFinders | Forgot Password",
  description: "Request a secure password reset link for your RollFinders account.",
};

export default function ForgotPasswordPage() {
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 py-7 sm:px-6 md:py-10 lg:py-12">
        <h1 className="text-3xl font-black text-stone-950">Forgot password</h1>
        <p className="mt-3 text-stone-700">Enter your email and we will send a reset link if an account exists.</p>
        <ForgotPasswordForm />
      </section>
    </PageShell>
  );
}
