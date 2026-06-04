"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    window.location.href = result?.url ?? "/dashboard";
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
