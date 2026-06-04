"use client";

import { getSession, signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");

  function loginErrorMessage(errorCode: string | undefined) {
    if (errorCode === "AccountDisabled") return "This account is disabled. Contact an administrator to enable it.";
    if (errorCode === "AcademyRequired") return "This account is active, but no academy is assigned. Ask an administrator to assign an academy.";
    if (errorCode === "MissingCredentials") return "Enter both email and password.";
    return "Invalid email or password.";
  }

  async function handleSubmit(formData: FormData) {
    setError("");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError(loginErrorMessage(result.error));
      return;
    }

    const session = await getSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    window.location.href = role === "PLATFORM_ADMIN"
      ? "/dashboard"
      : role === "ACADEMY_ADMIN" || role === "SUPER_ADMIN" || role === "ADMIN" ? "/admin" : result?.url ?? "/dashboard";
  }

  return (
    <form action={handleSubmit} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
      <label className="grid gap-1 text-sm font-semibold text-stone-800">Email<input name="email" type="email" required className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" /></label>
      <label className="grid gap-1 text-sm font-semibold text-stone-800">Password<input name="password" type="password" required className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" /></label>
      <button className="min-h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white">Sign In</button>
    </form>
  );
}
