"use client";

import { Button } from "@/components/Button";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function loginErrorMessage(errorCode: string | undefined) {
    if (errorCode === "AccountDisabled") return "This account is disabled. Contact an administrator to enable it.";
    if (errorCode === "AcademyRequired") return "This account is active, but no academy is assigned. Ask an administrator to assign an academy.";
    if (errorCode === "MissingCredentials") return "Enter both email and password.";
    return "Invalid email or password.";
  }

  async function handleSubmit(formData: FormData) {
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
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

      await getSession();
      window.location.href = result?.url ?? "/dashboard";
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="mt-5 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      {error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 break-words text-red-800">
          {error}
        </p>
      ) : null}
      <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
        Email
        <input
          name="email"
          type="email"
          required
          disabled={isSubmitting}
          className="min-h-12 w-full rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:bg-stone-100 disabled:text-stone-500"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
        Password
        <span className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            disabled={isSubmitting}
            className="min-h-12 w-full rounded-md border border-stone-300 bg-stone-50 px-3 pr-12 text-base font-normal text-stone-950 transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:bg-stone-100 disabled:text-stone-500"
          />
          <button
            type="button"
            className="absolute inset-y-1 right-1 inline-flex min-h-10 w-10 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={isSubmitting}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </span>
      </label>
      <Link href="/forgot-password" className="justify-self-start text-sm font-semibold text-teal-800 underline-offset-4 hover:underline">
        Forgot password?
      </Link>
      <Button type="submit" variant="primary" className="min-h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
