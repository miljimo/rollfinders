import { PageShell } from "@/components/PageShell";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-md px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Login</h1>
        <LoginForm />
      </section>
    </PageShell>
  );
}
