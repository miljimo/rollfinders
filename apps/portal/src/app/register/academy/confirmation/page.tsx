import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailWarning } from "lucide-react";
import { PageShell } from "@/app/_components/Page";

export const metadata: Metadata = {
  title: "RollFinders | Academy Registration Sent",
  description: "Your academy registration request has been sent.",
};

export const dynamic = "force-dynamic";

type ConfirmationSearchParams = {
  academy?: string;
  email?: string;
};

function textParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AcademyRegistrationConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<ConfirmationSearchParams>;
}) {
  const params = await searchParams;
  const academyName = textParam(params.academy).trim();
  const emailFailed = textParam(params.email) === "failed";

  return (
    <PageShell>
      <main className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 py-12 sm:px-6">
        <section className="w-full rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-teal-50 text-teal-800">
            <CheckCircle2 aria-hidden size={34} />
          </span>
          <p className="mt-5 text-sm font-bold uppercase tracking-wide text-teal-800">
            Academy registration
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-950 md:text-4xl">
            Claimed academy request has been sent
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-700">
            {academyName
              ? `${academyName} has been created as an unverified public academy profile. `
              : null}
            The academy owner can complete the claim process after RollFinders
            reviews the listing.
          </p>

          <div
            className={`mt-6 rounded-md border p-4 text-left text-sm font-semibold ${
              emailFailed
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-teal-200 bg-teal-50 text-teal-900"
            }`}
          >
            <div className="flex gap-3">
              {emailFailed ? (
                <MailWarning
                  aria-hidden
                  className="mt-0.5 shrink-0"
                  size={20}
                />
              ) : (
                <CheckCircle2
                  aria-hidden
                  className="mt-0.5 shrink-0"
                  size={20}
                />
              )}
              <p>
                {emailFailed
                  ? "The academy was created, but the verification email could not be sent. Contact RollFinders support to verify the academy contact email."
                  : "A verification code has been sent to the academy contact email."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-700 px-5 text-sm font-bold text-white"
            >
              Go to login
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-bold text-stone-800"
            >
              Back to home
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
