"use client";

import { Button } from "@/app/_components/Button";
import { trackAnalyticsEvent } from "@/app/_components/Analytics/analyticsTracker";
import {
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm({
  callbackUrl = "/dashboard",
  forgotPasswordHref = "/forgot-password",
  registerHref = "/register",
  variant = "default",
}: {
  callbackUrl?: string;
  forgotPasswordHref?: string;
  registerHref?: string;
  variant?: "default" | "mobile";
}) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function loginErrorMessage(errorCode: string | undefined) {
    if (errorCode === "AccountDisabled")
      return "This account is disabled. Contact an administrator to enable it.";
    if (errorCode === "AcademyRequired")
      return "This account is active, but no academy is assigned. Ask an administrator to assign an academy.";
    if (errorCode === "EmailVerificationRequired")
      return "Verify your email before signing in. Check your inbox for the verification link.";
    if (errorCode === "MissingCredentials")
      return "Enter both email and password.";
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
        callbackUrl,
      });

      if (result?.error) {
        setError(loginErrorMessage(result.error));
        return;
      }

      const session = await getSession();
      const sessionUser = session?.user as
        { id?: string; role?: string } | undefined;
      trackAnalyticsEvent("user_logged_in", {
        role: sessionUser?.role ?? null,
        userId: sessionUser?.id ?? null,
      });
      window.location.href = result?.url ?? callbackUrl;
    } finally {
      setIsSubmitting(false);
    }
  }

  const mobile = variant === "mobile";

  return (
    <form
      action={handleSubmit}
      className={
        mobile
          ? "mt-8 grid gap-7"
          : "mt-7 grid gap-5 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
      }
    >
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 break-words text-red-800"
        >
          {error}
        </p>
      ) : null}
      <label className={`grid ${mobile ? "gap-3 text-xl font-black text-slate-950" : "gap-1.5 text-sm font-semibold text-stone-800"}`}>
        Email
        <span className="relative">
          <Mail
            aria-hidden
            size={mobile ? 30 : 20}
            className={`${mobile ? "left-5" : "left-4"} absolute top-1/2 -translate-y-1/2 text-stone-500`}
          />
          <input
            name="email"
            type="email"
            required
            disabled={isSubmitting}
            className={`${mobile ? "min-h-20 rounded-xl px-20 text-xl" : "min-h-14 rounded-md px-12 text-base"} w-full border border-stone-300 bg-white font-normal text-stone-950 transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:bg-stone-100 disabled:text-stone-500`}
          />
        </span>
      </label>
      <label className={`grid ${mobile ? "gap-3 text-xl font-black text-slate-950" : "gap-1.5 text-sm font-semibold text-stone-800"}`}>
        Password
        <span className="relative">
          <LockKeyhole
            aria-hidden
            size={mobile ? 30 : 20}
            className={`${mobile ? "left-5" : "left-4"} absolute top-1/2 -translate-y-1/2 text-stone-500`}
          />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            disabled={isSubmitting}
            className={`${mobile ? "min-h-20 rounded-xl px-20 text-xl" : "min-h-14 rounded-md px-12 text-base"} w-full border border-stone-300 bg-white font-normal text-stone-950 transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:bg-stone-100 disabled:text-stone-500`}
          />
          <button
            type="button"
            className={`${mobile ? "inset-y-2 right-3 min-h-14 w-14 rounded-xl" : "inset-y-1 right-1 min-h-10 w-10 rounded-md"} absolute inline-flex items-center justify-center text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700`}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={isSubmitting}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? (
              <EyeOff size={mobile ? 29 : 18} aria-hidden />
            ) : (
              <Eye size={mobile ? 29 : 18} aria-hidden />
            )}
          </button>
        </span>
      </label>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${mobile ? "text-lg" : ""}`}>
        <label className={`${mobile ? "gap-4 text-lg" : "gap-2 text-sm"} inline-flex items-center font-medium text-stone-700`}>
          <input
            name="remember"
            type="checkbox"
            className={`${mobile ? "size-7 rounded-md" : "size-4 rounded"} border-stone-300 text-teal-700 focus:ring-teal-700`}
            disabled={isSubmitting}
          />
          Remember me
        </label>
        <Link
          href={forgotPasswordHref}
          className={`${mobile ? "text-lg" : "text-sm"} font-black text-teal-800 underline-offset-4 hover:underline`}
        >
          Forgot password?
        </Link>
      </div>
      <Button
        type="submit"
        variant="primary"
        className={`${mobile ? "min-h-16 rounded-xl text-xl" : "min-h-14 text-base"} w-full`}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>

      {mobile ? (
        <Link href={registerHref} className="flex min-h-16 w-full items-center justify-center rounded-xl border-2 border-teal-700 bg-white px-4 text-xl font-black text-teal-800">
          Create account
        </Link>
      ) : (
        <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
        <span className="h-px bg-stone-200" />
        <span>or</span>
        <span className="h-px bg-stone-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="grid gap-4 rounded-lg border border-teal-200 bg-teal-50/50 p-4 text-center">
          <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full border border-teal-300 bg-white text-teal-800">
            <Building2 aria-hidden size={28} />
          </span>
          <div>
            <h2 className="text-lg font-black text-stone-950">
              Register Your Academy
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Find your academy listing, submit a claim, or contact RollFinders
              to create a new profile.
            </p>
          </div>
          <Button
            href="/register/academy"
            variant="secondary"
            className="w-full"
          >
            Register Academy
          </Button>
        </section>

        <section className="grid gap-4 rounded-lg border border-blue-200 bg-blue-50/40 p-4 text-center">
          <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full border border-blue-300 bg-white text-blue-700">
            <UsersRound aria-hidden size={28} />
          </span>
          <div>
            <h2 className="text-lg font-black text-stone-950">
              Create User Account
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              If your academy already exists, create your account, find your
              academy, and request to join.
            </p>
          </div>
          <Button
            href={registerHref}
            variant="secondary"
            className="w-full border-blue-600 text-blue-700 hover:bg-blue-50"
          >
            Create User Account
          </Button>
        </section>
      </div>
        </>
      )}
    </form>
  );
}
