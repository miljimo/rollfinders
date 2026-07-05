import Link from "next/link";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/Page";
import { verifyAccountEmail } from "@/lib/email-verification";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const token = firstParam((await searchParams).token)?.trim();
  let verified = false;

  if (token) {
    try {
      await verifyAccountEmail(token);
      verified = true;
    } catch {
      verified = false;
    }
  }

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">{verified ? "Email verified" : "Verification failed"}</h1>
        <p className={`mt-4 rounded-md border p-3 text-sm font-semibold leading-6 ${verified ? "border-teal-200 bg-teal-50 text-teal-900" : "border-red-200 bg-red-50 text-red-800"}`}>
          {verified ? "Your account is active. You can sign in now." : "This verification link is invalid or expired. Ask an admin to verify your account or request a new link."}
        </p>
        <Button href="/login" variant="primary" className="mt-5 w-full">
          Sign in
        </Button>
        {!verified ? (
          <Link href="/contact" className="mt-4 block text-center text-sm font-semibold text-teal-800 underline-offset-4 hover:underline">
            Contact support
          </Link>
        ) : null}
      </section>
    </PageShell>
  );
}
