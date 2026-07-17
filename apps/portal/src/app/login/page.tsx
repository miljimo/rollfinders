import { PageShell } from "@/components/Page";
import { LoginForm } from "./LoginForm";

function safeRedirectTarget(value: string | string[] | undefined) {
  const redirectTarget = Array.isArray(value) ? value[0] : value;
  if (!redirectTarget) return "/dashboard";
  if (redirectTarget.startsWith("/") && !redirectTarget.startsWith("//"))
    return redirectTarget;
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    redirect?: string | string[];
    registered?: string | string[];
    email?: string | string[];
    warning?: string | string[];
    verifyEmail?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const registered = Array.isArray(params.registered)
    ? params.registered[0]
    : params.registered;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const warning = Array.isArray(params.warning)
    ? params.warning[0]
    : params.warning;
  const verifyEmail = Array.isArray(params.verifyEmail)
    ? params.verifyEmail[0]
    : params.verifyEmail;
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 md:py-12 lg:py-16">
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-8">
          <div className="text-center">
            <h1 className="text-3xl font-black text-stone-950 md:text-4xl">
              Welcome back
            </h1>
            <p className="mt-2 text-lg text-stone-600">
              Sign in to your academy account
            </p>
          </div>
          {registered === "1" ? (
            <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold leading-6 text-teal-900">
              Account created{email ? ` for ${email}` : ""}.{" "}
              {verifyEmail === "1"
                ? "Check your inbox and verify your email before signing in."
                : warning === "academy-link"
                  ? "Sign in and ask your academy admin to connect your account."
                  : "Sign in to continue."}
            </p>
          ) : null}
          <LoginForm
            callbackUrl={safeRedirectTarget(
              params.redirect ?? params.callbackUrl,
            )}
          />
        </div>
      </section>
    </PageShell>
  );
}
