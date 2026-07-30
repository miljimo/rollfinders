import type { Metadata } from "next";
import { StaticPageShell } from "@/app/_components/Page";
import { AccountDeletionConfirmForm } from "../AccountDeletionConfirmForm";

export const metadata: Metadata = {
  title: "Confirm account deletion | RollFinders",
  robots: { index: false, follow: false },
};

export default async function AccountDeletionConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] ?? "" : params.token ?? "";

  return (
    <StaticPageShell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase text-teal-800">RollFinders privacy</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950">Confirm account deletion</h1>
        <p className="mt-5 leading-7 text-slate-700">This confirmation is required before your request enters the processing queue.</p>
        <AccountDeletionConfirmForm token={token} />
      </main>
    </StaticPageShell>
  );
}
