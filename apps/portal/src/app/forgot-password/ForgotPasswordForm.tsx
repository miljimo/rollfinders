"use client";

import Link from "next/link";
import { Button } from "@/app/_components/Button";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {
  message: "",
  success: false,
};

export function ForgotPasswordForm({
  loginHref = "/login",
  variant = "default",
}: {
  loginHref?: string;
  variant?: "default" | "mobile";
}) {
  const [state, action, isPending] = useActionState(requestPasswordReset, initialState);
  const mobile = variant === "mobile";

  return (
    <form
      action={action}
      className={
        mobile
          ? "mt-8 grid gap-7 rounded-[1.35rem] bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.10)]"
          : "mt-5 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
      }
    >
      {state.message ? (
        <p role="status" className={`${mobile ? "rounded-xl p-4 text-base leading-7" : "rounded-md p-3 text-sm leading-6"} border border-teal-100 bg-teal-50 font-semibold text-teal-900`}>
          {state.message}
        </p>
      ) : null}
      <label className={`${mobile ? "gap-4 text-xl" : "gap-1.5 text-sm"} grid font-black text-slate-950`}>
        Email
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          disabled={isPending}
          className={`${mobile ? "min-h-20 rounded-xl px-5 text-xl" : "min-h-12 rounded-md px-3 text-base"} w-full border border-stone-300 bg-white font-normal text-stone-950 transition placeholder:text-stone-400 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:bg-stone-100 disabled:text-stone-500`}
        />
      </label>
      <Button type="submit" variant="primary" className={`${mobile ? "min-h-16 rounded-xl text-xl" : "min-h-12"} w-full`} disabled={isPending}>
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
      <Link href={loginHref} className={`${mobile ? "mt-5 text-xl" : "text-sm"} text-center font-black text-teal-800 underline-offset-4 hover:underline`}>
        Back to login
      </Link>
    </form>
  );
}
