import { PageShell } from "@/components/Page";
import { LoginForm } from "./LoginForm";

function safeRedirectTarget(value: string | string[] | undefined) {
  const redirectTarget = Array.isArray(value) ? value[0] : value;
  if (!redirectTarget) return "/dashboard";
  if (redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")) return redirectTarget;
  try {
    const url = new URL(redirectTarget);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return "/dashboard";
  }
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; redirect?: string | string[] }>;
}) {
  const params = await searchParams;
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 py-7 sm:px-6 md:py-10 lg:py-12">
        <h1 className="text-3xl font-black text-stone-950">Login</h1>
        <LoginForm callbackUrl={safeRedirectTarget(params.redirect ?? params.callbackUrl)} />
      </section>
    </PageShell>
  );
}
