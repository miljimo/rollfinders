import { PageShell } from "@/components/PageShell";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 py-7 sm:px-6 md:py-10 lg:py-12">
        <h1 className="text-3xl font-black text-stone-950">Login</h1>
        <LoginForm />
      </section>
    </PageShell>
  );
}
