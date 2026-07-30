import type { Metadata } from "next";
import Link from "next/link";
import { StaticPageShell } from "@/app/_components/Page";
import { AccountDeletionRequestForm } from "./AccountDeletionRequestForm";

export const metadata: Metadata = {
  title: "Request account deletion | RollFinders",
  description: "Request deletion of a RollFinders account and associated personal data.",
  alternates: { canonical: "/account-deletion" },
};

export default function AccountDeletionPage() {
  return (
    <StaticPageShell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase text-teal-800">RollFinders privacy</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950">Request account deletion</h1>
        <p className="mt-5 leading-7 text-slate-700">
          Enter the email used for your RollFinders account. We will send a short-lived confirmation link if an account exists.
        </p>
        <AccountDeletionRequestForm />
        <section className="mt-8 space-y-3 text-sm leading-6 text-slate-700">
          <h2 className="text-xl font-black text-slate-950">What happens next</h2>
          <p>After verification, we expect to complete a valid request within one calendar month. You can cancel it in dashboard settings before processing begins.</p>
          <p>Removing yourself from an academy does not delete your RollFinders account. Financial, fraud-prevention, or legal records may be retained where the law requires it.</p>
          <p>This intake records your request; final cross-service deletion is completed through RollFinders&apos; controlled privacy process.</p>
          <Link href="/privacy-policy" className="font-bold text-teal-800 underline">Read the RollFinders privacy policy</Link>
        </section>
      </main>
    </StaticPageShell>
  );
}
